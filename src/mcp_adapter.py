"""
Adaptador MCP (Model Context Protocol) — stub modular.

MCP é o protocolo da Anthropic para servidores expor ferramentas via stdio/SSE.
Permite que workers do CDH descubram dinamicamente ferramentas de servidores
externos (filesystem, github, slack, postgres, etc.) sem hardcoding.

Integração no CDH:
    # Em src/workers.py, ao registrar um worker:
    register_worker(WorkerSpec(
        name="backend",
        ...
        extra_tools_provider=lambda: load_mcp_tools_for("backend"),
    ))

Configuração via env var:
    MCP_SERVERS_BACKEND="filesystem:stdio:npx @modelcontextprotocol/server-filesystem /tmp;github:sse:http://localhost:3000"

Estado: STUB — requer instalação de `mcp` (pip install mcp) e validação
empírica antes de produção. A interface está definida; a implementação é
deixada como trabalho futuro (cf. paper, Seção Conclusão).
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class McpServerConfig:
    name: str            # ID local (ex: "filesystem")
    transport: str       # "stdio" | "sse"
    endpoint: str        # comando para stdio ou URL para SSE
    allowed_tools: tuple[str, ...] | None = None  # whitelist; None = todas


def parse_mcp_env(env_var: str) -> list[McpServerConfig]:
    """Parseia MCP_SERVERS_<WORKER>='name:transport:endpoint;name2:...'."""
    raw = os.getenv(env_var, "").strip()
    if not raw:
        return []
    servers: list[McpServerConfig] = []
    for entry in raw.split(";"):
        entry = entry.strip()
        if not entry:
            continue
        parts = entry.split(":", 2)
        if len(parts) != 3:
            continue
        name, transport, endpoint = parts
        servers.append(McpServerConfig(
            name=name.strip(),
            transport=transport.strip(),
            endpoint=endpoint.strip(),
        ))
    return servers


@lru_cache(maxsize=64)
def _connect_and_list(server_cfg: McpServerConfig) -> list:
    """Conecta a um servidor MCP e retorna a lista de tools como LangChain BaseTool.

    STUB: requer `pip install mcp` + cliente real. Retorna lista vazia até
    a implementação ser ativada. Falhas são silenciosas para não derrubar
    workers (degradação graceful).
    """
    # TODO: implementar quando MCP for prioridade
    # from mcp import ClientSession  # cliente Python oficial
    # from langchain_core.tools import StructuredTool
    # ...
    # Para o paper: a interface está pronta; ativação fica como trabalho futuro.
    return []


def load_mcp_tools_for(worker_name: str) -> list:
    """Retorna lista de tools MCP para um worker, lendo env MCP_SERVERS_<NAME>."""
    env_key = "MCP_SERVERS_" + worker_name.upper().replace("-", "_")
    servers = parse_mcp_env(env_key)
    tools: list = []
    for server in servers:
        try:
            tools.extend(_connect_and_list(server))
        except Exception:
            # Falha de conexão não derruba o worker
            continue
    return tools


__all__ = ["McpServerConfig", "parse_mcp_env", "load_mcp_tools_for"]
