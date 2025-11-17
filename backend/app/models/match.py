from __future__ import annotations

import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class Like(SQLModel, table=True):
    __tablename__ = "likes"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    sender_id: str = Field(foreign_key="profiles.id", index=True)
    recipient_id: str = Field(foreign_key="profiles.id", index=True)
    note: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class Match(SQLModel, table=True):
    __tablename__ = "matches"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    founder_id: str = Field(foreign_key="profiles.id", index=True)
    investor_id: str = Field(foreign_key="profiles.id", index=True)
    status: str = Field(default="pending", index=True)
    last_message_preview: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

