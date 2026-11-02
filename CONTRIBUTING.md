# Contributing · Como contribuir

🇺🇸 [English](#english) · 🇧🇷 [Português](#português)

---

## English

Thanks for your interest! This is a research repository, so besides code quality there is one extra
rule: **results must stay traceable**. Read the "Research rules" below before opening a PR.

### Setup

```bash
git clone https://github.com/y4g0o/pre-delegation-clarification.git
cd pre-delegation-clarification
python3 -m venv .venv && source .venv/bin/activate     # Python 3.12
pip install -r requirements.txt
pip install scipy                  # needed by the analysis scripts
pip install -r requirements_api.txt   # only if you work on the dashboard (api.py, front-end_CDH/)
```

[Ollama](https://ollama.com) is only needed to **run** benchmarks or the dashboard, not for the tests.

### Running tests

```bash
python3 -m pytest tests/
```

The suite uses fake LLMs and pure functions: it needs neither Ollama nor network access and finishes in
under a second. New code in `src/` should come with a test in `tests/` that also runs offline.

### Code style

There is no linter or formatter configured in the repository yet. Please match the existing code:

- PEP 8, 4-space indentation, type hints, `from __future__ import annotations` in new modules;
- identifiers, comments and docstrings in **Portuguese**, like the rest of the codebase;
- docstrings explain *why* (see `src/registry.py` or `src/ferramentas.py` for the tone);
- keep the legacy name `cdh` in code and data (it means PDC — see the README).

### Research rules

- **Never edit or overwrite committed results** (`benchmark_*_results.json`, `massive_results.json`).
  New runs go to new files (`--model-tag`, `--tag`).
- **Do not change Benchmark VI behavior** (`benchmark_vi.py`, the PDC prompts and guards in
  `src/supervisor.py`) without discussing it first: its analysis plan was registered before execution
  ([`docs/PLANO_BENCHMARK_VI.md`](docs/PLANO_BENCHMARK_VI.md)).
- Report numbers exactly as the scripts print them, and say which file they came from.

### Branch / PR flow

1. Fork and create a branch from `main`: `fix/<short-name>`, `test/<short-name>`, `docs/<short-name>`
   or `feat/<short-name>`.
2. Keep PRs small and focused — one issue per PR.
3. Run `python3 -m pytest tests/` before pushing.
4. In the PR description, say what changed, why, and how you verified it. If the change can affect
   measurements, say so explicitly.

### Good first issues

1. **Declare `scipy` as a dependency.** `analisar_*.py`, `corrigir_calc.py` and
   `likert_vi/analisar_likert_vi.py` import `scipy`, but `requirements.txt` does not list it.
   Add it and drop the extra `pip install scipy` line from the READMEs.
2. **Remove or document the unused `.env.example`.** It defines `ANTHROPIC_API_KEY`, but no code reads
   it (all models are served by Ollama) and `python-dotenv` in `requirements.txt` is never imported.
   Either remove both or replace `.env.example` with the env vars that *are* used
   (`SUPERVISOR_MODEL`, `WORKER_MODEL`, `<WORKER>_MODEL`, `MCP_SERVERS_<WORKER>`).
3. **Test `parse_mcp_env` in `src/mcp_adapter.py`.** Pure parsing with no tests: cover an empty
   variable, several `;`-separated servers, entries with missing parts (skipped) and endpoints containing
   `:` (e.g. `http://localhost:3000`). New file: `tests/test_mcp_adapter.py`.
4. **Test `src/registry.py`.** Cover: `register_worker` rejects the sentinels `FINALIZAR`/`CLARIFICAR`;
   `routing_targets()` = Workers + sentinels; `get_tools_for` returns `[]` for unknown Workers and
   survives an `extra_tools_provider` that raises. Use `monkeypatch` on `WORKERS` so the global registry
   is restored. New file: `tests/test_registry.py`.
5. **Test the `executar_codigo` guard in `src/ferramentas.py`.** Only `calcular` is tested today. Cover
   `_ast_has_forbidden_imports` (`import os`, `from subprocess import run`, `import os.path`, allowed
   `import math`), a non-Python `linguagem`, and a successful `print(...)` run. Add to
   `tests/test_ferramentas.py`.
6. **Align the Python version.** The README says Python 3.12, `start.sh` says 3.10+. Check what the code
   really needs (`src/supervisor.py` relies on `typing.Literal[tuple]`) and make both say the same.

---

## Português

Obrigado pelo interesse! Este é um repositório de pesquisa, então além da qualidade do código há uma
regra a mais: **os resultados precisam continuar rastreáveis**. Leia as "Regras de pesquisa" abaixo
antes de abrir um PR.

### Configuração

```bash
git clone https://github.com/y4g0o/pre-delegation-clarification.git
cd pre-delegation-clarification
python3 -m venv .venv && source .venv/bin/activate     # Python 3.12
pip install -r requirements.txt
pip install scipy                  # usado pelos scripts de análise
pip install -r requirements_api.txt   # só se for mexer no dashboard (api.py, front-end_CDH/)
```

O [Ollama](https://ollama.com) só é necessário para **rodar** benchmarks ou o dashboard, não para os testes.

### Rodando os testes

```bash
python3 -m pytest tests/
```

A suíte usa LLMs falsos e funções puras: não precisa de Ollama nem de rede e termina em menos de um
segundo. Código novo em `src/` deve vir com teste em `tests/` que também rode offline.

### Estilo de código

Ainda não há linter nem formatador configurado no repositório. Siga o código existente:

- PEP 8, indentação de 4 espaços, type hints, `from __future__ import annotations` em módulos novos;
- identificadores, comentários e docstrings em **português**, como no resto do código;
- docstrings explicam o *porquê* (veja o tom em `src/registry.py` ou `src/ferramentas.py`);
- mantenha o nome antigo `cdh` no código e nos dados (significa PDC — ver README).

### Regras de pesquisa

- **Nunca edite nem sobrescreva resultados versionados** (`benchmark_*_results.json`,
  `massive_results.json`). Execuções novas vão para arquivos novos (`--model-tag`, `--tag`).
- **Não mude o comportamento do Benchmark VI** (`benchmark_vi.py`, os prompts e *guards* da PDC em
  `src/supervisor.py`) sem discutir antes: o plano de análise foi registrado antes da execução
  ([`docs/PLANO_BENCHMARK_VI.md`](docs/PLANO_BENCHMARK_VI.md)).
- Reporte números exatamente como os scripts imprimem e diga de qual arquivo vieram.

### Fluxo de branch / PR

1. Faça um fork e crie uma branch a partir de `main`: `fix/<nome-curto>`, `test/<nome-curto>`,
   `docs/<nome-curto>` ou `feat/<nome-curto>`.
2. PRs pequenos e focados — uma tarefa por PR.
3. Rode `python3 -m pytest tests/` antes do push.
4. Na descrição do PR, diga o que mudou, por quê e como você verificou. Se a mudança puder afetar
   medições, diga isso explicitamente.

### Boas primeiras tarefas

1. **Declarar `scipy` como dependência.** `analisar_*.py`, `corrigir_calc.py` e
   `likert_vi/analisar_likert_vi.py` importam `scipy`, mas o `requirements.txt` não o lista.
   Adicione-o e retire a linha extra `pip install scipy` dos READMEs.
2. **Remover ou documentar o `.env.example` sem uso.** Ele define `ANTHROPIC_API_KEY`, mas nenhum código
   o lê (todos os modelos são servidos pelo Ollama), e o `python-dotenv` do `requirements.txt` nunca é
   importado. Remova os dois ou troque o `.env.example` pelas variáveis que *são* usadas
   (`SUPERVISOR_MODEL`, `WORKER_MODEL`, `<WORKER>_MODEL`, `MCP_SERVERS_<WORKER>`).
3. **Testar `parse_mcp_env` em `src/mcp_adapter.py`.** Parsing puro, sem testes: cubra variável vazia,
   vários servidores separados por `;`, entradas incompletas (ignoradas) e endpoints com `:`
   (ex.: `http://localhost:3000`). Arquivo novo: `tests/test_mcp_adapter.py`.
4. **Testar `src/registry.py`.** Cubra: `register_worker` recusa as sentinelas `FINALIZAR`/`CLARIFICAR`;
   `routing_targets()` = Workers + sentinelas; `get_tools_for` devolve `[]` para Worker desconhecido e
   sobrevive a um `extra_tools_provider` que levanta exceção. Use `monkeypatch` em `WORKERS` para
   restaurar o registry global. Arquivo novo: `tests/test_registry.py`.
5. **Testar a guarda de `executar_codigo` em `src/ferramentas.py`.** Hoje só `calcular` tem teste. Cubra
   `_ast_has_forbidden_imports` (`import os`, `from subprocess import run`, `import os.path`, e
   `import math` permitido), `linguagem` diferente de Python e uma execução bem-sucedida de `print(...)`.
   Adicione em `tests/test_ferramentas.py`.
6. **Alinhar a versão do Python.** O README diz Python 3.12; o `start.sh` diz 3.10+. Verifique o que o
   código realmente exige (`src/supervisor.py` usa `typing.Literal[tupla]`) e deixe os dois iguais.
