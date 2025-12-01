from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import select, func
from sqlmodel import Session

from app.models.match import Match
from app.models.message import Message
from app.models.profile import Profile
from app.schemas.message import MessageCreate, MessageResponse, ConversationThread


class MessagingService:
    """Handles message creation, retrieval, and conversation threads."""

    def create_message(self, session: Session, payload: MessageCreate) -> MessageResponse:
        # Verify match exists and sender is part of it
        match = session.get(Match, payload.match_id)
        if not match:
            raise ValueError("Match not found")

        if payload.sender_id not in [match.founder_id, match.investor_id]:
            raise ValueError("Sender is not part of this match")

        if match.status not in ["active", "pending"]:
            raise ValueError("Cannot send messages to closed or blocked matches")

        message = Message(
            match_id=payload.match_id,
            sender_id=payload.sender_id,
            content=payload.content,
            attachment_url=payload.attachment_url,
        )
        session.add(message)
        
        # Update match's last_message_preview and updated_at
        match.last_message_preview = payload.content[:100]  # First 100 chars
        match.updated_at = datetime.utcnow()
        
        session.commit()
        session.refresh(message)
        
        # Convert SQLModel to Pydantic
        message_response = MessageResponse(
            id=message.id,
            match_id=message.match_id,
            sender_id=message.sender_id,
            content=message.content,
            attachment_url=message.attachment_url,
            read_at=message.read_at,
            created_at=message.created_at,
        )
        
        
        return message_response

    def list_messages(
        self, session: Session, match_id: str, profile_id: str, limit: int = 50
    ) -> List[MessageResponse]:
        # Verify user is part of the match
        match = session.get(Match, match_id)
        if not match:
            raise ValueError("Match not found")

        if profile_id not in [match.founder_id, match.investor_id]:
            raise ValueError("User is not part of this match")

        # Mark messages as read for this user (only those not sent by them)
        messages_to_mark = session.exec(
            select(Message).where(
                Message.match_id == match_id,
                Message.sender_id != profile_id,
                Message.read_at.is_(None),
            )
        ).scalars().all()  # Use scalars() to get Message instances
        for msg in messages_to_mark:
            msg.read_at = datetime.utcnow()

        session.commit()

        # Fetch messages ordered by creation time (oldest first)
        results = session.exec(
            select(Message)
            .where(Message.match_id == match_id)
            .order_by(Message.created_at.asc())
            .limit(limit)
        ).scalars().all()  # Use scalars() to get Message instances
        # Convert SQLModel to Pydantic
        return [
            MessageResponse(
                id=msg.id,
                match_id=msg.match_id,
                sender_id=msg.sender_id,
                content=msg.content,
                attachment_url=msg.attachment_url,
                read_at=msg.read_at,
                created_at=msg.created_at,
            )
            for msg in results
        ]

    def list_conversations(
        self, session: Session, profile_id: str
    ) -> List[ConversationThread]:
        """Get all conversation threads for a user with last message preview."""
        # Get all matches where user is involved
        matches = session.exec(
            select(Match).where(
                (Match.founder_id == profile_id) | (Match.investor_id == profile_id)
            )
        ).scalars().all()  # Use scalars() to get Match instances

        threads = []
        for match in matches:
            # Determine the other party
            if match.founder_id == profile_id:
                other_party_id = match.investor_id
            else:
                other_party_id = match.founder_id

            other_party = session.get(Profile, other_party_id)
            if not other_party:
                continue

            # Get last message for preview
            last_message = session.exec(
                select(Message)
                .where(Message.match_id == match.id)
                .order_by(Message.created_at.desc())
                .limit(1)
            ).scalars().first()  # Use scalars() to get Message instance

            # Count unread messages (messages not sent by user and not read)
            unread_result = session.exec(
                select(func.count(Message.id))
                .where(
                    Message.match_id == match.id,
                    Message.sender_id != profile_id,
                    Message.read_at.is_(None),
                )
            ).scalar()
            unread_count = int(unread_result) if unread_result is not None else 0

            # Handle last_message safely
            if last_message and hasattr(last_message, 'content'):
                last_message_preview = last_message.content[:100] if last_message.content else None
                last_message_at = last_message.created_at if hasattr(last_message, 'created_at') else match.updated_at
            else:
                last_message_preview = match.last_message_preview
                last_message_at = match.updated_at
            
            threads.append(
                ConversationThread(
                    match_id=match.id,
                    founder_id=match.founder_id,
                    investor_id=match.investor_id,
                    other_party_id=other_party_id,
                    other_party_name=other_party.full_name,
                    other_party_avatar_url=other_party.avatar_url,
                    last_message_preview=last_message_preview,
                    last_message_at=last_message_at,
                    unread_count=unread_count,
                    status=match.status,
                )
            )

        # Sort by last_message_at descending (most recent first)
        threads.sort(key=lambda t: t.last_message_at or datetime.min, reverse=True)
        return threads


messaging_service = MessagingService()

