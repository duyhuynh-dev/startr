from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.core.exceptions import ValidationError
from app.db.session import get_session
from app.schemas.message import ConversationThread, MessageCreate, MessageResponse
from app.services.messaging import messaging_service

router = APIRouter()


@router.post(
    "",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send a message",
    description="""
    Send a message in a match thread. Both users in a match can send messages to each other.
    
    **Requirements:**
    - Sender must be part of the match (founder or investor)
    - Match status must be "active" or "pending"
    - Automatically updates match's last_message_preview
    
    **Example Request:**
    ```json
    {
        "match_id": "123e4567-e89b-12d3-a456-426614174000",
        "sender_id": "123e4567-e89b-12d3-a456-426614174001",
        "content": "Hi! I'm interested in learning more.",
        "attachment_url": null
    }
    ```
    
    **Example Response:**
    ```json
    {
        "id": "msg-id",
        "match_id": "match-id",
        "sender_id": "sender-id",
        "content": "Hi! I'm interested in learning more.",
        "attachment_url": null,
        "read_at": null,
        "created_at": "2025-01-20T12:00:00Z"
    }
    ```
    """,
    responses={
        201: {
            "description": "Message sent successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "message-id",
                        "match_id": "match-id",
                        "sender_id": "sender-id",
                        "content": "Hello!",
                        "attachment_url": None,
                        "read_at": None,
                        "created_at": "2025-01-20T12:00:00Z"
                    }
                }
            }
        },
        400: {"description": "Invalid message (e.g., not part of the match)"},
    },
)
def create_message(payload: MessageCreate, session: Session = Depends(get_session)) -> MessageResponse:
    """Send a message in a match thread."""
    try:
        return messaging_service.create_message(session, payload)
    except ValueError as e:
        raise ValidationError(message=str(e))


@router.get(
    "/{match_id}",
    response_model=List[MessageResponse],
    summary="Get messages in a thread",
    description="""
    Get all messages in a match thread, ordered by oldest first. 
    
    Automatically marks messages as read for the requesting user (only messages sent by the other party).
    
    **Example Request:**
    ```
    GET /api/v1/messages/{match_id}?profile_id=user-id&limit=50
    ```
    
    **Example Response:**
    ```json
    [
        {
            "id": "msg-1",
            "match_id": "match-id",
            "sender_id": "sender-1",
            "content": "Hello!",
            "read_at": "2025-01-20T12:05:00Z",
            "created_at": "2025-01-20T12:00:00Z"
        },
        {
            "id": "msg-2",
            "match_id": "match-id",
            "sender_id": "sender-2",
            "content": "Hi there!",
            "read_at": null,
            "created_at": "2025-01-20T12:01:00Z"
        }
    ]
    ```
    """,
    responses={
        200: {
            "description": "Messages returned successfully",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": "message-id",
                            "match_id": "match-id",
                            "sender_id": "sender-id",
                            "content": "Message content",
                            "read_at": None,
                            "created_at": "2025-01-20T12:00:00Z"
                        }
                    ]
                }
            }
        },
        400: {"description": "Invalid request (e.g., not part of the match)"},
    },
)
def list_messages(
    match_id: str,
    profile_id: str = Query(..., description="ID of the user requesting messages"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of messages to return"),
    session: Session = Depends(get_session),
) -> List[MessageResponse]:
    """Get all messages in a match thread. Automatically marks messages as read."""
    try:
        return messaging_service.list_messages(session, match_id, profile_id, limit)
    except ValueError as e:
        raise ValidationError(message=str(e))


@router.get(
    "",
    response_model=List[ConversationThread],
    summary="List all conversations",
    description="""
    Get all conversation threads for a user with last message preview and unread counts. 
    Ordered by most recent activity (last message timestamp).
    
    **Example Request:**
    ```
    GET /api/v1/messages?profile_id=user-id
    ```
    
    **Example Response:**
    ```json
    [
        {
            "match_id": "match-id-1",
            "founder_id": "founder-id",
            "investor_id": "investor-id",
            "other_party_id": "other-party-id",
            "other_party_name": "John Doe",
            "other_party_avatar_url": "https://example.com/avatar.jpg",
            "last_message_preview": "Looking forward to chatting!",
            "last_message_at": "2025-01-20T14:30:00Z",
            "unread_count": 2,
            "status": "active"
        }
    ]
    ```
    """,
    responses={
        200: {
            "description": "Conversations returned successfully",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "match_id": "match-id",
                            "founder_id": "founder-id",
                            "investor_id": "investor-id",
                            "other_party_id": "other-party-id",
                            "other_party_name": "John Doe",
                            "last_message_preview": "Last message...",
                            "unread_count": 0,
                            "status": "active"
                        }
                    ]
                }
            }
        },
    },
)
def list_conversations(
    profile_id: str = Query(..., description="ID of the user requesting conversations"),
    session: Session = Depends(get_session),
) -> List[ConversationThread]:
    """Get all conversation threads for a user with last message preview and unread counts."""
    return messaging_service.list_conversations(session, profile_id)

