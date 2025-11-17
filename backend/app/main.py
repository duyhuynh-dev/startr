from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.api.router import api_router
from app.core.config import settings
from app.core.exceptions import AppException
from app.core.handlers import (
    app_exception_handler,
    generic_exception_handler,
    integrity_error_handler,
    rate_limit_exceeded_handler,
    sqlalchemy_error_handler,
    validation_exception_handler,
    value_error_handler,
)
from app.core.rate_limit import limiter
from app.core.security_middleware import (
    InputSanitizationMiddleware,
    SecurityHeadersMiddleware,
)
from app.db.session import create_db_and_tables


def create_application() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        description="""
        VC × Startup Matching API - A Hinge-style platform for connecting investors and founders.
        
        ## Features
        
        * **Profiles**: Create and manage investor/founder profiles with prompt-based responses
        * **Discovery Feed**: Get ranked recommendations of potential matches
        * **Likes & Matches**: Like profiles and get matched when interest is mutual
        * **Messaging**: Threaded conversations between matched users
        * **Due Diligence**: Automated background checks and risk analysis
        * **Admin Tools**: Verification review and featured startup curation
        
        ## Authentication
        
        Currently, the API operates without authentication for MVP. In production, this will use
        Firebase Auth with email/phone OTP and LinkedIn OAuth.
        """,
        openapi_url=f"{settings.api_prefix}/openapi.json",
        docs_url=f"{settings.api_prefix}/docs",
        redoc_url=f"{settings.api_prefix}/redoc",
        tags_metadata=[
            {
                "name": "profiles",
                "description": "Manage user profiles (investors and founders) with prompts and verification.",
            },
            {
                "name": "prompts",
                "description": "CRUD operations for prompt templates used in profile building.",
            },
            {
                "name": "matches",
                "description": "Send likes and view mutual matches between users.",
            },
            {
                "name": "messaging",
                "description": "Threaded messaging between matched users.",
            },
            {
                "name": "feed",
                "description": "Discovery feed, likes queue, and standout profiles for matching.",
            },
            {
                "name": "diligence",
                "description": "Automated due diligence summaries with ETL data and risk flags.",
            },
            {
                "name": "admin",
                "description": "Admin operations for verification review and featured startup curation.",
            },
            {
                "name": "health",
                "description": "Health check endpoint.",
            },
        ],
    )

    # Add exception handlers
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(ValueError, value_error_handler)
    app.add_exception_handler(IntegrityError, integrity_error_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_error_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
    
    # Rate limiting exception handler
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

    # Security middleware (order matters - security headers should be first)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(InputSanitizationMiddleware)
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_hosts,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.api_prefix)
    
    # Mount limiter to app state (required by slowapi)
    app.state.limiter = limiter

    @app.on_event("startup")
    def on_startup() -> None:
        create_db_and_tables()

    @app.get("/healthz", tags=["health"])
    @limiter.limit("100/minute")  # Rate limit health checks
    def healthcheck(request: Request) -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_application()

