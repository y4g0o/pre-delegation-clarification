#!/usr/bin/env python3
"""
Analisa resultados de benchmark e imprime tabelas comparativas CDH vs Baseline.
Inclui testes estatísticos: Fisher's exact test (taxa de sucesso) e Mann-Whitney U (tokens).

Uso: python3 analisar_v2.py [results_file]   (padrão: benchmark_v3_results.json)
"""

import json
import sys
from statistics import mean, stdev
from scipy import stats
import math

RESULTS_FILE = sys.argv[1] if len(sys.argv) > 1 else "benchmark_v3_results.json"

with open(RESULTS_FILE) as f:
    data = json.load(f)

cdh  = [r for r in data if r["modo"] == "cdh"]
base = [r for r in data if r["modo"] == "baseline"]


def fmt(vals, decimals=0):
    if not vals:
        return "—"
    m = mean(vals)
    s = stdev(vals) if len(vals) > 1 else 0
    if decimals == 0:
        return f"{m:.0f} ± {s:.0f}"
    return f"{m:.{decimals}f} ± {s:.{decimals}f}"


def pct_diff(cdh_val, base_val):
    if base_val == 0:
        return "N/A"
    diff = (cdh_val - base_val) / base_val * 100
    sign = "+" if diff >= 0 else ""
    return f"{sign}{diff:.1f}%"


def cohens_h(p1, p2):
    """Effect size for difference between two proportions."""
    return 2 * math.asin(math.sqrt(p1)) - 2 * math.asin(math.sqrt(p2))


def effect_label(h):
    h = abs(h)
    if h < 0.2:  return "negligível"
    if h < 0.5:  return "pequeno"
    if h < 0.8:  return "médio"
    return "grande"


def rank_biserial(u_stat, n1, n2):
    """Rank-biserial correlation from Mann-Whitney U."""
    return 1 - (2 * u_stat) / (n1 * n2)


print("=" * 80)
print("BENCHMARK — CDH vs BASELINE")
print(f"Total: {len(data)} execuções  ({len(cdh)} CDH, {len(base)} Baseline)")
print("=" * 80)

# ── Resumo geral ──────────────────────────────────────────────────────────────
print("\n── RESUMO GERAL ─────────────────────────────────────────────────────────────")
print(f"{'Métrica':<22} {'Baseline':>18} {'CDH':>18} {'Δ CDH vs Base':>16}")
print("-" * 76)

metrics = [
    ("Tokens (worker)", "tokens_total", 0),
    ("Tokens (supervisor)", "tokens_supervisor", 0),
    ("Latência (s)", "latencia_s", 2),
    ("Ciclos ReAct", "ciclos_react", 2),
    ("Taxa sucesso (%)", None, 1),
]

for label, field, dec in metrics:
    if field is None:
        b_ok = sum(1 for r in base if r["sucesso"]) / len(base) * 100 if base else 0
        c_ok = sum(1 for r in cdh  if r["sucesso"]) / len(cdh)  * 100 if cdh  else 0
        print(f"  {label:<20} {b_ok:>17.1f}% {c_ok:>17.1f}% {pct_diff(c_ok, b_ok):>16}")
    else:
        b_vals = [r.get(field, 0) for r in base]
        c_vals = [r.get(field, 0) for r in cdh]
        b_mean = mean(b_vals) if b_vals else 0
        c_mean = mean(c_vals) if c_vals else 0
        print(f"  {label:<20} {fmt(b_vals, dec):>18} {fmt(c_vals, dec):>18} {pct_diff(c_mean, b_mean):>16}")

# ── Por categoria ─────────────────────────────────────────────────────────────
print("\n── POR CATEGORIA ────────────────────────────────────────────────────────────")
print(f"{'Cat | Modo':<16} {'N':>3} {'Sucesso':>8} {'Tokens':>16} {'Latência':>12} {'Ciclos':>10}")
print("-" * 68)

for cat in sorted(set(r["cat"] for r in data)):
    for modo, subset in [("Baseline", base), ("CDH", cdh)]:
        s = [r for r in subset if r["cat"] == cat]
        if not s:
            continue
        n = len(s)
        ok = sum(1 for r in s if r["sucesso"])
        t_vals = [r["tokens_total"] for r in s]
        l_vals = [r["latencia_s"] for r in s]
        c_vals = [r["ciclos_react"] for r in s]
        print(f"  {cat} {modo:<10} {n:>3} {ok/n*100:>7.0f}% {fmt(t_vals):>16} {fmt(l_vals, 1):>12} {fmt(c_vals, 2):>10}")

# ── Por ambiguidade ───────────────────────────────────────────────────────────
print("\n── POR NÍVEL DE AMBIGUIDADE ─────────────────────────────────────────────────")
print(f"{'Amb | Modo':<16} {'N':>3} {'Sucesso':>8} {'Tokens':>16} {'Ciclos':>10}")
print("-" * 56)

