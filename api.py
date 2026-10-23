"""
CDH Dashboard — Backend FastAPI

Endpoints:
  GET  /api/results                  → lista arquivos benchmark_*.json disponíveis
  GET  /api/results/{filename}       → serve o JSON do arquivo de benchmark
  POST /api/run                      → inicia execução de uma tarefa (assíncrono)
  GET  /api/run/{task_id}/status     → poll do status (running | done | error)
  GET  /api/models                   → lista modelos Ollama disponíveis
  GET  /api/health                   → ping

Roda na porta 8000. CORS limitado a localhost:8080/127.0.0.1:8080.

Concorrência: como o roteamento CDH (heterogeneous workers) é configurado por
variáveis de ambiente do processo, requisições concorrentes ao /api/run são
serializadas via _run_lock — duas execuções com modelos diferentes nunca cruzam.
"""
from __future__ import annotations

import json
import os
import re
import threading
import traceback
import uuid
from collections import OrderedDict
from pathlib import Path
from typing import Optional

import requests as req
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent

app = FastAPI(title="CDH Dashboard API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────────────────────────────
# Estado em memória das tarefas em execução (cap LRU)
# ──────────────────────────────────────────────────────────────────────
_TASKS_CAP = 100
_tasks: "OrderedDict[str, dict]" = OrderedDict()
_tasks_lock = threading.Lock()

# Lock global para serializar execuções: env vars de modelo são por processo,
# então duas threads de /api/run paralelas com modelos distintos cruzariam.
_run_lock = threading.Lock()

# Lista de workers CDH — derivada do WorkerRegistry (fonte única de verdade)
def _get_valid_workers() -> set[str]:
    from src import workers as _w  # side effect: register_worker() popula WORKERS
    from src.registry import WORKERS
    return set(WORKERS.keys())


_VALID_WORKERS = _get_valid_workers()


def _set_task(task_id: str, **fields) -> None:
    with _tasks_lock:
        rec = _tasks.get(task_id) or {}
        rec.update(fields)
        _tasks[task_id] = rec
        _tasks.move_to_end(task_id)
        while len(_tasks) > _TASKS_CAP:
            _tasks.popitem(last=False)


# ──────────────────────────────────────────────────────────────────────
# /api/health
# ──────────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "service": "cdh-dashboard"}


# ──────────────────────────────────────────────────────────────────────
# /api/results — lista e serve arquivos benchmark_*.json
# ──────────────────────────────────────────────────────────────────────
_BENCH_RE = re.compile(r"^benchmark_.*\.json$|^resultados_benchmark\.json$")


@app.get("/api/results")
def list_results() -> dict:
    files = []
    for p in sorted(ROOT.glob("*.json")):
        if _BENCH_RE.match(p.name):
            try:
                size = p.stat().st_size
            except OSError:
                size = 0
            files.append({"filename": p.name, "size_bytes": size})
    return {"files": files}


def _safe_resolve(filename: str) -> Path:
    """Retorna Path absoluto dentro de ROOT — bloqueia symlinks que apontam para fora."""
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Nome de arquivo inválido.")
    if not _BENCH_RE.match(filename):
        raise HTTPException(status_code=400, detail="Apenas arquivos benchmark_*.json.")
    path = (ROOT / filename).resolve()
    try:
        path.relative_to(ROOT.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="Caminho inválido (symlink fora da raiz).")
    return path


@app.get("/api/results/{filename}")
def get_result(filename: str):
    path = _safe_resolve(filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Arquivo {filename} não encontrado.")
    try:
        with path.open(encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha ao ler {filename}: {e}")


# ──────────────────────────────────────────────────────────────────────
# /api/models — Ollama
# ──────────────────────────────────────────────────────────────────────
@app.get("/api/models")
def list_models() -> dict:
    try:
        r = req.get("http://localhost:11434/api/tags", timeout=3)
        r.raise_for_status()
        models = [m["name"] for m in r.json().get("models", [])]
        if not models:
            raise ValueError("lista vazia")
        return {"models": models, "source": "ollama"}
    except Exception:
        return {
            "models": [
                "llama3.1:8b",
                "qwen2.5:7b",
                "qwen2.5-coder:7b",
                "mistral:7b",
                "llama3.2:3b",
            ],
            "source": "fallback",
        }


# ──────────────────────────────────────────────────────────────────────
# /api/run — submissão de tarefa
# ──────────────────────────────────────────────────────────────────────
class RunRequest(BaseModel):
    task: str
    mode: str = "cdh"  # cdh | baseline | cot
    supervisor_model: str = "llama3.1:8b"
    worker_model: str = "llama3.1:8b"
    # Override por worker (heterogeneous routing). Chaves devem estar em _VALID_WORKERS.
    # Ex: {"backend": "qwen2.5-coder:7b", "analista": "qwen2.5:7b"}
    worker_models: Optional[dict[str, str]] = None
    recursion_limit: int = 20


def _apply_env(body: RunRequest) -> dict[str, str]:
    """Aplica env vars para esta execução; retorna snapshot anterior para restaurar."""
    snapshot: dict[str, str] = {}
    keys = ["SUPERVISOR_MODEL", "WORKER_MODEL"]
    for w in _VALID_WORKERS:
        keys.append(w.upper().replace("-", "_") + "_MODEL")
    for k in keys:
        snapshot[k] = os.environ.get(k, "")
    os.environ["SUPERVISOR_MODEL"] = body.supervisor_model
    os.environ["WORKER_MODEL"] = body.worker_model
    if body.worker_models:
        for worker, model in body.worker_models.items():
            if worker not in _VALID_WORKERS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Worker desconhecido em worker_models: {worker}. "
                           f"Válidos: {sorted(_VALID_WORKERS)}",
                )
            env_key = worker.upper().replace("-", "_") + "_MODEL"
            os.environ[env_key] = model
    return snapshot


def _restore_env(snapshot: dict[str, str]) -> None:
    for k, v in snapshot.items():
        if v:
            os.environ[k] = v
        else:
            os.environ.pop(k, None)


@app.post("/api/run")
def start_run(body: RunRequest) -> dict:
    if not body.task or not body.task.strip():
        raise HTTPException(status_code=400, detail="Campo 'task' é obrigatório.")
    if body.mode not in ("cdh", "baseline", "cot"):
        raise HTTPException(status_code=400, detail="Modo inválido (cdh|baseline|cot).")
    # validação prévia de worker_models — falha antes de criar thread
    if body.worker_models:
        invalid = set(body.worker_models) - _VALID_WORKERS
        if invalid:
            raise HTTPException(
                status_code=400,
                detail=f"Workers inválidos em worker_models: {sorted(invalid)}. "
                       f"Válidos: {sorted(_VALID_WORKERS)}",
            )

    task_id = str(uuid.uuid4())
    _set_task(task_id, status="running", result=None, error=None, mode=body.mode, task=body.task)

    def _worker() -> None:
        try:
            with _run_lock:
                snapshot = _apply_env(body)
                try:
                    from benchmark_v2 import run_once
                    result = run_once(body.task, body.mode, recursion_limit=body.recursion_limit)
                finally:
                    _restore_env(snapshot)
            _set_task(task_id, status="done", result=result)
        except Exception as e:
            _set_task(
                task_id,
                status="error",
                error=str(e),
                trace=traceback.format_exc(),
            )

    threading.Thread(target=_worker, daemon=True).start()
    return {"task_id": task_id, "status": "running"}


@app.get("/api/run/{task_id}/status")
def get_run_status(task_id: str) -> dict:
    with _tasks_lock:
        rec = _tasks.get(task_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Task não encontrada.")
    out = {"task_id": task_id, "status": rec["status"]}
    if rec["status"] == "done":
        out["result"] = rec["result"]
    elif rec["status"] == "error":
        out["error"] = rec.get("error", "erro desconhecido")
    return out


@app.get("/api/run")
def list_runs() -> dict:
    with _tasks_lock:
        return {
            "tasks": [
                {"task_id": tid, "status": r["status"], "task": r.get("task", "")[:140]}
                for tid, r in _tasks.items()
            ]
        }


# ──────────────────────────────────────────────────────────────────────
# Entry point para `python api.py` (além de `uvicorn api:app`)
# ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
