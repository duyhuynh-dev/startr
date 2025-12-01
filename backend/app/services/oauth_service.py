"""OAuth service for LinkedIn, Google, and Firebase authentication."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlencode

import httpx
from authlib.integrations.httpx_client import AsyncOAuth2Client
from sqlalchemy import select
from sqlmodel import Session

import firebase_admin
from firebase_admin import auth, credentials

from app.core.auth import create_access_token, create_refresh_token
from app.core.config import settings
from app.core.exceptions import UnauthorizedError, ValidationError
from app.models.profile import Profile
from app.models.user import User


class OAuthService:
    """Service for OAuth authentication with LinkedIn, Google, and Firebase."""

    def __init__(self):
        """Initialize OAuth service and Firebase Admin SDK."""
        self._firebase_app: Optional[firebase_admin.App] = None
        self._init_firebase()

    def _init_firebase(self) -> None:
        """Initialize Firebase Admin SDK if credentials are provided."""
        if not all([
            settings.firebase_project_id,
            settings.firebase_private_key,
            settings.firebase_client_email,
        ]):
            return  # Firebase not configured

        try:
            # Parse private key (handle newlines)
            private_key = settings.firebase_private_key.replace("\\n", "\n")
            
            # Create Firebase credentials
            cred = credentials.Certificate({
                "type": "service_account",
                "project_id": settings.firebase_project_id,
                "private_key_id": "",
                "private_key": private_key,
                "client_email": settings.firebase_client_email,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            })
            
            # Initialize Firebase Admin SDK
            self._firebase_app = firebase_admin.initialize_app(cred)
        except Exception as e:
            # Log but don't fail - Firebase is optional
            print(f"Warning: Firebase Admin SDK initialization failed: {e}")

    def generate_state(self) -> str:
        """Generate a random state string for OAuth CSRF protection."""
        return secrets.token_urlsafe(32)

    def get_linkedin_authorization_url(self, redirect_uri: str, state: Optional[str] = None) -> tuple[str, str]:
        """Generate LinkedIn OAuth authorization URL.
        
        Args:
            redirect_uri: OAuth callback URL
            state: CSRF protection state (will be generated if not provided)
            
        Returns:
            Tuple of (authorization_url, state)
            
        Raises:
            ValidationError: If LinkedIn credentials are not configured
        """
        if not settings.linkedin_client_id:
            raise ValidationError("LinkedIn OAuth is not configured. Please add LINKEDIN_CLIENT_ID to .env")
        
        if not state:
            state = self.generate_state()
        
        base_url = "https://www.linkedin.com/oauth/v2/authorization"
        params = {
            "response_type": "code",
            "client_id": settings.linkedin_client_id,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": "openid profile email",  # Request basic profile info
        }
        
        authorization_url = f"{base_url}?{urlencode(params)}"
        return authorization_url, state

    def get_google_authorization_url(self, redirect_uri: str, state: Optional[str] = None) -> tuple[str, str]:
        """Generate Google OAuth authorization URL.
        
        Args:
            redirect_uri: OAuth callback URL
            state: CSRF protection state (will be generated if not provided)
            
        Returns:
            Tuple of (authorization_url, state)
            
        Raises:
            ValidationError: If Google credentials are not configured
        """
        if not settings.google_client_id:
            raise ValidationError("Google OAuth is not configured. Please add GOOGLE_CLIENT_ID to .env")
        
        if not state:
            state = self.generate_state()
        
        base_url = "https://accounts.google.com/o/oauth2/v2/auth"
        params = {
            "response_type": "code",
            "client_id": settings.google_client_id,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "consent",
        }
        
        authorization_url = f"{base_url}?{urlencode(params)}"
        return authorization_url, state

    async def handle_linkedin_callback(
        self, session: Session, code: str, redirect_uri: str
    ) -> tuple[User, str, str]:
        """Handle LinkedIn OAuth callback and create/login user.
        
        Args:
            session: Database session
            code: OAuth authorization code
            redirect_uri: OAuth callback URL
            
        Returns:
            Tuple of (User, access_token, refresh_token)
            
        Raises:
            UnauthorizedError: If OAuth flow fails
            ValidationError: If LinkedIn credentials are not configured
        """
        if not settings.linkedin_client_id or not settings.linkedin_client_secret:
            raise ValidationError("LinkedIn OAuth is not configured. Please add credentials to .env")
        
        # Exchange code for access token
        token_url = "https://www.linkedin.com/oauth/v2/accessToken"
        token_data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": settings.linkedin_client_id,
            "client_secret": settings.linkedin_client_secret,
        }
        
        async with httpx.AsyncClient() as client:
            # Get access token
            token_response = await client.post(
                token_url,
                data=token_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            
            if token_response.status_code != 200:
                raise UnauthorizedError("Failed to exchange LinkedIn authorization code")
            
            token_json = token_response.json()
            access_token = token_json.get("access_token")
            if not access_token:
                raise UnauthorizedError("Failed to get LinkedIn access token")
            
            # Get user info from LinkedIn
            profile_url = "https://api.linkedin.com/v2/userinfo"
            profile_response = await client.get(
                profile_url,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            
            if profile_response.status_code != 200:
                raise UnauthorizedError("Failed to get LinkedIn user profile")
            
            profile_data = profile_response.json()
            linkedin_id = profile_data.get("sub")  # LinkedIn user ID
            email = profile_data.get("email")
            full_name = profile_data.get("name", "")
            given_name = profile_data.get("given_name", "")
            family_name = profile_data.get("family_name", "")
            
            if not linkedin_id:
                raise UnauthorizedError("Failed to get LinkedIn user ID")
            
            # Use name parts if full name not available
            if not full_name and (given_name or family_name):
                full_name = f"{given_name} {family_name}".strip()
            
            # Find or create user
            user = session.exec(
                select(User).where(User.linkedin_id == linkedin_id)
            ).scalars().first()
            
            if not user:
                # Check if user exists with this email
                if email:
                    user = session.exec(
                        select(User).where(User.email == email)
                    ).scalars().first()
                    
                    if user:
                        # Link LinkedIn ID to existing user
                        user.linkedin_id = linkedin_id
                    else:
                        # Create new user
                        user = User(
                            email=email or f"linkedin_{linkedin_id}@oauth.local",
                            linkedin_id=linkedin_id,
                            is_active=True,
                            is_verified=True,  # OAuth users are considered verified
                        )
                        session.add(user)
                        session.flush()
                        
                        # Create profile (default to founder, user can update later)
                        profile = Profile(
                            role="founder",  # Default role
                            full_name=full_name or "LinkedIn User",
                            email=email or user.email,
                            verification={
                                "soft_verified": True,  # OAuth = soft verified
                                "manual_reviewed": False,
                                "accreditation_attested": False,
                                "badges": ["oauth_linkedin"],
                            },
                        )
                        session.add(profile)
                        session.flush()
                        user.profile_id = profile.id
            else:
                # Update last login
                user.last_login = datetime.now(timezone.utc)
            
            session.commit()
            session.refresh(user)
            
            # Generate tokens
            token_data = {
                "sub": user.id,
                "email": user.email,
                "profile_id": user.profile_id,
                "is_admin": user.is_admin,
            }
            access_token_jwt = create_access_token(token_data)
            refresh_token = create_refresh_token(token_data)
            
            return user, access_token_jwt, refresh_token

    async def handle_google_callback(
        self, session: Session, code: str, redirect_uri: str
    ) -> tuple[User, str, str]:
        """Handle Google OAuth callback and create/login user.
        
        Args:
            session: Database session
            code: OAuth authorization code
            redirect_uri: OAuth callback URL
            
        Returns:
            Tuple of (User, access_token, refresh_token)
            
        Raises:
            UnauthorizedError: If OAuth flow fails
            ValidationError: If Google credentials are not configured
        """
        if not settings.google_client_id or not settings.google_client_secret:
            raise ValidationError("Google OAuth is not configured. Please add credentials to .env")
        
        # Exchange code for access token using authlib
        async with AsyncOAuth2Client(
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
        ) as client:
            token_response = await client.fetch_token(
                "https://oauth2.googleapis.com/token",
                code=code,
                redirect_uri=redirect_uri,
            )
            
            access_token = token_response.get("access_token")
            if not access_token:
                raise UnauthorizedError("Failed to get Google access token")
            
            # Get user info from Google
            userinfo_response = await client.get(
                "https://openidconnect.googleapis.com/v1/userinfo",
                token=access_token,
            )
            
            if userinfo_response.status_code != 200:
                raise UnauthorizedError("Failed to get Google user profile")
            
            profile_data = userinfo_response.json()
            google_id = profile_data.get("sub")  # Google user ID
            email = profile_data.get("email")
            full_name = profile_data.get("name", "")
            given_name = profile_data.get("given_name", "")
            family_name = profile_data.get("family_name", "")
            picture = profile_data.get("picture")
            
            if not google_id:
                raise UnauthorizedError("Failed to get Google user ID")
            
            # Use name parts if full name not available
            if not full_name and (given_name or family_name):
                full_name = f"{given_name} {family_name}".strip()
            
            # Find or create user
            user = session.exec(
                select(User).where(User.google_id == google_id)
            ).scalars().first()
            
            if not user:
                # Check if user exists with this email
                if email:
                    user = session.exec(
                        select(User).where(User.email == email)
                    ).scalars().first()
                    
                    if user:
                        # Link Google ID to existing user
                        user.google_id = google_id
                    else:
                        # Create new user
                        user = User(
                            email=email or f"google_{google_id}@oauth.local",
                            google_id=google_id,
                            is_active=True,
                            is_verified=True,  # OAuth users are considered verified
                        )
                        session.add(user)
                        session.flush()
                        
                        # Create profile (default to founder, user can update later)
                        profile = Profile(
                            role="founder",  # Default role
                            full_name=full_name or "Google User",
                            email=email or user.email,
                            profile_picture_url=picture,  # Use Google profile picture
                            verification={
                                "soft_verified": True,  # OAuth = soft verified
                                "manual_reviewed": False,
                                "accreditation_attested": False,
                                "badges": ["oauth_google"],
                            },
                        )
                        session.add(profile)
                        session.flush()
                        user.profile_id = profile.id
            else:
                # Update last login
                user.last_login = datetime.now(timezone.utc)
            
            session.commit()
            session.refresh(user)
            
            # Generate tokens
            token_data = {
                "sub": user.id,
                "email": user.email,
                "profile_id": user.profile_id,
                "is_admin": user.is_admin,
            }
            access_token_jwt = create_access_token(token_data)
            refresh_token = create_refresh_token(token_data)
            
            return user, access_token_jwt, refresh_token

    async def handle_firebase_callback(
        self, session: Session, id_token: str
    ) -> tuple[User, str, str]:
        """Handle Firebase authentication callback and create/login user.
        
        Args:
            session: Database session
            id_token: Firebase ID token
            
        Returns:
            Tuple of (User, access_token, refresh_token)
            
        Raises:
            UnauthorizedError: If Firebase authentication fails
            ValidationError: If Firebase is not configured
        """
        if not self._firebase_app:
            raise ValidationError("Firebase is not configured. Please add Firebase credentials to .env")
        
        try:
            # Verify Firebase ID token
            decoded_token = auth.verify_id_token(id_token)
            firebase_uid = decoded_token.get("uid")
            email = decoded_token.get("email")
            name = decoded_token.get("name", "")
            picture = decoded_token.get("picture")
            
            if not firebase_uid:
                raise UnauthorizedError("Failed to get Firebase user ID")
            
            # Find or create user by email (Firebase uses email as primary identifier)
            user = None
            if email:
                user = session.exec(
                    select(User).where(User.email == email)
                ).scalars().first()
            
            if not user:
                # Create new user
                user = User(
                    email=email or f"firebase_{firebase_uid}@oauth.local",
                    is_active=True,
                    is_verified=True,  # Firebase users are verified
                )
                session.add(user)
                session.flush()
                
                # Create profile
                profile = Profile(
                    role="founder",  # Default role
                    full_name=name or "Firebase User",
                    email=email or user.email,
                    profile_picture_url=picture,
                    verification={
                        "soft_verified": True,
                        "manual_reviewed": False,
                        "accreditation_attested": False,
                        "badges": ["oauth_firebase"],
                    },
                )
                session.add(profile)
                session.flush()
                user.profile_id = profile.id
            else:
                # Update last login
                user.last_login = datetime.now(timezone.utc)
            
            session.commit()
            session.refresh(user)
            
            # Generate tokens
            token_data = {
                "sub": user.id,
                "email": user.email,
                "profile_id": user.profile_id,
                "is_admin": user.is_admin,
            }
            access_token_jwt = create_access_token(token_data)
            refresh_token = create_refresh_token(token_data)
            
            return user, access_token_jwt, refresh_token
            
        except Exception as e:
            raise UnauthorizedError(f"Firebase authentication failed: {str(e)}")


# Singleton instance
oauth_service = OAuthService()

