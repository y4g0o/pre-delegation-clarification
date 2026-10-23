"""
Workers do CDH — refatorado para usar WorkerRegistry (src/registry.py).

Cada worker é definido como um WorkerSpec e auto-registrado no import deste
módulo. Adicionar um novo worker exige apenas:

    register_worker(WorkerSpec(
        name="novo",
        description="...",
        system_prompt="...",
        tools=[...],
        keywords_fallback=[...],
        default_model="...",
    ))

E o grafo.py + supervisor.py + api.py adaptam-se automaticamente via
registry.routing_targets() / describe_workers_for_prompt() / WORKERS.
"""
from __future__ import annotations

import json
import os
from langchain_ollama import ChatOllama
from langchain_core.messages import AIMessage, SystemMessage, ToolMessage

from .estado import Estado
from .ferramentas import busca_web, calcular, executar_codigo
from .registry import WorkerSpec, register_worker, WORKERS, get_tools_for


# ── Util ──────────────────────────────────────────────────────────────────

_CDH_PREAMBLE = (
    "PRIORIDADE: Se houver uma mensagem do Supervisor contendo 'Instrução:', "
    "execute exatamente essa instrução desambiguada, ignorando qualquer ambiguidade "
    "da solicitação original. "
)


def _get_llm(worker_name: str) -> ChatOllama:
    """Retorna LLM para o worker.
    Prioridade env: <WORKER_NAME_UPPER>_MODEL > WORKER_MODEL > spec.default_model."""
    env_key = worker_name.upper().replace("-", "_") + "_MODEL"
    spec = WORKERS.get(worker_name)
    fallback = spec.default_model if spec else "llama3.1:8b"
    model = (
        os.getenv(env_key)
        or os.getenv("WORKER_MODEL")
        or fallback
    )
    return ChatOllama(model=model, temperature=0)


