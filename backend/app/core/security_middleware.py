"""Security middleware for adding security headers and input sanitization."""

from __future__ import annotations

import html
import re
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # Content Security Policy (adjust based on your needs)
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "  # Allow inline scripts for Swagger UI
            "style-src 'self' 'unsafe-inline'; "  # Allow inline styles for Swagger UI
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self'; "
        )
        response.headers["Content-Security-Policy"] = csp
        
        return response


class InputSanitizationMiddleware(BaseHTTPMiddleware):
    """Sanitize user input to prevent XSS and injection attacks."""

    # Patterns that might indicate injection attempts
    SQL_INJECTION_PATTERNS = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)",
        r"(--|/\*|\*/|;|'|\"|`|\\)",
    ]
    
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"<iframe[^>]*>.*?</iframe>",
        r"javascript:",
        r"onerror\s*=",
        r"onload\s*=",
        r"onclick\s*=",
    ]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Only sanitize POST/PUT/PATCH requests with body
        if request.method in ("POST", "PUT", "PATCH"):
            # Get query parameters
            query_params = dict(request.query_params)
            
            # Check query parameters for suspicious patterns
            for key, value in query_params.items():
                if isinstance(value, str) and self._is_suspicious(value):
                    # Log and return error (don't process malicious requests)
                    from fastapi import HTTPException
                    raise HTTPException(
                        status_code=400,
                        detail=f"Suspicious input detected in parameter: {key}",
                    )
        
        response = await call_next(request)
        return response

    def _is_suspicious(self, value: str) -> bool:
        """Check if input contains suspicious patterns."""
        value_lower = value.lower()
        
        # Check SQL injection patterns
        for pattern in self.SQL_INJECTION_PATTERNS:
            if re.search(pattern, value_lower, re.IGNORECASE):
                return True
        
        # Check XSS patterns
        for pattern in self.XSS_PATTERNS:
            if re.search(pattern, value_lower, re.IGNORECASE | re.DOTALL):
                return True
        
        return False

    @staticmethod
    def sanitize_string(value: str) -> str:
        """Sanitize a string by HTML escaping."""
        return html.escape(value, quote=True)

