#!/usr/bin/env python3
"""
Análise da avaliação Likert cega do Benchmark VI (depois de preencher a planilha).

Médias por condição e critério, médias por nível de ambiguidade e testes de Wilcoxon
pareados por tarefa (PDC vs. Baseline e PDC vs. CoT), no geral e por nível.

Uso (na raiz do repositório):
  python3 likert_vi/analisar_likert_vi.py
"""
import csv
import json
from pathlib import Path
from statistics import mean

from scipy.stats import wilcoxon

base = Path(__file__).resolve().parent
chave = json.load(open(base / "chave_NAO_ABRIR.json"))
CRITERIOS = ["completude", "correcao_factual", "clareza", "resolucao_ambiguidade", "utilidade"]

notas = {}
for linha in csv.DictReader(open(base / "planilha_avaliacao.csv")):
    k = chave[linha["codigo"]]
    vals = [linha[c].strip() for c in CRITERIOS]
    if all(vals):
        notas[(k["id"], k["modo"])] = {"amb": k["amb"], **{c: int(v) for c, v in zip(CRITERIOS, vals)}}

modos = ("baseline", "cot", "cdh")
media_item = lambda n: mean(n[c] for c in CRITERIOS)

print(f"Itens avaliados: {len(notas)}\n")
print(f"{'Critério':<24}" + "".join(f"{m:>10}" for m in modos))
for c in CRITERIOS:
    print(f"{c:<24}" + "".join(f"{mean(n[c] for (i, m), n in notas.items() if m == mo):>10.2f}" for mo in modos))

for nivel in (None, "BAIXA", "MEDIA", "ALTA"):
    ids = sorted({i for (i, m), n in notas.items() if nivel is None or n["amb"] == nivel})
    ids = [i for i in ids if all((i, m) in notas for m in modos)]
    if not ids:
        continue
    med = {m: mean(media_item(notas[(i, m)]) for i in ids) for m in modos}
    linha = f"\n{nivel or 'GERAL':<6} (n={len(ids)}): " + ", ".join(f"{m} {med[m]:.2f}" for m in modos)
    for outro in ("baseline", "cot"):
        x = [media_item(notas[(i, "cdh")]) for i in ids]
        y = [media_item(notas[(i, outro)]) for i in ids]
        try:
            p = wilcoxon(x, y).pvalue
        except ValueError:
            p = float("nan")
        linha += f" | PDC×{outro} Wilcoxon p={p:.3f}"
    print(linha)
