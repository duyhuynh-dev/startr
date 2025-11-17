from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from sqlmodel import Session

from app.core.rate_limit import limiter
from app.db.session import get_session
from app.schemas.match import LikePayload, MatchRecord
from app.services.matching import matching_service

router = APIRouter()


@router.post(
    "/likes",
    response_model=dict,
    summary="Send a like",
    description="""
    Send a like to another profile. Optionally include a note to personalize the like.
    
    **Matching Behavior:**
    - If the recipient has already liked you, a match is automatically created
    - If not, the like is stored and they'll see you in their likes queue
    - When they like you back, a match is created
    
    **Response:**
    - `status: "matched"` if mutual like (match created immediately)
    - `status: "pending"` if one-way like (waiting for response)
    - `match` object is included if matched
    """,
    responses={
        200: {"description": "Like sent successfully (may result in match)"},
        400: {"description": "Invalid like payload (e.g., cannot like yourself)"},
    },
)
@limiter.limit("50/hour")  # Rate limit likes to prevent spam
def send_like(
    request: Request,
    payload: LikePayload,
    session: Session = Depends(get_session),
) -> dict:
    """Send a like to another profile. Returns match if mutual."""
    match = matching_service.record_like(session, payload)
    return {"status": "matched" if match else "pending", "match": match}


@router.get(
    "",
    response_model=list[MatchRecord],
    summary="List matches",
    description="""
    List all matches for a user, ordered by most recent.
    
    Returns all profiles the user has matched with, including:
    - Match status (pending, active, etc.)
    - Last message preview (if any)
    - Match timestamps
    
    Use this to populate the matches/conversations view.
    """,
    responses={
        200: {"description": "List of matches returned successfully"},
    },
)
def list_matches(
    profile_id: str = Query(..., description="ID of the user requesting matches"),
    session: Session = Depends(get_session),
) -> list[MatchRecord]:
    """List all matches for a user."""
    return matching_service.list_matches(session, profile_id)


