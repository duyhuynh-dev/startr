# Backend Service

FastAPI-based API serving the VC × Startup matching platform. Initial version ships in-memory storage for profiles, likes, matches, and due-diligence summaries so the frontend can integrate before the real database + ML stack lands.

## Getting Started

```bash
cd backend
uv sync  # or pip install -r requirements.txt (if you prefer virtualenv)
cd ..
docker compose -f docker-compose.dev.yml up -d  # Postgres + Redis
cd backend
uvicorn app.main:app --reload
```

Visit `http://localhost:8000/api/docs` for Swagger UI. Health endpoint lives at `/healthz`.

## Project Layout

- `app/core`: configuration and shared settings.
- `app/api`: routers + v1 endpoints for profiles, prompts, matches, diligence.
- `app/schemas`: Pydantic models for request/response validation.
- `app/services`: placeholder services (matching + diligence) to be replaced by real implementations (DB, PyTorch, LangChain).
- `app/models`: SQLModel table definitions persisted in Postgres.
- `app/db`: session helpers, engine creation, and auto-migration bootstrap.

## Next Steps

1. Expand SQLModel models (prompt responses, messaging).
2. Surface Redis-backed ranking endpoints (feed, standouts).
3. Replace mock diligence service with ETL-driven pipeline + LangChain summaries.
