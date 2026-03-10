from __future__ import annotations

import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class Notification(SQLModel, table=True):
    __tablename__ = "notifications"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    recipient_id: str = Field(foreign_key="profiles.id", index=True)

    # Optional context for "who/what caused this"
    actor_id: str | None = Field(default=None, foreign_key="profiles.id", index=True)
    match_id: str | None = Field(default=None, foreign_key="matches.id", index=True)
    message_id: str | None = Field(default=None, foreign_key="messages.id", index=True)

    # Free-form type for now (e.g. "new_message", "new_match")
    type: str = Field(index=True, max_length=64)
    title: str = Field(max_length=140)
    body: str | None = Field(default=None, max_length=1000)
    href: str | None = Field(default=None, max_length=500)

    read_at: datetime | None = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