def _safe_usage(response: AIMessage) -> dict:
    meta = response.usage_metadata
    if meta is None:
        return {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
    return meta


def _fix_tool_calls(response: AIMessage) -> AIMessage:
    """Convert JSON-in-content tool calls to proper tool_calls for models that ignore the API."""
    if response.tool_calls:
        return response
    content = response.content
    brace = content.find("{")
    if brace == -1:
        return response
    bracket = content.find("[")
    start = brace if bracket == -1 else (bracket if brace == -1 else min(brace, bracket))
    try:
        data, _ = json.JSONDecoder().raw_decode(content[start:])
    except (json.JSONDecodeError, ValueError):
        return response
    if isinstance(data, list):
        data = data[0] if data else {}
    if "function_call" in data:
        data = data["function_call"]
    name = data.get("name")
    args = data.get("arguments") or data.get("parameters") or {}
    if not name:
        return response
    if isinstance(args, str):
        try:
            args = json.loads(args)
        except json.JSONDecodeError:
            return response
    tool_id = f"call_{abs(hash(content[brace:])) % 10000:04d}"
    return AIMessage(
        content=content[:brace].strip(),
        tool_calls=[{"name": name, "args": args, "id": tool_id}],
        usage_metadata=_safe_usage(response),
    )


def _run_react(llm, tools: list, system: str, existing_messages: list,
               max_cycles: int = 8, agent_name: str | None = None):
    """ReAct loop com suporte a JSON-in-content tool calls.
    Aborta após 3 ciclos consecutivos com tool_calls 100% falhos (protege
    contra modelo que emite tool_calls malformados em loop)."""
    tools_by_name = {t.name: t for t in tools}
    llm_with_tools = llm.bind_tools(tools)
    context = [SystemMessage(content=system)] + list(existing_messages)
    new_messages: list = []
    ciclos = 0
    consecutive_failed_cycles = 0
    MAX_CONSECUTIVE_FAILURES = 3

    for _ in range(max_cycles):
        raw = llm_with_tools.invoke(context)
        response = _fix_tool_calls(raw)

        if not response.tool_calls and agent_name:
            response = AIMessage(
                content=response.content,
                name=agent_name,
                usage_metadata=_safe_usage(response),
            )

        context.append(response)
        new_messages.append(response)

        if not response.tool_calls:
            break

        cycle_total = 0
        cycle_failures = 0
        for tc in response.tool_calls:
            ciclos += 1
            cycle_total += 1
            tool_fn = tools_by_name.get(tc["name"])
            if tool_fn:
                try:
                    result = str(tool_fn.invoke(tc["args"]))
                except Exception as e:
                    result = f"Erro ao executar ferramenta: {e}"
                    cycle_failures += 1
            else:
                result = f"Ferramenta '{tc['name']}' não encontrada."
                cycle_failures += 1
            tool_msg = ToolMessage(content=result, tool_call_id=tc["id"])
            context.append(tool_msg)
            new_messages.append(tool_msg)

        if cycle_total > 0 and cycle_failures == cycle_total:
            consecutive_failed_cycles += 1
            if consecutive_failed_cycles >= MAX_CONSECUTIVE_FAILURES:
                new_messages.append(AIMessage(
                    content=f"[ReAct abort] {MAX_CONSECUTIVE_FAILURES} ciclos consecutivos "
                            f"com tool_calls inválidos/falhos. Interrompendo loop.",
                    name=agent_name or "worker",
                ))
                break
        else:
            consecutive_failed_cycles = 0

    # U2 — Recovery: se o worker exhausta o loop sem produzir conteúdo textual
    # substantivo, força uma síntese final SEM tools. Evita 'resposta vazia'
    # quando max_cycles é atingido com a última mensagem sendo tool_call ou ToolMessage.
    worker_has_content = any(
        isinstance(m, AIMessage) and (m.content or '').strip()
        for m in new_messages
    )
    if not worker_has_content:
        synthesis_system = SystemMessage(content=(
            "Os ciclos de uso de ferramentas terminaram. Produza agora a RESPOSTA "
            "FINAL ao usuário em texto puro, com base nos resultados das ferramentas "
            "acima. NÃO chame mais ferramentas — responda diretamente em português."
        ))
        try:
            raw_final = llm.invoke(context + [synthesis_system])
            final_content = (raw_final.content or '').strip()
            if final_content:
                final_msg = AIMessage(
                    content=raw_final.content,
                    name=agent_name or "worker",
                    usage_metadata=_safe_usage(raw_final),
                )
                new_messages.append(final_msg)
        except Exception:
            # Recovery best-effort; se a síntese falhar, deixa como estava (vazio)
            pass

    return new_messages, ciclos


# ── Worker node factory ───────────────────────────────────────────────────

def make_worker_node(name: str):
    """Constrói o nó LangGraph para um worker registrado.
    Tudo (LLM, tools, prompt, max_cycles, ReAct vs direct) vem do WorkerSpec."""
    def _node(estado: Estado) -> dict:
        spec = WORKERS[name]
        llm = _get_llm(name)
        tools = get_tools_for(name)
        system = _CDH_PREAMBLE + spec.system_prompt

        if not spec.use_react:
            # Modo direto (escritor): sem ferramentas, sem loop
            result = llm.invoke([SystemMessage(content=system)] + list(estado["messages"]))
            msg = AIMessage(
                content=result.content,
                name=name,
                usage_metadata=_safe_usage(result),
            )
            return {"messages": [msg], "ciclos_react": 0}

        new_msgs, ciclos = _run_react(
            llm, tools, system, estado["messages"],
            max_cycles=spec.max_cycles, agent_name=name,
        )
        return {"messages": new_msgs, "ciclos_react": ciclos}

    _node.__name__ = f"no_{name}"
    return _node


# ── Specs e registro (executado no import) ────────────────────────────────

register_worker(WorkerSpec(
    name="pesquisador_web",
    description="busca fatos, documentação, notícias, dados externos. NÃO USE para código ou cálculos puros.",
    tools=[busca_web],
    keywords_fallback=[
        "busque", "pesquise", "procure", "encontre informacoes", "buscar", "pesquisar",
        "noticias", "documentacao", "referencias", "artigos recentes", "artigos sobre",
        "papers sobre", "o que e", "como funciona", "site oficial", "fonte confiavel",
    ],
    default_model="llama3.1:8b",
    max_cycles=5,
    system_prompt=(
        "Você é um Agente Pesquisador Web especialista. "
        "Use busca_web para encontrar informações precisas e atualizadas. "
        "Se a primeira busca for insuficiente, refine os termos e busque novamente (máx. 2 buscas). "
        "Sintetize as fontes em uma resposta coesa — cite URLs quando disponíveis. "
        "Priorize fontes primárias (documentação oficial, artigos, sites de referência). "
        "Responda em português, preservando termos técnicos em inglês quando necessário."
    ),
))

register_worker(WorkerSpec(
    name="analista",
    description="cálculos matemáticos, estatísticas, conversões numéricas. NÃO USE para pesquisa ou redação.",
    tools=[calcular],
    keywords_fallback=[
        "calcule", "calcular", "calculo", "calculos", "calcula", "calculei",
        "quanto e", "quanto vale", "quanto sera", "matematica", "resultado de",
        "potencia", "juros", "porcentagem", "area", "perimetro", "raiz quadrada",
        "logaritmo", "derivada", "integral", "estatistica", "media", "mediana",
        "desvio", "probabilidade", "conversao", "soma", "subtrai", "multiplica", "divide",
    ],
    default_model="qwen2.5:7b",
    max_cycles=3,
    system_prompt=(
        "Você é um Agente Analista especialista em cálculos e análise numérica. "
        "Use calcular para avaliar expressões matemáticas — nunca faça aritmética mental. "
        "Funções disponíveis: sqrt, log, log10, sin, cos, tan, ceil, floor, exp, pi, e. "
        "Mostre cada etapa: dados de entrada → transformação → resultado com unidade. "
        "Se houver ambiguidade nos dados, adote a interpretação mais comum e explicite o pressuposto. "
        "Responda em português."
    ),
))

register_worker(WorkerSpec(
    name="escritor",
    description="emails, artigos, resumos, textos narrativos. NÃO USE para código ou cálculos.",
    tools=[],
    use_react=False,
    keywords_fallback=[
        "escreva", "redija", "email", "texto narrativo", "resumo", "carta", "poema",
        "redacao", "plano de estudos", "roteiro", "narrativa", "paragrafo",
        "relatorio escrito", "descricao detalhada",
    ],
    default_model="llama3.1:8b",
    max_cycles=0,
    system_prompt=(
        "Você é um Escritor Profissional especialista em comunicação escrita. "
        "Produza conteúdo bem estruturado: introdução, desenvolvimento e conclusão quando aplicável. "
        "Adapte tom e formato ao contexto: formal para emails corporativos, narrativo para artigos, direto para resumos. "
        "Não repita a instrução recebida — vá direto ao conteúdo. "
        "Responda em português."
    ),
))

register_worker(WorkerSpec(
    name="backend",
    description="APIs REST, banco de dados, scripts server-side (Python/Node/SQL). NÃO USE para interfaces visuais.",
    tools=[executar_codigo],
    keywords_fallback=[
        "backend", "back-end", "api", "endpoint", "banco de dados", "database",
        "servidor", "fastapi", "flask", "django", "node", "express", "rest",
        "sql", "mongodb", "postgresql", "sqlite", "orm", "crud",
        "autenticacao", "middleware", "microservico",
        # códigos genéricos (caem aqui depois de testes/frontend)
        "python", "script", "funcao", "funcoes", "algoritmo", "codigo", "programa",
        "debug", "implementa", "classe", "metodo", "funcionalidade",
        "modulo", "biblioteca", "package", "import", "def", "class",
    ],
    default_model="qwen2.5-coder:7b",
    max_cycles=8,
    system_prompt=(
        "Você é um Agente de Desenvolvimento Backend especialista. "
        "Implemente APIs REST, lógica de negócio, acesso a banco de dados e serviços server-side. "
        "Use executar_codigo para validar o código antes de entregar. Se houver erro, corrija e teste novamente. "
        "Prefira Python (FastAPI/Flask) salvo especificação contrária. "
        "Entregue o código final completo com instruções de uso."
    ),
))

register_worker(WorkerSpec(
    name="frontend",
    description="HTML/CSS/JS/React, componentes UI, prototipação visual. NÃO USE para lógica de negócio pura.",
    tools=[executar_codigo],
    keywords_fallback=[
        "frontend", "front-end", "html", "css", "react", "componente", "interface",
        "ui", "ux", "pagina web", "website", "design web", "vue", "angular",
        "svelte", "tailwind", "bootstrap",
    ],
    default_model="qwen2.5-coder:7b",
    max_cycles=8,
    system_prompt=(
        "Você é um Agente de Desenvolvimento Frontend especialista. "
        "Crie interfaces, componentes e interações client-side com HTML, CSS e JavaScript/TypeScript. "
        "Use React quando não houver especificação de framework. "
        "Use executar_codigo para validar a lógica do componente com Python equivalente quando a estrutura permitir. "
        "Entregue o código completo com estrutura de arquivos clara."
    ),
))

register_worker(WorkerSpec(
    name="testes",
    description="testes automatizados (pytest/jest), TDD, cobertura. NÃO USE para produzir o código funcional em si.",
    tools=[executar_codigo],
    keywords_fallback=[
        "teste", "testes", "pytest", "unittest", "jest", "tdd", "cobertura",
        "mock", "assert", "coverage", "spec", "test_", "test",
    ],
    default_model="qwen2.5-coder:7b",
    max_cycles=8,
    system_prompt=(
        "Você é um Agente de Testes especialista. "
        "Escreva testes automatizados claros cobrindo casos limite (edge cases). "
        "Use pytest para Python, Jest para JavaScript salvo especificação contrária. "
        "Use executar_codigo para rodar os testes e confirmar que passam. "
        "Se um teste falhar, analise a causa, corrija ou sinalize o bug no código principal. "
        "Entregue os testes completos com relatório de cobertura dos cenários."
    ),
))


# ── Exports backward-compat (benchmark_v2.py e código antigo) ─────────────
# Mantêm a API anterior (`no_pesquisador`, `no_analista`, ...) mas delegam ao
# factory para zero duplicação de lógica.

no_pesquisador = make_worker_node("pesquisador_web")
no_analista    = make_worker_node("analista")
no_escritor    = make_worker_node("escritor")
no_backend     = make_worker_node("backend")
no_frontend    = make_worker_node("frontend")
no_testes      = make_worker_node("testes")


# Mantém o dict legado para imports externos (api.py, benchmark_v2.py)
_WORKER_MODEL_DEFAULTS: dict[str, str] = {
    name: spec.default_model for name, spec in WORKERS.items()
}
