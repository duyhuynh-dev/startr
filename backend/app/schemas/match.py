from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class LikePayload(BaseModel):
    sender_id: str
    recipient_id: str
    note: str | None = Field(default=None, max_length=1000)


class MatchRecord(BaseModel):
    id: str
    founder_id: str
    investor_id: str
    status: Literal["pending", "active", "closed", "blocked"] = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_message_preview: Optional[str] = None

