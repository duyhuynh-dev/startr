"""Middleware to log all errors and ensure proper error handling."""

import logging
import traceback
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


class ErrorLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all exceptions before they're handled."""
    
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            # Log the exception BEFORE it's handled
            error_type = type(exc).__name__
            error_msg = str(exc)
            full_traceback = traceback.format_exc()
            
            logger.error(f"\n{'='*60}")
            logger.error(f"EXCEPTION CAUGHT IN MIDDLEWARE:")
            logger.error(f"  Type: {error_type}")
            logger.error(f"  Message: {error_msg}")
            logger.error(f"  Path: {request.url.path}")
            logger.error(f"{'='*60}")
            logger.error(full_traceback)
            logger.error(f"{'='*60}\n")
            
            # Also print to stdout for immediate visibility
            print(f"\n{'='*60}")
            print(f"EXCEPTION CAUGHT IN MIDDLEWARE:")
            print(f"  Type: {error_type}")
            print(f"  Message: {error_msg}")
            print(f"  Path: {request.url.path}")
            print(f"{'='*60}")
            print(full_traceback)
            print(f"{'='*60}\n")
            
            # Re-raise to let exception handlers deal with it
            raise

