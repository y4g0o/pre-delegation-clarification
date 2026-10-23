"""
WorkerRegistry — fonte única de verdade sobre quais workers existem no CDH.

Substitui as listas duplicadas em supervisor.py (_RoteramentoCDH Literal),
workers.py (_WORKER_MODEL_DEFAULTS), api.py (_VALID_WORKERS) e grafo.py
(adds_node manuais). Adicionar um worker novo agora exige apenas:

    register_worker(WorkerSpec(
        name="novo_worker",
        description="...",
        system_prompt="...",
        tools=[...],
        keywords_fallback=[...],
        default_model="...",
    ))

Guards A e B continuam invariantes — operam sobre os sentinelas
FINALIZAR/CLARIFICAR que NÃO são workers e ficam definidos no Supervisor.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Any


@dataclass
class WorkerSpec:
    name: str                            # ID canônico (ex: "pesquisador_web")
    description: str                     # Descrição usada em prompts (CDH/CoT/Baseline)
    system_prompt: str                   # Prompt completo do worker (sem _CDH_PREAMBLE)
    tools: list                          # Lista de LangChain BaseTool (busca_web, calcular, etc.)
    keywords_fallback: list[str]         # Termos disparadores em _fallback_worker (já normalizados)
    default_model: str = "llama3.1:8b"   # Modelo padrão (overridable via env var <NAME_UPPER>_MODEL)
    max_cycles: int = 8                  # Limite do loop ReAct (escritor=0 → invoke direto)
    use_react: bool = True               # False = invoke direto sem ferramentas (escritor)
    # Função opcional que retorna lista de tools dinâmicas (MCP server discovery, etc.)
    extra_tools_provider: Callable[[], list] | None = None


# Registry global — populado por register_worker() em src/workers.py no import time
WORKERS: dict[str, WorkerSpec] = {}

# Sentinelas do Supervisor (NÃO são workers; nunca vão pro registry)
SENTINELS = ("FINALIZAR", "CLARIFICAR")


def register_worker(spec: WorkerSpec) -> WorkerSpec:
    """Registra um worker. Idempotente: re-registrar substitui (útil em reload)."""
    if spec.name in SENTINELS:
        raise ValueError(f"Nome reservado: {spec.name}")
    WORKERS[spec.name] = spec
    return spec


def worker_names() -> list[str]:
    """Nomes de todos os workers registrados, em ordem de registro."""
    return list(WORKERS.keys())


def routing_targets() -> list[str]:
    """Alvos válidos de roteamento: workers + sentinelas."""
    return worker_names() + list(SENTINELS)


def describe_workers_for_prompt() -> str:
    """Bloco 'WORKERS DISPONÍVEIS' construído dinamicamente para os 3 prompts."""
    lines = []
    for spec in WORKERS.values():
        lines.append(f"- {spec.name}: {spec.description}")
    return "\n".join(lines)


def get_tools_for(worker_name: str) -> list:
    """Tools fixas + tools dinâmicas (MCP, etc.) para um worker."""
    spec = WORKERS.get(worker_name)
    if not spec:
        return []
    base = list(spec.tools)
    if spec.extra_tools_provider is not None:
        try:
            base.extend(spec.extra_tools_provider())
        except Exception:
            pass  # falha em provider externo não derruba o worker
    return base
