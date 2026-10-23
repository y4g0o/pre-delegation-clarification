"""Verifica U2: _run_react força síntese final quando o loop exhausta sem conteúdo textual."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.tools import tool
from src.workers import _run_react


@tool
def fake_tool(query: str = "") -> str:
    """Ferramenta fake que sempre retorna sucesso."""
    return "resultado-fake-ok"


class FakeLLM:
    """Imita o mínimo necessário: bind_tools(tools)→self, invoke(messages)→AIMessage."""
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = 0
    def bind_tools(self, tools):
        return self
    def invoke(self, messages):
        idx = min(self.calls, len(self.responses) - 1)
        content, tool_calls = self.responses[idx]
        self.calls += 1
        msg = AIMessage(content=content, tool_calls=tool_calls)
        # _safe_usage espera usage_metadata; manter ausente para usar default
        return msg


def test_recovery_fires_when_loop_exhausts_without_content():
    """Cenário: modelo sempre devolve content vazio + tool_call. Loop exhausta.
    Recovery deve adicionar uma AIMessage final substantiva."""
    # Tool succeeds (não dispara abort de 3 falhas consecutivas), mas modelo nunca emite resposta final
    tool_call_resp = ("", [{"name": "fake_tool", "args": {"query": "q"}, "id": "x1"}])
    synth_resp = ("RESPOSTA SINTETIZADA FINAL", [])  # usada na chamada de recovery
    # max_cycles=3 → 3 invokes no loop; 4ª invoke é o recovery → deve ser synth_resp
    fake = FakeLLM([tool_call_resp, tool_call_resp, tool_call_resp, synth_resp])
    msgs, ciclos = _run_react(
        llm=fake, tools=[fake_tool], system="sys", existing_messages=[HumanMessage(content="x")],
        max_cycles=3, agent_name="escritor",
    )
    # Pelo menos uma AIMessage de worker (não-Supervisor) com content substantivo deve existir
    substantive = [m for m in msgs
                   if isinstance(m, AIMessage)
                   and getattr(m, 'name', None) != 'Supervisor'
                   and (m.content or '').strip()]
    assert substantive, f"recovery não disparou; msgs: {[(type(m).__name__, (m.content or '')[:40]) for m in msgs]}"
    assert "RESPOSTA SINTETIZADA FINAL" in substantive[-1].content, \
        f"última substantiva veio errada: {substantive[-1].content!r}"


def test_recovery_does_not_fire_when_content_already_present():
    """Cenário: modelo dá content substantivo na 1ª chamada. Não chamar recovery."""
    good_resp = ("Resposta direta do escritor", [])
    extra_resp = ("EXTRA NÃO DEVE APARECER", [])
    fake = FakeLLM([good_resp, extra_resp])
    msgs, ciclos = _run_react(
        llm=fake, tools=[], system="sys", existing_messages=[HumanMessage(content="x")],
        max_cycles=3, agent_name="escritor",
    )
    # Apenas 1 invoke do LLM esperado (não dispara recovery)
    assert fake.calls == 1, f"esperava 1 chamada, fez {fake.calls}"
    assert "EXTRA NÃO DEVE APARECER" not in (msgs[-1].content or '')


def test_recovery_handles_llm_exception_gracefully():
    """Cenário: recovery falha (LLM raises). Não deve crashar _run_react."""
    class FailingLLM(FakeLLM):
        def invoke(self, messages):
            self.calls += 1
            if self.calls == 1:
                # 1ª chamada (no loop): tool_call sem conteúdo
                return AIMessage(content="", tool_calls=[{"name": "x", "args": {}, "id": "y"}])
            # 2ª (recovery): falha
            raise RuntimeError("LLM down")
    fake = FailingLLM([])
    # Não deve raise
    msgs, ciclos = _run_react(
        llm=fake, tools=[], system="sys", existing_messages=[HumanMessage(content="x")],
        max_cycles=1, agent_name="analista",
    )
    # Retorna o que existia (sem síntese), sem crash
    assert isinstance(msgs, list)


if __name__ == "__main__":
    test_recovery_fires_when_loop_exhausts_without_content()
    test_recovery_does_not_fire_when_content_already_present()
    test_recovery_handles_llm_exception_gracefully()
    print("U2 OK: 3/3 testes passaram")
