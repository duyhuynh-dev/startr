from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import List, Optional, Set

from redis.exceptions import RedisError
from sqlalchemy import select, func, or_, and_
from sqlmodel import Session

from app.core.redis import redis_client
from app.models.match import Like
from app.models.profile import Profile
from app.schemas.feed import DiscoveryFeedResponse, LikesQueueItem, ProfileCard, StandoutProfile


class DiscoveryFeedService:
    """Redis-backed discovery feed with ranking, likes queue, and standouts."""

    # Redis key prefixes
    FEED_CACHE_PREFIX = "feed:"
    FEED_CACHE_TTL = 300  # 5 minutes
    LIKES_QUEUE_PREFIX = "likes_queue:"
    COMPATIBILITY_SCORE_PREFIX = "compat:"
    COMPATIBILITY_CACHE_TTL = 3600  # 1 hour

    def get_discovery_feed(
        self,
        session: Session,
        profile_id: str,
        role_filter: Optional[str] = None,
        limit: int = 20,
        cursor: Optional[str] = None,
    ) -> DiscoveryFeedResponse:
        """
        Get ranked discovery feed for a user.
        Uses Redis cache if available, otherwise computes and caches ranking.
        """
        current_profile = session.get(Profile, profile_id)
        if not current_profile:
            raise ValueError("Profile not found")

        # Determine target role (opposite of current user)
        target_role = role_filter or ("founder" if current_profile.role == "investor" else "investor")

        # Try Redis cache first
        cache_key = f"{self.FEED_CACHE_PREFIX}{profile_id}:{target_role}"
        try:
            cached = redis_client.get(cache_key)
            if cached:
                feed_data = json.loads(cached)
                profile_ids = feed_data.get("profile_ids", [])
                
                # Apply pagination
                start_idx = int(cursor) if cursor else 0
                end_idx = start_idx + limit
                paginated_ids = profile_ids[start_idx:end_idx]
                
                if not paginated_ids:
                    return DiscoveryFeedResponse(profiles=[], cursor=None, has_more=False)
                
                # Fetch profiles and build response
                profiles = self._fetch_profiles_with_metadata(
                    session, profile_id, paginated_ids, target_role
                )
                
                next_cursor = str(end_idx) if end_idx < len(profile_ids) else None
                return DiscoveryFeedResponse(
                    profiles=profiles,
                    cursor=next_cursor,
                    has_more=end_idx < len(profile_ids),
                )
        except RedisError:
            pass

        # Cache miss - compute ranking
        ranked_profile_ids = self._rank_profiles(session, current_profile, target_role)
        
        # Cache the ranking
        try:
            cache_data = json.dumps({"profile_ids": ranked_profile_ids, "generated_at": datetime.utcnow().isoformat()})
            redis_client.setex(cache_key, self.FEED_CACHE_TTL, cache_data)
        except RedisError:
            pass

        # Apply pagination
        start_idx = int(cursor) if cursor else 0
        end_idx = start_idx + limit
        paginated_ids = ranked_profile_ids[start_idx:end_idx]
        
        if not paginated_ids:
            return DiscoveryFeedResponse(profiles=[], cursor=None, has_more=False)
        
        profiles = self._fetch_profiles_with_metadata(session, profile_id, paginated_ids, target_role)
        next_cursor = str(end_idx) if end_idx < len(ranked_profile_ids) else None
        
        return DiscoveryFeedResponse(
            profiles=profiles,
            cursor=next_cursor,
            has_more=end_idx < len(ranked_profile_ids),
        )

    def get_likes_queue(self, session: Session, profile_id: str) -> List[LikesQueueItem]:
        """
        Get users who have liked you (likes queue).
        Checks Redis first, falls back to database.
        """
        queue_key = f"{self.LIKES_QUEUE_PREFIX}{profile_id}"
        
        try:
            # Try Redis queue
            like_ids = redis_client.lrange(queue_key, 0, 50)
            if like_ids:
                likes = []
                for like_id in like_ids:
                    like = session.get(Like, like_id)
                    if like and like.recipient_id == profile_id:
                        sender = session.get(Profile, like.sender_id)
                        if sender:
                            likes.append(
                                LikesQueueItem(
                                    profile=self._profile_to_base(sender),
                                    like_id=like.id,
                                    note=like.note,
                                    liked_at=like.created_at.isoformat(),
                                )
                            )
                return likes
        except RedisError:
            pass

        # Fallback to database
        likes = session.exec(
            select(Like).where(Like.recipient_id == profile_id).order_by(Like.created_at.desc()).limit(50)
        ).all()
        
        result = []
        for like in likes:
            sender = session.get(Profile, like.sender_id)
            if sender:
                result.append(
                    LikesQueueItem(
                        profile=self._profile_to_base(sender),
                        like_id=like.id,
                        note=like.note,
                        liked_at=like.created_at.isoformat(),
                    )
                )
        return result

    def get_standouts(
        self, session: Session, profile_id: str, limit: int = 10
    ) -> List[StandoutProfile]:
        """
        Get standout profiles (most compatible, similar to Hinge Standouts).
        Uses compatibility scores cached in Redis.
        """
        current_profile = session.get(Profile, profile_id)
        if not current_profile:
            raise ValueError("Profile not found")

        target_role = "founder" if current_profile.role == "investor" else "investor"

        # Get all profiles of target role (prefer verified profiles, but include all for now)
        excluded_ids = self._get_excluded_profile_ids(session, profile_id)
        excluded_ids.add(profile_id)
        
        candidates = session.exec(
            select(Profile).where(
                and_(
                    Profile.role == target_role,
                    Profile.id.notin_(list(excluded_ids)) if excluded_ids else True,
                )
            )
        ).all()

        # Compute compatibility scores
        scored_profiles = []
        for candidate in candidates:
            score = self._compute_compatibility_score(session, current_profile, candidate)
            if score >= 70:  # Only show high-compatibility profiles
                match_reasons = self._get_match_reasons(current_profile, candidate)
                standout = StandoutProfile(
                    **self._profile_to_base(candidate).model_dump(),
                    compatibility_score=score,
                    match_reasons=match_reasons,
                )
                scored_profiles.append(standout)

        # Sort by score descending
        scored_profiles.sort(key=lambda p: p.compatibility_score, reverse=True)
        return scored_profiles[:limit]

    def _rank_profiles(
        self, session: Session, current_profile: Profile, target_role: str
    ) -> List[str]:
        """Rank profiles by compatibility (placeholder for ML model)."""
        # Get all profiles of target role, excluding current user and already matched/liked
        excluded_ids = self._get_excluded_profile_ids(session, current_profile.id)
        
        candidates = session.exec(
            select(Profile).where(
                and_(
                    Profile.role == target_role,
                    Profile.id != current_profile.id,
                    Profile.id.notin_(excluded_ids) if excluded_ids else True,
                )
            )
        ).all()

        # Score and sort (simple heuristic for now, will be replaced by ML)
        scored = []
        for candidate in candidates:
            score = self._compute_compatibility_score(session, current_profile, candidate)
            scored.append((candidate.id, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return [profile_id for profile_id, _ in scored]

    def _compute_compatibility_score(
        self, session: Session, profile_a: Profile, profile_b: Profile
    ) -> float:
        """Compute compatibility score between two profiles (heuristic-based for now)."""
        # Try Redis cache first
        cache_key = f"{self.COMPATIBILITY_SCORE_PREFIX}{profile_a.id}:{profile_b.id}"
        try:
            cached = redis_client.get(cache_key)
            if cached:
                return float(cached)
        except RedisError:
            pass

        score = 0.0
        max_score = 100.0

        # Sector overlap (30 points)
        if profile_a.focus_sectors and profile_b.focus_sectors:
            overlap = len(set(profile_a.focus_sectors) & set(profile_b.focus_sectors))
            total = len(set(profile_a.focus_sectors) | set(profile_b.focus_sectors))
            if total > 0:
                score += (overlap / total) * 30

        # Stage alignment (25 points) - only for investor-founder pairs
        if profile_a.role != profile_b.role:
            if profile_a.focus_stages and profile_b.focus_stages:
                overlap = len(set(profile_a.focus_stages) & set(profile_b.focus_stages))
                if overlap > 0:
                    score += 25

        # Check size alignment (25 points) - investor check size vs founder needs
        if profile_a.role == "investor" and profile_b.role == "founder":
            if profile_a.check_size_min and profile_b.revenue_run_rate:
                # Simplified: if founder revenue is in investor's check size range
                if profile_a.check_size_min <= profile_b.revenue_run_rate * 12 <= (profile_a.check_size_max or float('inf')):
                    score += 25
        elif profile_a.role == "founder" and profile_b.role == "investor":
            if profile_b.check_size_min and profile_a.revenue_run_rate:
                if profile_b.check_size_min <= profile_a.revenue_run_rate * 12 <= (profile_b.check_size_max or float('inf')):
                    score += 25

        # Location overlap (10 points)
        if profile_a.location and profile_b.location:
            if profile_a.location.lower() == profile_b.location.lower():
                score += 10

        # Verification boost (10 points)
        if profile_b.verification.get("soft_verified") or profile_b.verification.get("manual_reviewed"):
            score += 10

        # Cache the score
        try:
            redis_client.setex(cache_key, self.COMPATIBILITY_CACHE_TTL, str(score))
        except RedisError:
            pass

        return min(score, max_score)

    def _fetch_profiles_with_metadata(
        self, session: Session, viewer_id: str, profile_ids: List[str], target_role: str
    ) -> List[ProfileCard]:
        """Fetch profiles and enrich with metadata (compatibility, like counts, etc.)."""
        profiles = session.exec(select(Profile).where(Profile.id.in_(profile_ids))).all()
        
        # Get like counts
        like_counts = {}
        for profile in profiles:
            count = session.exec(
                select(func.count(Like.id)).where(Like.recipient_id == profile.id)
            ).first() or 0
            like_counts[profile.id] = count

        # Check which profiles have liked the viewer
        likes_sent_to_viewer = session.exec(
            select(Like.sender_id).where(Like.recipient_id == viewer_id)
        ).all()
        has_liked_you_set = set(likes_sent_to_viewer)

        # Build profile cards
        profile_map = {p.id: p for p in profiles}
        cards = []
        
        for profile_id in profile_ids:
            if profile_id not in profile_map:
                continue
            
            profile = profile_map[profile_id]
            viewer_profile = session.get(Profile, viewer_id)
            
            compatibility_score = None
            if viewer_profile:
                compatibility_score = self._compute_compatibility_score(session, viewer_profile, profile)
            
            cards.append(
                ProfileCard(
                    **self._profile_to_base(profile).model_dump(),
                    compatibility_score=compatibility_score,
                    like_count=like_counts.get(profile.id, 0),
                    has_liked_you=profile.id in has_liked_you_set,
                )
            )

        return cards

    def _get_excluded_profile_ids(self, session: Session, profile_id: str) -> Set[str]:
        """Get IDs of profiles to exclude from feed (already matched or liked/passed)."""
        from app.models.match import Match
        
        excluded = set()

        # Already matched
        matches = session.exec(
            select(Match).where(
                (Match.founder_id == profile_id) | (Match.investor_id == profile_id)
            )
        ).all()
        
        for match in matches:
            if match.founder_id == profile_id:
                excluded.add(match.investor_id)
            else:
                excluded.add(match.founder_id)

        # Already liked or received likes from
        likes_given = session.exec(
            select(Like.recipient_id).where(Like.sender_id == profile_id)
        ).all()
        likes_received = session.exec(
            select(Like.sender_id).where(Like.recipient_id == profile_id)
        ).all()

        excluded.update(likes_given)
        excluded.update(likes_received)

        return excluded

    def _get_match_reasons(self, profile_a: Profile, profile_b: Profile) -> List[str]:
        """Get reasons why two profiles are compatible (for standouts)."""
        reasons = []

        if profile_a.focus_sectors and profile_b.focus_sectors:
            overlap = set(profile_a.focus_sectors) & set(profile_b.focus_sectors)
            if overlap:
                reasons.append(f"Shared interest in: {', '.join(list(overlap)[:2])}")

        if profile_a.location and profile_b.location:
            if profile_a.location.lower() == profile_b.location.lower():
                reasons.append(f"Both based in {profile_a.location}")

        if profile_b.verification.get("manual_reviewed"):
            reasons.append("Verified profile")

        if profile_a.focus_stages and profile_b.focus_stages:
            overlap = set(profile_a.focus_stages) & set(profile_b.focus_stages)
            if overlap:
                reasons.append(f"Aligned on stage: {', '.join(list(overlap)[:1])}")

        return reasons[:3]  # Max 3 reasons

    @staticmethod
    def _profile_to_base(profile: Profile) -> dict:
        """Convert Profile model to BaseProfile schema dict."""
        from app.schemas.profile import PromptResponse, VerificationStatus

        prompts = [PromptResponse(**p) for p in (profile.prompts or [])]
        verification = VerificationStatus(**profile.verification) if profile.verification else VerificationStatus()

        return {
            "id": profile.id,
            "role": profile.role,
            "full_name": profile.full_name,
            "email": profile.email,
            "headline": profile.headline,
            "avatar_url": profile.avatar_url,
            "location": profile.location,
            "prompts": prompts,
            "metadata": profile.metadata,
            "verification": verification,
            "firm": profile.firm,
            "check_size_min": profile.check_size_min,
            "check_size_max": profile.check_size_max,
            "focus_sectors": profile.focus_sectors or [],
            "focus_stages": profile.focus_stages or [],
            "accreditation_note": profile.accreditation_note,
            "company_name": profile.company_name,
            "company_url": profile.company_url,
            "revenue_run_rate": profile.revenue_run_rate,
            "team_size": profile.team_size,
            "runway_months": profile.runway_months,
            "focus_markets": profile.focus_markets or [],
            "created_at": profile.created_at,
            "updated_at": profile.updated_at,
        }


discovery_feed_service = DiscoveryFeedService()

