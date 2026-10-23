#!/usr/bin/env python3
"""
Análise do Benchmark Heterogêneo — CDH com workers especializados por domínio.

Carrega benchmark_heterogeneous_results.json (gerado por
`benchmark_v2.py --heterogeneous --cot --tasks-file tasks_prog.json --no-timeout`)
e produz:
  1. Taxa de sucesso CDH/CoT/Baseline por categoria (BACK/FRONT/TEST)
  2. Tokens (Workers / Supervisor / Total) por modo
  3. Latência por modo
  4. Comparação de modelos efetivamente usados (snapshot do field 'models')
  5. Testes estatísticos: Fisher Exact (sucesso) + Mann-Whitney U (tokens)
  6. Taxa de fallback (Guard A) por modo

Uso:
  python3 analisar_heterogeneo.py
  python3 analisar_heterogeneo.py benchmark_heterogeneous_results.json
"""

import json
import sys
from collections import Counter, defaultdict
from statistics import median, mean

try:
    from scipy.stats import fisher_exact, mannwhitneyu
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False


RESULTS_FILE = sys.argv[1] if len(sys.argv) > 1 else "benchmark_heterogeneous_results.json"

with open(RESULTS_FILE) as f:
    data = json.load(f)

if not data:
    print(f"{RESULTS_FILE} está vazio.")
    sys.exit(1)

cats = sorted(set(r.get("cat", "?") for r in data))
modos = sorted(set(r["modo"] for r in data))
sep = "=" * 72


# =============================================================================
# 1. Taxa de sucesso por modo × categoria
# =============================================================================
print(f"\n{sep}")
print("1. TAXA DE SUCESSO POR MODO × CATEGORIA")
print(sep)
header = f"{'Modo':<10}" + "".join(f"{c:>10}" for c in cats) + f"{'TOTAL':>10}"
print(header)
print("-" * len(header))

for modo in modos:
    row = f"{modo.upper():<10}"
    tot_n = 0
    tot_ok = 0
    for cat in cats:
        sub = [r for r in data if r["modo"] == modo and r.get("cat") == cat]
        ok = sum(1 for r in sub if r["sucesso"])
        n = len(sub)
        tot_n += n
        tot_ok += ok
        row += f"{f'{ok}/{n}':>10}"
    row += f"{f'{tot_ok}/{tot_n} ({tot_ok/max(tot_n,1)*100:.0f}%)':>10}"
    print(row)


# =============================================================================
# 2. Tokens e latência por modo (médias e medianas)
# =============================================================================
print(f"\n{sep}")
print("2. TOKENS E LATÊNCIA POR MODO (mediana ± IQR)")
print(sep)
print(f"{'Modo':<10} {'N':>4} {'OK':>4} {'Tok.Wk':>10} {'Tok.Sup':>10} {'Tok.Tot':>10} {'Lat.(s)':>10} {'Ciclos':>8}")
print("-" * 78)

for modo in modos:
    sub = [r for r in data if r["modo"] == modo]
    n = len(sub)
    ok = sum(1 for r in sub if r["sucesso"])
    if not sub:
        continue
    tok_w = int(median(r["tokens_total"] for r in sub))
    tok_s = int(median(r.get("tokens_supervisor", 0) for r in sub))
    tok_t = int(median(r.get("tokens_grand_total", r["tokens_total"]) for r in sub))
    lat = median(r["latencia_s"] for r in sub)
    cic = median(r.get("ciclos_react", 0) for r in sub)
    print(f"{modo.upper():<10} {n:>4} {ok:>4} {tok_w:>10} {tok_s:>10} {tok_t:>10} {lat:>10.1f} {cic:>8.1f}")


# =============================================================================
# 3. Modelos efetivamente usados (snapshot do field 'models')
# =============================================================================
print(f"\n{sep}")
print("3. MODELOS EFETIVAMENTE USADOS")
print(sep)

models_seen = set()
for r in data:
    m = r.get("models")
    if isinstance(m, dict):
        for role, model in m.items():
            models_seen.add((role, model))

if models_seen:
    by_role = defaultdict(set)
    for role, model in models_seen:
        by_role[role].add(model)
    for role in sorted(by_role):
        models_list = sorted(by_role[role])
        marker = "  HETEROGÊNEO" if len(models_list) > 1 else ""
        print(f"  {role:<20} → {', '.join(models_list)}{marker}")
else:
    print("  Campo 'models' ausente nos resultados (benchmark anterior à v1.1.0).")


# =============================================================================
# 4. Testes estatísticos: Fisher Exact + Mann-Whitney
# =============================================================================
print(f"\n{sep}")
print("4. TESTES ESTATÍSTICOS — CDH vs BASELINE")
print(sep)

cdh = [r for r in data if r["modo"] == "cdh"]
baseline = [r for r in data if r["modo"] == "baseline"]

