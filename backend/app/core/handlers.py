"""Exception handlers for FastAPI."""

from datetime import datetime
from typing import Any

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from slowapi.errors import RateLimitExceeded
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.core.cors import get_cors_headers
from app.core.exceptions import AppException
from app.schemas.errors import ErrorDetail, ErrorResponse, ValidationErrorResponse


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle custom application exceptions."""
    # CORS headers will be added by middleware, but explicitly set origin to ensure they're present
    headers = get_cors_headers(request)
    
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.message,
            status_code=exc.status_code,
            details=[
                ErrorDetail(
                    field=exc.details.get("field"),
                    message=exc.details.get("message", exc.message),
                    code=exc.details.get("code"),
                )
            ]
            if exc.details
            else [],
            timestamp=datetime.utcnow().isoformat(),
        ).model_dump(),
        headers=headers,
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle Pydantic validation errors."""
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error.get("loc", []))
        message = error.get("msg", "Validation error")
        error_type = error.get("type", "validation_error")
        
        errors.append(
            ErrorDetail(
                field=field if field != "body" else None,
                message=message,
                code=error_type,
            )
        )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ValidationErrorResponse(
            details=errors,
        ).model_dump(),
    )


async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    """Handle ValueError exceptions (often from service layer)."""
    # CORS headers will be added by middleware, but explicitly set origin to ensure they're present
    headers = get_cors_headers(request)
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=ErrorResponse(
            error=str(exc),
            status_code=400,
            details=[ErrorDetail(message=str(exc))],
            timestamp=datetime.utcnow().isoformat(),
        ).model_dump(),
        headers=headers,
    )


async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    """Handle database integrity errors (duplicate keys, foreign key violations, etc.)."""
    error_msg = str(exc.orig) if exc.orig else "Database integrity error"
    
    # Parse common errors
    if "unique" in error_msg.lower() or "duplicate" in error_msg.lower():
        message = "Resource already exists"
        status_code = status.HTTP_409_CONFLICT
    elif "foreign key" in error_msg.lower():
        message = "Referenced resource does not exist"
        status_code = status.HTTP_400_BAD_REQUEST
    elif "not null" in error_msg.lower():
        message = "Required field is missing"
        status_code = status.HTTP_400_BAD_REQUEST
    else:
        message = "Database constraint violation"
        status_code = status.HTTP_400_BAD_REQUEST

    return JSONResponse(
        status_code=status_code,
        content=ErrorResponse(
            error=message,
            status_code=status_code,
            details=[ErrorDetail(message=error_msg, code="integrity_error")],
            timestamp=datetime.utcnow().isoformat(),
        ).model_dump(),
    )


async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """Handle general SQLAlchemy errors."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error="Database error occurred",
            status_code=500,
            details=[ErrorDetail(message=str(exc), code="database_error")],
            timestamp=datetime.utcnow().isoformat(),
        ).model_dump(),
    )


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Handle rate limit exceeded errors."""
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content=ErrorResponse(
            error="Rate limit exceeded",
            status_code=429,
            details=[
                ErrorDetail(
                    message=f"Too many requests. Limit: {exc.detail}",
                    code="rate_limit_exceeded",
                )
            ],
            timestamp=datetime.utcnow().isoformat(),
        ).model_dump(),
        headers={"Retry-After": str(exc.retry_after) if hasattr(exc, "retry_after") else "60"},
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    # FORCE PRINT THE ERROR TO STDERR
    import sys
    import traceback
    
    error_type = type(exc).__name__
    error_msg = str(exc)
    full_traceback = traceback.format_exc()
    
    print(f"\n{'='*60}", file=sys.stderr, flush=True)
    print(f"GENERIC EXCEPTION HANDLER:", file=sys.stderr, flush=True)
    print(f"  Type: {error_type}", file=sys.stderr, flush=True)
    print(f"  Message: {error_msg}", file=sys.stderr, flush=True)
    print(f"  Path: {request.url.path}", file=sys.stderr, flush=True)
    print(f"{'='*60}", file=sys.stderr, flush=True)
    print(full_traceback, file=sys.stderr, flush=True)
    print(f"{'='*60}\n", file=sys.stderr, flush=True)
    
    # CORS headers will be added by middleware, but explicitly set origin to ensure they're present
    headers = get_cors_headers(request)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error="Internal server error",
            status_code=500,
            details=[ErrorDetail(message=str(exc), code="internal_error")],
            timestamp=datetime.utcnow().isoformat(),
        ).model_dump(),
        headers=headers,
    )

