#!/usr/bin/env python3
"""
Correção automática das tarefas CALC verificáveis (BAIXA e MÉDIA ambiguidade).

As tarefas CALC_A* (ALTA) não têm resposta única ("Qual é o resultado?") e ficam de fora.
Uma resposta é considerada CORRETA quando todos os valores-chave do gabarito aparecem
no texto (tolerância relativa de 0,5%), aceitando formatação pt-BR e en-US.
Respostas armazenadas truncadas em 800 caracteres podem ser subestimadas.

Uso:
  python3 corrigir_calc.py
"""

import json
import re
from scipy.stats import binomtest

ARQUIVOS = {
    "Llama 3.2 3B": "benchmark_llama32_3b_results.json",
    "Mistral 7B":   "benchmark_mistral7b_results.json",
    "Qwen 2.5 7B":  "benchmark_qwen25_7b_results.json",
    "Gemma 2 9B":   "benchmark_gemma29b_results.json",
    "Phi 3 Mini":   "benchmark_phi3mini_results.json",
}

# Valores-chave por tarefa; listas aninhadas = alternativas aceitas (interpretações válidas).
GABARITO = {
    "CALC_B1": [4294967296],
    "CALC_B2": [56309],
    "CALC_B3": [1307674368000],
    "CALC_B4": [325],
    "CALC_B5": [1203],
    "CALC_B6": [120000],
    "CALC_B7": [10],
    "CALC_B8": [153.94],
    "CALC_B9": [46.97],
    "CALC_B10": [4.25],
    "CALC_B11": [16, 192],
    "CALC_B12": [855],
    "CALC_M1": [round(5000 * 1.008 ** 24, 2)],
    "CALC_M2": [367.38, 44085.6],
    "CALC_M3": [297.5, 267.75],
    "CALC_M4": [144000],
    "CALC_M5": [28.73],
    "CALC_M6": [12.86, 206.15],
    "CALC_M7": [4, 260],
    "CALC_M8": [round(8000 * 1.14 ** 3, 2)],
    "CALC_M9": [67.5],
    "CALC_M10": [33, 0.25],
    "CALC_M11": [[round(45 / (1 - 0.35 - 0.12), 2), round(45 * 1.35 / 0.88, 2)]],
    "CALC_M12": [[266.67, 267]],
}

NUM = re.compile(r"\d[\d.,]*")


def numeros(texto):
    """Todas as leituras numéricas plausíveis (pt-BR e en-US) de cada token."""
    out = []
    for tok in NUM.findall(texto):
        tok = tok.rstrip(".,")
        for dec, mil in ((",", "."), (".", ",")):
            s = tok.replace(mil, "").replace(dec, ".")
            try:
                out.append(float(s))
            except ValueError:
                pass
        out.append(float(re.sub(r"[.,]", "", tok)))  # separadores mistos (ex.: 4,294.967.296)
    return out


def contem(valores, v):
    return any(abs(x - v) <= max(0.005 * abs(v), 0.01) for x in valores)


def correta(tid, resposta):
    vals = numeros(resposta or "")
    for chave in GABARITO[tid]:
        alternativas = chave if isinstance(chave, list) else [chave]
        if not any(contem(vals, v) for v in alternativas):
            return False
    return True


def mcnemar(a, b):
    so_a = sum(1 for i in a if a[i] and not b[i])
    so_b = sum(1 for i in a if b[i] and not a[i])
    return 1.0 if so_a + so_b == 0 else binomtest(so_a, so_a + so_b, 0.5).pvalue


if __name__ == "__main__":
    print(f"{'Modelo':<28}{'Base':>7}{'CoT':>7}{'PDC':>7}   PDC×Base (p)   [terminação Base/CoT/PDC]")
    for nome, arq in ARQUIVOS.items():
        dados = json.load(open(arq))
        acerto, term = {}, {}
        for m in ("baseline", "cot", "cdh"):
            rs = {r["id"]: r for r in dados if r["modo"] == m and r["id"] in GABARITO}
            acerto[m] = {i: bool(r["sucesso"]) and correta(i, r.get("resposta", "")) for i, r in rs.items()}
            term[m] = sum(bool(r["sucesso"]) for r in rs.values())
        n = len(acerto["baseline"])
        pct = lambda m: 100 * sum(acerto[m].values()) / n
        print(f"{nome:<28}{pct('baseline'):>6.0f}%{pct('cot'):>6.0f}%{pct('cdh'):>6.0f}%   "
              f"{mcnemar(acerto['cdh'], acerto['baseline']):>8.3f}       "
              f"[{term['baseline']}/{term['cot']}/{term['cdh']} de {n}]")
    print("\nAcerto = terminou com sucesso E contém todos os valores do gabarito (24 tarefas CALC BAIXA/MÉDIA).")
