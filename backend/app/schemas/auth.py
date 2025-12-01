"""Authentication schemas for requests and responses."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class SignUpRequest(BaseModel):
    """Request to create a new user account."""
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    role: str = Field(..., pattern="^(investor|founder)$", description="User role: investor or founder")
    full_name: str = Field(..., min_length=1, max_length=200)


class LoginRequest(BaseModel):
    """Request to login with email and password."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Response with access and refresh tokens."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # Seconds until access token expires


class RefreshTokenRequest(BaseModel):
    """Request to refresh access token."""
    refresh_token: str


class OAuthProvider(str, Enum):
    """Supported OAuth providers."""
    LINKEDIN = "linkedin"
    GOOGLE = "google"
    FIREBASE = "firebase"


class OAuthAuthorizationResponse(BaseModel):
    """Response with OAuth authorization URL."""
    authorization_url: str
    state: str


class OAuthCallbackRequest(BaseModel):
    """Request for OAuth callback.
    
    For LinkedIn/Google: use `code` (authorization code from OAuth provider)
    For Firebase: use `id_token` (Firebase ID token from client SDK)
    """
    code: Optional[str] = None  # For LinkedIn/Google
    id_token: Optional[str] = None  # For Firebase
    state: Optional[str] = None  # OAuth state parameter for CSRF protection


class UserResponse(BaseModel):
    """User information response."""
    id: str
    email: str
    profile_id: Optional[str] = None
    is_active: bool
    is_verified: bool
    is_admin: bool
    created_at: datetime
    last_login: Optional[datetime] = None


class PasswordResetRequest(BaseModel):
    """Request to initiate password reset."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Request to confirm password reset with token."""
    token: str
    new_password: str = Field(..., min_length=8, description="New password must be at least 8 characters")


class EmailVerificationRequest(BaseModel):
    """Request to resend verification email."""
    email: EmailStr


class EmailVerificationConfirm(BaseModel):
    """Request to verify email with token."""
    token: str


class AuthMessageResponse(BaseModel):
    """Simple message response for auth endpoints."""
    message: str

