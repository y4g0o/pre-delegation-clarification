"""
Supervisor CDH — 3 modos (CDH, CoT-Baseline, Baseline).

Refatorado para consultar WorkerRegistry: a lista de workers nos schemas
Pydantic, no bloco WORKERS DISPONÍVEIS dos prompts e no _fallback_worker
agora vem de src/registry.py — fonte única de verdade.

Guards A e B INVARIANTES — operam sobre os sentinelas FINALIZAR/CLARIFICAR
que NÃO são workers (não estão no registry).
"""
from __future__ import annotations

import os
import re
import typing
import unicodedata
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import AIMessage
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.outputs import LLMResult
from pydantic import BaseModel, Field, ValidationError

from .estado import Estado
# Importar workers ANTES de construir os schemas Pydantic — register_worker()
# precisa rodar antes de tuplas/Literals serem construídos.
from . import workers as _workers  # noqa: F401 — side effect: registra workers
from .registry import WORKERS, routing_targets, describe_workers_for_prompt, SENTINELS


# ── Literal dinâmico construído do registry ────────────────────────────────
# Permite que adicionar/remover workers em src/workers.py atualize automaticamente
# o schema Pydantic. CDH inclui CLARIFICAR; Baseline/CoT só FINALIZAR.

def _make_literal(extra_sentinels: tuple[str, ...]) -> typing.Any:
    """Constrói um typing.Literal com workers do registry + sentinelas dadas.
    Subscripting com tupla é válido em Python 3.10+ (sem precisar de PEP 646)."""
    valores = tuple(WORKERS.keys()) + extra_sentinels
    return typing.Literal[valores]  # type: ignore[valid-type]


_LITERAL_CDH = _make_literal(("CLARIFICAR", "FINALIZAR"))
_LITERAL_BASE = _make_literal(("FINALIZAR",))


# ── Util ───────────────────────────────────────────────────────────────────

def _normalize(text: str) -> str:
    """Remove acentos e converte para minúsculas para matching robusto."""
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii").lower()


def _any_match(text: str, keywords: list[str]) -> bool:
    """Match com word-boundary; evita 'orm' em 'formal', 'rest' em 'floresta'."""
    for kw in keywords:
        pattern = r"\b" + re.escape(kw.strip()) + r"\b"
        if re.search(pattern, text):
            return True
    return False


class _TokenCounter(BaseCallbackHandler):
    """Acumula total_tokens via callback on_llm_end."""
    def __init__(self):
        self.total = 0

    def on_llm_end(self, response: LLMResult, **kwargs) -> None:
        for gen_list in response.generations:
            for gen in gen_list:
                msg = getattr(gen, "message", None)
                if msg and getattr(msg, "usage_metadata", None):
                    self.total += msg.usage_metadata.get("total_tokens", 0)


def _get_supervisor_llm():
    return ChatOllama(model=os.getenv("SUPERVISOR_MODEL", "llama3.1:8b"), temperature=0)


# ── Schemas Pydantic (proximo é Literal dinâmico do registry) ──────────────

class _RoteramentoCDH(BaseModel):
    proximo: _LITERAL_CDH = Field(  # type: ignore[valid-type]
        description="Próximo agente, CLARIFICAR se faltar info essencial, ou FINALIZAR."
    )
    instrucao: str = Field(
        description="Instrução técnica e desambiguada para o Worker. Se CLARIFICAR, escreva aqui a pergunta ao usuário."
    )
    justificativa: str = Field(description="Breve justificativa da decisão.")
    complexidade: int = Field(
        default=5,
        description="Score 1–10: complexidade da tarefa (1=trivial, 10=multi-domínio extremo)."
    )
    tipo_ambiguidade: typing.Literal["nenhuma", "sintatica", "semantica", "contextual", "multi_dominio"] = Field(
        default="nenhuma",
        description="Tipo principal de ambiguidade identificada."
    )
    confianca: int = Field(
        default=80,
        description="Confiança na decisão de roteamento: 0–100 (100 = certeza absoluta)."
    )


class _RoteramentoBase(BaseModel):
    proximo: _LITERAL_BASE = Field(  # type: ignore[valid-type]
        description="Agente para executar a tarefa, ou FINALIZAR se já concluída."
    )


class _RoteramentoCOT(BaseModel):
    proximo: _LITERAL_BASE = Field(  # type: ignore[valid-type]
        description="Agente para executar a tarefa, ou FINALIZAR se já concluída."
    )
    instrucao: str = Field(
        description="Instrução reformulada para o Worker após reflexão sobre possíveis ambiguidades."
    )


