"""Rate limiting middleware using slowapi."""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# Initialize limiter with Redis backend
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.redis_url,
    default_limits=[settings.rate_limit_default] if settings.rate_limit_enabled else [],
    headers_enabled=True,
)


def get_rate_limiter() -> Limiter:
    """Get the rate limiter instance."""
    return limiter

