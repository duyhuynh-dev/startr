from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import func, select
from sqlmodel import Session

from app.models.notification import Notification


class NotificationsService:
    def create_notification(
        self,
        session: Session,
        *,
        recipient_id: str,
        type: str,
        title: str,
        body: str | None = None,
        href: str | None = None,
        actor_id: str | None = None,
        match_id: str | None = None,
        message_id: str | None = None,
    ) -> Notification:
        notif = Notification(
            recipient_id=recipient_id,
            actor_id=actor_id,
            match_id=match_id,
            message_id=message_id,
            type=type,
            title=title,
            body=body,
            href=href,
        )
        session.add(notif)
        session.commit()
        session.refresh(notif)
        return notif

    def list_notifications(
        self,
        session: Session,
        *,
        recipient_id: str,
        limit: int = 30,
        cursor: Optional[str] = None,
    ) -> tuple[list[Notification], Optional[str]]:
        limit = max(1, min(int(limit), 100))

        query = select(Notification).where(Notification.recipient_id == recipient_id)
        if cursor:
            # Cursor is an ISO datetime string; we paginate older notifications
            try:
                cursor_dt = datetime.fromisoformat(cursor.replace("Z", "+00:00"))
                query = query.where(Notification.created_at < cursor_dt)
            except Exception:
                pass

        results = session.exec(
            query.order_by(Notification.created_at.desc()).limit(limit + 1)
        ).scalars().all()

        next_cursor = None
        if len(results) > limit:
            last = results[limit - 1]
            next_cursor = last.created_at.replace(microsecond=0).isoformat() + "Z"
            results = results[:limit]

        return results, next_cursor

    def unread_count(self, session: Session, *, recipient_id: str) -> int:
        return int(
            session.exec(
                select(func.count())
                .select_from(Notification)
                .where(Notification.recipient_id == recipient_id, Notification.read_at.is_(None))
            ).one()
        )

    def mark_read(self, session: Session, *, notification_id: str, recipient_id: str) -> Notification | None:
        notif = session.get(Notification, notification_id)
        if not notif or notif.recipient_id != recipient_id:
            return None
        if notif.read_at is None:
            notif.read_at = datetime.utcnow()
            session.add(notif)
            session.commit()
            session.refresh(notif)
        return notif

    def mark_all_read(self, session: Session, *, recipient_id: str) -> int:
        unread = session.exec(
            select(Notification).where(Notification.recipient_id == recipient_id, Notification.read_at.is_(None))
        ).scalars().all()
        if not unread:
            return 0
        now = datetime.utcnow()
        for n in unread:
            n.read_at = now
            session.add(n)
        session.commit()
        return len(unread)


notifications_service = NotificationsService()

