"""CORS utility functions for consistent header generation."""

import fnmatch
import re
from typing import Dict, List, Optional

from fastapi import Request

from app.core.config import settings


def matches_pattern(origin: str, pattern: str) -> bool:
    """
    Check if an origin matches a wildcard pattern.
    
    Supports:
    - Exact match: "https://example.com"
    - Wildcard: "https://*.vercel.app" matches "https://anything.vercel.app"
    - Regex-like: "https://.*\\.vercel\\.app" (alternative format)
    
    Args:
        origin: The origin to check (e.g., "https://startr-4tyf.vercel.app")
        pattern: The pattern to match against (e.g., "https://*.vercel.app")
    
    Returns:
        True if origin matches the pattern, False otherwise
    """
    # Convert wildcard pattern to regex
    # Escape dots and convert * to .*
    regex_pattern = pattern.replace(".", r"\.").replace("*", ".*")
    return bool(re.match(f"^{regex_pattern}$", origin))


def is_origin_allowed(origin: str, allowed_origins: Optional[List[str]] = None) -> bool:
    """
    Check if an origin is allowed for CORS.
    
    Supports:
    - Exact matches: "https://example.com"
    - Wildcard patterns: "https://*.vercel.app"
    - All origins: "*"
    
    Args:
        origin: Origin header value
        allowed_origins: List of allowed origins/patterns (defaults to settings.cors_origins)
    
    Returns:
        True if origin is allowed, False otherwise
    """
    if not origin:
        return False
    
    origins = allowed_origins or settings.cors_origins
    
    # Check for wildcard allowing all
    if "*" in origins:
        return True
    
    # Check exact matches and wildcard patterns
    for allowed_origin in origins:
        if allowed_origin == origin:
            return True
        # Check if it's a wildcard pattern
        if "*" in allowed_origin and matches_pattern(origin, allowed_origin):
            return True
    
    return False


def get_cors_headers(request: Request, allowed_origins: Optional[List[str]] = None) -> Dict[str, str]:
    """
    Generate CORS headers for a request.
    
    Args:
        request: FastAPI request object
        allowed_origins: List of allowed origins (defaults to settings.cors_origins)
    
    Returns:
        Dictionary of CORS headers
    """
    headers: Dict[str, str] = {}
    origin = request.headers.get("origin")
    
    if not origin:
        return headers
    
    # Check if origin is allowed
    if is_origin_allowed(origin, allowed_origins):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    
    return headers

