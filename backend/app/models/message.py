from __future__ import annotations

import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class Message(SQLModel, table=True):
    __tablename__ = "messages"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    match_id: str = Field(foreign_key="matches.id", index=True)
    sender_id: str = Field(foreign_key="profiles.id", index=True)
    content: str
    attachment_url: str | None = None
    read_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

