"""Authentication service for user management and JWT tokens."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlmodel import Session

logger = logging.getLogger(__name__)

from app.core.auth import (
    create_access_token,
    create_email_verification_token,
    create_password_reset_token,
    create_refresh_token,
    get_email_verification_token_data,
    get_password_hash,
    get_password_reset_token_data,
    get_token_data,
    verify_password,
)
from app.core.redis import redis_client
from app.core.config import settings
from app.core.exceptions import ConflictError, NotFoundError, UnauthorizedError, ValidationError
from app.models.profile import Profile
from app.models.user import User
from app.services.email_service import email_service
from app.services.profile_cache import profile_cache_service


class AuthService:
    """Service for user authentication and authorization."""

    def signup(
        self,
        session: Session,
        email: str,
        password: str,
        role: str,
        full_name: str,
    ) -> tuple[User, Profile]:
        """Create a new user account and associated profile.
        
        Args:
            session: Database session
            email: User email
            password: Plain text password (will be hashed)
            role: User role ("investor" or "founder")
            full_name: User's full name
            
        Returns:
            Tuple of (User, Profile) objects
            
        Raises:
            ConflictError: If email already exists
            ValidationError: If role is invalid
        """
        # Check if user already exists
        existing_user = session.exec(select(User).where(User.email == email)).scalars().first()
        if existing_user:
            raise ConflictError(f"User with email '{email}' already exists")
        
        # Validate role
        if role not in ["investor", "founder"]:
            raise ValidationError(f"Invalid role: {role}. Must be 'investor' or 'founder'")
        
        # Create user
        user = User(
            email=email,
            password_hash=get_password_hash(password),
            is_active=True,
            is_verified=False,  # Email verification required
            is_admin=False,
        )
        session.add(user)
        session.flush()  # Get user ID
        
        # Create profile linked to user
        profile = Profile(
            role=role,
            full_name=full_name,
            email=email,
            verification={
                "soft_verified": False,
                "manual_reviewed": False,
                "accreditation_attested": False,
                "badges": [],
            },
        )
        session.add(profile)
        session.flush()  # Get profile ID
        
        # Link user to profile
        user.profile_id = profile.id
        session.add(user)
        session.commit()
        session.refresh(user)
        session.refresh(profile)
        
        # Send verification email
        try:
            self.request_email_verification(session, user.email)
        except Exception as e:
            # Don't fail signup if email fails - just log
            logger.warning(f"Failed to send verification email during signup: {e}")
        
        return user, profile

    def login(self, session: Session, email: str, password: str) -> tuple[User, str, str]:
        """Authenticate user and generate tokens.
        
        Args:
            session: Database session
            email: User email
            password: Plain text password
            
        Returns:
            Tuple of (User, access_token, refresh_token)
            
        Raises:
            UnauthorizedError: If credentials are invalid
        """
        # Find user - use scalars() to get User instance
        user = session.exec(select(User).where(User.email == email)).scalars().first()
        if not user:
            raise UnauthorizedError("Invalid email or password")
        
        # Verify password
        if not verify_password(password, user.password_hash):
            raise UnauthorizedError("Invalid email or password")
        
        # Check if user is active
        if not user.is_active:
            raise UnauthorizedError("Account is inactive")
        
        # Update last login
        user.last_login = datetime.now(timezone.utc)
        session.add(user)
        session.commit()
        
        # Generate tokens
        token_data = {
            "sub": user.id,  # Subject (user ID)
            "email": user.email,
            "profile_id": user.profile_id,
            "is_admin": user.is_admin,
        }
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        return user, access_token, refresh_token

    def refresh_access_token(self, session: Session, refresh_token: str) -> str:
        """Generate a new access token from a refresh token.
        
        Args:
            session: Database session
            refresh_token: Valid refresh token
            
        Returns:
            New access token
            
        Raises:
            UnauthorizedError: If refresh token is invalid
        """
        # Decode and validate refresh token
        payload = get_token_data(refresh_token, token_type="refresh")
        if not payload:
            raise UnauthorizedError("Invalid refresh token")
        
        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedError("Invalid refresh token")
        
        # Verify user exists and is active
        user = session.get(User, user_id)
        if not user or not user.is_active:
            raise UnauthorizedError("User not found or inactive")
        
        # Generate new access token
        token_data = {
            "sub": user.id,
            "email": user.email,
            "profile_id": user.profile_id,
            "is_admin": user.is_admin,
        }
        return create_access_token(token_data)

    def get_current_user(self, session: Session, token: str) -> User:
        """Get current user from access token.
        
        Args:
            session: Database session
            token: JWT access token
            
        Returns:
            User object
            
        Raises:
            UnauthorizedError: If token is invalid or user not found
        """
        # Decode and validate token
        payload = get_token_data(token, token_type="access")
        if not payload:
            raise UnauthorizedError("Invalid or expired token")
        
        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedError("Invalid token")
        
        # Get user
        user = session.get(User, user_id)
        if not user or not user.is_active:
            raise UnauthorizedError("User not found or inactive")
        
        return user

    def get_user_profile(self, session: Session, user: User) -> Optional[Profile]:
        """Get profile associated with user.
        
        Args:
            session: Database session
            user: User object
            
        Returns:
            Profile object or None if not found
        """
        if not user.profile_id:
            return None
        return session.get(Profile, user.profile_id)

    def request_password_reset(self, session: Session, email: str) -> bool:
        """Request password reset by sending email with reset token.
        
        Args:
            session: Database session
            email: User email address
            
        Returns:
            True if email sent (or would be sent), False otherwise
            
        Note:
            Always returns True to prevent email enumeration attacks.
            If user doesn't exist, no email is sent but we still return True.
        """
        user = session.exec(select(User).where(User.email == email)).scalars().first()
        
        # Always return True to prevent email enumeration
        if not user:
            return True
        
        # Generate reset token
        reset_token = create_password_reset_token(user.id, user.email)
        
        # Store token in Redis with expiration (for rate limiting and tracking)
        # Key format: password_reset:{user_id}
        cache_key = f"password_reset:{user.id}"
        expire_seconds = settings.password_reset_token_expire_hours * 3600
        try:
            redis_client.setex(cache_key, expire_seconds, reset_token)
        except Exception as e:
            logger.warning(f"Failed to cache password reset token: {e}")
        
        # Send email
        email_service.send_password_reset_email(user.email, reset_token)
        
        return True

    def reset_password(self, session: Session, token: str, new_password: str) -> User:
        """Reset password using reset token.
        
        Args:
            session: Database session
            token: Password reset token
            new_password: New plain text password
            
        Returns:
            Updated User object
            
        Raises:
            UnauthorizedError: If token is invalid or expired
            ValidationError: If password is invalid
        """
        # Validate token
        payload = get_password_reset_token_data(token)
        if not payload:
            raise UnauthorizedError("Invalid or expired password reset token")
        
        user_id = payload.get("sub")
        email = payload.get("email")
        
        if not user_id:
            raise UnauthorizedError("Invalid password reset token")
        
        # Get user
        user = session.get(User, user_id)
        if not user:
            raise UnauthorizedError("User not found")
        
        # Verify email matches
        if user.email != email:
            raise UnauthorizedError("Invalid password reset token")
        
        # Check if token is in Redis (for additional validation)
        cache_key = f"password_reset:{user_id}"
        try:
            cached_token = redis_client.get(cache_key)
            if cached_token and cached_token.decode() != token:
                raise UnauthorizedError("Password reset token has already been used or is invalid")
        except Exception as e:
            logger.warning(f"Failed to check password reset token cache: {e}")
        
        # Update password
        user.password_hash = get_password_hash(new_password)
        user.updated_at = datetime.now(timezone.utc)
        session.add(user)
        session.commit()
        
        # Remove token from Redis (one-time use)
        try:
            redis_client.delete(cache_key)
        except Exception as e:
            logger.warning(f"Failed to delete password reset token from cache: {e}")
        
        session.refresh(user)
        return user

    def request_email_verification(self, session: Session, email: str) -> bool:
        """Request email verification by sending verification email.
        
        Args:
            session: Database session
            email: User email address
            
        Returns:
            True if email sent (or would be sent), False otherwise
            
        Note:
            Always returns True to prevent email enumeration attacks.
        """
        user = session.exec(select(User).where(User.email == email)).scalars().first()
        
        # Always return True to prevent email enumeration
        if not user:
            return True
        
        # Skip if already verified
        if user.is_verified:
            return True
        
        # Generate verification token
        verification_token = create_email_verification_token(user.id, user.email)
        
        # Store token in Redis with expiration
        cache_key = f"email_verification:{user.id}"
        expire_seconds = settings.email_verification_token_expire_hours * 3600
        try:
            redis_client.setex(cache_key, expire_seconds, verification_token)
        except Exception as e:
            logger.warning(f"Failed to cache email verification token: {e}")
        
        # Send email
        email_service.send_verification_email(user.email, verification_token)
        
        return True

    def verify_email(self, session: Session, token: str) -> User:
        """Verify email using verification token.
        
        Args:
            session: Database session
            token: Email verification token
            
        Returns:
            Updated User object with is_verified=True
            
        Raises:
            UnauthorizedError: If token is invalid or expired
        """
        # Validate token
        payload = get_email_verification_token_data(token)
        if not payload:
            raise UnauthorizedError("Invalid or expired email verification token")
        
        user_id = payload.get("sub")
        email = payload.get("email")
        
        if not user_id:
            raise UnauthorizedError("Invalid email verification token")
        
        # Get user
        user = session.get(User, user_id)
        if not user:
            raise UnauthorizedError("User not found")
        
        # Verify email matches
        if user.email != email:
            raise UnauthorizedError("Invalid email verification token")
        
        # Skip if already verified
        if user.is_verified:
            return user
        
        # Mark as verified
        user.is_verified = True
        user.updated_at = datetime.now(timezone.utc)
        session.add(user)
        session.commit()
        
        # Remove token from Redis
        cache_key = f"email_verification:{user_id}"
        try:
            redis_client.delete(cache_key)
        except Exception as e:
            logger.warning(f"Failed to delete email verification token from cache: {e}")
        
        session.refresh(user)
        return user


# Singleton instance
auth_service = AuthService()

