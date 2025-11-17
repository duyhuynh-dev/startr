from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.db.session import get_session
from app.schemas.feed import DiscoveryFeedResponse, LikesQueueItem, StandoutProfile
from app.services.discovery import discovery_feed_service

router = APIRouter()


@router.get(
    "/discover",
    response_model=DiscoveryFeedResponse,
    summary="Get discovery feed",
    description="""
    Get a ranked discovery feed of profiles to potentially match with.
    
    The feed is algorithmically ranked based on:
    - Compatibility scores (sector/stage alignment, location, etc.)
    - Mutual connections and network effects
    - User behavior and preferences
    - Verification status and profile completeness
    
    Results are cached for performance and paginated using cursor-based pagination.
    """,
    responses={
        200: {"description": "Discovery feed returned successfully"},
        400: {"description": "Invalid request parameters"},
    },
)
def get_discovery_feed(
    profile_id: str = Query(..., description="ID of the user requesting the feed"),
    role: Optional[str] = Query(None, description="Filter by role: investor or founder (auto-detected if omitted)"),
    limit: int = Query(20, ge=1, le=50, description="Number of profiles to return"),
    cursor: Optional[str] = Query(None, description="Pagination cursor from previous response"),
    session: Session = Depends(get_session),
) -> DiscoveryFeedResponse:
    """Get ranked discovery feed of profiles to potentially match with."""
    try:
        return discovery_feed_service.get_discovery_feed(session, profile_id, role, limit, cursor)
    except ValueError as e:
        from app.core.exceptions import ValidationError
        raise ValidationError(message=str(e))


@router.get(
    "/likes-queue",
    response_model=List[LikesQueueItem],
    summary="Get likes queue",
    description="""
    Get users who have liked you (likes queue, similar to Hinge 'Likes You').
    
    Returns a list of profiles that have sent you a like, ordered by most recent.
    This is useful for prioritizing which profiles to review.
    
    Results are cached for performance.
    """,
    responses={
        200: {"description": "Likes queue returned successfully"},
    },
)
def get_likes_queue(
    profile_id: str = Query(..., description="ID of the user requesting their likes queue"),
    session: Session = Depends(get_session),
) -> List[LikesQueueItem]:
    """Get users who have liked you (likes queue, similar to Hinge 'Likes You')."""
    return discovery_feed_service.get_likes_queue(session, profile_id)


@router.get(
    "/standouts",
    response_model=List[StandoutProfile],
    summary="Get standout profiles",
    description="""
    Get standout profiles (most compatible, similar to Hinge Standouts).
    
    Returns profiles with the highest compatibility scores, typically including:
    - Strong sector/stage alignment
    - High verification status
    - Complete profiles with detailed prompts
    - Positive signals from mutual connections
    
    Results are cached for performance.
    """,
    responses={
        200: {"description": "Standout profiles returned successfully"},
        400: {"description": "Invalid request parameters"},
    },
)
def get_standouts(
    profile_id: str = Query(..., description="ID of the user requesting standouts"),
    limit: int = Query(10, ge=1, le=20, description="Number of standout profiles to return"),
    session: Session = Depends(get_session),
) -> List[StandoutProfile]:
    """Get standout profiles (most compatible, similar to Hinge Standouts)."""
    try:
        return discovery_feed_service.get_standouts(session, profile_id, limit)
    except ValueError as e:
        from app.core.exceptions import ValidationError
        raise ValidationError(message=str(e))

