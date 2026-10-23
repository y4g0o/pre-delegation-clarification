#!/usr/bin/env bash
# Benchmark VI — nova tentativa, com código corrigido, de esclarecer o Benchmark II.
# Não sobrescreve nenhum resultado anterior. Pode ser interrompido e rodado de novo:
# continua de onde parou.
#
# Uso:
#   ./rodar_benchmark_vi.sh etapa1      # Llama 3.1 8B, repetição 1, 4 condições    (~5–7 h)
#   ./rodar_benchmark_vi.sh etapa2      # Llama 3.1 8B, repetições 2 e 3, 3 condições (~7–9 h)
#   ./rodar_benchmark_vi.sh etapa3      # modelos locais recentes, 1 repetição         (~3–5 h por modelo)
#   ./rodar_benchmark_vi.sh analise     # gera relatórios em docs/ e a planilha Likert cega
#   ./rodar_benchmark_vi.sh tudo        # etapas 1, 2, 3 e análise em sequência
#
# Agendar para a madrugada (exemplo, 23h):
#   echo "cd $PWD && ./rodar_benchmark_vi.sh etapa1" | at 23:00
# Acompanhar:
#   tail -f logs_benchmark_vi/*.log
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p logs_benchmark_vi
STAMP=$(date +%Y%m%d_%H%M)

MODELO_REF="llama3.1:8b"
# Modelos locais recentes já instalados nesta máquina (ajuste se quiser).
# Qwen3 e Qwen3.5 têm modo de raciocínio: podem falhar com saída estruturada, como o DeepSeek-R1.
MODELOS_NOVOS=("qwen3:8b" "gemma3:4b" "qwen3.5:latest")

checar() {
  curl -s http://localhost:11434/api/tags >/dev/null || { echo "Ollama não está rodando (ollama serve)."; exit 1; }
  if ! ollama list | awk '{print $1}' | grep -qx "$1"; then
    echo "Modelo $1 não está instalado. Baixando (vários GB)..."
    ollama pull "$1"
  fi
}

etapa1() {
  checar "$MODELO_REF"
  python3 benchmark_vi.py --modelo "$MODELO_REF" --tag llama31_8b --repeticoes 1 \
    --modos baseline,cot,cdh,agente_unico 2>&1 | tee -a "logs_benchmark_vi/etapa1_$STAMP.log"
}

etapa2() {
  checar "$MODELO_REF"
  # repetições 2 e 3: o runner pula a repetição 1 já completa (agente_unico só na rep. 1)
  python3 benchmark_vi.py --modelo "$MODELO_REF" --tag llama31_8b --repeticoes 3 \
    --modos baseline,cot,cdh 2>&1 | tee -a "logs_benchmark_vi/etapa2_$STAMP.log"
}

etapa3() {
  for m in "${MODELOS_NOVOS[@]}"; do
    checar "$m"
    tag=$(echo "$m" | tr ':.' '__')
    python3 benchmark_vi.py --modelo "$m" --tag "$tag" --repeticoes 1 \
      --modos baseline,cot,cdh 2>&1 | tee -a "logs_benchmark_vi/etapa3_${tag}_$STAMP.log"
  done
}

analise() {
  python3 analisar_benchmark_vi.py --tag llama31_8b
  for m in "${MODELOS_NOVOS[@]}"; do
    tag=$(echo "$m" | tr ':.' '__')
    ls benchmark_vi_${tag}_rep*_results.json >/dev/null 2>&1 && python3 analisar_benchmark_vi.py --tag "$tag"
  done
  python3 likert_vi/preparar_likert_vi.py --tag llama31_8b
  echo "Relatórios em docs/RELATORIO_BENCHMARK_VI_*.md; planilha Likert em likert_vi/planilha_avaliacao.csv"
}

case "${1:-}" in
  etapa1) etapa1 ;;
  etapa2) etapa2 ;;
  etapa3) etapa3 ;;
  analise) analise ;;
  tudo) etapa1; etapa2; etapa3; analise ;;
  *) sed -n '2,17p' "$0"; exit 1 ;;
esac
