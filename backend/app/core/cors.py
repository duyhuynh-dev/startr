"""CORS utility functions for consistent header generation."""

from typing import Dict, List, Optional

from fastapi import Request

from app.core.config import settings


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
    
    # Use provided origins or fall back to settings
    origins = allowed_origins or settings.cors_origins
    
    # Check if origin is allowed (support wildcard)
    if "*" in origins or origin in origins:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    
    return headers


def is_origin_allowed(origin: str, allowed_origins: Optional[List[str]] = None) -> bool:
    """
    Check if an origin is allowed for CORS.
    
    Args:
        origin: Origin header value
        allowed_origins: List of allowed origins (defaults to settings.cors_origins)
    
    Returns:
        True if origin is allowed, False otherwise
    """
    if not origin:
        return False
    
    origins = allowed_origins or settings.cors_origins
    
    return "*" in origins or origin in origins