# ── Prompts (bloco de workers construído do registry) ─────────────────────

def _build_cdh_prompt() -> ChatPromptTemplate:
    workers_block = describe_workers_for_prompt()
    system = (
        "Você é o Supervisor CDH (Ciclo de Desambiguação Hierárquica).\n"
        "Recebe objetivos possivelmente ambíguos e os transforma em instruções precisas para Workers.\n\n"
        "WORKERS DISPONÍVEIS:\n"
        f"{workers_block}\n\n"
        "CICLO DE DESAMBIGUAÇÃO:\n"
        "1. IDENTIFIQUE a ambiguidade: sintática (palavra com duplo sentido), semântica (domínio incerto), "
        "contextual (falta de contexto que muda o resultado), multi_domínio (requer 2+ workers), ou nenhuma.\n"
        "2. RESOLVA: qual domínio principal completa o objetivo? Se multi_domínio, qual vem PRIMEIRO?\n"
        "3. INSTRUÇÃO: específica, mensurável, com critério de conclusão claro. Inclua parâmetros concretos quando inferíveis.\n"
        "4. COMPLEXIDADE: 1–3 tarefa direta (1 worker suficiente); 4–6 análise prévia recomendada; "
        "7–10 múltiplos domínios, sequência obrigatória.\n\n"
        "REGRAS:\n"
        "1. REGRA CRÍTICA: sem resposta de Worker no histórico → NUNCA use FINALIZAR. Delegue sempre.\n"
        "2. complexidade >= 7 e nenhum Worker respondeu → delegue ao pesquisador_web antes de outros workers.\n"
        "3. CLARIFICAR somente se a informação ausente for impossível de inferir e bloquear completamente a execução.\n"
        "4. FINALIZAR somente após Worker responder E o objetivo estiver completamente cumprido."
    )
    return ChatPromptTemplate.from_messages([
        ("system", system),
        MessagesPlaceholder(variable_name="messages"),
    ])


def _build_simple_prompt(intro: str) -> ChatPromptTemplate:
    workers_block = describe_workers_for_prompt()
    system = (
        f"{intro}\n\n"
        f"Agentes disponíveis:\n{workers_block}\n"
        "- FINALIZAR: se a tarefa já foi concluída\n\n"
        "Responda apenas com o campo 'proximo' (e 'instrucao' quando aplicável)."
    )
    return ChatPromptTemplate.from_messages([
        ("system", system),
        MessagesPlaceholder(variable_name="messages"),
    ])


_CDH_PROMPT = _build_cdh_prompt()
_BASE_PROMPT = _build_simple_prompt("Você é um roteador de tarefas. Escolha o agente correto.")
_COT_PROMPT = _build_simple_prompt(
    "Você é um roteador de tarefas com capacidade de reflexão. "
    "Antes de rotear, pense brevemente: o que pode ser ambíguo ou vago nesta tarefa? "
    "Então formule uma instrução clara e direta para o Worker escolhido."
)


# ── Fallback heurístico (consulta registry para keywords) ─────────────────

def _worker_responded(msgs) -> bool:
    return any(isinstance(m, AIMessage) and m.name not in (None, "Supervisor") for m in msgs)


# Ordem de prioridade intencional: workers mais específicos primeiro. Filtrada
# contra o registry em runtime — workers removidos são silenciosamente ignorados.
# Workers no registry mas fora desta lista entram ao final (ordem de registro).
_FALLBACK_PRIORITY_INTENT = ("testes", "frontend", "backend", "analista", "pesquisador_web", "escritor")


def _fallback_priority() -> list[str]:
    """Resolve prioridade contra o registry vigente. Inclui workers extras
    no final na ordem de registro."""
    in_intent = [w for w in _FALLBACK_PRIORITY_INTENT if w in WORKERS]
    extras = [w for w in WORKERS.keys() if w not in _FALLBACK_PRIORITY_INTENT]
    return in_intent + extras


def _fallback_worker(instrucao: str, human_text: str = "") -> str:
    """Infere worker por keywords quando o modelo retorna FINALIZAR/CLARIFICAR prematuramente.
    Consulta WorkerSpec.keywords_fallback do registry — fonte única de verdade."""
    text = _normalize(instrucao + " " + human_text)
    for worker_name in _fallback_priority():
        spec = WORKERS[worker_name]
        if _any_match(text, spec.keywords_fallback):
            return worker_name
    return "pesquisador_web" if "pesquisador_web" in WORKERS else next(iter(WORKERS))


