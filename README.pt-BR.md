[🇺🇸 English](README.md) · 🇧🇷 Português

# Pre-Delegation Clarification (PDC)

**Um estudo empírico sobre *quando* um agente supervisor deve clarificar uma tarefa antes de delegá-la — em sistemas multiagente servidos por modelos de linguagem locais pequenos.**

[![Licença: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python 3.12](https://img.shields.io/badge/python-3.12-blue.svg)](requirements.txt)
[![Testes: pytest](https://img.shields.io/badge/tests-pytest-green.svg)](tests/)

*Quando vale a pena clarificar? Clarificação pré-delegação em sistemas multiagente com modelos de linguagem locais* —
Trabalho de Conclusão de Curso, Ciência da Computação, IFCE *Campus* Aracati.
Autor: **Yago Macambira** (Yago De Sá Barreto Macambira) · Orientador: Prof. Dr. Raimundo Valter Costa Filho.

Este repositório contém a implementação de referência, os conjuntos de tarefas, os resultados brutos e
os scripts de análise.

## 💡 Por quê

Num sistema multiagente Supervisor–Worker, o Supervisor reescreve o pedido do usuário como instrução
para um Worker. Com modelos locais pequenos (≤ 9B parâmetros, servidos pelo [Ollama](https://ollama.com)),
um pedido ambíguo pode mandar o Worker na direção errada e desperdiçar a execução inteira. Pedir ao
Supervisor que *clarifique antes* — classificar a ambiguidade, produzir uma instrução desambiguada ou
perguntar ao usuário — parece ajudar, mas custa tokens e também pode falhar.

**Pergunta de pesquisa:** em que condições — de capacidade do modelo e de domínio da tarefa — a
clarificação estruturada antes da delegação melhora a confiabilidade e a eficiência de sistemas
multiagente servidos por modelos locais?

## ✨ O que ele faz

- **Três condições experimentais** sobre o mesmo grafo Supervisor–Worker:
  - `baseline` — o Supervisor só roteia;
  - `cot` — Baseline com Chain-of-Thought: o Supervisor reflete e reescreve a instrução, sem estrutura;
  - `cdh` — **PDC**: saída estruturada com instrução desambiguada, tipo de ambiguidade
    (`nenhuma`, `sintatica`, `semantica`, `contextual`, `multi_dominio`), complexidade (1–10),
    confiança (0–100) e a opção de `CLARIFICAR` (perguntar ao usuário).
- **Seis Workers** com ferramentas reais: busca web (DuckDuckGo), calculadora segura baseada em AST,
  redator e Workers de backend/frontend/testes com execução de Python limitada por tempo.
- **Conjuntos de tarefas:** 100 tarefas gerais (`tasks_v2.json`: pesquisa/PESQ, cálculo/CALC,
  escrita/ESC, cada uma em ambiguidade baixa/média/alta), amostra Likert de 45 e 30 tarefas de programação.
- **Executores de benchmark** com timeout, retomada e métricas por execução (latência, tokens de
  Workers e do Supervisor, ciclos ReAct, uso de fallback).
- **Análises estatísticas:** Fisher exato, McNemar exato, Mann-Whitney U, intervalos de Wilson, h de Cohen,
  simulação post-hoc de *PDC seletiva* e correção automática das tarefas CALC verificáveis.
- **Um experimento de seguimento pré-registrado** (Benchmark VI) e um **protocolo Likert cego**.
- **Um dashboard local** (FastAPI + React) para navegar nos resultados e executar tarefas avulsas.

## 🚀 Início rápido

Requisitos: Python 3.12, [Ollama](https://ollama.com) e os modelos que quiser testar
(ex.: `ollama pull llama3.1:8b`).

```bash
git clone https://github.com/y4g0o/pre-delegation-clarification.git
cd pre-delegation-clarification
pip install -r requirements.txt
pip install scipy                 # usado pelos scripts analisar_*.py / corrigir_calc.py (ainda fora do requirements.txt)

python3 -m pytest tests/          # testes unitários — não precisam de Ollama nem de rede
```

Refazer as análises sobre os resultados brutos versionados (offline, alguns segundos cada):

```bash
python3 corrigir_calc.py          # acerto nas 24 tarefas CALC verificáveis
python3 analisar_gate.py          # simulação de PDC seletiva (limite superior, oráculo)
python3 analisar_multimodelo.py   # Baseline / CoT / PDC em vários modelos
python3 analisar_v2.py            # tabelas e testes por arquivo (padrão: benchmark_v3_results.json)
```

Rodar experimentos (precisa do Ollama rodando; demorado):

```bash
python3 benchmark_v2.py --test                       # 1 tarefa, não grava nada
python3 benchmark_v2.py --cot --model-tag meu_teste  # Benchmark II/IV com outro rótulo de saída
./rodar_benchmark_vi.sh etapa1                       # Benchmark VI, etapa 1 (várias horas)
```

Dashboard (backend em `:8000`, frontend em `:8080`; precisa do Ollama para executar tarefas):

```bash
pip install -r requirements_api.txt
bash start.sh
```

## 🧭 Como funciona

```
START → supervisor → (condicional) → { worker_i | END }
        worker_i → supervisor          (ciclo: o Supervisor revisa e decide de novo)
```

- **Grafo** (`src/grafo.py`, LangGraph): construído a partir do `WorkerRegistry`; todo Worker registrado
  vira um nó. `FINALIZAR` e `CLARIFICAR` são sentinelas que encerram a execução.
- **Supervisor** (`src/supervisor.py`): um prompt e um schema Pydantic por condição; os alvos de
  roteamento válidos são um `Literal` gerado do registry. Dois *guards* seguram os modelos pequenos:
  o **Guard A** impede `FINALIZAR`/`CLARIFICAR` antes de qualquer Worker responder (um fallback por
  palavras-chave escolhe o Worker); o **Guard B** impede `CLARIFICAR` depois que um Worker já respondeu.
- **Workers** (`src/workers.py`): laços ReAct com limite de ciclos, correção de *tool calls* e síntese
  final forçada quando os ciclos acabam; o redator é chamado diretamente, sem ferramentas.
- **Registry** (`src/registry.py`): fonte única de verdade sobre os Workers — adicionar um é uma única
  chamada `register_worker(WorkerSpec(...))`. O modelo de cada Worker é definido pela variável
  de ambiente `<NOME>_MODEL`.
- **Ferramentas** (`src/ferramentas.py`): `busca_web`, `calcular` (lista branca de AST, sem `eval`) e
  `executar_codigo` (timeout de 10 s + guarda de AST contra imports de sistema/rede — explicitamente
  *não* é um sandbox completo).
- **Estado** (`src/estado.py`): mensagens e contadores acumulados (ciclos ReAct, tokens do Supervisor,
  Workers escolhidos, fallbacks).

### Sobre o nome

O padrão se chamava **Ciclo de Desambiguação Hierárquica (CDH)**. O nome mudou para PDC em outubro de 2026,
para alinhar a terminologia à literatura (*clarification*). Código e arquivos de dados preservam o nome
antigo: o modo `cdh` e o campo `instrucao_cdh` correspondem à PDC.

### Mapa do repositório

| Caminho | Conteúdo |
|---|---|
| `src/` | Implementação (LangGraph): Supervisor com saída estruturada (Pydantic) e *guards*, Workers ReAct, `WorkerRegistry`, stub do adaptador MCP |
| `benchmark_v2.py` | Executor dos Benchmarks II–V (condições `baseline`, `cot`, `cdh`) |
| `benchmark_vi.py`, `rodar_benchmark_vi.sh` | Benchmark VI (nova tentativa com código corrigido, repetições, agente único) |
| `tasks_v2.json`, `tasks_sample.json`, `tasks_prog.json` | Tarefas gerais (100), amostra Likert (45) e de programação (30) |
| `benchmark_*_results.json`, `massive_results.json` | Resultados brutos |
| `analisar_*.py`, `corrigir_calc.py`, `extrair_instrucao_cdh.py` | Análises estatísticas, simulação de PDC seletiva, correção de tarefas verificáveis, extração de dados |
| `likert_vi/` | Protocolo de avaliação Likert cega ([rubrica](likert_vi/RUBRICA.md)) |
| [`docs/PLANO_BENCHMARK_VI.md`](docs/PLANO_BENCHMARK_VI.md) | Plano de análise do Benchmark VI, registrado **antes** da execução |
| `front-end_CDH/`, `api.py`, `start.sh` | Dashboard (FastAPI + React) |
| `tests/` | Testes unitários |

### Dados × experimentos

| Experimento | Arquivo(s) |
|---|---|
| Benchmark I (Llama 3.2 3B, exploratório) | `massive_results.json` |
| Benchmark II (Llama 3.1 8B) | `benchmark_v3_results.OLD_stubs_20260527.json` |
| Reexecução de 27/05/2026 (código modificado, ver artigo) | `benchmark_v3_results.json` |
| Benchmark III (amostra Likert) | `benchmark_sample_results.json` |
| Benchmark IV (6 modelos) | `benchmark_<modelo>_results.json` (Llama 3.1 8B = arquivo do Benchmark II) |
| Benchmark V (programação) | `benchmark_heterogeneous_results.json` |
| Benchmark VI (nova tentativa) | `benchmark_vi_<modelo>_rep<n>_results.json` (após execução) |

**Métrica de terminação:** a execução atinge `FINALIZAR` sem erro e com resposta não vazia. Ela mede
confiabilidade operacional, não correção; o acerto é estimado em tarefas verificáveis (`corrigir_calc.py`).

## 📌 Estado do projeto e limitações

- **O resultado principal do Benchmark II não se reproduziu.** O Benchmark II (terminação de 97% da PDC
  vs. 89% do Baseline com Llama 3.1 8B) provém de uma **única execução**, e uma reexecução com código
  modificado não o reproduziu. **O Benchmark VI foi preparado para esclarecer isso**: mesmas 100 tarefas
  e mesmo modelo, bugs de medição U1/U2 corrigidos, três repetições independentes e uma condição nova de
  agente único, com o plano de análise registrado antes em
  [`docs/PLANO_BENCHMARK_VI.md`](docs/PLANO_BENCHMARK_VI.md). Os resultados do Benchmark VI
  **ainda não estão neste repositório**.
- Os rótulos de ambiguidade das tarefas foram atribuídos pelo autor.
- Terminação não é correção: só as 24 tarefas CALC de ambiguidade baixa/média são corrigidas
  automaticamente, e respostas armazenadas truncadas em 800 caracteres podem ser subestimadas.
- A *PDC seletiva* de `analisar_gate.py` usa o rótulo verdadeiro de ambiguidade, então é um
  **limite superior** (oráculo), não uma política implantável.
- `executar_codigo` é timeout + guarda de imports, não um sandbox completo — serve para verificar
  lógica, não para código adversário.
- O adaptador MCP (`src/mcp_adapter.py`) é um stub: a interface existe, o cliente não.
- As demais limitações estão descritas no artigo (não incluído neste repositório).

## 🗺️ Roadmap

1. Executar as etapas 1–3 e a análise do Benchmark VI (`./rodar_benchmark_vi.sh etapa1|etapa2|etapa3|analise`)
   e publicar os relatórios `docs/RELATORIO_BENCHMARK_VI_*.md`, qualquer que seja o resultado.
2. Concluir a avaliação Likert cega do Benchmark VI ([`likert_vi/RUBRICA.md`](likert_vi/RUBRICA.md)).
3. Testar as mudanças de prompt planejadas U3, U4 e U5 num experimento **separado** — ficaram fora do
   Benchmark VI de propósito, porque alterariam a própria PDC.
4. Transformar a simulação de PDC seletiva num gate real, guiado pela classificação inicial de
   ambiguidade do próprio Supervisor (`tipo_ambiguidade_inicial`) em vez do rótulo-oráculo.
5. Implementar o cliente MCP em `src/mcp_adapter.py` (`_connect_and_list`), para que os Workers
   descubram ferramentas externas.

## 🤝 Como contribuir

Contribuições são bem-vindas — de testes pequenos a replicações com outros modelos locais.
Veja o [CONTRIBUTING.md](CONTRIBUTING.md) para configuração, convenções e uma lista de boas primeiras tarefas.

## 📄 Licença

MIT — ver [`LICENSE`](LICENSE).
