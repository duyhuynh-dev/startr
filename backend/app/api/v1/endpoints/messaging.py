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
    description="Send a message in a match thread. Both users in a match can send messages to each other.",
    responses={
        201: {"description": "Message sent successfully"},
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
    description="Get all messages in a match thread, ordered by most recent. Automatically marks messages as read for the requesting user.",
    responses={
        200: {"description": "Messages returned successfully"},
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
    description="Get all conversation threads for a user with last message preview and unread counts. Ordered by most recent activity.",
    responses={
        200: {"description": "Conversations returned successfully"},
    },
)
def list_conversations(
    profile_id: str = Query(..., description="ID of the user requesting conversations"),
    session: Session = Depends(get_session),
) -> List[ConversationThread]:
    """Get all conversation threads for a user with last message preview and unread counts."""
    return messaging_service.list_conversations(session, profile_id)

