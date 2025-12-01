"""Authentication endpoints (signup, login, OAuth, token refresh)."""

from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.exceptions import ConflictError, UnauthorizedError, ValidationError
from app.db.session import get_session
from app.models.user import User
from app.schemas.auth import (
    EmailVerificationConfirm,
    EmailVerificationRequest,
    LoginRequest,
    AuthMessageResponse,
    OAuthAuthorizationResponse,
    OAuthCallbackRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshTokenRequest,
    SignUpRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import auth_service
from app.services.oauth_service import oauth_service

router = APIRouter()


@router.post(
    "/signup",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Sign up",
    description="""
    Create a new user account and profile.
    
    This endpoint:
    1. Creates a new user account with email/password
    2. Creates an associated profile (investor or founder)
    3. Returns the user information
    
    **Note:** Email verification will be required before full access.
    
    **Example Request:**
    ```json
    {
        "email": "user@example.com",
        "password": "SecurePassword123!",
        "role": "investor",
        "full_name": "John Doe"
    }
    ```
    
    **Example Response:**
    ```json
    {
        "id": "user-id",
        "email": "user@example.com",
        "profile_id": "profile-id",
        "is_active": true,
        "is_verified": false,
        "is_admin": false,
        "created_at": "2025-01-20T12:00:00Z",
        "last_login": null
    }
    ```
    """,
)
def signup(
    request: SignUpRequest,
    session: Session = Depends(get_session),
) -> UserResponse:
    """Create a new user account."""
    try:
        user, profile = auth_service.signup(
            session=session,
            email=request.email,
            password=request.password,
            role=request.role,
            full_name=request.full_name,
        )
        
        return UserResponse(
            id=user.id,
            email=user.email,
            profile_id=user.profile_id,
            is_active=user.is_active,
            is_verified=user.is_verified,
            is_admin=user.is_admin,
            created_at=user.created_at,
            last_login=user.last_login,
        )
    except ConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login",
    description="""
    Authenticate with email and password, receive JWT tokens.
    
    **Example Request:**
    ```json
    {
        "email": "user@example.com",
        "password": "SecurePassword123!"
    }
    ```
    
    **Example Response:**
    ```json
    {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "token_type": "bearer",
        "expires_in": 1800
    }
    ```
    
    Use the `access_token` in the `Authorization: Bearer <token>` header for authenticated requests.
    Use `refresh_token` to get a new access token when it expires.
    """,
)
def login(
    request: LoginRequest,
    session: Session = Depends(get_session),
) -> TokenResponse:
    """Login with email and password."""
    try:
        user, access_token, refresh_token = auth_service.login(
            session=session,
            email=request.email,
            password=request.password,
        )
        
        expires_in = settings.access_token_expire_minutes * 60
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=expires_in,
        )
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
    description="""
    Generate a new access token using a refresh token.
    
    **Example Request:**
    ```json
    {
        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
    
    **Example Response:**
    ```json
    {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "token_type": "bearer",
        "expires_in": 1800
    }
    ```
    """,
)
def refresh_token(
    request: RefreshTokenRequest,
    session: Session = Depends(get_session),
) -> TokenResponse:
    """Refresh access token."""
    try:
        new_access_token = auth_service.refresh_access_token(session, request.refresh_token)
        expires_in = settings.access_token_expire_minutes * 60
        
        return TokenResponse(
            access_token=new_access_token,
            refresh_token=request.refresh_token,  # Reuse same refresh token
            token_type="bearer",
            expires_in=expires_in,
        )
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
    description="""
    Get current authenticated user information.
    
    Requires authentication via Bearer token.
    
    **Example Response:**
    ```json
    {
        "id": "user-id",
        "email": "user@example.com",
        "profile_id": "profile-id",
        "is_active": true,
        "is_verified": true,
        "is_admin": false,
        "created_at": "2025-01-20T12:00:00Z",
        "last_login": "2025-01-21T10:30:00Z"
    }
    ```
    """,
)
def get_current_user_endpoint(
    user: User = Depends(get_current_user),
) -> UserResponse:
    """Get current user information."""
    return UserResponse(
        id=user.id,
        email=user.email,
        profile_id=user.profile_id,
        is_active=user.is_active,
        is_verified=user.is_verified,
        is_admin=user.is_admin,
        created_at=user.created_at,
        last_login=user.last_login,
    )


