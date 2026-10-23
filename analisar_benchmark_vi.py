#!/usr/bin/env python3
"""
Análise do Benchmark VI (nova tentativa com código corrigido). Gera um relatório em Markdown.

Para cada repetição e no conjunto:
  - terminação (sucesso E resposta não vazia) por condição, com IC 95% de Wilson;
  - H1: PDC vs. Baseline (McNemar exato), geral e em ALTA ambiguidade;
  - variabilidade entre repetições (amplitude da terminação);
  - acerto nas 24 tarefas CALC verificáveis (gabarito de corrigir_calc.py);
  - PDC seletiva: (a) oráculo com o rótulo verdadeiro; (b) REAL, com a classificação
    tipo_ambiguidade do próprio Supervisor ('nenhuma' -> Baseline, demais -> PDC);
  - agente único vs. PDC e vs. Baseline.

Uso:
  python3 analisar_benchmark_vi.py --tag llama31_8b
  python3 analisar_benchmark_vi.py --tag llama31_8b --dir pasta/ --saida relatorio.md
"""

import argparse
import glob
import json
import math
import os
from statistics import mean

from scipy.stats import binomtest

from corrigir_calc import GABARITO, correta

ap = argparse.ArgumentParser()
ap.add_argument("--tag", default="llama31_8b")
ap.add_argument("--dir", default=".")
ap.add_argument("--saida", default=None)
A = ap.parse_args()

ORIGINAL_BENCH_II = "Benchmark II original (execução única, 2026): Baseline 89%, PDC 97%, McNemar p=0,039; ALTA 66,7% vs 93,3%, p=0,021."


def terminou(r):
    return bool(r["sucesso"]) and bool((r.get("resposta") or "").strip())


def wilson(k, n, z=1.96):
    if n == 0:
        return (0, 0)
    p = k / n
    d = 1 + z * z / n
    c = p + z * z / (2 * n)
    r = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return (100 * (c - r) / d, 100 * (c + r) / d)


def mcnemar(a, b, ids):
    so_a = sum(1 for i in ids if a[i] and not b[i])
    so_b = sum(1 for i in ids if b[i] and not a[i])
    p = 1.0 if so_a + so_b == 0 else binomtest(so_a, so_a + so_b, 0.5).pvalue
    return so_a, so_b, p


def _amb_sup(r):
    """Classificação inicial do Supervisor (campo novo); cai para o campo antigo se ausente."""
    return (r.get("tipo_ambiguidade_inicial") or r.get("tipo_ambiguidade") or "nenhuma").strip() or "nenhuma"


def pct(k, n):
    return f"{100 * k / n:.0f}%" if n else "—"


arquivos = sorted(glob.glob(os.path.join(A.dir, f"benchmark_vi_{A.tag}_rep*_results.json")))
if not arquivos:
    raise SystemExit(f"Nenhum arquivo benchmark_vi_{A.tag}_rep*_results.json em {A.dir}")

L = [f"# Relatório — Benchmark VI ({A.tag})", "", f"> {ORIGINAL_BENCH_II}", "",
     "Terminação = atingiu FINALIZAR sem erro **e** com resposta não vazia.", ""]
resumo_term = {}

