from __future__ import annotations

from typing import List

from fastapi import APIRouter

router = APIRouter()

HARD_CODED_PROMPTS = {
    "investor": [
        {"id": "inv-thesis", "text": "What kind of founders does your fund champion?"},
        {"id": "inv-stage", "text": "Which stages are you actively leading this quarter?"},
    ],
    "founder": [
        {"id": "founder-mission", "text": "What's your mission and why now?"},
        {"id": "founder-kpi", "text": "Share a KPI you're proud of this quarter."},
    ],
}


@router.get("", response_model=List[dict])
def list_prompts(role: str | None = None) -> List[dict]:
    if role and role in HARD_CODED_PROMPTS:
        return HARD_CODED_PROMPTS[role]
    return HARD_CODED_PROMPTS["investor"] + HARD_CODED_PROMPTS["founder"]

