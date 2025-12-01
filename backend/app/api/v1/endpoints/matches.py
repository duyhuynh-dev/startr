from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from sqlmodel import Session

from app.core.exceptions import AppException, ValidationError
from app.core.rate_limit import limiter
from app.db.session import get_session
from app.schemas.match import DailyLimitsResponse, LikePayload, MatchRecord, PassPayload
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
    import logging
    import traceback
    import sys
    
    logger = logging.getLogger(__name__)
    
    # Validate input first
    if not payload.sender_id or not payload.recipient_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="sender_id and recipient_id are required",
        )
    
    if payload.sender_id == payload.recipient_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot like yourself",
        )
    
    try:
        match = matching_service.record_like(session, payload)

        # Convert MatchRecord to dict for JSON serialization
        if match:
            # Safely convert datetime to ISO format
            def safe_isoformat(dt):
                if dt is None:
                    return datetime.utcnow().isoformat()
                if hasattr(dt, 'isoformat'):
                    return dt.isoformat()
                return str(dt)
            
            match_dict = {
                "id": str(match.id),
                "founder_id": str(match.founder_id),
                "investor_id": str(match.investor_id),
                "status": match.status or "active",
                "created_at": safe_isoformat(match.created_at),
                "updated_at": safe_isoformat(match.updated_at),
                "last_message_preview": match.last_message_preview,
            }
            return {"status": "matched", "match": match_dict}

        return {"status": "pending", "match": None}
    except AppException as e:
        print(f"AppException caught: {e.message}", file=sys.stderr, flush=True)
        raise
    except ValueError as e:
        print(f"ValueError caught: {str(e)}", file=sys.stderr, flush=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        full_traceback = traceback.format_exc()
        
        # FORCE print to stderr
        print(f"\n{'='*60}", file=sys.stderr, flush=True)
        print(f"EXCEPTION IN send_like:", file=sys.stderr, flush=True)
        print(f"  Type: {error_type}", file=sys.stderr, flush=True)
        print(f"  Message: {error_msg}", file=sys.stderr, flush=True)
        print(f"{'='*60}", file=sys.stderr, flush=True)
        print(full_traceback, file=sys.stderr, flush=True)
        print(f"{'='*60}\n", file=sys.stderr, flush=True)
        
        raise


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


@router.post(
    "/pass",
    summary="Pass (X) on a profile",
    description="""
    Record when a user passes (X) on a profile in the discovery feed.

    Passed profiles won't be shown again for 30 days, similar to Hinge's behavior.
    This helps curate the discovery feed and avoid showing unwanted profiles.

    **Example Request:**
    ```json
    {
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "passed_profile_id": "123e4567-e89b-12d3-a456-426614174001"
    }
    ```
    """,
)
def pass_on_profile(
    payload: PassPayload,
    session: Session = Depends(get_session),
) -> dict:
    """Record a pass (X) on a profile."""
    matching_service.record_pass(session, payload.user_id, payload.passed_profile_id)
    return {"status": "success", "message": "Profile passed"}


@router.get(
    "/limits",
    response_model=DailyLimitsResponse,
    summary="Get daily limits status",
    description="""
    Get the current daily limit status for likes and roses.

    Returns information about:
    - How many standard likes used today
    - How many standard likes remaining
    - How many roses used today
    - How many roses remaining

    Hinge-style limits:
    - 10 standard likes per day (free)
    - 1 rose per day (special like that goes to top of likes queue)

    **Example Response:**
    ```json
    {
        "date": "2025-11-30",
        "standard_likes_used": 3,
        "standard_likes_remaining": 7,
        "standard_likes_limit": 10,
        "roses_used": 0,
        "roses_remaining": 1,
        "roses_limit": 1
    }
    ```
    """,
)
def get_daily_limits(
    profile_id: str = Query(..., description="ID of the user"),
    session: Session = Depends(get_session),
) -> DailyLimitsResponse:
    """Get daily limits status for a user."""
    limits = matching_service.get_daily_limits(session, profile_id)
    return DailyLimitsResponse(**limits)


