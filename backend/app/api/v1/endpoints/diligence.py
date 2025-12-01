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
    - ETL data from external sources (Crunchbase, Clearbit)
    - LLM-generated summary (when available)
    - Overall diligence score (0-100)
    
    Results are cached for 24 hours by default. Use `force_refresh=true` to bypass cache.
    
    **Example Request:**
    ```
    GET /api/v1/diligence/{profile_id}?force_refresh=false
    ```
    
    **Example Response:**
    ```json
    {
        "profile_id": "profile-id",
        "overall_score": 85,
        "metrics": {
            "revenue_run_rate": 500000.0,
            "team_size": 10,
            "runway_months": 18
        },
        "risk_flags": [
            {
                "type": "runway",
                "severity": "low",
                "message": "Sufficient runway for next 12 months"
            }
        ],
        "etl_data": {
            "crunchbase": {"status": "not_connected"},
            "clearbit": {"status": "not_connected"}
        },
        "summary": "Company shows strong growth metrics with healthy runway.",
        "last_updated": "2025-01-20T12:00:00Z"
    }
    ```
    """,
    responses={
        200: {
            "description": "Diligence summary returned successfully",
            "content": {
                "application/json": {
                    "example": {
                        "profile_id": "profile-id",
                        "overall_score": 85,
                        "metrics": {
                            "revenue_run_rate": 500000.0,
                            "team_size": 10
                        },
                        "risk_flags": [],
                        "summary": "Strong metrics"
                    }
                }
            }
        },
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

