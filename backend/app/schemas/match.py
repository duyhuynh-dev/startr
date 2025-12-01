from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class LikePayload(BaseModel):
    sender_id: str
    recipient_id: str
    note: str | None = Field(default=None, max_length=1000)
    prompt_id: str | None = Field(default=None, description="Specific prompt being liked")
    like_type: Literal["standard", "rose", "superlike"] = Field(default="standard")


class PassPayload(BaseModel):
    user_id: str
    passed_profile_id: str


class DailyLimitsResponse(BaseModel):
    date: str
    standard_likes_used: int
    standard_likes_remaining: int
    standard_likes_limit: int
    roses_used: int
    roses_remaining: int
    roses_limit: int


class MatchRecord(BaseModel):
    id: str
    founder_id: str
    investor_id: str
    status: Literal["active", "closed", "blocked"] = "active"
    match_outcome: Literal["met", "didnt_meet", "still_talking"] | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_message_preview: Optional[str] = None

