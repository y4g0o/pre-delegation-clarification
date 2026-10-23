"""
Extrai instrucao_cdh do campo resposta em arquivos de benchmark.

Contexto: benchmark_v3_results.json foi gerado antes do campo instrucao_cdh
ser capturado separadamente. A instrução está em resposta no formato:
  "Delegando para FINALIZAR. [Complexidade: N/10] Instrução: <instrução>"

Uso: python3 extrair_instrucao_cdh.py
"""
import json
import re
from pathlib import Path

BASE = Path(__file__).resolve().parent
PATTERN = re.compile(r'Instrução:\s*(.+?)(?=\s*\[|\Z)', re.DOTALL)

TARGETS = [
    "benchmark_v3_results.json",
    # benchmark_sample_results.json: já tem instrucao_cdh 45/45 preenchidos
    "benchmark_heterogeneous_results.json",
]


def extract_instrucao(resposta: str) -> str:
    m = PATTERN.search(resposta or "")
    return m.group(1).strip() if m else ""


def process_file(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    filled, skipped, already = 0, 0, 0
    for record in data:
        if record.get("modo") != "cdh":
            continue
        existing = record.get("instrucao_cdh", "")
        if existing and existing.strip():
            already += 1
            continue
        extracted = extract_instrucao(record.get("resposta", ""))
        if extracted:
            record["instrucao_cdh"] = extracted
            filled += 1
        else:
            skipped += 1
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return {"filled": filled, "skipped": skipped, "already": already}


def main():
    for filename in TARGETS:
        path = BASE / filename
        if not path.exists():
            print(f"SKIP (não encontrado): {filename}")
            continue
        stats = process_file(path)
        print(
            f"{filename}: "
            f"+{stats['filled']} extraídos, "
            f"{stats['already']} já preenchidos, "
            f"{stats['skipped']} sem instrução"
        )


if __name__ == "__main__":
    main()
