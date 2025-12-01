from __future__ import annotations

import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class Like(SQLModel, table=True):
    __tablename__ = "likes"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    sender_id: str = Field(foreign_key="profiles.id", index=True)
    recipient_id: str = Field(foreign_key="profiles.id", index=True)
    note: str | None = Field(default=None, max_length=1000)
    prompt_id: str | None = Field(default=None, description="Specific prompt that was liked")
    like_type: str = Field(default="standard", description="standard, rose, superlike")
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class Match(SQLModel, table=True):
    __tablename__ = "matches"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    founder_id: str = Field(foreign_key="profiles.id", index=True)
    investor_id: str = Field(foreign_key="profiles.id", index=True)
    status: str = Field(default="active", index=True, description="active, closed, blocked")
    last_message_preview: str | None = None
    match_outcome: str | None = Field(default=None, description="met, didnt_meet, still_talking")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Pass(SQLModel, table=True):
    """Track when a user passes (X) on a profile - prevents showing again for 30 days"""
    __tablename__ = "passes"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    user_id: str = Field(foreign_key="profiles.id", index=True)
    passed_profile_id: str = Field(foreign_key="profiles.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class ProfileView(SQLModel, table=True):
    """Track which profiles a user has viewed to avoid showing duplicates"""
    __tablename__ = "profile_views"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    viewer_id: str = Field(foreign_key="profiles.id", index=True)
    viewed_profile_id: str = Field(foreign_key="profiles.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class DailyLimit(SQLModel, table=True):
    """Track daily limits for likes and roses"""
    __tablename__ = "daily_limits"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    profile_id: str = Field(foreign_key="profiles.id", index=True)
    date: str = Field(index=True, description="YYYY-MM-DD format")
    standard_likes_used: int = Field(default=0)
    roses_used: int = Field(default=0)

    # Daily limits (can be increased with premium)
    standard_likes_limit: int = Field(default=10)
    roses_limit: int = Field(default=1)

