#!/usr/bin/env python3
"""
Análise de tipo_ambiguidade e confiança — CDH paper.

Carrega benchmark_v3_results.json (ou arquivo passado como argumento) e produz:
  1. Distribuição dos 5 tipos de ambiguidade (CDH) por categoria (PESQ/CALC/ESC)
  2. Taxa de sucesso CDH por tipo de ambiguidade
  3. Mediana de tokens por tipo
  4. Correlação Spearman: confiança (0-100) × sucesso
  5. Distribuição de workers_escolhidos por categoria
  6. Top exemplos por tipo para o paper (tarefa → instrucao_cdh)

Uso:
  python3 analisar_ambiguidade.py
  python3 analisar_ambiguidade.py benchmark_v3_results.json
"""

import json
import sys
from collections import Counter
from statistics import median

try:
    from scipy.stats import spearmanr
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

RESULTS_FILE = sys.argv[1] if len(sys.argv) > 1 else "benchmark_v3_results.json"

with open(RESULTS_FILE) as f:
    data = json.load(f)

cdh = [r for r in data if r["modo"] == "cdh"]
baseline = [r for r in data if r["modo"] == "baseline"]

if not cdh:
    print(f"Nenhuma entrada CDH em {RESULTS_FILE}")
    sys.exit(1)

TIPOS = ["nenhuma", "sintatica", "semantica", "contextual", "multi_dominio"]
cats = sorted(set(r.get("cat", "?") for r in cdh))
ambs = ["BAIXA", "MEDIA", "ALTA"]

sep = "=" * 70

# =============================================================================
# 1. Distribuição de tipo_ambiguidade por categoria
# =============================================================================
print(f"\n{sep}")
print("1. DISTRIBUIÇÃO DE tipo_ambiguidade POR CATEGORIA")
print(sep)

header = f"{'Tipo':<18}" + "".join(f"{c:>8}" for c in cats) + f"{'TOTAL':>8}"
print(header)
print("-" * len(header))

tipo_totals = Counter()
for tipo in TIPOS:
    row = f"{tipo:<18}"
    for cat in cats:
        n = sum(1 for r in cdh if r.get("tipo_ambiguidade") == tipo and r.get("cat") == cat)
        row += f"{n:>8}"
        tipo_totals[tipo] += n
    row += f"{tipo_totals[tipo]:>8}"
    print(row)

print("-" * len(header))
total_row = f"{'TOTAL':<18}"
for cat in cats:
    total_row += f"{sum(1 for r in cdh if r.get('cat') == cat):>8}"
total_row += f"{len(cdh):>8}"
print(total_row)

# =============================================================================
# 2. Sucesso CDH por tipo de ambiguidade
# =============================================================================
print(f"\n{sep}")
print("2. TAXA DE SUCESSO CDH POR tipo_ambiguidade")
print(sep)

print(f"{'Tipo':<18} {'N':>5} {'Sucesso':>8} {'Taxa%':>7} {'Tokens med.':>12}")
print("-" * 55)

for tipo in TIPOS:
    subset = [r for r in cdh if r.get("tipo_ambiguidade") == tipo]
    if not subset:
        continue
    n = len(subset)
    ok = sum(1 for r in subset if r["sucesso"])
    med_tok = int(median(r["tokens_total"] for r in subset))
    print(f"{tipo:<18} {n:>5} {ok:>8} {ok/n*100:>6.1f}% {med_tok:>12}")

# Sem filtro de tipo (todos)
n_all = len(cdh)
ok_all = sum(1 for r in cdh if r["sucesso"])
med_all = int(median(r["tokens_total"] for r in cdh))
print("-" * 55)
print(f"{'TOTAL CDH':<18} {n_all:>5} {ok_all:>8} {ok_all/n_all*100:>6.1f}% {med_all:>12}")

# =============================================================================
# 3. Sucesso CDH por ambiguidade (BAIXA/MEDIA/ALTA) e tipo
# =============================================================================
print(f"\n{sep}")
print("3. TAXA DE SUCESSO POR NÍVEL DE AMBIGUIDADE")
print(sep)

print(f"{'Amb':<8} {'N':>5} {'CDH ok':>8} {'CDH%':>6} {'Base ok':>8} {'Base%':>6}")
print("-" * 45)

