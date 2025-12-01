from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

#hi
class MessageCreate(BaseModel):
    match_id: str
    sender_id: str
    content: str = Field(..., max_length=5000)
    attachment_url: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    match_id: str
    sender_id: str
    content: str
    attachment_url: Optional[str] = None
    read_at: Optional[datetime] = None
    created_at: datetime


class ConversationThread(BaseModel):
    """Summary of a conversation thread with last message preview."""
    match_id: str
    founder_id: str
    investor_id: str
    other_party_id: str  # The other user in the conversation (for current user context)
    other_party_name: str
    other_party_avatar_url: Optional[str] = None
    last_message_preview: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0
    status: str

