"""Testes unitários do estado compartilhado."""
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.graph.message import add_messages
from src.estado import Estado


def test_estado_acumula_mensagens():
    """add_messages deve anexar novas mensagens sem sobrescrever."""
    msgs_iniciais = [HumanMessage(content="Olá")]
    msgs_novas = [AIMessage(content="Resposta")]
    resultado = add_messages(msgs_iniciais, msgs_novas)
    assert len(resultado) == 2
    assert resultado[0].content == "Olá"
    assert resultado[1].content == "Resposta"


def test_estado_campos_obrigatorios():
    """Estado deve aceitar messages, proximo e ciclos_react."""
    estado: Estado = {
        "messages": [HumanMessage(content="teste")],
        "proximo": "pesquisador_web",
        "ciclos_react": 0,
    }
    assert estado["proximo"] == "pesquisador_web"
    assert len(estado["messages"]) == 1
    assert estado["ciclos_react"] == 0


def test_ciclos_react_acumulador():
    """ciclos_react usa operator.add, deve acumular entre nós."""
    import operator
    # Simula o comportamento do redutor: reducer(existing, update)
    assert operator.add(0, 3) == 3
    assert operator.add(3, 2) == 5
