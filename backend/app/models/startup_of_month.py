from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class StartupOfMonth(SQLModel, table=True):
    """Tracks monthly featured startups."""
    __tablename__ = "startup_of_month"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    profile_id: str = Field(foreign_key="profiles.id", index=True, unique=True)
    year: int = Field(index=True)
    month: int = Field(index=True)  # 1-12
    reason: Optional[str] = None  # Why this startup was selected
    curator_notes: Optional[str] = None  # Admin notes
    featured_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

