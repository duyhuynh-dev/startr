from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.db.session import create_db_and_tables


def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        openapi_url=f"{settings.api_prefix}/openapi.json",
        docs_url=f"{settings.api_prefix}/docs",
        redoc_url=f"{settings.api_prefix}/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_hosts,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.api_prefix)

    @app.on_event("startup")
    def on_startup() -> None:
        create_db_and_tables()

    @app.get("/healthz", tags=["health"])
    def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_application()

