from __future__ import annotations

from datetime import datetime, timedelta
from typing import List, Optional

from redis.exceptions import RedisError
from sqlalchemy import select, and_
from sqlmodel import Session

from app.core.cache import LIKES_QUEUE_PREFIX, cache_service
from app.core.exceptions import ValidationError
from app.core.redis import redis_client
from app.models.match import DailyLimit, Like, Match, Pass, ProfileView
from app.models.profile import Profile
from app.schemas.match import LikePayload, MatchRecord


class MatchingService:
    """Database + Redis-backed matching orchestration."""

    def record_like(self, session: Session, payload: LikePayload) -> Optional[MatchRecord]:
        # Validate that profiles exist before proceeding
        sender_profile = session.get(Profile, payload.sender_id)
        recipient_profile = session.get(Profile, payload.recipient_id)
        
        if not sender_profile:
            raise ValidationError(
                message=f"Sender profile not found: {payload.sender_id}",
                field="sender_id"
            )
        
        if not recipient_profile:
            raise ValidationError(
                message=f"Recipient profile not found: {payload.recipient_id}",
                field="recipient_id"
            )
        
        # Check if already liked
        existing = session.exec(
            select(Like).where(
                Like.sender_id == payload.sender_id,
                Like.recipient_id == payload.recipient_id,
            )
        ).first()
        if existing:
            return None

        # Check daily limits
        like_type = getattr(payload, 'like_type', 'standard')
        if not self._check_daily_limit(session, payload.sender_id, like_type):
            raise ValidationError(
                message=f"Daily {like_type} limit reached. Try again tomorrow!",
                field="like_type"
            )

        # Create like with enhanced fields
        like = Like(
            sender_id=payload.sender_id,
            recipient_id=payload.recipient_id,
            note=payload.note,
            prompt_id=getattr(payload, 'prompt_id', None),
            like_type=like_type
        )
        session.add(like)
        
        try:
            session.commit()
            session.refresh(like)
        except Exception as e:
            session.rollback()
            # Check if it's a foreign key constraint error
            error_msg = str(e)
            if "foreign key" in error_msg.lower() or "violates foreign key constraint" in error_msg.lower():
                raise ValidationError(
                    message="Invalid profile ID. One or both profiles do not exist.",
                    field="sender_id" if "sender_id" in error_msg else "recipient_id"
                )
            # Re-raise other database errors
            raise

        # Increment daily limit counter (non-critical, don't fail the whole request if this fails)
        try:
            self._increment_daily_limit(session, payload.sender_id, like_type)
        except Exception as e:
            # Log but don't fail - daily limit increment is not critical
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to increment daily limit (non-critical): {e}")
            # Don't re-raise - we've already created the like successfully

        try:
            redis_client.lpush(f"{LIKES_QUEUE_PREFIX}{payload.recipient_id}", like.id)
        except RedisError:
            pass

        # Invalidate feed caches since ranking may change
        cache_service.invalidate_feeds_for_profile(payload.recipient_id)
        cache_service.invalidate_compatibility_scores(payload.sender_id)
        cache_service.invalidate_compatibility_scores(payload.recipient_id)

        reciprocal = session.exec(
            select(Like).where(
                Like.sender_id == payload.recipient_id,
                Like.recipient_id == payload.sender_id,
            )
        ).first()

        if reciprocal:
            try:
                match = self._create_match(session, payload.sender_id, payload.recipient_id, payload.note)
                # Invalidate feed caches for both users after match
                cache_service.invalidate_feeds_for_profile(payload.sender_id)
                cache_service.invalidate_feeds_for_profile(payload.recipient_id)
                return MatchRecord(
                    id=str(match.id),
                    founder_id=str(match.founder_id),
                    investor_id=str(match.investor_id),
                    status=match.status or "active",
                    created_at=match.created_at or datetime.utcnow(),
                    updated_at=match.updated_at or datetime.utcnow(),
                    last_message_preview=match.last_message_preview,
                )
            except ValueError as e:
                # If match creation fails (e.g., both are same role), log and continue
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to create match after reciprocal like: {e}")
                # Return None - the like was still created successfully
                return None
        return None

    def list_matches(self, session: Session, profile_id: str) -> List[MatchRecord]:
        results = session.exec(
            select(Match).where(
                (Match.founder_id == profile_id) | (Match.investor_id == profile_id)
            )
        ).scalars().all()  # Use scalars() to get Match instances, not Row objects
        # Convert SQLModel Match to Pydantic MatchRecord
        return [
            MatchRecord(
                id=match.id,
                founder_id=match.founder_id,
                investor_id=match.investor_id,
                status=match.status,
                created_at=match.created_at,
                updated_at=match.updated_at,
                last_message_preview=match.last_message_preview,
            )
            for match in results
        ]

    def rank_profiles(self, session: Session, profile_id: str) -> list[str]:
        """Get ranked profile IDs from likes (for feed ranking)."""
        key = f"{LIKES_QUEUE_PREFIX}{profile_id}"
        try:
            like_ids = redis_client.lrange(key, 0, 50)
            if like_ids:
                return like_ids
        except RedisError:
            pass
        # Fallback to database
        results = session.exec(select(Like.recipient_id).where(Like.sender_id == profile_id)).all()
        return list(results)

    def record_pass(self, session: Session, user_id: str, passed_profile_id: str) -> None:
        """Record when a user passes (X) on a profile."""
        # Check if already passed
        existing = session.exec(
            select(Pass).where(
                Pass.user_id == user_id,
                Pass.passed_profile_id == passed_profile_id,
            )
        ).first()
        if existing:
            return  # Already passed

        pass_record = Pass(user_id=user_id, passed_profile_id=passed_profile_id)
        session.add(pass_record)
        session.commit()

        # Invalidate feed cache
        cache_service.invalidate_feeds_for_profile(user_id)

    def record_profile_view(self, session: Session, viewer_id: str, viewed_profile_id: str) -> None:
        """Record when a user views a profile in discovery feed."""
        # Check if already viewed recently (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        existing = session.exec(
            select(ProfileView).where(
                ProfileView.viewer_id == viewer_id,
                ProfileView.viewed_profile_id == viewed_profile_id,
                ProfileView.created_at >= week_ago
            )
        ).first()
        if existing:
            return  # Already viewed recently

        view = ProfileView(viewer_id=viewer_id, viewed_profile_id=viewed_profile_id)
        session.add(view)
        session.commit()

    def get_daily_limits(self, session: Session, profile_id: str) -> dict:
        """Get current daily limit status for a profile."""
        today = datetime.utcnow().strftime("%Y-%m-%d")

        limit_record = session.exec(
            select(DailyLimit).where(
                DailyLimit.profile_id == profile_id,
                DailyLimit.date == today
            )
        ).first()

        if not limit_record:
            # No usage today yet
            return {
                "date": today,
                "standard_likes_used": 0,
                "standard_likes_remaining": 10,
                "standard_likes_limit": 10,
                "roses_used": 0,
                "roses_remaining": 1,
                "roses_limit": 1,
            }

        # Handle cases where attributes might be None due to migration
        standard_used = getattr(limit_record, 'standard_likes_used', 0) or 0
        standard_limit = getattr(limit_record, 'standard_likes_limit', 10) or 10
        roses_used = getattr(limit_record, 'roses_used', 0) or 0
        roses_limit = getattr(limit_record, 'roses_limit', 1) or 1

        return {
            "date": today,
            "standard_likes_used": standard_used,
            "standard_likes_remaining": max(0, standard_limit - standard_used),
            "standard_likes_limit": standard_limit,
            "roses_used": roses_used,
            "roses_remaining": max(0, roses_limit - roses_used),
            "roses_limit": roses_limit,
        }

    def _check_daily_limit(self, session: Session, profile_id: str, like_type: str) -> bool:
        """Check if user has remaining likes for the day."""
        limits = self.get_daily_limits(session, profile_id)

        if like_type == "rose":
            return limits["roses_remaining"] > 0
        else:  # standard
            return limits["standard_likes_remaining"] > 0

    def _increment_daily_limit(self, session: Session, profile_id: str, like_type: str) -> None:
        """Increment daily limit counter after sending a like."""
        today = datetime.utcnow().strftime("%Y-%m-%d")

        limit_record = session.exec(
            select(DailyLimit).where(
                DailyLimit.profile_id == profile_id,
                DailyLimit.date == today
            )
        ).first()

        if not limit_record:
            # Create new record for today
            limit_record = DailyLimit(
                profile_id=profile_id,
                date=today,
                standard_likes_used=1 if like_type == "standard" else 0,
                roses_used=1 if like_type == "rose" else 0,
            )
            session.add(limit_record)
        else:
            # Increment existing record
            if like_type == "rose":
                limit_record.roses_used += 1
            else:
                limit_record.standard_likes_used += 1

        session.commit()

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
        try:
            session.commit()
            session.refresh(match)
        except Exception as e:
            session.rollback()
            raise
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

