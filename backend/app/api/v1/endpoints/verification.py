"""Verification endpoints for email OTP, domain verification, and badge management."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundError, ValidationError, UnauthorizedError
from app.db.session import get_session
from app.models.user import User
from app.schemas.auth import (
    AuthMessageResponse,
    DomainVerificationResponse,
    EmailOTPRequest,
    EmailOTPVerify,
    OTPResponse,
    VerificationStatusResponse,
)
from app.services.verification_service import verification_service

router = APIRouter()


@router.post(
    "/email/request",
    response_model=OTPResponse,
    status_code=status.HTTP_200_OK,
    summary="Request email verification OTP",
    description="""
    Request a 6-digit OTP code for email verification.
    
    The code will be sent to the provided email address and expires in 10 minutes.
    There is a 60-second cooldown between requests.
    
    **Example Request:**
    ```json
    {
        "email": "user@example.com"
    }
    ```
    
    **Example Response:**
    ```json
    {
        "success": true,
        "message": "Verification code sent to your email.",
        "expires_in": 600
    }
    ```
    """,
)
def request_email_otp(
    request: EmailOTPRequest,
    session: Session = Depends(get_session),
) -> OTPResponse:
    """Request OTP code for email verification."""
    try:
        result = verification_service.request_email_otp(session, request.email)
        return OTPResponse(**result)
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/email/verify",
    response_model=AuthMessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify email with OTP",
    description="""
    Verify email address using the 6-digit OTP code.
    
    **Example Request:**
    ```json
    {
        "email": "user@example.com",
        "code": "123456"
    }
    ```
    
    **Example Response:**
    ```json
    {
        "message": "Email verified successfully!"
    }
    ```
    """,
)
def verify_email_otp(
    request: EmailOTPVerify,
    session: Session = Depends(get_session),
) -> AuthMessageResponse:
    """Verify email with OTP code."""
    try:
        verification_service.verify_email_otp(session, request.email, request.code)
        return AuthMessageResponse(message="Email verified successfully!")
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/status",
    response_model=VerificationStatusResponse,
    summary="Get verification status",
    description="""
    Get the current verification status for the authenticated user's profile.
    
    Requires authentication.
    
    **Example Response:**
    ```json
    {
        "profile_id": "abc-123",
        "level": 2,
        "level_name": "Identity Verified",
        "badges": ["email", "linkedin"],
        "email_verified": true,
        "domain_verified": false,
        "oauth_verified": true,
        "manually_reviewed": false,
        "accreditation_attested": false
    }
    ```
    """,
)
def get_verification_status(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> VerificationStatusResponse:
    """Get verification status for current user."""
    if not user.profile_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no profile",
        )
    
    try:
        status_data = verification_service.get_verification_status(session, user.profile_id)
        return VerificationStatusResponse(**status_data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/status/{profile_id}",
    response_model=VerificationStatusResponse,
    summary="Get verification status by profile ID",
    description="""
    Get the verification status for a specific profile.
    
    This is useful for viewing verification status of other users.
    
    **Example Response:**
    ```json
    {
        "profile_id": "abc-123",
        "level": 3,
        "level_name": "Domain Verified",
        "badges": ["email", "linkedin", "domain"],
        "email_verified": true,
        "domain_verified": true,
        "oauth_verified": true,
        "manually_reviewed": false,
        "accreditation_attested": false
    }
    ```
    """,
)
def get_verification_status_by_profile(
    profile_id: str,
    session: Session = Depends(get_session),
) -> VerificationStatusResponse:
    """Get verification status for a profile."""
    try:
        status_data = verification_service.get_verification_status(session, profile_id)
        return VerificationStatusResponse(**status_data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/domain",
    response_model=DomainVerificationResponse,
    summary="Request domain verification",
    description="""
    Request domain verification for founders.
    
    If your email domain matches your company domain, verification is automatic.
    Otherwise, manual verification instructions will be provided.
    
    Requires authentication.
    
    **Example Response (auto-verified):**
    ```json
    {
        "verified": true,
        "message": "Domain verified! Your email domain matches example.com",
        "domain": "example.com"
    }
    ```
    
    **Example Response (manual needed):**
    ```json
    {
        "verified": false,
        "message": "Domain verification requires manual review",
        "domain": "example.com",
        "user_email_domain": "gmail.com",
        "instructions": ["..."]
    }
    ```
    """,
)
def request_domain_verification(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> DomainVerificationResponse:
    """Request domain verification for founders."""
    if not user.profile_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no profile",
        )
    
    try:
        result = verification_service.verify_domain(session, user.profile_id)
        return DomainVerificationResponse(**result)
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
