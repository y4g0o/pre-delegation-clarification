#!/usr/bin/env bash
# =============================================================================
# Benchmark Noturno CDH — Execução Sequencial (~7-8 horas)
#
# Objetivo: comparação multi-modelo e multi-condição para excelência acadêmica
# Modelos: llama3.2:3b, qwen2.5-coder:7b, mistral:7b, gemma2:9b, phi3:mini
# Condições: Baseline, CoT-Baseline, CDH (3 condições × 5 modelos = 15 séries)
#
# Contribuição acadêmica:
#   - Mostra efeito CDH em diferentes famílias (Meta, Alibaba, Mistral, Google, Microsoft)
#   - Testa hipótese: ganho CDH diminui com capacidade do modelo
#   - CoT-Baseline como condição intermediária (novidade na literatura)
#   - N=100 tarefas por modelo → poder estatístico adequado (Fisher + Mann-Whitney)
#
# Uso: bash benchmark_overnight.sh
#      bash benchmark_overnight.sh --skip-pulls   (se modelos já baixados)
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

LOG_DIR="logs_overnight"
mkdir -p "$LOG_DIR"

SKIP_PULLS=false
[[ "${1:-}" == "--skip-pulls" ]] && SKIP_PULLS=true

START_TIME=$(date +%s)
log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_DIR/master.log"; }

log "=== BENCHMARK NOTURNO CDH INICIADO ==="
log "Supervisor: llama3.1:8b  Worker: llama3.1:8b (padrão por modelo)"
log "Tarefas: 100 × 3 condições = 300 execuções por modelo"
log ""

# =============================================================================
# FASE 0: pull de modelos necessários
# =============================================================================
if ! $SKIP_PULLS; then
    log "--- FASE 0: Download de modelos ---"

    for model in gemma2:9b phi3:mini deepseek-r1:7b; do
        log "Baixando $model..."
        ollama pull "$model" 2>&1 | tail -3 | tee -a "$LOG_DIR/pulls.log" || \
            log "AVISO: falha ao baixar $model — pulando"
    done
    log "Downloads concluídos."
    log ""
fi

# =============================================================================
# Função: rodar benchmark completo para um modelo
# =============================================================================
run_model() {
    local tag="$1"
    local model="$2"
    log "--- Iniciando $tag ($model) ---"
    SUPERVISOR_MODEL="$model" WORKER_MODEL="$model" \
        python3 benchmark_v2.py --cot --model-tag "$tag" \
        2>&1 | tee "$LOG_DIR/benchmark_${tag}.log"
    log "--- $tag concluído ---"
    log ""
}

run_model_incremental() {
    local tag="$1"
    local model="$2"
    log "--- Complementando $tag com CoT (incremental) ---"
    SUPERVISOR_MODEL="$model" WORKER_MODEL="$model" \
        python3 benchmark_v2.py --cot --incremental --model-tag "$tag" \
        2>&1 | tee "$LOG_DIR/benchmark_${tag}_cot_supplement.log"
    log "--- $tag CoT concluído ---"
    log ""
}

# =============================================================================
# FASE 1: complementar llama3.1:8b com CoT (já tem baseline+cdh, falta cot)
# =============================================================================
log "--- FASE 1: Complementar llama3.1:8b com CoT ---"
SUPERVISOR_MODEL=llama3.1:8b WORKER_MODEL=llama3.1:8b \
    python3 benchmark_v2.py --cot --incremental --model-tag llama31_8b \
    2>&1 | tee "$LOG_DIR/benchmark_llama31_8b_cot.log"
log ""

# =============================================================================
# FASE 2: llama3.2:3b — complementar com CoT (já tem baseline+cdh)
# =============================================================================
log "--- FASE 2: Complementar llama3.2:3b com CoT ---"
SUPERVISOR_MODEL=llama3.2:latest WORKER_MODEL=llama3.2:latest \
    python3 benchmark_v2.py --cot --incremental --model-tag llama32_3b \
    2>&1 | tee "$LOG_DIR/benchmark_llama32_cot.log"
log ""

# =============================================================================
# FASE 3: qwen2.5-coder:7b — completo (3 condições)
# Code-specialized: mostra CDH em modelo orientado a código
# =============================================================================
run_model "qwen25coder" "qwen2.5-coder:7b"

# =============================================================================
# FASE 4: mistral:7b — completo (3 condições)
# Arquitetura Mistral (sliding window attention): teste de generalização
# =============================================================================
run_model "mistral7b" "mistral:7b"

# =============================================================================
# FASE 5: gemma2:9b — completo (3 condições)
# Maior modelo do conjunto: testa hipótese de ganho decrescente
# =============================================================================
run_model "gemma29b" "gemma2:9b"

# =============================================================================
# FASE 6: phi3:mini — completo (3 condições)
# Microsoft, 3.8B mas altamente otimizado: modelo small de alta qualidade
# =============================================================================
run_model "phi3mini" "phi3:mini"

# =============================================================================
# FASE 7: deepseek-r1:7b — completo (3 condições) [SE DISPONÍVEL]
# Reasoning model: testa se CDH adiciona valor sobre modelos com CoT interno
# Contribuição acadêmica única: CDH vs raciocínio nativo
# =============================================================================
if ollama list 2>/dev/null | grep -q "deepseek-r1"; then
    log "--- FASE 7: deepseek-r1:7b (reasoning model) ---"
    run_model "deepseek_r1_7b" "deepseek-r1:7b"
else
    log "--- FASE 7: deepseek-r1:7b não disponível, pulando ---"
fi

# =============================================================================
# FASE FINAL: análise completa multi-modelo
# =============================================================================
log "--- ANÁLISE FINAL ---"
python3 analisar_multimodelo.py 2>&1 | tee "$LOG_DIR/analise_final.log"

END_TIME=$(date +%s)
ELAPSED=$(( (END_TIME - START_TIME) / 60 ))
log ""
log "=== BENCHMARK NOTURNO CONCLUÍDO em ${ELAPSED} minutos ==="
log "Arquivos gerados:"
for f in benchmark_*_results.json; do
    N=$(python3 -c "import json; d=json.load(open('$f')); print(len(d))" 2>/dev/null || echo "?")
    log "  $f ($N execuções)"
done
log ""
log "Próximo passo: carregar arquivos no dashboard e avaliar Likert"
log "              python3 analisar_multimodelo.py para análise completa"
