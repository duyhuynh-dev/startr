from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.core.dependencies import get_current_user_profile
from app.db.session import get_session
from app.models.profile import Profile
from app.schemas.notification import (
    NotificationsListResponse,
    NotificationResponse,
    UnreadCountResponse,
)
from app.services.notifications import notifications_service

router = APIRouter()


@router.get(
    "",
    response_model=NotificationsListResponse,
    summary="List notifications (most recent first)",
    responses={401: {"description": "Authentication required"}},
)
def list_notifications(
    profile: Profile = Depends(get_current_user_profile),
    session: Session = Depends(get_session),
    limit: int = Query(30, ge=1, le=100),
    cursor: str | None = Query(None, description="ISO datetime cursor from previous response"),
) -> NotificationsListResponse:
    items, next_cursor = notifications_service.list_notifications(
        session, recipient_id=profile.id, limit=limit, cursor=cursor
    )
    return NotificationsListResponse(
        items=[
            NotificationResponse(
                id=n.id,
                recipient_id=n.recipient_id,
                actor_id=n.actor_id,
                match_id=n.match_id,
                message_id=n.message_id,
                type=n.type,
                title=n.title,
                body=n.body,
                href=n.href,
                read_at=n.read_at,
                created_at=n.created_at,
            )
            for n in items
        ],
        next_cursor=next_cursor,
    )


@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    summary="Get unread notifications count",
    responses={401: {"description": "Authentication required"}},
)
def unread_count(
    profile: Profile = Depends(get_current_user_profile),
    session: Session = Depends(get_session),
) -> UnreadCountResponse:
    return UnreadCountResponse(unread_count=notifications_service.unread_count(session, recipient_id=profile.id))


@router.post(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark a notification as read",
    responses={
        401: {"description": "Authentication required"},
        404: {"description": "Notification not found"},
    },
)
def mark_read(
    notification_id: str,
    profile: Profile = Depends(get_current_user_profile),
    session: Session = Depends(get_session),
) -> NotificationResponse:
    notif = notifications_service.mark_read(session, notification_id=notification_id, recipient_id=profile.id)
    if not notif:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Notification not found")
    return NotificationResponse(
        id=notif.id,
        recipient_id=notif.recipient_id,
        actor_id=notif.actor_id,
        match_id=notif.match_id,
        message_id=notif.message_id,
        type=notif.type,
        title=notif.title,
        body=notif.body,
        href=notif.href,
        read_at=notif.read_at,
        created_at=notif.created_at,
    )


@router.post(
    "/mark-all-read",
    summary="Mark all notifications as read",
    responses={401: {"description": "Authentication required"}},
)
def mark_all_read(
    profile: Profile = Depends(get_current_user_profile),
    session: Session = Depends(get_session),
) -> dict:
    updated = notifications_service.mark_all_read(session, recipient_id=profile.id)
    return {"marked_read": updated}

