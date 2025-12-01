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
from app.core.error_middleware import ErrorLoggingMiddleware
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

    # Error logging middleware - MUST be added FIRST (innermost) to catch all errors
    app.add_middleware(ErrorLoggingMiddleware)
    
    # Security middleware (added first = inner layer)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(InputSanitizationMiddleware)
    
    # CORS configuration - MUST be added LAST (outermost layer)
    # In FastAPI/Starlette, middleware executes in REVERSE order:
    # Last added = Outermost (executes FIRST, wraps everything)
    # First added = Innermost (executes LAST)
    # This ensures CORS headers are always present, even in error responses
    cors_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.api_prefix)
    
    # Mount limiter to app state (required by slowapi)
    app.state.limiter = limiter

    @app.on_event("startup")
    async def on_startup() -> None:
        create_db_and_tables()
        # Start WebSocket broadcast worker for real-time messaging
        try:
            from app.services.realtime_broadcast import start_broadcast_worker
            start_broadcast_worker()
        except Exception as e:
            # Log but don't fail startup if WebSocket worker fails
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to start WebSocket broadcast worker: {e}")

    @app.get("/healthz", tags=["health"])
    def healthcheck() -> dict[str, str]:
        """Health check endpoint."""
        return {"status": "ok"}

    return app


app = create_application()