if cdh and baseline and HAS_SCIPY:
    cdh_ok = sum(1 for r in cdh if r["sucesso"])
    base_ok = sum(1 for r in baseline if r["sucesso"])
    cdh_n = len(cdh)
    base_n = len(baseline)

    table = [
        [cdh_ok, cdh_n - cdh_ok],
        [base_ok, base_n - base_ok],
    ]
    odds, p_fisher = fisher_exact(table)
    print(f"  Fisher Exact (sucesso): CDH {cdh_ok}/{cdh_n} ({cdh_ok/cdh_n*100:.1f}%) "
          f"vs Baseline {base_ok}/{base_n} ({base_ok/base_n*100:.1f}%)")
    print(f"    odds_ratio={odds:.3f}  p={p_fisher:.4f}  {'✓ significativo' if p_fisher < 0.05 else '— não-significativo'}")

    cdh_toks = [r["tokens_total"] for r in cdh]
    base_toks = [r["tokens_total"] for r in baseline]
    u, p_mwu = mannwhitneyu(cdh_toks, base_toks, alternative="two-sided")
    print(f"  Mann-Whitney U (tokens Workers): CDH med={median(cdh_toks):.0f} "
          f"vs Baseline med={median(base_toks):.0f}")
    print(f"    U={u:.0f}  p={p_mwu:.4f}  {'✓ significativo' if p_mwu < 0.05 else '— não-significativo'}")

    if median(base_toks) > 0:
        delta_pct = (median(cdh_toks) - median(base_toks)) / median(base_toks) * 100
        print(f"    Δ mediana tokens CDH vs Baseline: {delta_pct:+.1f}%")
else:
    print("  scipy indisponível ou dados insuficientes — pulando testes")


# =============================================================================
# 5. Taxa de fallback (Guard A)
# =============================================================================
print(f"\n{sep}")
print("5. TAXA DE FALLBACK (Guard A acionado)")
print(sep)
for modo in modos:
    sub = [r for r in data if r["modo"] == modo]
    if not sub:
        continue
    fb = sum(1 for r in sub if r.get("fallback_usado"))
    print(f"  {modo.upper():<10} {fb}/{len(sub)}  ({fb/len(sub)*100:.1f}%)")


# =============================================================================
# 6. Comparação CDH × CoT-Baseline (isola estrutura formal)
# =============================================================================
cot = [r for r in data if r["modo"] == "cot"]
if cdh and cot and HAS_SCIPY:
    print(f"\n{sep}")
    print("6. CDH vs CoT-Baseline — isolamento da estrutura formal")
    print(sep)
    cdh_ok = sum(1 for r in cdh if r["sucesso"])
    cot_ok = sum(1 for r in cot if r["sucesso"])
    table = [[cdh_ok, len(cdh) - cdh_ok], [cot_ok, len(cot) - cot_ok]]
    odds, p = fisher_exact(table)
    print(f"  Sucesso CDH {cdh_ok}/{len(cdh)} vs CoT {cot_ok}/{len(cot)}: p={p:.4f}")

    cdh_t = [r["tokens_total"] for r in cdh]
    cot_t = [r["tokens_total"] for r in cot]
    u, p_t = mannwhitneyu(cdh_t, cot_t, alternative="two-sided")
    print(f"  Tokens CDH med={median(cdh_t):.0f} vs CoT med={median(cot_t):.0f}: p={p_t:.4f}")


# =============================================================================
# 7. Resumo executivo (para colar no paper)
# =============================================================================
print(f"\n{sep}")
print("7. RESUMO EXECUTIVO (heterogeneous routing em domínio de programação)")
print(sep)
if cdh and baseline:
    cdh_pct = sum(1 for r in cdh if r["sucesso"]) / len(cdh) * 100
    base_pct = sum(1 for r in baseline if r["sucesso"]) / len(baseline) * 100
    tok_delta = (median(r["tokens_total"] for r in cdh) - median(r["tokens_total"] for r in baseline))
    tok_pct = tok_delta / max(median(r["tokens_total"] for r in baseline), 1) * 100
    lat_delta = median(r["latencia_s"] for r in cdh) - median(r["latencia_s"] for r in baseline)
    print(f"  N={len(data)} ({len(cdh)} CDH, {len(baseline)} Baseline, {len(cot)} CoT)")
    print(f"  Sucesso CDH heterogêneo:  {cdh_pct:.1f}%")
    print(f"  Sucesso Baseline (mesma config Worker): {base_pct:.1f}%")
    print(f"  Δ tokens CDH vs Baseline: {tok_pct:+.1f}% (mediana)")
    print(f"  Δ latência CDH vs Baseline: {lat_delta:+.1f}s (mediana)")

print(f"\n{sep}\n")
