"""Profile caching service with TTL management."""

from __future__ import annotations

from typing import Optional

from sqlmodel import Session

from app.core.cache import CACHE_TTL_LONG, cache_service
from app.models.profile import Profile
from app.schemas.profile import BaseProfile, PromptResponse, VerificationStatus


class ProfileCacheService:
    """Caching service for profile lookups."""

    PROFILE_CACHE_TTL = CACHE_TTL_LONG  # 1 hour - profiles don't change frequently

    @staticmethod
    def get_profile(profile_id: str, session: Session) -> Optional[BaseProfile]:
        """Get profile from cache or database."""
        cache_key = cache_service.get_profile_key(profile_id)

        def fetch_profile() -> BaseProfile:
            profile = session.get(Profile, profile_id)
            if not profile:
                return None  # type: ignore
            return ProfileCacheService._profile_to_base(profile)

        cached = cache_service.get(cache_key)
        if cached:
            return BaseProfile(**cached)

        profile = session.get(Profile, profile_id)
        if not profile:
            return None

        base_profile = ProfileCacheService._profile_to_base(profile)
        cache_service.set(cache_key, base_profile.model_dump(), ProfileCacheService.PROFILE_CACHE_TTL)
        return base_profile

    @staticmethod
    def invalidate_profile(profile_id: str) -> None:
        """Invalidate profile cache and related caches."""
        cache_service.invalidate_profile(profile_id)

    @staticmethod
    def _profile_to_base(profile: Profile) -> BaseProfile:
        """Convert Profile model to BaseProfile schema."""
        prompts = [PromptResponse(**p) for p in (profile.prompts or [])]
        verification = (
            VerificationStatus(**profile.verification)
            if profile.verification
            else VerificationStatus()
        )

        return BaseProfile(
            id=profile.id,
            role=profile.role,
            full_name=profile.full_name,
            email=profile.email,
            headline=profile.headline,
            avatar_url=profile.avatar_url,
            location=profile.location,
            prompts=prompts,
            metadata=profile.metadata,
            verification=verification,
            firm=profile.firm,
            check_size_min=profile.check_size_min,
            check_size_max=profile.check_size_max,
            focus_sectors=profile.focus_sectors or [],
            focus_stages=profile.focus_stages or [],
            accreditation_note=profile.accreditation_note,
            company_name=profile.company_name,
            company_url=profile.company_url,
            revenue_run_rate=profile.revenue_run_rate,
            team_size=profile.team_size,
            runway_months=profile.runway_months,
            focus_markets=profile.focus_markets or [],
            created_at=profile.created_at,
            updated_at=profile.updated_at,
        )


profile_cache_service = ProfileCacheService()

