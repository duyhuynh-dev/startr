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


@router.get("/verifications/pending", response_model=List[PendingVerificationProfile])
def get_pending_verifications(
    limit: int = Query(50, ge=1, le=100, description="Maximum number of profiles to return"),
    session: Session = Depends(get_session),
) -> List[PendingVerificationProfile]:
    """Get all profiles awaiting manual verification review."""
    return admin_service.get_pending_verifications(session, limit)


@router.post("/verifications/review", response_model=VerificationReviewResponse)
def review_verification(
    request: VerificationReviewRequest,
    session: Session = Depends(get_session),
) -> VerificationReviewResponse:
    """Review and approve/reject a profile's verification."""
    try:
        return admin_service.review_verification(session, request)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


@router.get("/startup-of-month", response_model=List[StartupOfMonthResponse])
def list_startups_of_month(
    year: Optional[int] = Query(None, ge=2020, le=2100, description="Filter by year"),
    limit: int = Query(12, ge=1, le=100, description="Maximum number of entries to return"),
    session: Session = Depends(get_session),
) -> List[StartupOfMonthResponse]:
    """List all featured startups of the month, optionally filtered by year."""
    return admin_service.list_startups_of_month(session, year, limit)


@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(session: Session = Depends(get_session)) -> AdminStatsResponse:
    """Get admin dashboard statistics."""
    return admin_service.get_admin_stats(session)

