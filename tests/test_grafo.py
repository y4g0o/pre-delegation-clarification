"""Testes unitários do grafo de estados."""
from unittest.mock import MagicMock, patch
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.graph import END
from src.grafo import _roteador
from src.estado import Estado


# ---------------------------------------------------------------------------
# Testes do roteador (lógica pura, sem I/O)
# ---------------------------------------------------------------------------

def test_roteador_para_pesquisador():
    estado: Estado = {"messages": [HumanMessage(content="buscar algo")], "proximo": "pesquisador_web", "ciclos_react": 0}
    assert _roteador(estado) == "pesquisador_web"


def test_roteador_para_analista():
    estado: Estado = {"messages": [HumanMessage(content="analisar dados")], "proximo": "analista", "ciclos_react": 0}
    assert _roteador(estado) == "analista"


def test_roteador_finalizar():
    estado: Estado = {"messages": [HumanMessage(content="pronto")], "proximo": "FINALIZAR", "ciclos_react": 0}
    assert _roteador(estado) == END


def test_roteador_clarificar():
    estado: Estado = {"messages": [HumanMessage(content="algo vago")], "proximo": "CLARIFICAR", "ciclos_react": 0}
    assert _roteador(estado) == END


# ---------------------------------------------------------------------------
# Teste de construção do grafo
# ---------------------------------------------------------------------------

def test_grafo_tem_nos_corretos():
    from src.grafo import construir_grafo
    app = construir_grafo()
    nos = set(app.get_graph().nodes.keys())
    assert "supervisor" in nos
    assert "pesquisador_web" in nos
    assert "analista" in nos


# ---------------------------------------------------------------------------
# Teste de integração com LLM mockado
# ---------------------------------------------------------------------------

def test_fluxo_completo_mockado():
    """Grafo termina em FINALIZAR quando supervisor retorna FINALIZAR após worker."""
    from src.grafo import construir_grafo

    chamadas = [
        # 1ª chamada: delega para escritor
        {"proximo": "escritor", "messages": [AIMessage(content="Delegando para escritor.", name="Supervisor")]},
        # 2ª chamada: finaliza após resposta do worker
        {"proximo": "FINALIZAR", "messages": [AIMessage(content="Concluído.", name="Supervisor")]},
    ]
    mock_sup = MagicMock(side_effect=chamadas)
    mock_worker = MagicMock(return_value={"messages": [AIMessage(content="Texto gerado.", name="escritor")], "ciclos_react": 0})

    with (
        patch("src.grafo.no_supervisor", mock_sup),
        patch("src.grafo.make_worker_node", lambda nome: mock_worker if nome == "escritor" else MagicMock()),
    ):
        app = construir_grafo()
        resultado = app.invoke({
            "messages": [HumanMessage(content="Escreva algo.")],
            "proximo": "",
            "ciclos_react": 0,
        })

    assert resultado["proximo"] == "FINALIZAR"
    assert mock_sup.call_count == 2


def test_fluxo_supervisor_delega_e_finaliza():
    """Supervisor delega para pesquisador_web e depois finaliza."""
    from src.grafo import construir_grafo

    chamadas = [
        {"proximo": "pesquisador_web", "messages": [AIMessage(content="Delegando para pesquisador_web.", name="Supervisor")]},
        {"proximo": "FINALIZAR", "messages": [AIMessage(content="Concluído.", name="Supervisor")]},
    ]
    mock_sup = MagicMock(side_effect=chamadas)
    mock_worker = MagicMock(return_value={"messages": [AIMessage(content="Resultado da busca.", name="pesquisador_web")], "ciclos_react": 0})

    with (
        patch("src.grafo.no_supervisor", mock_sup),
        patch("src.grafo.make_worker_node", lambda nome: mock_worker if nome == "pesquisador_web" else MagicMock()),
    ):
        app = construir_grafo()
        resultado = app.invoke({
            "messages": [HumanMessage(content="Pesquise sobre LangGraph.")],
            "proximo": "",
            "ciclos_react": 0,
        })

    assert resultado["proximo"] == "FINALIZAR"
    assert mock_sup.call_count == 2
