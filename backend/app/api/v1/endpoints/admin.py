from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.db.session import get_session
from app.schemas.admin import (
    AdminStatsResponse,
    PendingVerificationProfile,
    StartupOfMonthCreate,
    StartupOfMonthResponse,
    VerificationReviewRequest,
    VerificationReviewResponse,
)
from app.services.admin import admin_service

router = APIRouter()

# TODO: Add authentication/authorization middleware to ensure only admins can access these endpoints
# For now, these endpoints are unprotected


@router.get(
    "/verifications/pending",
    response_model=List[PendingVerificationProfile],
    summary="Get pending verifications",
    description="""
    Get all profiles awaiting manual verification review.
    
    Returns profiles that need admin review, typically:
    - New profiles that need verification
    - Profiles with uploaded documents pending review
    - Flagged profiles requiring attention
    
    **Example Request:**
    ```
    GET /api/v1/admin/verifications/pending?limit=50
    ```
    
    **Example Response:**
    ```json
    [
        {
            "id": "profile-id",
            "full_name": "John Doe",
            "email": "john@example.com",
            "role": "investor",
            "verification": {
                "soft_verified": False,
                "manual_reviewed": False,
                "badges": []
            },
            "created_at": "2025-01-20T12:00:00Z"
        }
    ]
    ```
    """,
    responses={
        200: {
            "description": "Pending verifications returned successfully",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": "profile-id",
                            "full_name": "John Doe",
                            "role": "investor"
                        }
                    ]
                }
            }
        },
    },
)
def get_pending_verifications(
    limit: int = Query(50, ge=1, le=100, description="Maximum number of profiles to return"),
    session: Session = Depends(get_session),
) -> List[PendingVerificationProfile]:
    """Get all profiles awaiting manual verification review."""
    return admin_service.get_pending_verifications(session, limit)


@router.post(
    "/verifications/review",
    response_model=VerificationReviewResponse,
    summary="Review verification",
    description="""
    Review and approve/reject a profile's verification.
    
    Admin can approve or reject a profile's verification request, optionally adding notes.
    Approved profiles get a "manual_reviewed" badge.
    
    **Example Request:**
    ```json
    {
        "profile_id": "profile-id",
        "approved": True,
        "notes": "Profile verified, all documents in order"
    }
    ```
    
    **Example Response:**
    ```json
    {
        "profile_id": "profile-id",
        "approved": True,
        "notes": "Profile verified, all documents in order",
        "reviewed_at": "2025-01-20T14:00:00Z"
    }
    ```
    """,
    responses={
        200: {
            "description": "Verification reviewed successfully",
            "content": {
                "application/json": {
                    "example": {
                        "profile_id": "profile-id",
                        "approved": True,
                        "notes": "Verified",
                        "reviewed_at": "2025-01-20T12:00:00Z"
                    }
                }
            }
        },
        400: {"description": "Invalid request"},
    },
)
def review_verification(
    request: VerificationReviewRequest,
    session: Session = Depends(get_session),
) -> VerificationReviewResponse:
    """Review and approve/reject a profile's verification."""
    try:
        return admin_service.review_verification(session, request)
    except ValueError as e:
        from app.core.exceptions import ValidationError
        raise ValidationError(message=str(e))


@router.get("/startup-of-month/current", response_model=Optional[StartupOfMonthResponse])
def get_current_startup_of_month(
    year: Optional[int] = Query(None, ge=2020, le=2100),
    month: Optional[int] = Query(None, ge=1, le=12),
    session: Session = Depends(get_session),
) -> Optional[StartupOfMonthResponse]:
    """Get the currently featured startup of the month."""
    return admin_service.get_current_startup_of_month(session, year, month)


@router.post("/startup-of-month", response_model=StartupOfMonthResponse, status_code=status.HTTP_201_CREATED)
def feature_startup_of_month(
    request: StartupOfMonthCreate,
    session: Session = Depends(get_session),
) -> StartupOfMonthResponse:
    """Feature a startup as startup of the month."""
    try:
        return admin_service.feature_startup_of_month(session, request)
    except ValueError as e:
        from app.core.exceptions import ValidationError
        raise ValidationError(message=str(e))


@router.get("/startup-of-month", response_model=List[StartupOfMonthResponse])
def list_startups_of_month(
    year: Optional[int] = Query(None, ge=2020, le=2100, description="Filter by year"),
    limit: int = Query(12, ge=1, le=100, description="Maximum number of entries to return"),
    session: Session = Depends(get_session),
) -> List[StartupOfMonthResponse]:
    """List all featured startups of the month, optionally filtered by year."""
    return admin_service.list_startups_of_month(session, year, limit)


@router.get(
    "/stats",
    response_model=AdminStatsResponse,
    summary="Get admin statistics",
    description="""
    Get admin dashboard statistics.
    
    Returns aggregated metrics for the admin dashboard including:
    - Total profiles (investors and founders)
    - Pending verifications count
    - Matches and messages statistics
    - Verification completion rates
    
    **Example Response:**
    ```json
    {
        "total_profiles": 150,
        "investor_count": 75,
        "founder_count": 75,
        "pending_verifications": 12,
        "total_matches": 45,
        "total_messages": 230,
        "verification_completion_rate": 0.85
    }
    ```
    """,
    responses={
        200: {
            "description": "Statistics returned successfully",
            "content": {
                "application/json": {
                    "example": {
                        "total_profiles": 100,
                        "investor_count": 50,
                        "founder_count": 50,
                        "pending_verifications": 5
                    }
                }
            }
        },
    },
)
def get_admin_stats(session: Session = Depends(get_session)) -> AdminStatsResponse:
    """Get admin dashboard statistics."""
    return admin_service.get_admin_stats(session)

