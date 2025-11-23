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
    
    **Example Request:**
    ```json
    {
        "sender_id": "123e4567-e89b-12d3-a456-426614174000",
        "recipient_id": "123e4567-e89b-12d3-a456-426614174001",
        "note": "Love your vision! Let's chat."
    }
    ```
    
    **Example Response (Pending):**
    ```json
    {
        "status": "pending",
        "match": null
    }
    ```
    
    **Example Response (Matched):**
    ```json
    {
        "status": "matched",
        "match": {
            "id": "123e4567-e89b-12d3-a456-426614174002",
            "founder_id": "123e4567-e89b-12d3-a456-426614174000",
            "investor_id": "123e4567-e89b-12d3-a456-426614174001",
            "status": "active",
            "created_at": "2025-01-20T12:00:00Z"
        }
    }
    ```
    """,
    responses={
        200: {
            "description": "Like sent successfully (may result in match)",
            "content": {
                "application/json": {
                    "examples": {
                        "pending": {
                            "summary": "One-way like",
                            "value": {
                                "status": "pending",
                                "match": None
                            }
                        },
                        "matched": {
                            "summary": "Mutual like - match created",
                            "value": {
                                "status": "matched",
                                "match": {
                                    "id": "match-id",
                                    "founder_id": "founder-id",
                                    "investor_id": "investor-id",
                                    "status": "active",
                                    "created_at": "2025-01-20T12:00:00Z"
                                }
                            }
                        }
                    }
                }
            }
        },
        400: {"description": "Invalid like payload (e.g., cannot like yourself)"},
    },
)
# Note: Rate limiting temporarily removed due to slowapi/FastAPI body parsing conflict
# TODO: Re-implement with middleware-based rate limiting
def send_like(
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
    
    **Example Request:**
    ```
    GET /api/v1/matches?profile_id=123e4567-e89b-12d3-a456-426614174000
    ```
    
    **Example Response:**
    ```json
    [
        {
            "id": "match-id-1",
            "founder_id": "founder-id-1",
            "investor_id": "investor-id",
            "status": "active",
            "last_message_preview": "Hey! Interested in discussing...",
            "created_at": "2025-01-20T12:00:00Z",
            "updated_at": "2025-01-20T14:30:00Z"
        },
        {
            "id": "match-id-2",
            "founder_id": "founder-id-2",
            "investor_id": "investor-id",
            "status": "pending",
            "last_message_preview": null,
            "created_at": "2025-01-19T10:00:00Z",
            "updated_at": "2025-01-19T10:00:00Z"
        }
    ]
    ```
    """,
    responses={
        200: {
            "description": "List of matches returned successfully",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": "match-id",
                            "founder_id": "founder-id",
                            "investor_id": "investor-id",
                            "status": "active",
                            "last_message_preview": "Last message preview",
                            "created_at": "2025-01-20T12:00:00Z",
                            "updated_at": "2025-01-20T14:30:00Z"
                        }
                    ]
                }
            }
        },
    },
)
def list_matches(
    profile_id: str = Query(..., description="ID of the user requesting matches"),
    session: Session = Depends(get_session),
) -> list[MatchRecord]:
    """List all matches for a user."""
    return matching_service.list_matches(session, profile_id)


