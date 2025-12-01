"""JWT authentication and authorization utilities."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt.
    
    Note: bcrypt has a 72-byte limit. Passwords longer than 72 bytes
    will be truncated automatically.
    """
    # Ensure password is a string
    if not isinstance(password, str):
        password = str(password)
    
    # Encode password to bytes
    password_bytes = password.encode('utf-8')
    
    # Truncate to 72 bytes if needed (bcrypt limit)
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    
    # Generate salt and hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    
    # Return as string
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token.
    
    Args:
        data: Data to encode in the token (typically user_id, email, etc.)
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token.
    
    Args:
        data: Data to encode in the token (typically user_id, email, etc.)
        
    Returns:
        Encoded JWT refresh token string
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError:
        return None


def get_token_data(token: str, token_type: str = "access") -> Optional[dict]:
    """Get token data and validate type.
    
    Args:
        token: JWT token string
        token_type: Expected token type ("access" or "refresh")
        
    Returns:
        Token payload if valid and correct type, None otherwise
    """
    payload = decode_token(token)
    if payload and payload.get("type") == token_type:
        return payload
    return None


def create_password_reset_token(user_id: str, email: str) -> str:
    """Create a password reset token.
    
    Args:
        user_id: User ID
        email: User email
        
    Returns:
        Encoded JWT password reset token
    """
    to_encode = {
        "sub": user_id,
        "email": email,
        "type": "password_reset",
    }
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.password_reset_token_expire_hours)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_email_verification_token(user_id: str, email: str) -> str:
    """Create an email verification token.
    
    Args:
        user_id: User ID
        email: User email
        
    Returns:
        Encoded JWT email verification token
    """
    to_encode = {
        "sub": user_id,
        "email": email,
        "type": "email_verification",
    }
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.email_verification_token_expire_hours)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def get_password_reset_token_data(token: str) -> Optional[dict]:
    """Get password reset token data and validate.
    
    Args:
        token: Password reset token
        
    Returns:
        Token payload if valid, None otherwise
    """
    payload = decode_token(token)
    if payload and payload.get("type") == "password_reset":
        return payload
    return None


def get_email_verification_token_data(token: str) -> Optional[dict]:
    """Get email verification token data and validate.
    
    Args:
        token: Email verification token
        
    Returns:
        Token payload if valid, None otherwise
    """
    payload = decode_token(token)
    if payload and payload.get("type") == "email_verification":
        return payload
    return None