for amb in ambs:
    c_sub = [r for r in cdh if r.get("amb") == amb]
    b_sub = [r for r in baseline if r.get("amb") == amb]
    if not c_sub:
        continue
    nc, nb = len(c_sub), len(b_sub)
    okc = sum(1 for r in c_sub if r["sucesso"])
    okb = sum(1 for r in b_sub if r["sucesso"]) if nb else 0
    print(f"{amb:<8} {nc:>5} {okc:>8} {okc/nc*100:>5.1f}% {okb:>8} {okb/nb*100 if nb else 0:>5.1f}%")

# =============================================================================
# 4. Correlação Spearman: confiança × sucesso
# =============================================================================
print(f"\n{sep}")
print("4. CORRELAÇÃO SPEARMAN: confiança × sucesso (CDH)")
print(sep)

confianças = [r.get("confianca", 0) for r in cdh]
sucessos = [int(r["sucesso"]) for r in cdh]

if HAS_SCIPY:
    rho, pval = spearmanr(confianças, sucessos)
    print(f"  ρ = {rho:.4f}  |  p = {pval:.4f}")
    if pval < 0.05:
        print(f"  → Correlação {'positiva' if rho > 0 else 'negativa'} significativa (p<0,05)")
    else:
        print(f"  → Sem significância estatística (p≥0,05)")
else:
    print("  scipy não disponível — instale com: pip install scipy")

# Distribuição manual por faixa
print("\n  Sucesso por faixa de confiança:")
print(f"  {'Faixa':<12} {'N':>5} {'Sucesso':>8} {'Taxa%':>7}")
print("  " + "-" * 35)
for lo, hi in [(0, 39), (40, 69), (70, 100)]:
    sub = [r for r in cdh if lo <= r.get("confianca", 0) <= hi]
    if not sub:
        continue
    ok = sum(1 for r in sub if r["sucesso"])
    print(f"  {lo}-{hi:<9} {len(sub):>5} {ok:>8} {ok/len(sub)*100:>6.1f}%")

# =============================================================================
# 5. Distribuição de workers_escolhidos por categoria
# =============================================================================
print(f"\n{sep}")
print("5. DISTRIBUIÇÃO DE workers_escolhidos POR CATEGORIA")
print(sep)

all_workers = sorted(set(
    w for r in cdh for w in r.get("workers_escolhidos", [])
))
if all_workers:
    header = f"{'Worker':<22}" + "".join(f"{c:>8}" for c in cats) + f"{'TOTAL':>8}"
    print(header)
    print("-" * len(header))
    for w in all_workers:
        row = f"{w:<22}"
        total = 0
        for cat in cats:
            n = sum(r.get("workers_escolhidos", []).count(w)
                    for r in cdh if r.get("cat") == cat)
            row += f"{n:>8}"
            total += n
        row += f"{total:>8}"
        print(row)
else:
    print("  Campo workers_escolhidos vazio ou ausente nos dados.")

# =============================================================================
# 6. Top exemplos por tipo (para o paper)
# =============================================================================
print(f"\n{sep}")
print("6. EXEMPLOS ILUSTRATIVOS POR TIPO (CDH, ALTA ambiguidade, sucesso=True)")
print(sep)

for tipo in ["contextual", "sintatica", "semantica", "multi_dominio"]:
    subset = [r for r in cdh
              if r.get("tipo_ambiguidade") == tipo
              and r.get("amb") == "ALTA"
              and r["sucesso"]
              and r.get("instrucao_cdh", "").strip()]
    if not subset:
        # fallback: qualquer ambiguidade
        subset = [r for r in cdh
                  if r.get("tipo_ambiguidade") == tipo
                  and r["sucesso"]
                  and r.get("instrucao_cdh", "").strip()]
    if not subset:
        continue
    ex = subset[0]
    print(f"\n  [{tipo.upper()}] ID={ex.get('id','?')} cat={ex.get('cat','?')} amb={ex.get('amb','?')}")
    task = ex.get("task", "")[:120]
    instrucao = ex.get("instrucao_cdh", "")[:200]
    print(f"  Tarefa:   {task}")
    print(f"  Instrução CDH: {instrucao}")

print(f"\n{sep}")
print(f"Análise concluída — {len(cdh)} execuções CDH em {RESULTS_FILE}")
print(sep)
