"""FastAPI dependencies for authentication and authorization."""

from __future__ import annotations

from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.db.session import get_session
from app.models.profile import Profile
from app.models.user import User
from app.services.auth_service import auth_service

# HTTP Bearer token scheme
security = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: Session = Depends(get_session),
) -> User:
    """Dependency to get current authenticated user.
    
    Usage:
        @router.get("/protected")
        def protected_endpoint(user: User = Depends(get_current_user)):
            ...
    
    Raises:
        HTTPException 401: If not authenticated
    """
    # Check if auth is disabled (for development)
    if not credentials:
        # For now, allow unauthenticated access in development
        # In production, this should raise UnauthorizedError
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    try:
        user = auth_service.get_current_user(session, token)
        return user
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency to get current active user.
    
    Usage:
        @router.get("/protected")
        def protected_endpoint(user: User = Depends(get_current_active_user)):
            ...
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    return current_user


def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
) -> Profile:
    """Dependency to get current user's profile.
    
    Usage:
        @router.get("/my-profile")
        def get_my_profile(profile: Profile = Depends(get_current_user_profile)):
            ...
    
    Raises:
        HTTPException 404: If profile not found
    """
    profile = auth_service.get_user_profile(session, current_user)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Please complete your profile setup.",
        )
    return profile


def get_admin_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Dependency to ensure user is an admin.
    
    Usage:
        @router.get("/admin/endpoint")
        def admin_endpoint(admin: User = Depends(get_admin_user)):
            ...
    
    Raises:
        HTTPException 403: If user is not admin
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: Session = Depends(get_session),
) -> Optional[User]:
    """Optional dependency to get current user if authenticated.
    
    Use this for endpoints that work with or without authentication.
    
    Usage:
        @router.get("/public-or-private")
        def endpoint(user: Optional[User] = Depends(get_optional_user)):
            if user:
                # Authenticated user
            else:
                # Anonymous user
    """
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        user = auth_service.get_current_user(session, token)
        return user if user.is_active else None
    except Exception:
        return None

