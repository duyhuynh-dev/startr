#!/usr/bin/env bash
# Run on EC2 from repo root:  cd ~/startr && bash backend/deploy/deploy.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$BACKEND_DIR/.." && pwd)"
cd "$REPO_ROOT"
echo ">>> Deploying Startr backend (repo: $(pwd), backend: $BACKEND_DIR)"

echo ">>> Git pull"
git pull origin main || git pull origin master || true

echo ">>> Activate venv and sync deps"
cd "$BACKEND_DIR"
source .venv/bin/activate
uv sync 2>/dev/null || pip install -e . 2>/dev/null || true

echo ">>> Run migrations"
uv run alembic upgrade head 2>/dev/null || .venv/bin/alembic upgrade head

echo ">>> Restart systemd service"
sudo systemctl restart startr-backend

echo ">>> Status"
sudo systemctl status startr-backend --no-pager || true
echo ">>> Done. Check health: curl http://localhost:8012/healthz"
