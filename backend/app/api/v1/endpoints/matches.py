from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.db.session import get_session
from app.schemas.match import LikePayload, MatchRecord
from app.services.matching import matching_service

router = APIRouter()


@router.post("/likes", response_model=dict)
def send_like(payload: LikePayload, session: Session = Depends(get_session)) -> dict:
    """Send a like to another profile. Returns match if mutual."""
    match = matching_service.record_like(session, payload)
    return {"status": "matched" if match else "pending", "match": match}


@router.get("", response_model=list[MatchRecord])
def list_matches(
    profile_id: str = Query(..., description="ID of the user requesting matches"),
    session: Session = Depends(get_session),
) -> list[MatchRecord]:
    """List all matches for a user."""
    return matching_service.list_matches(session, profile_id)


