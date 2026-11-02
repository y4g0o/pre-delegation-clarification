🇺🇸 English · [🇧🇷 Português](README.pt-BR.md)

# Pre-Delegation Clarification (PDC)

**An empirical study of *when* a supervisor agent should clarify a task before delegating it — in multi-agent systems running on small local LLMs.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python 3.12](https://img.shields.io/badge/python-3.12-blue.svg)](requirements.txt)
[![Tests: pytest](https://img.shields.io/badge/tests-pytest-green.svg)](tests/)

*When is clarification worth it? Pre-delegation clarification in multi-agent systems with local language models* —
B.Sc. thesis (Trabalho de Conclusão de Curso), Computer Science, IFCE *Campus* Aracati.
Author: **Yago Macambira** (Yago De Sá Barreto Macambira) · Advisor: Prof. Dr. Raimundo Valter Costa Filho.

This repository holds the reference implementation, task sets, raw results and analysis scripts.
Task prompts, code comments and identifiers are in Portuguese.

## 💡 Why

In a Supervisor–Worker multi-agent system, the Supervisor rewrites the user's request into an
instruction for a Worker. With small local models (≤ 9B parameters, served by [Ollama](https://ollama.com)),
an ambiguous request can send a Worker in the wrong direction and waste the whole run.
Asking the Supervisor to *clarify first* — classify the ambiguity, produce a disambiguated
instruction, or ask the user — sounds helpful, but it costs tokens and can itself fail.

**Research question:** under which conditions — model capability and task domain — does structured
clarification before delegation improve the reliability and efficiency of multi-agent systems served
by local models?

## ✨ What it does

- **Three experimental conditions** over the same Supervisor–Worker graph:
  - `baseline` — the Supervisor only routes;
  - `cot` — Chain-of-Thought Baseline: the Supervisor reflects and rewrites the instruction, unstructured;
  - `cdh` — **PDC**: structured output with a disambiguated instruction, ambiguity type
    (`nenhuma`, `sintatica`, `semantica`, `contextual`, `multi_dominio`), complexity (1–10),
    confidence (0–100) and the option to `CLARIFICAR` (ask the user).
- **Six Workers** with real tools: web search (DuckDuckGo), a safe AST-based calculator, a writer,
  and backend/frontend/test Workers with a time-limited Python runner.
- **Task sets:** 100 general tasks (`tasks_v2.json`: research/PESQ, calculation/CALC, writing/ESC,
  each at low/medium/high ambiguity), a 45-task Likert sample and 30 programming tasks.
- **Benchmark runners** with timeouts, resume and per-run metrics (latency, Worker and Supervisor
  tokens, ReAct cycles, fallback use).
- **Statistical analyses:** Fisher's exact, McNemar exact, Mann-Whitney U, Wilson intervals, Cohen's h,
  a post-hoc *selective PDC* simulation and automatic grading of verifiable CALC tasks.
- **A pre-registered follow-up experiment** (Benchmark VI) and a **blind Likert protocol**.
- **A local dashboard** (FastAPI + React) to browse results and run single tasks.

## 🚀 Quickstart

Requirements: Python 3.12, [Ollama](https://ollama.com) and the models you want to test
(e.g. `ollama pull llama3.1:8b`).

```bash
git clone https://github.com/y4g0o/pre-delegation-clarification.git
cd pre-delegation-clarification
pip install -r requirements.txt
pip install scipy                 # used by the analisar_*.py / corrigir_calc.py scripts (not yet in requirements.txt)

python3 -m pytest tests/          # unit tests — no Ollama, no network needed
```

Re-run the analyses on the committed raw results (offline, a few seconds each):

```bash
python3 corrigir_calc.py          # accuracy on the 24 verifiable CALC tasks
python3 analisar_gate.py          # selective-PDC simulation (oracle upper bound)
python3 analisar_multimodelo.py   # Baseline / CoT / PDC across models
python3 analisar_v2.py            # per-file tables and tests (default: benchmark_v3_results.json)
```

Run experiments (needs Ollama running; long):

```bash
python3 benchmark_v2.py --test                       # 1 task, nothing saved
python3 benchmark_v2.py --cot --model-tag my_test    # Benchmark II/IV with your own output tag
./rodar_benchmark_vi.sh etapa1                       # Benchmark VI, stage 1 (several hours)
```

Dashboard (backend on `:8000`, frontend on `:8080`; needs Ollama to execute tasks):

```bash
pip install -r requirements_api.txt
bash start.sh
```

## 🧭 How it works

```
START → supervisor → (conditional) → { worker_i | END }
        worker_i → supervisor          (loop: the Supervisor reviews and decides again)
```

- **Graph** (`src/grafo.py`, LangGraph): built from the `WorkerRegistry`; every registered Worker becomes
  a node. `FINALIZAR` and `CLARIFICAR` are sentinels that end the run.
- **Supervisor** (`src/supervisor.py`): one prompt and one Pydantic schema per condition; the allowed
  routing targets are a `Literal` generated from the registry. Two guards keep small models honest:
  **Guard A** blocks `FINALIZAR`/`CLARIFICAR` before any Worker has answered (keyword fallback picks a
  Worker); **Guard B** blocks `CLARIFICAR` after a Worker has already answered.
- **Workers** (`src/workers.py`): ReAct loops with a cycle limit, tool-call repair and a forced final
  synthesis when cycles run out; the writer is invoked directly, without tools.
- **Registry** (`src/registry.py`): single source of truth for Workers — adding one is a single
  `register_worker(WorkerSpec(...))` call. Per-Worker models are set with `<NAME>_MODEL` env vars.
- **Tools** (`src/ferramentas.py`): `busca_web`, `calcular` (AST whitelist, no `eval`), `executar_codigo`
  (10 s timeout + AST guard against system/network imports — explicitly *not* a full sandbox).
- **State** (`src/estado.py`): messages plus accumulated counters (ReAct cycles, Supervisor tokens,
  chosen Workers, fallbacks).

### About the name

The pattern was first called **Ciclo de Desambiguação Hierárquica (CDH)**. It was renamed PDC in
October 2026 to align with the literature (*clarification*). Code and data files keep the old name:
the `cdh` mode and the `instrucao_cdh` field correspond to PDC.

### Repository map

| Path | Contents |
|---|---|
| `src/` | Implementation (LangGraph): Supervisor with structured output (Pydantic) and guards, ReAct Workers, `WorkerRegistry`, MCP adapter stub |
| `benchmark_v2.py` | Runner for Benchmarks II–V (conditions `baseline`, `cot`, `cdh`) |
| `benchmark_vi.py`, `rodar_benchmark_vi.sh` | Benchmark VI (new attempt with fixed code, repetitions, single-agent condition) |
| `tasks_v2.json`, `tasks_sample.json`, `tasks_prog.json` | General tasks (100), Likert sample (45), programming tasks (30) |
| `benchmark_*_results.json`, `massive_results.json` | Raw results |
| `analisar_*.py`, `corrigir_calc.py`, `extrair_instrucao_cdh.py` | Statistical analyses, selective-PDC simulation, grading of verifiable tasks, data extraction |
| `likert_vi/` | Blind Likert evaluation protocol ([rubric](likert_vi/RUBRICA.md)) |
| [`docs/PLANO_BENCHMARK_VI.md`](docs/PLANO_BENCHMARK_VI.md) | Benchmark VI analysis plan, registered **before** execution |
| `front-end_CDH/`, `api.py`, `start.sh` | Dashboard (FastAPI + React) |
| `tests/` | Unit tests |

### Data × experiments

| Experiment | File(s) |
|---|---|
| Benchmark I (Llama 3.2 3B, exploratory) | `massive_results.json` |
| Benchmark II (Llama 3.1 8B) | `benchmark_v3_results.OLD_stubs_20260527.json` |
| Re-run of 2026-05-27 (modified code, see the paper) | `benchmark_v3_results.json` |
| Benchmark III (Likert sample) | `benchmark_sample_results.json` |
| Benchmark IV (6 models) | `benchmark_<model>_results.json` (Llama 3.1 8B = the Benchmark II file) |
| Benchmark V (programming) | `benchmark_heterogeneous_results.json` |
| Benchmark VI (new attempt) | `benchmark_vi_<model>_rep<n>_results.json` (after execution) |

**Termination metric:** a run reaches `FINALIZAR` without error and with a non-empty answer. It measures
operational reliability, not correctness; correctness is estimated on verifiable tasks (`corrigir_calc.py`).

## 📌 Project status & limitations

- **The main Benchmark II result did not reproduce.** Benchmark II (PDC 97% vs. Baseline 89%
  termination with Llama 3.1 8B) comes from a **single run**, and a re-run with modified code did not
  reproduce it. **Benchmark VI was prepared to clarify this**: same 100 tasks and model, measurement bugs
  U1/U2 fixed, three independent repetitions and a new single-agent condition, with the analysis plan
  registered beforehand in [`docs/PLANO_BENCHMARK_VI.md`](docs/PLANO_BENCHMARK_VI.md).
  Benchmark VI results are **not yet in this repository**.
- The ambiguity labels of the tasks were assigned by the author.
- Termination is not correctness: only the 24 low/medium-ambiguity CALC tasks are graded automatically,
  and answers stored truncated at 800 characters may be under-scored.
- The `selective PDC` analysis in `analisar_gate.py` uses the true ambiguity label, so it is an
  **upper bound** (oracle), not a deployable policy.
- `executar_codigo` is a timeout + import guard, not a full sandbox — fine for checking logic, not for
  adversarial code.
- The MCP adapter (`src/mcp_adapter.py`) is a stub: the interface exists, the client does not.
- Other limitations are described in the paper (not included in this repository).

## 🗺️ Roadmap

1. Run Benchmark VI stages 1–3 and the analysis step (`./rodar_benchmark_vi.sh etapa1|etapa2|etapa3|analise`),
   publishing the generated `docs/RELATORIO_BENCHMARK_VI_*.md` reports whatever the outcome.
2. Complete the blind Likert evaluation of Benchmark VI ([`likert_vi/RUBRICA.md`](likert_vi/RUBRICA.md)).
3. Test the planned prompt changes U3, U4, U5 as a **separate** experiment — they were deliberately
   left out of Benchmark VI because they would change PDC itself.
4. Turn the selective-PDC simulation into a real gate driven by the Supervisor's own initial
   ambiguity classification (`tipo_ambiguidade_inicial`), instead of the oracle label.
5. Implement the MCP client in `src/mcp_adapter.py` (`_connect_and_list`) so Workers can discover
   external tools.

## 🤝 Contributing

Contributions are welcome — from small test additions to replication runs on other local models.
See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, conventions and a list of good first issues.

## 📄 License

MIT — see [`LICENSE`](LICENSE).
