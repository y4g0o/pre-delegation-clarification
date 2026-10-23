#!/usr/bin/env python3
"""
Benchmark VI — nova tentativa, com o código corrigido, de esclarecer as dúvidas do Benchmark II.

NÃO substitui nenhum resultado anterior: grava em arquivos próprios (benchmark_vi_*.json)
e reutiliza run_once() de benchmark_v2.py sem alterá-lo.

O que muda em relação ao Benchmark II:
  - código com as correções de medição U1 (captura da melhor resposta de Worker) e
    U2 (síntese final quando o ReAct esgota os ciclos), aplicadas igualmente a todas as condições;
  - resposta do Worker gravada (até 3000 caracteres), permitindo corrigir o acerto;
  - tipo_ambiguidade e confianca do Supervisor gravados (permite a PDC seletiva real);
  - repetições independentes (--repeticoes), para medir a variabilidade entre execuções;
  - condição nova 'agente_unico': um único agente ReAct com todas as ferramentas,
    sem Supervisor (responde à objeção "precisa mesmo ser multiagente?").

As mudanças de prompt planejadas (U3, U4, U5) NÃO estão aqui: alterariam a própria PDC.

Uso:
  python3 benchmark_vi.py --modelo llama3.1:8b --tag llama31_8b --repeticoes 3
  python3 benchmark_vi.py --modelo qwen3:8b --tag qwen3_8b --repeticoes 1 --modos baseline,cot,cdh
  python3 benchmark_vi.py --teste            # 1 tarefa, todas as condições, não grava

Retomada: rodar o mesmo comando de novo continua de onde parou (pula pares já gravados).
"""

import argparse
import datetime as dt
import json
import os
import subprocess
import sys
import time

MODOS_VALIDOS = ("baseline", "cot", "cdh", "agente_unico")


def _args():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--modelo", default="llama3.1:8b", help="modelo Ollama para Supervisor e Workers")
    p.add_argument("--tag", default="llama31_8b", help="sufixo dos arquivos de saída")
    p.add_argument("--repeticoes", type=int, default=3)
    p.add_argument("--modos", default="baseline,cot,cdh,agente_unico")
    p.add_argument("--tarefas", default="tasks_v2.json")
    p.add_argument("--timeout", type=int, default=7200, help="segundos por execução (padrão: regime --no-timeout)")
    p.add_argument("--teste", action="store_true", help="1 tarefa, não grava arquivo")
    return p.parse_args()


A = _args()
# Modelos precisam estar no ambiente ANTES de importar src/ e benchmark_v2
os.environ["SUPERVISOR_MODEL"] = A.modelo
os.environ["WORKER_MODEL"] = A.modelo

import benchmark_v2 as b2  # noqa: E402
from langchain_core.messages import AIMessage, HumanMessage  # noqa: E402
from langchain_ollama import ChatOllama  # noqa: E402
from src.registry import WORKERS, get_tools_for  # noqa: E402
from src.workers import _run_react  # noqa: E402

b2.TASK_TIMEOUT = A.timeout

_SISTEMA_AGENTE_UNICO = (
    "Você é um assistente que resolve sozinho a tarefa do usuário. Use as ferramentas "
    "disponíveis quando forem úteis (busca na web, calculadora, execução de código) e, "
    "ao final, responda em português com a resposta completa."
)


def _ferramentas_todas() -> list:
    vistas, out = set(), []
    for nome in WORKERS:
        for t in get_tools_for(nome):
            if t.name not in vistas:
                vistas.add(t.name)
                out.append(t)
    return out


