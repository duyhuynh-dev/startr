from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.profile import BaseProfile


class VerificationReviewRequest(BaseModel):
    """Request to review/update verification status."""
    profile_id: str
    action: Literal["approve", "reject", "request_info"]
    notes: Optional[str] = None
    badges: Optional[List[str]] = None  # Additional badges to grant


class VerificationReviewResponse(BaseModel):
    """Response after verification review."""
    profile_id: str
    status: str  # "approved", "rejected", "pending_info"
    badges: List[str]
    reviewed_at: datetime
    reviewer_notes: Optional[str] = None


class PendingVerificationProfile(BaseProfile):
    """Profile awaiting verification review."""
    verification_submitted_at: Optional[datetime] = None
    verification_status: str = "pending"


class StartupOfMonthCreate(BaseModel):
    """Request to feature a startup as startup of the month."""
    profile_id: str
    year: int = Field(..., ge=2020, le=2100)
    month: int = Field(..., ge=1, le=12)
    reason: Optional[str] = Field(None, max_length=500)
    curator_notes: Optional[str] = Field(None, max_length=1000)


class StartupOfMonthResponse(BaseModel):
    """Featured startup of the month."""
    id: str
    profile: BaseProfile
    year: int
    month: int
    reason: Optional[str] = None
    curator_notes: Optional[str] = None
    featured_at: datetime


class AdminStatsResponse(BaseModel):
    """Admin dashboard statistics."""
    total_profiles: int
    pending_verifications: int
    verified_profiles: int
    total_matches: int
    active_matches: int
    featured_startup: Optional[StartupOfMonthResponse] = None

