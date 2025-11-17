# Backend Service

FastAPI-based API serving the VC × Startup matching platform with PostgreSQL, Redis, and ETL pipeline integration.

## Prerequisites

- Python 3.11+
- Docker & Docker Compose (for Postgres and Redis)
- `uv` package manager (recommended) or `pip` + `virtualenv`

## Getting Started

### 1. Install Dependencies

**Using `uv` (recommended):**

```bash
cd backend
uv sync  # Installs all dependencies including dev tools
```

**Using `pip` + `virtualenv`:**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -e ".[dev]"  # Install with dev dependencies
```

### 2. Set Up Environment Variables

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your actual values (or use defaults for local dev)
```

The `.env.example` file contains all available configuration options. For local development, the defaults should work if you're using the docker-compose setup.

### 3. Start Database Services

```bash
# From project root
docker compose -f docker-compose.dev.yml up -d
```

This starts:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

### 4. Initialize Database

**Option 1: Using Alembic (Recommended for production):**

```bash
cd backend
# Create initial migration
alembic revision --autogenerate -m "Initial migration"

# Apply migrations
alembic upgrade head
```

**Option 2: Auto-create tables (Development only):**

```bash
cd backend
python -c "from app.db.session import create_db_and_tables; create_db_and_tables()"
```

Or if running the app, it will auto-create tables on startup (see `app/main.py`). For production, always use Alembic migrations.

### 5. Run the API Server

```bash
cd backend
uvicorn app.main:app --reload
```

Visit `http://localhost:8000/api/docs` for Swagger UI. Health endpoint lives at `/healthz`.

## Configuration

All configuration is managed through environment variables. See `.env.example` for available options:

- **Database**: PostgreSQL connection string
- **Redis**: Redis connection URL
- **External APIs**: Optional keys for Crunchbase, Clearbit, Plaid (currently stubs)
- **Logging**: Log level (INFO, DEBUG, etc.)

## Project Layout

- `app/core`: Configuration and shared settings
- `app/api`: Routers + v1 endpoints for profiles, prompts, matches, messaging, feed, diligence, admin
- `app/schemas`: Pydantic models for request/response validation
- `app/services`: Business logic (matching, messaging, discovery, diligence, admin)
- `app/models`: SQLModel table definitions
- `app/db`: Database session helpers and migrations
- `app/services/etl`: Data source integrations (Crunchbase, Clearbit, Plaid stubs)

## Development

```bash
# Run with auto-reload
uvicorn app.main:app --reload

# Run tests (once implemented)
pytest

# Format code
ruff format .

# Lint
ruff check .
```

## Database Migrations

This project uses Alembic for database schema versioning.

```bash
# Create a new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback to previous version
alembic downgrade -1

# Check current migration status
alembic current

# View migration history
alembic history
```

**Important:** Always review auto-generated migrations before applying them. Alembic may not detect all changes (especially JSON fields or complex relationships).

## Next Steps

1. ✅ Core models and endpoints implemented
2. ✅ Redis-backed discovery feed
3. ✅ Automated diligence service with ETL stubs
4. ✅ Admin endpoints for verification and curation
5. ✅ Error handling and validation improvements
6. ✅ Alembic migrations
7. ⏳ Seed data scripts
8. ⏳ ML integration (PyTorch recommendation engine)
