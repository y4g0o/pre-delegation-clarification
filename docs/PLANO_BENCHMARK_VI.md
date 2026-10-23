# Benchmark VI — plano registrado antes da execução

> Registrado em 23/10/2026, **antes** de qualquer execução. Mudanças posteriores neste arquivo
> devem ser declaradas no artigo. O Benchmark VI **não substitui** o Benchmark II: é uma nova
> tentativa, reportada à parte, para esclarecer a dúvida levantada pela reexecução de 27/05.

## Pergunta
O resultado do Benchmark II (PDC 97% vs. Baseline 89% de terminação com Llama 3.1 8B) se repete
com o código de medição corrigido e em execuções independentes?

## O que é igual ao Benchmark II
Mesmas 100 tarefas (`tasks_v2.json`), mesmo modelo (`llama3.1:8b` em todos os papéis), mesmos
prompts e guards da PDC, limite de recursão 20, regime sem timeout prático (7200 s).

## O que muda (e por quê)
| Mudança | Motivo |
|---|---|
| Correções U1 e U2 (captura da melhor resposta; síntese final do ReAct) | bugs de medição; afetam igualmente as três condições |
| Resposta do Worker gravada (até 3000 caracteres) | permitir medir acerto |
| Classificação inicial do Supervisor gravada (`tipo_ambiguidade_inicial`) | o campo antigo registrava a última chamada, não a análise inicial |
| 3 repetições independentes | medir variabilidade entre execuções |
| Condição nova `agente_unico` (rep. 1) | testar se o arranjo multiagente se justifica |
| Terminação = sucesso **e** resposta não vazia | definição do artigo |

Mudanças de prompt planejadas (U3, U4, U5) **não** entram: alterariam a PDC.

## Análises (definidas antes de ver os dados)
1. **Teste principal:** PDC vs. Baseline na repetição 1, McNemar exato, α = 0,05.
2. **Critério de replicação de H1:** a terminação da PDC é maior que a do Baseline nas três
   repetições **e** o teste principal é significativo. Qualquer outro padrão será reportado
   como "não replicado" ou "replicado parcialmente", com os números.
3. Secundárias (exploratórias): ALTA ambiguidade; acerto nas 24 tarefas CALC verificáveis;
   custo total em tokens; amplitude entre repetições; PDC seletiva com o rótulo verdadeiro e
   com a classificação inicial do Supervisor; agente único vs. PDC e vs. Baseline.
4. Etapa 3 (modelos locais recentes): descritiva, uma repetição, sem teste confirmatório.

## Como reportar no artigo
Nova subseção "Benchmark VI — nova tentativa com código corrigido", **depois** do Benchmark II,
mantendo o Benchmark II como está. Reportar o resultado qualquer que seja, com a tabela de
terminação por repetição, o teste principal e o critério acima. Atualizar resumo, H1 na
conclusão e limitações de acordo. Rascunho com marcadores em `docs/benchmark_vi_secao_artigo.tex`.

## Execução
`./rodar_benchmark_vi.sh etapa1`, depois `etapa2`, `etapa3` (opcional) e `analise`.
Relatórios: `docs/RELATORIO_BENCHMARK_VI_*.md`. Depois, avaliação Likert cega: `likert_vi/RUBRICA.md`.
