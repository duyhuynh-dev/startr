from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.db.session import get_session
from app.schemas.diligence import DiligenceSummary
from app.services.diligence import diligence_service

router = APIRouter()


@router.get(
    "/{profile_id}",
    response_model=DiligenceSummary,
    summary="Get due diligence summary",
    description="""
    Get automated due diligence summary for a profile (founder/startup).
    
    Includes:
    - Aggregated metrics (revenue, team size, runway, etc.)
    - Risk flags (based on rule-based checks)
    - ETL data from external sources (Crunchbase, Clearbit, Plaid stubs)
    - LLM-generated summary (when available)
    
    Results are cached for 24 hours by default. Use `force_refresh=true` to bypass cache.
    """,
    responses={
        200: {"description": "Diligence summary returned successfully"},
        404: {"description": "Profile not found"},
    },
)
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

