from __future__ import annotations

from typing import List, Optional

from redis.exceptions import RedisError
from sqlalchemy import select
from sqlmodel import Session

from app.core.redis import redis_client
from app.models.match import Like, Match
from app.models.profile import Profile
from app.schemas.match import LikePayload, MatchRecord


class MatchingService:
    """Database + Redis-backed matching orchestration."""

    def record_like(self, session: Session, payload: LikePayload) -> Optional[MatchRecord]:
        existing = session.exec(
            select(Like).where(
                Like.sender_id == payload.sender_id,
                Like.recipient_id == payload.recipient_id,
            )
        ).first()
        if existing:
            return None

        like = Like(sender_id=payload.sender_id, recipient_id=payload.recipient_id, note=payload.note)
        session.add(like)
        session.commit()
        session.refresh(like)

        try:
            redis_client.lpush(f"likes:{payload.recipient_id}", like.id)
        except RedisError:
            pass

        reciprocal = session.exec(
            select(Like).where(
                Like.sender_id == payload.recipient_id,
                Like.recipient_id == payload.sender_id,
            )
        ).first()

        if reciprocal:
            match = self._create_match(session, payload.sender_id, payload.recipient_id, payload.note)
            return MatchRecord(**match.model_dump())
        return None

    def list_matches(self, session: Session, profile_id: str) -> List[MatchRecord]:
        results = session.exec(
            select(Match).where(
                (Match.founder_id == profile_id) | (Match.investor_id == profile_id)
            )
        ).all()
        return [MatchRecord(**match.model_dump()) for match in results]

    def rank_profiles(self, session: Session, profile_id: str) -> list[str]:
        key = f"likes:{profile_id}"
        try:
            like_ids = redis_client.lrange(key, 0, 50)
            if like_ids:
                return like_ids
        except RedisError:
            like_ids = []
        results = session.exec(select(Like.recipient_id).where(Like.sender_id == profile_id)).all()
        return list(results)

    def _create_match(self, session: Session, sender_id: str, recipient_id: str, note: str | None) -> Match:
        sender = session.get(Profile, sender_id)
        recipient = session.get(Profile, recipient_id)
        if not sender or not recipient:
            raise ValueError("Profiles missing for match creation")

        founder_id, investor_id = self._resolve_roles(sender, recipient)

        match = Match(
            founder_id=founder_id,
            investor_id=investor_id,
            status="active",
            last_message_preview=note,
        )
        session.add(match)
        session.commit()
        session.refresh(match)
        return match

    @staticmethod
    def _resolve_roles(profile_a: Profile, profile_b: Profile) -> tuple[str, str]:
        mapping = {
            profile_a.role: profile_a.id,
            profile_b.role: profile_b.id,
        }
        if "founder" not in mapping or "investor" not in mapping:
            raise ValueError("Matches require one founder and one investor")
        return mapping["founder"], mapping["investor"]


matching_service = MatchingService()

