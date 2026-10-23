#!/usr/bin/env python3
"""
Análise multi-modelo e multi-condição do benchmark CDH.
Compara Baseline / CoT-Baseline / CDH em múltiplos modelos.

Uso:
  python3 analisar_multimodelo.py
  python3 analisar_multimodelo.py --sample   (usa benchmark_sample_results.json)
"""

import json
import sys
import math
import os
from statistics import mean, stdev, median
from scipy import stats

SAMPLE_MODE = "--sample" in sys.argv

# Mapeamento: tag → arquivo de resultados
MODELOS = {
    "Llama 3.1 8B":   "benchmark_v3_results.json",
    "Llama 3.2 3B":   "benchmark_llama32_3b_results.json",
    "Qwen 2.5 7B":    "benchmark_qwen25coder_results.json",
    "Mistral 7B":     "benchmark_mistral7b_results.json",
    "Gemma 2 9B":     "benchmark_gemma29b_results.json",
    "Phi 3 Mini":     "benchmark_phi3mini_results.json",
    "DeepSeek-R1 7B": "benchmark_deepseek_r1_7b_results.json",
}

if SAMPLE_MODE:
    MODELOS = {k: v.replace("_results.json", "_sample_results.json") for k, v in MODELOS.items()}
    MODELOS["Llama 3.1 8B"] = "benchmark_sample_results.json"

MODOS = ["baseline", "cot", "cdh"]
CATS  = ["PESQ", "CALC", "ESC"]
AMBS  = ["BAIXA", "MEDIA", "ALTA"]


def load(path):
    if not os.path.exists(path):
        return []
    with open(path) as f:
        data = json.load(f)
    # Normalizar campos faltantes para compatibilidade com versões antigas
    for r in data:
        r.setdefault("tokens_supervisor", 0)
        r.setdefault("tokens_grand_total", r["tokens_total"] + r.get("tokens_supervisor", 0))
        r.setdefault("instrucao_cdh", "")
        r.setdefault("resposta", "")
    return data


def fmt(vals, dec=1):
    if not vals:
        return "—"
    m = mean(vals)
    s = stdev(vals) if len(vals) > 1 else 0
    return f"{m:.{dec}f}±{s:.{dec}f}"


def pct(ok, n):
    return f"{ok/n*100:.0f}%" if n else "—"


def cohens_h(p1, p2):
    return 2 * math.asin(math.sqrt(max(0, min(1, p1)))) - 2 * math.asin(math.sqrt(max(0, min(1, p2))))


def effect_label(h):
    h = abs(h)
    if h < 0.2: return "neg"
    if h < 0.5: return "peq"
    if h < 0.8: return "med"
    return "grd"


def rank_biserial(u, n1, n2):
    return 1 - (2 * u) / (n1 * n2) if n1 * n2 > 0 else 0


def fisher(c_ok, c_n, b_ok, b_n):
    if c_n == 0 or b_n == 0:
        return 1.0
    _, p = stats.fisher_exact([[c_ok, c_n - c_ok], [b_ok, b_n - b_ok]])
    return p


def mwu(c_vals, b_vals):
    if len(c_vals) < 2 or len(b_vals) < 2:
        return 1.0, 0.0
    u, p = stats.mannwhitneyu(c_vals, b_vals, alternative="two-sided")
    r = rank_biserial(u, len(c_vals), len(b_vals))
    return p, r


def sig(p):
    if p < 0.01: return "**"
    if p < 0.05: return "*"
    if p < 0.10: return "~"
    return "✗"


# ── Carregar todos os dados ───────────────────────────────────────────────────
datasets = {}
for nome, path in MODELOS.items():
    d = load(path)
    if d:
        datasets[nome] = d
        print(f"✓ {nome:16s} → {path} ({len(d)} execuções)")
    else:
        print(f"✗ {nome:16s} → {path} (não encontrado)")

if not datasets:
    print("Nenhum arquivo de resultados encontrado.")
    sys.exit(1)

print()

# ── Tabela 1: Resumo geral por modelo × modo ─────────────────────────────────
print("=" * 100)
print("TABELA 1 — RESUMO GERAL POR MODELO E MODO")
print("=" * 100)
print(f"{'Modelo':<18} {'Modo':<10} {'N':>4} {'Sucesso':>8} {'Tok Worker':>12} {'Tok Sup':>10} {'Latência':>10} {'Δ vs Base':>10}")
print("-" * 100)

for nome, data in datasets.items():
    base_ok = sum(1 for r in data if r["modo"] == "baseline" and r["sucesso"])
    base_n  = sum(1 for r in data if r["modo"] == "baseline")
    base_tok = mean([r["tokens_total"] for r in data if r["modo"] == "baseline"]) if base_n else 0

    for modo in MODOS:
        subset = [r for r in data if r["modo"] == modo]
        if not subset:
            continue
        n   = len(subset)
        ok  = sum(1 for r in subset if r["sucesso"])
        tok = [r["tokens_total"] for r in subset]
        lat = [r["latencia_s"] for r in subset]
        tok_sup = [r.get("tokens_supervisor", 0) for r in subset]

        tok_mean = mean(tok) if tok else 0
        delta = f"{(tok_mean - base_tok) / base_tok * 100:+.0f}%" if base_tok and modo != "baseline" else "—"

        print(f"{'  '+nome if modo != MODOS[0] else nome:<18} {modo.upper():<10} {n:>4} {pct(ok,n):>8} {fmt(tok):>12} {fmt(tok_sup):>10} {fmt(lat):>10} {delta:>10}")
    print()

