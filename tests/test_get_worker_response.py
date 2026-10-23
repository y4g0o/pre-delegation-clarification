"""Verifica que _get_worker_response captura o melhor worker, não o último (bug U1)."""
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir)))

from langchain_core.messages import HumanMessage, AIMessage
from benchmark_v2 import _get_worker_response


def test_returns_longest_non_empty_worker():
    messages = [
        HumanMessage(content="Escreva um email."),
        AIMessage(content="Delegando para escritor", name="Supervisor"),
        AIMessage(content="EMAIL_LONGO_" + "x" * 1200, name="escritor"),
        AIMessage(content="Delegando para pesquisador_web", name="Supervisor"),
        AIMessage(content="WEB_CURTO_" + "y" * 300, name="pesquisador_web"),
    ]
    result = _get_worker_response(messages)
    assert result.startswith("EMAIL_LONGO_"), f"esperado o email longo, veio: {result[:60]!r}"
    assert len(result) > 1000


def test_ignores_empty_workers():
    messages = [
        HumanMessage(content="x"),
        AIMessage(content="Resposta real", name="analista"),
        AIMessage(content="", name="pesquisador_web"),  # vazia, deve ser ignorada
    ]
    assert _get_worker_response(messages) == "Resposta real"


def test_ignores_supervisor_messages():
    messages = [
        HumanMessage(content="x"),
        AIMessage(content="A" * 5000, name="Supervisor"),  # supervisor mais longo, deve ignorar
        AIMessage(content="resposta worker", name="escritor"),
    ]
    assert _get_worker_response(messages) == "resposta worker"


def test_returns_empty_when_no_workers():
    messages = [
        HumanMessage(content="x"),
        AIMessage(content="só supervisor", name="Supervisor"),
    ]
    assert _get_worker_response(messages) == ""


def test_caps_at_3000_chars():
    messages = [AIMessage(content="A" * 5000, name="escritor")]
    assert len(_get_worker_response(messages)) == 3000


def test_tie_breaks_to_most_recent():
    messages = [
        AIMessage(content="A" * 100, name="escritor"),
        AIMessage(content="B" * 100, name="analista"),
    ]
    # mesma length → mais recente
    assert _get_worker_response(messages).startswith("B")


if __name__ == "__main__":
    test_returns_longest_non_empty_worker()
    test_ignores_empty_workers()
    test_ignores_supervisor_messages()
    test_returns_empty_when_no_workers()
    test_caps_at_3000_chars()
    test_tie_breaks_to_most_recent()
    print("U1 OK: 6/6 testes passaram")