@router.get(
    "/oauth/{provider}/authorize",
    response_model=OAuthAuthorizationResponse,
    summary="OAuth authorization URL",
    description="""
    Get OAuth authorization URL for a provider.
    
    **Providers:** `linkedin`, `google`
    
    **Note:** Firebase doesn't use this endpoint - it uses ID tokens directly via the callback endpoint.
    
    **Example Request:**
    ```
    GET /api/v1/auth/oauth/linkedin/authorize
    ```
    
    **Example Response:**
    ```json
    {
        "authorization_url": "https://www.linkedin.com/oauth/v2/authorization?...",
        "state": "random-state-string"
    }
    ```
    
    **Note:** Requires API keys to be configured. See `.env` for OAuth settings.
    """,
)
def oauth_authorize(provider: str, request: Request):
    """Get OAuth authorization URL."""
    # Firebase doesn't use OAuth authorization flow
    if provider.lower() == "firebase":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firebase uses ID tokens directly. Use the callback endpoint with an id_token.",
        )
    
    # Get base URL from request
    base_url = str(request.base_url).rstrip("/")
    redirect_uri = f"{base_url}/api/v1/auth/oauth/{provider}/callback"
    
    try:
        if provider.lower() == "linkedin":
            auth_url, state = oauth_service.get_linkedin_authorization_url(redirect_uri)
        elif provider.lower() == "google":
            auth_url, state = oauth_service.get_google_authorization_url(redirect_uri)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported OAuth provider: {provider}. Supported: linkedin, google, firebase",
            )
        
        return OAuthAuthorizationResponse(
            authorization_url=auth_url,
            state=state,
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/oauth/{provider}/callback",
    response_model=TokenResponse,
    summary="OAuth callback",
    description="""
    Handle OAuth callback and create/login user.
    
    **Providers:** `linkedin`, `google`, `firebase`
    
    **For LinkedIn/Google:**
    ```json
    {
        "code": "oauth-authorization-code",
        "state": "random-state-string"
    }
    ```
    
    **For Firebase:**
    ```json
    {
        "id_token": "firebase-id-token-from-client-sdk"
    }
    ```
    
    **Example Response:**
    ```json
    {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "token_type": "bearer",
        "expires_in": 1800
    }
    ```
    
    **Note:** Requires API keys to be configured. See `.env` for OAuth settings.
    """,
)
async def oauth_callback(
    provider: str,
    request: OAuthCallbackRequest,
    http_request: Request,
    session: Session = Depends(get_session),
):
    """Handle OAuth callback."""
    provider_lower = provider.lower()
    
    try:
        # Firebase uses ID tokens directly (not OAuth code flow)
        if provider_lower == "firebase":
            if not request.id_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Firebase requires id_token in request body",
                )
            
            user, access_token, refresh_token = await oauth_service.handle_firebase_callback(
                session=session,
                id_token=request.id_token,
            )
        else:
            # LinkedIn and Google use OAuth code flow
            if not request.code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{provider} requires code in request body",
                )
            
            # Get base URL for redirect URI
            base_url = str(http_request.base_url).rstrip("/")
            redirect_uri = f"{base_url}/api/v1/auth/oauth/{provider}/callback"
            
            if provider_lower == "linkedin":
                user, access_token, refresh_token = await oauth_service.handle_linkedin_callback(
                    session=session,
                    code=request.code,
                    redirect_uri=redirect_uri,
                )
            elif provider_lower == "google":
                user, access_token, refresh_token = await oauth_service.handle_google_callback(
                    session=session,
                    code=request.code,
                    redirect_uri=redirect_uri,
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported OAuth provider: {provider}. Supported: linkedin, google, firebase",
                )
        
        expires_in = settings.access_token_expire_minutes * 60
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=expires_in,
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post(
    "/password-reset/request",
    response_model=AuthMessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Request password reset",
    description="""
    Request a password reset email.
    
    **Note:** This endpoint always returns success to prevent email enumeration attacks.
    If the email exists, a password reset link will be sent.
    
    **Example Request:**
    ```json
    {
        "email": "user@example.com"
    }
    ```
    
    **Example Response:**
    ```json
    {
        "message": "If the email exists, a password reset link has been sent."
    }
    ```
    """,
)
def request_password_reset(
    request: PasswordResetRequest,
    session: Session = Depends(get_session),
) -> AuthMessageResponse:
    """Request password reset email."""
    auth_service.request_password_reset(session, request.email)
    
    # Always return same message to prevent email enumeration
    return AuthMessageResponse(
        message="If the email exists, a password reset link has been sent."
    )


@router.post(
    "/password-reset/confirm",
    response_model=AuthMessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Confirm password reset",
    description="""
    Reset password using the token from the password reset email.
    
    **Example Request:**
    ```json
    {
        "token": "password-reset-token-from-email",
        "new_password": "NewSecurePassword123!"
    }
    ```
    
    **Example Response:**
    ```json
    {
        "message": "Password has been reset successfully."
    }
    ```
    """,
)
def confirm_password_reset(
    request: PasswordResetConfirm,
    session: Session = Depends(get_session),
) -> AuthMessageResponse:
    """Confirm password reset with token."""
    try:
        auth_service.reset_password(session, request.token, request.new_password)
        return AuthMessageResponse(message="Password has been reset successfully.")
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/verify-email/request",
    response_model=AuthMessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Request email verification",
    description="""
    Request a verification email to be sent.
    
    **Note:** This endpoint always returns success to prevent email enumeration attacks.
    If the email exists and is not verified, a verification link will be sent.
    
    **Example Request:**
    ```json
    {
        "email": "user@example.com"
    }
    ```
    
    **Example Response:**
    ```json
    {
        "message": "If the email exists and is unverified, a verification link has been sent."
    }
    ```
    """,
)
def request_email_verification(
    request: EmailVerificationRequest,
    session: Session = Depends(get_session),
) -> AuthMessageResponse:
    """Request email verification email."""
    auth_service.request_email_verification(session, request.email)
    
    # Always return same message to prevent email enumeration
    return AuthMessageResponse(
        message="If the email exists and is unverified, a verification link has been sent."
    )


@router.post(
    "/verify-email/confirm",
    response_model=AuthMessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Confirm email verification",
    description="""
    Verify email address using the token from the verification email.
    
    **Example Request:**
    ```json
    {
        "token": "verification-token-from-email"
    }
    ```
    
    **Example Response:**
    ```json
    {
        "message": "Email has been verified successfully."
    }
    ```
    """,
)
def confirm_email_verification(
    request: EmailVerificationConfirm,
    session: Session = Depends(get_session),
) -> AuthMessageResponse:
    """Confirm email verification with token."""
    try:
        auth_service.verify_email(session, request.token)
        return AuthMessageResponse(message="Email has been verified successfully.")
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )
