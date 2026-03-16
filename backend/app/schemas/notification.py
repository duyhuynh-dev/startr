from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class NotificationResponse(BaseModel):
    id: str
    recipient_id: str
    actor_id: Optional[str] = None
    match_id: Optional[str] = None
    message_id: Optional[str] = None
    type: str
    title: str
    body: Optional[str] = None
    href: Optional[str] = None
    read_at: Optional[datetime] = None
    created_at: datetime


class NotificationsListResponse(BaseModel):
    items: list[NotificationResponse]
    next_cursor: Optional[str] = Field(
        default=None,
        description="Pass this cursor as `cursor` to paginate older notifications.",
    )


class UnreadCountResponse(BaseModel):
    unread_count: int

