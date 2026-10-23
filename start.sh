#!/usr/bin/env bash
# CDH Dashboard — launcher unificado (backend FastAPI + frontend HTTP).
#
# Uso:
#   bash start.sh
#
# Sobe:
#   - Backend  em http://localhost:8000  (uvicorn + api.py)
#   - Frontend em http://localhost:8080  (python -m http.server, serve front-end_CDH/)
#
# Requer:
#   - Python 3.10+
#   - Dependências do backend instaladas: pip install -r requirements_api.txt
#   - Dependências do sistema CDH instaladas: pip install -r requirements.txt
#   - Ollama rodando em http://localhost:11434 (para execução real de tarefas)

set -e
cd "$(dirname "$0")"

echo "=== CDH Dashboard ==="

if ! command -v uvicorn >/dev/null 2>&1; then
  echo "uvicorn não encontrado — instalando dependências do backend..."
  pip install -r requirements_api.txt
fi

echo "Iniciando backend..."
uvicorn api:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "  → Backend:  http://localhost:8000  (pid $BACKEND_PID)"

echo "Iniciando frontend..."
python3 -m http.server 8080 --directory front-end_CDH &
HTTP_PID=$!
echo "  → Frontend: http://localhost:8080  (pid $HTTP_PID)"

echo ""
echo "Pressione Ctrl+C para encerrar ambos."

cleanup() {
  echo ""
  echo "Encerrando..."
  kill "$BACKEND_PID" "$HTTP_PID" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

wait
