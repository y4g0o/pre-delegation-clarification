"""
Construção do grafo LangGraph CDH.

O grafo é construído dinamicamente a partir do WorkerRegistry: todos os workers
registrados em src/workers.py viram nós do grafo. Adicionar/remover workers não
exige editar este arquivo.

Topologia (invariante):
  START → supervisor → (cond) → {worker_i | END}
  worker_i → supervisor   (auto-correção via ciclo)
"""
from __future__ import annotations

from langgraph.graph import StateGraph, START, END
from .estado import Estado
from .supervisor import no_supervisor
from .registry import WORKERS, worker_names

# Importar workers garante que register_worker() popule o registry antes de
# construir_grafo() ler WORKERS. Esse import precisa permanecer aqui.
from . import workers as _workers  # noqa: F401 — side effect: registra workers
from .workers import make_worker_node


def _roteador(estado: Estado) -> str:
    proximo = estado["proximo"]
    if proximo in ("FINALIZAR", "CLARIFICAR"):
        return END
    if proximo in WORKERS:
        return proximo
    # Roteamento inválido (não esperado após Guard A) — encerra gracefully
    return END


def construir_grafo():
    grafo = StateGraph(Estado)

    grafo.add_node("supervisor", no_supervisor)
    for name in worker_names():
        grafo.add_node(name, make_worker_node(name))

    grafo.add_edge(START, "supervisor")
    grafo.add_conditional_edges("supervisor", _roteador)

    for name in worker_names():
        grafo.add_edge(name, "supervisor")

    return grafo.compile()