for amb in ["BAIXA", "MEDIA", "ALTA"]:
    for modo, subset in [("Baseline", base), ("CDH", cdh)]:
        s = [r for r in subset if r["amb"] == amb]
        if not s:
            continue
        n = len(s)
        ok = sum(1 for r in s if r["sucesso"])
        t_vals = [r["tokens_total"] for r in s]
        c_vals = [r["ciclos_react"] for r in s]
        print(f"  {amb} {modo:<10} {n:>3} {ok/n*100:>7.0f}% {fmt(t_vals):>16} {fmt(c_vals, 2):>10}")

# ── Testes estatísticos ───────────────────────────────────────────────────────
print("\n── TESTES ESTATÍSTICOS (α = 0.05) ──────────────────────────────────────────")

# --- Taxa de sucesso: Fisher's exact test ---
print("\n  [Taxa de sucesso — Fisher's Exact Test]")
print(f"  {'Escopo':<22} {'CDH':>10} {'Baseline':>10} {'p-value':>10} {'Cohen h':>9} {'Efeito':<12} {'Sig.':>5}")
print("  " + "-" * 80)

def fisher_row(label, c_subset, b_subset):
    c_ok  = sum(1 for r in c_subset if r["sucesso"])
    c_fail = len(c_subset) - c_ok
    b_ok  = sum(1 for r in b_subset if r["sucesso"])
    b_fail = len(b_subset) - b_ok
    if len(c_subset) == 0 or len(b_subset) == 0:
        return
    _, p = stats.fisher_exact([[c_ok, c_fail], [b_ok, b_fail]])
    p_cdh  = c_ok / len(c_subset)
    p_base = b_ok / len(b_subset)
    h = cohens_h(p_cdh, p_base)
    sig = "✓" if p < 0.05 else ("~" if p < 0.10 else "✗")
    print(f"  {label:<22} {p_cdh*100:>9.1f}% {p_base*100:>9.1f}% {p:>10.4f} {h:>9.3f} {effect_label(h):<12} {sig:>5}")

fisher_row("Geral",       cdh, base)
for cat in sorted(set(r["cat"] for r in data)):
    fisher_row(f"  {cat}",
               [r for r in cdh  if r["cat"] == cat],
               [r for r in base if r["cat"] == cat])
for amb in ["BAIXA", "MEDIA", "ALTA"]:
    fisher_row(f"  {amb}",
               [r for r in cdh  if r["amb"] == amb],
               [r for r in base if r["amb"] == amb])

# --- Tokens Workers: Mann-Whitney U ---
print("\n  [Tokens Workers — Mann-Whitney U (não-paramétrico)]")
print(f"  {'Escopo':<22} {'CDH med':>10} {'Base med':>10} {'U-stat':>10} {'p-value':>10} {'r (rb)':>8} {'Sig.':>5}")
print("  " + "-" * 72)

def mwu_row(label, c_subset, b_subset):
    c_vals = [r["tokens_total"] for r in c_subset]
    b_vals = [r["tokens_total"] for r in b_subset]
    if len(c_vals) < 2 or len(b_vals) < 2:
        return
    u, p = stats.mannwhitneyu(c_vals, b_vals, alternative="two-sided")
    r = rank_biserial(u, len(c_vals), len(b_vals))
    from statistics import median
    sig = "✓" if p < 0.05 else ("~" if p < 0.10 else "✗")
    print(f"  {label:<22} {median(c_vals):>10.0f} {median(b_vals):>10.0f} {u:>10.0f} {p:>10.4f} {r:>8.3f} {sig:>5}")

mwu_row("Geral",   cdh, base)
for cat in sorted(set(r["cat"] for r in data)):
    mwu_row(f"  {cat}",
            [r for r in cdh  if r["cat"] == cat],
            [r for r in base if r["cat"] == cat])
for amb in ["BAIXA", "MEDIA", "ALTA"]:
    mwu_row(f"  {amb}",
            [r for r in cdh  if r["amb"] == amb],
            [r for r in base if r["amb"] == amb])

print("\n  Legenda: ✓ p<0.05 (significativo) | ~ p<0.10 (tendência) | ✗ p≥0.10 (não significativo)")
print("  Cohen h: <0.2 negligível | 0.2–0.5 pequeno | 0.5–0.8 médio | >0.8 grande")
print("  r (rank-biserial): correlação de efeito para Mann-Whitney, [-1, 1]")

# ── Tarefas com falha ─────────────────────────────────────────────────────────
failed = [r for r in data if not r["sucesso"]]
if failed:
    print(f"\n── FALHAS ({len(failed)}) ──────────────────────────────────────────────────────")
    for r in failed:
        err = r.get("erro") or r.get("proximo_final", "?")
        print(f"  {r['id']:10s} | {r['modo']:8s} | proximo={r['proximo_final']} | {str(err)[:80]}")

print("\nNOTA: tokens_total = Workers apenas | tokens_supervisor capturado via callback (Benchmark IV+)")
