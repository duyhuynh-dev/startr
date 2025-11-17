from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.profile import BaseProfile


class ProfileCard(BaseProfile):
    """Profile card shown in discovery feed with compatibility score."""
    compatibility_score: Optional[float] = Field(None, ge=0, le=100, description="Compatibility score (0-100)")
    like_count: int = Field(default=0, description="Number of likes this profile has received")
    has_liked_you: bool = Field(default=False, description="Whether this profile has liked you")


class DiscoveryFeedResponse(BaseModel):
    profiles: List[ProfileCard]
    cursor: Optional[str] = Field(None, description="Pagination cursor for next page")
    has_more: bool = Field(default=False)


class StandoutProfile(BaseProfile):
    """Profile shown in standouts (most compatible)."""
    compatibility_score: float = Field(..., ge=0, le=100)
    match_reasons: List[str] = Field(default_factory=list, description="Reasons for high compatibility")


class LikesQueueItem(BaseModel):
    """Item in the likes queue (people who liked you)."""
    profile: BaseProfile
    like_id: str
    note: Optional[str] = None
    liked_at: str

