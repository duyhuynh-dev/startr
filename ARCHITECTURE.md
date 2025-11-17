# Architecture & Folder Layout

This document keeps the single source of truth for how the repo is organized as we grow the project. The current structure is intentionally lean but already names future folders so every team member knows where code should live.

```
ambitious-project/
├── README.md                # Product overview and status updates
├── ARCHITECTURE.md          # (this file) folder layout + rationale
├── backend/                 # FastAPI services
│   ├── README.md            # backend-specific getting started
│   ├── pyproject.toml
│   └── app/
│       ├── __init__.py
│       ├── main.py          # FastAPI application factory
│       ├── core/            # settings, logging, security config
│       ├── api/
│       │   ├── router.py
│       │   └── v1/endpoints/
│       ├── schemas/         # Pydantic models shared across layers
│       └── services/        # business logic (matching, diligence, etc.)
├── frontend/                # Next.js application (placeholder)
│   ├── package.json
│   ├── src/
│   │   ├── app/             # Next.js App Router pages/layouts
│   │   ├── components/      # shared UI building blocks
│   │   ├── features/        # feature-specific modules (onboarding, discover…)
│   │   └── lib/             # utils, API clients, hooks
│   └── public/
├── infra/                   # IaC and deployment assets (placeholder)
│   ├── terraform/
│   ├── docker/
│   └── github-actions/
├── docker-compose.dev.yml   # local Postgres + Redis for backend
└── docs/                    # Design docs, API references, diagrams (placeholder)
    ├── product/
    ├── ml/
    └── verification/
```

## Layout Principles

- **Domain-first:** group by feature (profiles, prompts, matching) within each stack to keep context tight.
- **Versioned APIs:** `app/api/v1` ensures compatibility when we iterate on endpoints.
- **Shared schemas/services:** `app/schemas` and `app/services` allow future swapping of persistence/ML without touching routers.
- **Parallel frontend structure:** mirrors feature modules from backend to keep collaboration symmetrical.
- **Infra isolation:** terraform, Docker, CI lives in `infra/` so deployments evolve independently.
- **Docs alongside code:** `docs/` holds diagrams/decisions (ADR-style) tied to commits.

## Near-Term TODOs

1. Scaffold Next.js app inside `frontend/` (soon as backend endpoints stabilize).
2. Add `infra/docker` compose file to run Postgres + Redis locally.
3. Create ADRs in `docs/` for verification strategy and ML pipeline decisions.
