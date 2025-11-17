from __future__ import annotations

from fastapi import APIRouter

from app.schemas.diligence import DiligenceSummary
from app.services.diligence import diligence_service

router = APIRouter()


@router.get("/{profile_id}", response_model=DiligenceSummary)
def get_summary(profile_id: str) -> DiligenceSummary:
    return diligence_service.generate_summary(profile_id)

