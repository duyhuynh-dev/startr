from __future__ import annotations

from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlmodel import Session

from app.core.dependencies import get_current_user_profile
from app.core.exceptions import ValidationError
from app.db.session import get_session
from app.models.profile import Profile
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
    
    **Authentication:** Bearer token required. The sender is the authenticated user's profile.

    **Requirements:**
    - Sender must be part of the match (founder or investor)
    - Match status must be "active" or "pending"
    - Automatically updates match's last_message_preview

    **Example Request:**
    ```json
    {
        "match_id": "123e4567-e89b-12d3-a456-426614174000",
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
        401: {"description": "Authentication required"},
    },
)
async def create_message(
    payload: MessageCreate,
    profile: Profile = Depends(get_current_user_profile),
    background_tasks: BackgroundTasks = None,
    session: Session = Depends(get_session),
) -> MessageResponse:
    """Send a message in a match thread. Sender is the authenticated user."""
    try:
        authenticated_payload = MessageCreate(
            match_id=payload.match_id,
            sender_id=profile.id,
            content=payload.content,
            attachment_url=payload.attachment_url,
        )
        message_response = messaging_service.create_message(session, authenticated_payload)
        
        # Broadcast via WebSocket in background (non-blocking)
        async def broadcast_message():
            try:
                from app.services.realtime import connection_manager
                from app.db.session import engine
                from sqlmodel import Session as SQLSession
                import logging
                
                logger = logging.getLogger(__name__)
                
                # Convert Pydantic model to JSON-serializable dict (handles datetime)
                # Ensure datetime fields are explicitly in UTC with 'Z' suffix
                message_data = message_response.model_dump(mode='json')
                # Pydantic's model_dump(mode='json') should handle datetime, but ensure UTC
                if 'created_at' in message_data and message_data['created_at']:
                    # Ensure datetime string ends with 'Z' to indicate UTC
                    created_at_str = message_data['created_at']
                    if isinstance(created_at_str, str) and not created_at_str.endswith('Z'):
                        # Add 'Z' if it's missing (assumes UTC)
                        message_data['created_at'] = created_at_str.rstrip('Z') + 'Z'
                
                message_dict = {
                    "type": "new_message",
                    "message": message_data
                }
                
                # Broadcast to both users in the match
                with SQLSession(engine) as broadcast_session:
                    await connection_manager.broadcast_message(
                        message_dict,
                        message_response.match_id,
                        broadcast_session
                    )
                logger.info(f"✅ Message broadcasted via WebSocket for match {message_response.match_id}: {message_dict}")
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"WebSocket broadcast failed (non-critical): {e}", exc_info=True)
        
        # Add broadcast task to background
        if background_tasks:
            background_tasks.add_task(broadcast_message)
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"📤 Message created, queued for broadcast: match={message_response.match_id}, sender={message_response.sender_id}")
        
        return message_response
    except ValueError as e:
        raise ValidationError(message=str(e))


@router.get(
    "",
    response_model=List[ConversationThread],
    summary="List all conversations",
    description="""
    Get all conversation threads for a user with last message preview and unread counts. 
    Ordered by most recent activity (last message timestamp).
    
    **Authentication:** Bearer token required.

    **Example Request:**
    ```
    GET /api/v1/messages
    Authorization: Bearer <token>
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
        401: {"description": "Authentication required"},
    },
)
def list_conversations(
    profile: Profile = Depends(get_current_user_profile),
    session: Session = Depends(get_session),
) -> List[ConversationThread]:
    """Get all conversation threads for the authenticated user."""
    return messaging_service.list_conversations(session, profile.id)


@router.get(
    "/{match_id}",
    response_model=List[MessageResponse],
    summary="Get messages in a thread",
    description="""
    Get all messages in a match thread, ordered by oldest first. 
    
    Automatically marks messages as read for the requesting user (only messages sent by the other party).
    
    **Authentication:** Bearer token required.

    **Example Request:**
    ```
    GET /api/v1/messages/{match_id}?limit=50
    Authorization: Bearer <token>
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
        401: {"description": "Authentication required"},
    },
)
def list_messages(
    match_id: str,
    profile: Profile = Depends(get_current_user_profile),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of messages to return"),
    session: Session = Depends(get_session),
) -> List[MessageResponse]:
    """Get all messages in a match thread. Automatically marks messages as read."""
    try:
        return messaging_service.list_messages(session, match_id, profile.id, limit)
    except ValueError as e:
        raise ValidationError(message=str(e))