def run_agente_unico(task_text: str, max_ciclos: int = 8) -> dict:
    """Um agente ReAct, sem Supervisor nem delegação, com todas as ferramentas do registry."""
    from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout

    llm = ChatOllama(model=A.modelo, temperature=0)
    t0 = time.perf_counter()
    erro, msgs, ciclos = None, [], 0
    ex = ThreadPoolExecutor(max_workers=1)
    fut = ex.submit(_run_react, llm, _ferramentas_todas(), _SISTEMA_AGENTE_UNICO,
                    [HumanMessage(content=task_text)], max_ciclos, "agente_unico")
    try:
        msgs, ciclos = fut.result(timeout=A.timeout)
    except FuturesTimeout:
        erro = f"timeout (>{A.timeout}s)"
        b2._ollama_unload()
    except Exception as e:  # noqa: BLE001
        erro = str(e)
    finally:
        ex.shutdown(wait=False)
    latencia = round(time.perf_counter() - t0, 2)

    resposta = b2._get_worker_response(msgs) if msgs else ""
    tokens = b2._count_tokens(msgs) if msgs else 0
    terminou = erro is None and bool(resposta.strip())
    return {
        "modo": "agente_unico", "terminou": terminou, "qualidade": None, "sucesso": terminou,
        "erro": erro, "latencia_s": latencia, "tokens_total": tokens, "tokens_supervisor": 0,
        "tokens_grand_total": tokens, "ciclos_react": ciclos,
        "proximo_final": "FINALIZAR" if terminou else "ERRO", "resposta": resposta,
        "instrucao_cdh": "", "workers_escolhidos": [], "tipo_ambiguidade": "", "confianca": 0,
        "fallback_usado": False, "models": {"agente_unico": A.modelo},
    }


def _commit() -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], text=True).strip()
    except Exception:  # noqa: BLE001
        return "?"


def main():
    modos = [m.strip() for m in A.modos.split(",") if m.strip()]
    invalidos = [m for m in modos if m not in MODOS_VALIDOS]
    if invalidos:
        sys.exit(f"Modos inválidos: {invalidos}. Válidos: {MODOS_VALIDOS}")

    tarefas = json.load(open(A.tarefas))
    if A.teste:
        tarefas = tarefas[:1]
    reps = 1 if A.teste else A.repeticoes
    commit = _commit()

    for rep in range(1, reps + 1):
        arquivo = f"benchmark_vi_{A.tag}_rep{rep}_results.json"
        feitos = json.load(open(arquivo)) if (os.path.exists(arquivo) and not A.teste) else []
        chaves = {(r["id"], r["modo"]) for r in feitos}
        pendentes = [(t, m) for t in tarefas for m in modos if (t["id"], m) not in chaves]
        print(f"\n=== Benchmark VI | modelo {A.modelo} | repetição {rep}/{reps} | "
              f"{len(chaves)} feitas, {len(pendentes)} pendentes | saída: {arquivo}")

        resultados = list(feitos)
        for i, (t, modo) in enumerate(pendentes, 1):
            print(f"[{i:4d}/{len(pendentes)}] {t['id']:10s} | {modo:12s} | {t['amb']:5s} | ", end="", flush=True)
            r = run_agente_unico(t["task"]) if modo == "agente_unico" else b2.run_once(t["task"], modo)
            r["terminou_nao_vazia"] = bool(r["sucesso"]) and bool((r.get("resposta") or "").strip())
            print(f"{'✓' if r['terminou_nao_vazia'] else '✗'} {r['latencia_s']:6.1f}s | {r['tokens_grand_total']:6d} tok")
            resultados.append({**t, **r, "repeticao": rep, "benchmark": "VI", "commit": commit,
                               "registrado_em": dt.datetime.now().isoformat(timespec="seconds")})
            if not A.teste:
                with open(arquivo, "w") as f:
                    json.dump(resultados, f, ensure_ascii=False, indent=2)

        for modo in modos:
            sub = [r for r in resultados if r["modo"] == modo]
            if sub:
                ok = sum(r["terminou_nao_vazia"] for r in sub)
                print(f"  {modo:12s}: terminou (resposta não vazia) {ok}/{len(sub)}")


if __name__ == "__main__":
    main()
