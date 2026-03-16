from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.core.dependencies import get_current_user_profile
from app.db.session import get_session
from app.models.profile import Profile
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
    - ML-based compatibility scores (embedding similarity)
    - Rule-based compatibility (sector/stage alignment, location, etc.)
    - Due diligence scores
    - User engagement signals
    - Verification status and profile completeness
    
    Results are cached for performance and paginated using cursor-based pagination.
    
    **Authentication:** Bearer token required. Profile is derived from the authenticated user.

    **Example Request:**
    ```
    GET /api/v1/feed/discover?role=founder&limit=20
    Authorization: Bearer <token>
    ```
    
    **Example Response:**
    ```json
    {
        "profiles": [
            {
                "id": "profile-id",
                "full_name": "John Doe",
                "headline": "CEO at StartupCo",
                "compatibility_score": 85.5,
                "match_reasons": ["Strong sector alignment", "High diligence score"],
                "unread_likes": 3
            }
        ],
                        "cursor": "next-page-cursor",
                        "has_more": True
    }
    ```
    """,
    responses={
        200: {
            "description": "Discovery feed returned successfully",
            "content": {
                "application/json": {
                    "example": {
                        "profiles": [
                            {
                                "id": "profile-id",
                                "full_name": "John Doe",
                                "headline": "CEO",
                                "compatibility_score": 85.5,
                                "match_reasons": ["Strong alignment"],
                                "unread_likes": 0
                            }
                        ],
                        "cursor": "next-cursor",
                        "has_more": True
                    }
                }
            }
        },
        400: {"description": "Invalid request parameters"},
        401: {"description": "Authentication required"},
    },
)
def get_discovery_feed(
    profile: Profile = Depends(get_current_user_profile),
    role: Optional[str] = Query(None, description="Filter by role: investor or founder (auto-detected if omitted)"),
    limit: int = Query(20, ge=1, le=50, description="Number of profiles to return"),
    cursor: Optional[str] = Query(None, description="Pagination cursor from previous response"),
    stages: Optional[list[str]] = Query(None, description="Preferred stages (used as feed filters)"),
    sectors: Optional[list[str]] = Query(None, description="Preferred sectors (used as feed filters)"),
    location: Optional[str] = Query(None, description="Location filter (city, region, or country)"),
    min_check_size: Optional[int] = Query(None, description="Minimum preferred check size (USD)"),
    max_check_size: Optional[int] = Query(None, description="Maximum preferred check size (USD)"),
    session: Session = Depends(get_session),
) -> DiscoveryFeedResponse:
    """Get ranked discovery feed of profiles to potentially match with. Requires authentication."""
    return discovery_feed_service.get_discovery_feed(
        session=session,
        profile_id=profile.id,
        role_filter=role,
        limit=limit,
        cursor=cursor,
        stages=stages,
        sectors=sectors,
        location=location,
        min_check_size=min_check_size,
        max_check_size=max_check_size,
    )


@router.get(
    "/likes-queue",
    response_model=List[LikesQueueItem],
    summary="Get likes queue",
    description="""
    Get users who have liked you (likes queue, similar to Hinge 'Likes You').
    
    Returns a list of profiles that have sent you a like, ordered by most recent.
    This is useful for prioritizing which profiles to review.
    
    Results are cached for performance and ML-ranked by compatibility.
    
    **Authentication:** Bearer token required.

    **Example Request:**
    ```
    GET /api/v1/feed/likes-queue
    Authorization: Bearer <token>
    ```
    
    **Example Response:**
    ```json
    [
        {
            "profile": {
                "id": "liker-id",
                "full_name": "Jane Smith",
                "headline": "Partner at VC Fund"
            },
            "note": "Love your vision!",
            "liked_at": "2025-01-20T14:00:00Z"
        }
    ]
    ```
    """,
    responses={
        200: {
            "description": "Likes queue returned successfully",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "profile": {
                                "id": "profile-id",
                                "full_name": "John Doe"
                            },
                            "note": "Optional note",
                            "liked_at": "2025-01-20T12:00:00Z"
                        }
                    ]
                }
            }
        },
        401: {"description": "Authentication required"},
    },
)
def get_likes_queue(
    profile: Profile = Depends(get_current_user_profile),
    session: Session = Depends(get_session),
) -> List[LikesQueueItem]:
    """Get users who have liked you (likes queue). Requires authentication."""
    return discovery_feed_service.get_likes_queue(session, profile.id)


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
    - High due diligence scores
    
    Results are cached for performance and ML-ranked.
    
    **Authentication:** Bearer token required.

    **Example Request:**
    ```
    GET /api/v1/feed/standouts?limit=10
    Authorization: Bearer <token>
    ```
    
    **Example Response:**
    ```json
    [
        {
            "profile": {
                "id": "standout-id",
                "full_name": "Jane Doe",
                "headline": "CEO at Amazing Startup"
            },
            "score": 92.5,
            "reasons": ["Strong sector alignment", "High diligence score", "Verified profile"]
        }
    ]
    ```
    """,
    responses={
        200: {
            "description": "Standout profiles returned successfully",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "profile": {
                                "id": "profile-id",
                                "full_name": "John Doe"
                            },
                            "score": 90.0,
                            "reasons": ["Strong alignment", "Verified"]
                        }
                    ]
                }
            }
        },
        400: {"description": "Invalid request parameters"},
        401: {"description": "Authentication required"},
    },
)
def get_standouts(
    profile: Profile = Depends(get_current_user_profile),
    limit: int = Query(10, ge=1, le=20, description="Number of standout profiles to return"),
    session: Session = Depends(get_session),
) -> List[StandoutProfile]:
    """Get standout profiles (most compatible). Requires authentication."""
    return discovery_feed_service.get_standouts(session, profile.id, limit)


@router.post(
    "/stable-matching",
    summary="Compute Gale-Shapley stable matching",
    description="""
    Run Gale-Shapley (investors propose to founders) using compatibility scores.
    Result is cached; the discovery feed will show each user's stable match first.
    Call this periodically (e.g. daily) or after large profile changes.
    """,
    responses={200: {"description": "Stable matching computed and cached"}},
)
def compute_stable_matching(session: Session = Depends(get_session)) -> dict:
    """Compute and cache stable matching for discovery feed ranking."""
    return discovery_feed_service.compute_stable_matching(session)

