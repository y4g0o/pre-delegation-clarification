#!/usr/bin/env python3
"""
Prepara a avaliação Likert CEGA do Benchmark VI.

Usa as mesmas 45 tarefas da amostra do Benchmark III (tasks_sample.json), nas condições
baseline, cot e cdh da repetição 1, para comparação direta com a avaliação anterior.
Cada resposta recebe um código aleatório; a planilha NÃO mostra condição, status de
execução, erro, tokens nem latência. A chave fica em arquivo separado — não abra antes
de terminar.

Uso (na raiz do repositório):
  python3 likert_vi/preparar_likert_vi.py --tag llama31_8b
Saídas:
  likert_vi/planilha_avaliacao.csv   (para preencher)
  likert_vi/chave_NAO_ABRIR.json     (mapeamento código -> tarefa/condição)
"""
import argparse
import csv
import json
import random
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument("--tag", default="llama31_8b")
ap.add_argument("--rep", type=int, default=1)
ap.add_argument("--semente", type=int, default=2026)
A = ap.parse_args()

base = Path(__file__).resolve().parent
raiz = base.parent
dados = json.load(open(raiz / f"benchmark_vi_{A.tag}_rep{A.rep}_results.json"))
amostra = {t["id"] for t in json.load(open(raiz / "tasks_sample.json"))}
modos = ("baseline", "cot", "cdh")

itens = [r for r in dados if r["id"] in amostra and r["modo"] in modos]
faltam = len(amostra) * len(modos) - len(itens)
if faltam:
    print(f"Atenção: {faltam} pares tarefa×condição da amostra ainda não existem no arquivo.")

rng = random.Random(A.semente)
rng.shuffle(itens)
codigos = rng.sample(range(1000, 9999), len(itens))

CRITERIOS = ["completude", "correcao_factual", "clareza", "resolucao_ambiguidade", "utilidade"]
with open(base / "planilha_avaliacao.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["codigo", "tarefa", "resposta"] + CRITERIOS + ["observacao"])
    for c, r in zip(codigos, itens):
        resposta = (r.get("resposta") or "").strip() or "(sem resposta)"
        w.writerow([c, r["task"], resposta] + [""] * len(CRITERIOS) + [""])

chave = {str(c): {"id": r["id"], "modo": r["modo"], "amb": r["amb"], "cat": r["cat"]}
         for c, r in zip(codigos, itens)}
json.dump(chave, open(base / "chave_NAO_ABRIR.json", "w"), ensure_ascii=False, indent=1)
print(f"{len(itens)} respostas em likert_vi/planilha_avaliacao.csv (ordem aleatória, condição oculta).")