# ── Tabela 2: Comparação CDH vs Baseline por categoria × modelo ──────────────
print("=" * 100)
print("TABELA 2 — CDH vs BASELINE POR CATEGORIA")
print("=" * 100)
print(f"{'Modelo':<18} {'Cat':<6} {'CDH ok':>7} {'Base ok':>8} {'CDH tok':>10} {'Base tok':>10} {'Δ tok':>8} {'p-val':>7} {'sig':>4}")
print("-" * 100)

for nome, data in datasets.items():
    for cat in CATS:
        c = [r for r in data if r["modo"] == "cdh"      and r["cat"] == cat]
        b = [r for r in data if r["modo"] == "baseline" and r["cat"] == cat]
        if not c or not b:
            continue
        c_ok = sum(1 for r in c if r["sucesso"])
        b_ok = sum(1 for r in b if r["sucesso"])
        c_tok = [r["tokens_total"] for r in c]
        b_tok = [r["tokens_total"] for r in b]
        p_tok, r_rb = mwu(c_tok, b_tok)
        delta = f"{(mean(c_tok)-mean(b_tok))/mean(b_tok)*100:+.0f}%" if mean(b_tok) else "—"
        label = f"{nome}" if cat == CATS[0] else ""
        print(f"{label:<18} {cat:<6} {pct(c_ok,len(c)):>7} {pct(b_ok,len(b)):>8} {fmt(c_tok):>10} {fmt(b_tok):>10} {delta:>8} {p_tok:>7.4f} {sig(p_tok):>4}")
    print()

# ── Tabela 3: CDH vs CoT vs Baseline por ambiguidade (se CoT disponível) ─────
has_cot = any(any(r["modo"] == "cot" for r in d) for d in datasets.values())
if has_cot:
    print("=" * 100)
    print("TABELA 3 — GRADIENTE BASELINE → CoT → CDH POR NÍVEL DE AMBIGUIDADE (llama3.1:8b amostra)")
    print("=" * 100)
    data = list(datasets.values())[0]  # usa primeiro dataset disponível com CoT
    for d in datasets.values():
        if any(r["modo"] == "cot" for r in d):
            data = d
            break

    print(f"{'Amb':<8} {'Modo':<10} {'N':>4} {'Sucesso':>8} {'Tok med':>9} {'Tok mean':>10}")
    print("-" * 55)
    for amb in AMBS:
        for modo in MODOS:
            s = [r for r in data if r["amb"] == amb and r["modo"] == modo]
            if not s:
                continue
            ok  = sum(1 for r in s if r["sucesso"])
            tok = [r["tokens_total"] for r in s]
            print(f"{amb:<8} {modo.upper():<10} {len(s):>4} {pct(ok,len(s)):>8} {median(tok):>9.0f} {mean(tok):>10.0f}")
        print()

# ── Tabela 4: Testes estatísticos Fisher CDH vs Baseline por modelo ──────────
print("=" * 100)
print("TABELA 4 — TESTES ESTATÍSTICOS: CDH vs BASELINE (Fisher + Mann-Whitney)")
print("=" * 100)
print(f"{'Modelo':<18} {'Escopo':<10} {'CDH':>7} {'Base':>7} {'p-Fisher':>10} {'h':>7} {'Efeito':<8} {'p-MWU':>8} {'r-rb':>6}")
print("-" * 100)

for nome, data in datasets.items():
    for escopo, filt in [("Geral", lambda r: True)] + [(c, (lambda cat: lambda r: r["cat"]==cat)(c)) for c in CATS] + [(a, (lambda amb: lambda r: r["amb"]==amb)(a)) for a in AMBS]:
        c = [r for r in data if r["modo"] == "cdh"      and filt(r)]
        b = [r for r in data if r["modo"] == "baseline" and filt(r)]
        if not c or not b:
            continue
        c_ok = sum(1 for r in c if r["sucesso"])
        b_ok = sum(1 for r in b if r["sucesso"])
        p_f  = fisher(c_ok, len(c), b_ok, len(b))
        h    = cohens_h(c_ok/len(c), b_ok/len(b))
        c_tok = [r["tokens_total"] for r in c]
        b_tok = [r["tokens_total"] for r in b]
        p_m, r_rb = mwu(c_tok, b_tok)
        label = nome if escopo == "Geral" else ""
        print(f"{label:<18} {escopo:<10} {pct(c_ok,len(c)):>7} {pct(b_ok,len(b)):>7} {p_f:>10.4f} {h:>7.3f} {effect_label(h):<8} {p_m:>8.4f} {r_rb:>6.3f} {sig(p_f)}")
    print()

print("\nLegenda: ** p<0.01 | * p<0.05 | ~ p<0.10 | ✗ p≥0.10")
print("Cohen h: neg<0.2 | peq 0.2-0.5 | med 0.5-0.8 | grd>0.8")
print("r-rb: rank-biserial [-1,1], efeito do Mann-Whitney")
