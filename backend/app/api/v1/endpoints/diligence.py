from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.db.session import get_session
from app.schemas.diligence import DiligenceSummary
from app.services.diligence import diligence_service

router = APIRouter()


@router.get("/{profile_id}", response_model=DiligenceSummary)
def get_summary(
    profile_id: str,
    force_refresh: bool = Query(
        False, description="Force refresh and bypass cache"
    ),
    session: Session = Depends(get_session),
) -> DiligenceSummary:
    """Get automated due diligence summary for a profile."""
    try:
        return diligence_service.generate_summary(session, profile_id, force_refresh)
    except ValueError as e:
        from app.core.exceptions import NotFoundError
        raise NotFoundError(resource="Profile", identifier=profile_id)

