# Pre-Delegation Clarification (PDC)

**Quando vale a pena clarificar? Clarificação pré-delegação em sistemas multiagente com modelos de linguagem locais**
Trabalho de Conclusão de Curso — Ciência da Computação, IFCE *Campus* Aracati.
Autor: Yago De Sá Barreto Macambira · Orientador: Prof. Dr. Raimundo Valter Costa Filho.

> *English summary:* this repository contains the reference implementation, task sets, raw results and
> analysis scripts of an empirical study on **when** structured task clarification before delegation
> (Pre-Delegation Clarification, PDC) pays off in Supervisor–Worker multi-agent systems served by small
> **local** language models (≤ 9B, via Ollama). PDC is compared with a no-clarification Baseline and an
> unstructured Chain-of-Thought Baseline.

## Sobre o nome
O padrão se chamava **Ciclo de Desambiguação Hierárquica (CDH)**. O nome mudou para PDC em outubro de 2026,
para alinhar a terminologia à literatura (*clarification*). Código e arquivos de dados preservam o nome
antigo: o modo `cdh` e o campo `instrucao_cdh` correspondem à PDC.

## Pergunta de pesquisa
Em que condições — de capacidade do modelo e de domínio da tarefa — a clarificação estruturada antes
da delegação melhora a confiabilidade e a eficiência de sistemas multiagente servidos por modelos locais?

## Estrutura
| Caminho | Conteúdo |
|---|---|
| `src/` | Implementação (LangGraph): Supervisor com saída estruturada (Pydantic) e *guards*, Workers ReAct, `WorkerRegistry` |
| `benchmark_v2.py` | Executor dos Benchmarks II–V (condições `baseline`, `cot`, `cdh`) |
| `benchmark_vi.py`, `rodar_benchmark_vi.sh` | Benchmark VI (nova tentativa com código corrigido, repetições, agente único) |
| `tasks_v2.json`, `tasks_sample.json`, `tasks_prog.json` | Tarefas gerais (100), amostra Likert (45) e de programação (30) |
| `benchmark_*_results.json`, `massive_results.json` | Resultados brutos |
| `analisar_*.py`, `corrigir_calc.py` | Análises estatísticas, simulação de PDC seletiva e correção de tarefas verificáveis |
| `likert_vi/` | Protocolo de avaliação Likert cega |
| `docs/PLANO_BENCHMARK_VI.md` | Plano de análise do Benchmark VI, registrado **antes** da execução |
| `front-end_CDH/`, `api.py`, `start.sh` | Dashboard (FastAPI + React) |
| `tests/` | Testes unitários |

## Dados × experimentos
| Experimento | Arquivo(s) |
|---|---|
| Benchmark I (Llama 3.2 3B, exploratório) | `massive_results.json` |
| Benchmark II (Llama 3.1 8B) | `benchmark_v3_results.OLD_stubs_20260527.json` |
| Reexecução de 27/05/2026 (código modificado, ver artigo) | `benchmark_v3_results.json` |
| Benchmark III (amostra Likert) | `benchmark_sample_results.json` |
| Benchmark IV (6 modelos) | `benchmark_<modelo>_results.json` (Llama 3.1 8B = arquivo do Benchmark II) |
| Benchmark V (programação) | `benchmark_heterogeneous_results.json` |
| Benchmark VI (nova tentativa) | `benchmark_vi_<modelo>_rep<n>_results.json` (após execução) |

**Métrica de terminação:** a execução atinge FINALIZAR sem erro e com resposta não vazia. Ela mede
confiabilidade operacional, não correção; o acerto é estimado em tarefas verificáveis (`corrigir_calc.py`).

## Reproduzir
Requisitos: Python 3.12, [Ollama](https://ollama.com) e os modelos usados (ex.: `ollama pull llama3.1:8b`).

```bash
pip install -r requirements.txt
python3 benchmark_v2.py --cot --model-tag meu_teste      # Benchmark II/IV com outro rótulo de saída
python3 analisar_gate.py                                  # simulação de PDC seletiva
python3 corrigir_calc.py                                  # acerto em tarefas CALC verificáveis
./rodar_benchmark_vi.sh etapa1                            # Benchmark VI (várias horas)
python3 -m pytest tests/
```

## Limitações conhecidas
O resultado principal do Benchmark II provém de uma única execução, e uma reexecução com código modificado
não o reproduziu; o Benchmark VI foi preparado para esclarecer isso. Os rótulos de ambiguidade das tarefas
foram atribuídos pelo autor. As demais limitações estão descritas no artigo.

## Licença
MIT — ver `LICENSE`.