for arq in arquivos:
    dados = json.load(open(arq))
    rep = dados[0].get("repeticao", "?") if dados else "?"
    por = {}
    for r in dados:
        por.setdefault(r["modo"], {})[r["id"]] = r
    modos = [m for m in ("baseline", "cot", "cdh", "agente_unico") if m in por]
    ids = sorted(set.intersection(*(set(por[m]) for m in modos)))
    amb = {i: por[modos[0]][i]["amb"] for i in ids}
    T = {m: {i: terminou(por[m][i]) for i in ids} for m in modos}

    L += [f"## Repetição {rep} — `{os.path.basename(arq)}` ({len(ids)} tarefas completas)", "",
          "| Condição | Terminação | IC 95% | ALTA | Tokens totais (média) | Latência média (s) |",
          "|---|---|---|---|---|---|"]
    for m in modos:
        k = sum(T[m].values())
        lo, hi = wilson(k, len(ids))
        alta = [i for i in ids if amb[i] == "ALTA"]
        tok = mean(por[m][i]["tokens_grand_total"] for i in ids)
        lat = mean(por[m][i]["latencia_s"] for i in ids)
        L.append(f"| {m} | {pct(k, len(ids))} | {lo:.0f}–{hi:.0f}% | {pct(sum(T[m][i] for i in alta), len(alta))} | {tok:.0f} | {lat:.1f} |")
        resumo_term.setdefault(m, []).append(100 * k / len(ids))
    L.append("")

    if "cdh" in T and "baseline" in T:
        a, b, p = mcnemar(T["cdh"], T["baseline"], ids)
        alta = [i for i in ids if amb[i] == "ALTA"]
        a2, b2, p2 = mcnemar(T["cdh"], T["baseline"], alta)
        L += [f"**H1 (PDC vs. Baseline):** só PDC terminou em {a}, só Baseline em {b} — McNemar p={p:.3f}. "
              f"Em ALTA: {a2} vs {b2}, p={p2:.3f}.", ""]

    # Acerto CALC verificável
    calc = [i for i in ids if i in GABARITO]
    if calc:
        L += ["**Acerto nas tarefas CALC verificáveis** "
              f"({len(calc)} tarefas): " + "; ".join(
                  f"{m} {pct(sum(T[m][i] and correta(i, por[m][i].get('resposta', '')) for i in calc), len(calc))}"
                  for m in modos), ""]

    # PDC seletiva
    if "cdh" in T and "baseline" in T:
        oraculo = {i: T["cdh"][i] if amb[i] == "ALTA" else T["baseline"][i] for i in ids}
        real = {i: T["cdh"][i] if _amb_sup(por["cdh"][i]) != "nenhuma"
                else T["baseline"][i] for i in ids}
        n_pdc = sum(1 for i in ids if _amb_sup(por["cdh"][i]) != "nenhuma")
        acerto_cls = sum(1 for i in ids if (_amb_sup(por["cdh"][i]) != "nenhuma") == (amb[i] == "ALTA"))
        _, _, p_or = mcnemar(oraculo, T["baseline"], ids)
        _, _, p_re = mcnemar(real, T["baseline"], ids)
        L += ["**PDC seletiva:**",
              f"- oráculo (rótulo verdadeiro): {pct(sum(oraculo.values()), len(ids))} (vs Baseline p={p_or:.3f})",
              f"- real (classificação do Supervisor; PDC em {n_pdc} tarefas): {pct(sum(real.values()), len(ids))} "
              f"(vs Baseline p={p_re:.3f}); concordância 'ambígua?' × rótulo ALTA: {pct(acerto_cls, len(ids))}",
              "- custo do classificador não incluído na terminação; em tokens, o limite superior é somar os tokens do Supervisor da PDC.", ""]

    if "agente_unico" in T:
        for m in ("cdh", "baseline"):
            if m in T:
                a, b, p = mcnemar(T["agente_unico"], T[m], ids)
                L.append(f"**Agente único vs {m}:** só agente único terminou em {a}, só {m} em {b} — p={p:.3f}.")
        L.append("")

if len(arquivos) > 1:
    L += ["## Variabilidade entre repetições", "", "| Condição | Terminação por repetição | Amplitude |", "|---|---|---|"]
    for m, v in resumo_term.items():
        L.append(f"| {m} | {', '.join(f'{x:.0f}%' for x in v)} | {max(v) - min(v):.0f} p.p. |")
    L.append("")

texto = "\n".join(L)
saida = A.saida or f"docs/RELATORIO_BENCHMARK_VI_{A.tag}.md"
os.makedirs(os.path.dirname(saida) or ".", exist_ok=True)
open(saida, "w").write(texto + "\n")
print(texto)
print(f"\n[relatório salvo em {saida}]")
