#!/usr/bin/env python3
"""
Simulação post-hoc de PDC seletiva (gate por nível de ambiguidade) no Benchmark IV.

Política "gate": Baseline para tarefas BAIXA/MEDIA, PDC (modo 'cdh') para ALTA.
Usa o rótulo verdadeiro de ambiguidade (amb) das tarefas — logo é um LIMITE
SUPERIOR (oráculo) de uma política seletiva; um gate real dependeria de um
classificador de ambiguidade com erros próprios.

Nenhuma execução nova: recombina, por id de tarefa, os resultados já existentes.
Llama 3.1 8B usa o arquivo que originou as Tabelas 2 e 4 do artigo
(benchmark_v3_results.OLD_stubs_20260527.json); o benchmark_v3_results.json atual
é a re-run intermediária de 27/05, ainda não incorporada ao artigo.
Comparação pareada (mesmas 100 tarefas) via McNemar exato (binomial nos pares discordantes).

Uso:
  python3 analisar_gate.py
"""

import json
from statistics import mean
from scipy.stats import binomtest

MODELOS = {
    "Llama 3.1 8B": "benchmark_v3_results.OLD_stubs_20260527.json",
    "Llama 3.2 3B": "benchmark_llama32_3b_results.json",
    "Mistral 7B":   "benchmark_mistral7b_results.json",
    "Qwen 2.5 7B":  "benchmark_qwen25_7b_results.json",
    "Gemma 2 9B":   "benchmark_gemma29b_results.json",
    "Phi 3 Mini":   "benchmark_phi3mini_results.json",
}
GATE = {"BAIXA": "baseline", "MEDIA": "baseline", "ALTA": "cdh"}


def load(path):
    with open(path) as f:
        data = json.load(f)
    por_modo = {}
    for r in data:
        r.setdefault("tokens_grand_total", r["tokens_total"] + r.get("tokens_supervisor", 0))
        por_modo.setdefault(r["modo"], {})[r["id"]] = r
    return por_modo


def terminou(r):
    """Terminação conforme definida no artigo: sucesso E resposta não-vazia."""
    return bool(r["sucesso"]) and bool((r.get("resposta") or "").strip())


def politica(por_modo, escolha):
    """escolha: nome de modo fixo ou dict amb→modo. Retorna {id: registro}."""
    ids = por_modo["baseline"].keys()
    if isinstance(escolha, str):
        return {i: por_modo[escolha][i] for i in ids}
    return {i: por_modo[escolha[por_modo["baseline"][i]["amb"]]][i] for i in ids}


def mcnemar(a, b):
    """p exato bilateral para sucesso pareado a vs b."""
    so_a = sum(1 for i in a if terminou(a[i]) and not terminou(b[i]))
    so_b = sum(1 for i in a if terminou(b[i]) and not terminou(a[i]))
    if so_a + so_b == 0:
        return 1.0, so_a, so_b
    return binomtest(so_a, so_a + so_b, 0.5).pvalue, so_a, so_b


def resumo(p):
    succ = sum(terminou(r) for r in p.values())
    tok = mean(r["tokens_grand_total"] for r in p.values())
    return succ, tok


print(f"{'Modelo':<14}{'Base':>12}{'CoT':>12}{'PDC':>12}{'Gate':>12}   Gate×Base (p)   Gate×PDC (p)")
for nome, arq in MODELOS.items():
    pm = load(arq)
    pols = {m: politica(pm, m) for m in ("baseline", "cot", "cdh")}
    pols["gate"] = politica(pm, GATE)
    cols = "".join(f"{s:>4}% {t:>6.0f}t" for s, t in (resumo(pols[k]) for k in ("baseline", "cot", "cdh", "gate")))
    p_b, gb, bg = mcnemar(pols["gate"], pols["baseline"])
    p_c, gc, cg = mcnemar(pols["gate"], pols["cdh"])
    print(f"{nome:<14}{cols}   +{gb}/-{bg} ({p_b:.3f})   +{gc}/-{cg} ({p_c:.4f})")

print("\nColunas: sucesso (% de 100 tarefas) e média de tokens totais (Supervisor + Workers).")
print("+x/-y: tarefas em que o Gate acerta e o outro erra (x) e vice-versa (y).")
print("Gate usa o rótulo verdadeiro de ambiguidade → limite superior de uma PDC seletiva.")