# ── Nó do grafo ───────────────────────────────────────────────────────────

def no_supervisor(estado: Estado) -> dict:
    llm = _get_supervisor_llm()
    msgs = estado["messages"]
    counter = _TokenCounter()
    config = {"callbacks": [counter]}

    human_text = next((m.content for m in msgs if m.type == "human"), msgs[0].content if msgs else "")

    if os.getenv("MODO_BASELINE") == "true":
        try:
            resultado = (_BASE_PROMPT | llm.with_structured_output(_RoteramentoBase)).invoke(
                {"messages": msgs}, config=config
            )
        except (ValidationError, Exception):
            resultado = _RoteramentoBase(proximo=_fallback_worker("", human_text))
        diretiva = AIMessage(
            content=f"Delegando para {resultado.proximo}. Tarefa: {human_text}",
            name="Supervisor",
        )
        return {"proximo": resultado.proximo, "messages": [diretiva], "tokens_supervisor": counter.total}

    if os.getenv("MODO_COT") == "true":
        try:
            resultado = (_COT_PROMPT | llm.with_structured_output(_RoteramentoCOT)).invoke(
                {"messages": msgs}, config=config
            )
        except (ValidationError, Exception):
            resultado = _RoteramentoCOT(proximo=_fallback_worker("", human_text), instrucao=human_text)
        worker_already_responded = _worker_responded(msgs)
        if resultado.proximo == "FINALIZAR" and not worker_already_responded:
            resultado.proximo = _fallback_worker(resultado.instrucao, human_text)
        diretiva = AIMessage(
            content=f"Delegando para {resultado.proximo}. [CoT] Instrução: {resultado.instrucao}",
            name="Supervisor",
        )
        return {"proximo": resultado.proximo, "messages": [diretiva], "tokens_supervisor": counter.total}

    # ── CDH ───
    try:
        resultado = (_CDH_PROMPT | llm.with_structured_output(_RoteramentoCDH)).invoke(
            {"messages": msgs}, config=config
        )
    except (ValidationError, Exception):
        resultado = _RoteramentoCDH(
            proximo=_fallback_worker("", human_text),
            instrucao=human_text,
            justificativa="structured output failed — fallback",
            tipo_ambiguidade="nenhuma",
            confianca=0,
        )
    worker_already_responded = _worker_responded(msgs)

    # Guard A: prevent FINALIZAR/CLARIFICAR before any worker has responded
    fallback_acionado = False
    if resultado.proximo in SENTINELS and not worker_already_responded:
        resultado.proximo = _fallback_worker(resultado.instrucao, human_text)
        if not resultado.instrucao.strip():
            resultado.instrucao = human_text
        fallback_acionado = True
        # Invariante: fallback deve retornar worker válido do registry.
        if resultado.proximo not in WORKERS:
            raise RuntimeError(
                f"Guard A fallback returned invalid worker '{resultado.proximo}'. "
                f"Registry keys: {list(WORKERS.keys())}"
            )

    # Guard B: prevent CLARIFICAR after worker already responded
    elif resultado.proximo == "CLARIFICAR" and worker_already_responded:
        resultado.proximo = "FINALIZAR"

    prefixo = "Solicitando esclarecimento" if resultado.proximo == "CLARIFICAR" else f"Delegando para {resultado.proximo}"
    fallback_tag = " [FALLBACK]" if fallback_acionado else ""
    diretiva = AIMessage(
        content=(
            f"{prefixo}.{fallback_tag} [Complexidade: {resultado.complexidade}/10]"
            f" [Amb: {resultado.tipo_ambiguidade}] [Confiança: {resultado.confianca}%]"
            f" Instrução: {resultado.instrucao}"
        ),
        name="Supervisor",
    )
    workers_novos = [resultado.proximo] if resultado.proximo not in SENTINELS else []
    return {
        "proximo": resultado.proximo,
        "messages": [diretiva],
        "tokens_supervisor": counter.total,
        "workers_escolhidos": workers_novos,
        "tipo_ambiguidade": resultado.tipo_ambiguidade,
        "confianca": resultado.confianca,
        "complexidade": resultado.complexidade,
        "fallback_count": 1 if fallback_acionado else 0,
    }
