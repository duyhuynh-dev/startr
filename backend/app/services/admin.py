from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import select, func, and_, or_
from sqlmodel import Session

from app.models.match import Match
from app.models.profile import Profile
from app.models.startup_of_month import StartupOfMonth
from app.schemas.admin import (
    AdminStatsResponse,
    PendingVerificationProfile,
    StartupOfMonthCreate,
    StartupOfMonthResponse,
    VerificationReviewRequest,
    VerificationReviewResponse,
)
from app.schemas.profile import BaseProfile


class AdminService:
    """Admin operations for verification review and startup-of-month curation."""

    def get_pending_verifications(
        self, session: Session, limit: int = 50
    ) -> List[PendingVerificationProfile]:
        """Get profiles awaiting manual verification review."""
        # Fetch all profiles and filter in Python (JSON field queries can be complex)
        # TODO: Optimize with proper JSONB queries for PostgreSQL when needed
        # Use scalars() to get Profile objects, not Row objects
        all_profiles = session.exec(select(Profile)).scalars().all()

        pending = []
        for profile in all_profiles:
            verification = profile.verification or {}
            soft_verified = verification.get("soft_verified", False)
            accreditation_attested = verification.get("accreditation_attested", False)
            manual_reviewed = verification.get("manual_reviewed", False)

            # Include if they have soft_verified or accreditation_attested but not manually reviewed
            if (soft_verified or accreditation_attested) and not manual_reviewed:
                pending.append(profile)
                if len(pending) >= limit:
                    break

        result = []
        for profile in pending:
            verification = profile.verification or {}
            # _profile_to_base returns a dict, not a Pydantic model
            profile_dict = self._profile_to_base(profile)
            result.append(
                PendingVerificationProfile(
                    **profile_dict,
                    verification_submitted_at=profile.updated_at,
                    verification_status="pending",
                )
            )

        return result

    def review_verification(
        self, session: Session, request: VerificationReviewRequest
    ) -> VerificationReviewResponse:
        """Review and approve/reject a profile's verification."""
        profile = session.get(Profile, request.profile_id)
        if not profile:
            raise ValueError(f"Profile {request.profile_id} not found")

        verification = profile.verification or {
            "soft_verified": False,
            "manual_reviewed": False,
            "accreditation_attested": False,
            "badges": [],
        }

        if request.action == "approve":
            verification["manual_reviewed"] = True
            if request.badges:
                existing_badges = verification.get("badges", [])
                verification["badges"] = list(set(existing_badges + request.badges))
            status = "approved"
        elif request.action == "reject":
            verification["manual_reviewed"] = False
            verification["soft_verified"] = False  # Revoke soft verification
            status = "rejected"
        else:  # request_info
            status = "pending_info"
            # Keep pending, don't change verification status

        profile.verification = verification
        profile.updated_at = datetime.utcnow()
        session.add(profile)
        session.commit()
        session.refresh(profile)

        return VerificationReviewResponse(
            profile_id=profile.id,
            status=status,
            badges=verification.get("badges", []),
            reviewed_at=datetime.utcnow(),
            reviewer_notes=request.notes,
        )

    def get_current_startup_of_month(
        self, session: Session, year: Optional[int] = None, month: Optional[int] = None
    ) -> Optional[StartupOfMonthResponse]:
        """Get the featured startup of the month."""
        if not year or not month:
            now = datetime.utcnow()
            year = year or now.year
            month = month or now.month

        # Use scalars() to get StartupOfMonth object, not Row object
        featured = session.exec(
            select(StartupOfMonth).where(
                and_(StartupOfMonth.year == year, StartupOfMonth.month == month)
            )
        ).scalars().first()

        if not featured:
            return None

        profile = session.get(Profile, featured.profile_id)
        if not profile:
            return None

        # Convert profile to BaseProfile - _profile_to_base returns a dict
        profile_dict = self._profile_to_base(profile)
        
        return StartupOfMonthResponse(
            id=featured.id,
            profile=BaseProfile(**profile_dict),
            year=featured.year,
            month=featured.month,
            reason=featured.reason,
            curator_notes=featured.curator_notes,
            featured_at=featured.featured_at,
        )

    def feature_startup_of_month(
        self, session: Session, request: StartupOfMonthCreate
    ) -> StartupOfMonthResponse:
        """Feature a startup as startup of the month."""
        profile = session.get(Profile, request.profile_id)
        if not profile:
            raise ValueError(f"Profile {request.profile_id} not found")

        if profile.role != "founder":
            raise ValueError("Only founder profiles can be featured as startup of the month")

        # Check if there's already a featured startup for this month
        existing = session.exec(
            select(StartupOfMonth).where(
                and_(
                    StartupOfMonth.year == request.year,
                    StartupOfMonth.month == request.month,
                )
            )
        ).first()

        if existing:
            # Update existing
            existing.profile_id = request.profile_id
            existing.reason = request.reason
            existing.curator_notes = request.curator_notes
            existing.updated_at = datetime.utcnow()
            session.add(existing)
            session.commit()
            session.refresh(existing)
            featured = existing
        else:
            # Create new
            featured = StartupOfMonth(
                profile_id=request.profile_id,
                year=request.year,
                month=request.month,
                reason=request.reason,
                curator_notes=request.curator_notes,
            )
            session.add(featured)
            session.commit()
            session.refresh(featured)

        # Convert profile to BaseProfile - _profile_to_base returns a dict
        profile_dict = self._profile_to_base(profile)
        
        return StartupOfMonthResponse(
            id=featured.id,
            profile=BaseProfile(**profile_dict),
            year=featured.year,
            month=featured.month,
            reason=featured.reason,
            curator_notes=featured.curator_notes,
            featured_at=featured.featured_at,
        )

    def list_startups_of_month(
        self, session: Session, year: Optional[int] = None, limit: int = 12
    ) -> List[StartupOfMonthResponse]:
        """List all featured startups of the month, optionally filtered by year."""
        query = select(StartupOfMonth).order_by(
            StartupOfMonth.year.desc(), StartupOfMonth.month.desc()
        )

        if year:
            query = query.where(StartupOfMonth.year == year)

        featured_list = session.exec(query.limit(limit)).all()

        result = []
        for featured in featured_list:
            profile = session.get(Profile, featured.profile_id)
            if profile:
                # Convert profile to BaseProfile - _profile_to_base returns a dict
                profile_dict = self._profile_to_base(profile)
                
                result.append(
                    StartupOfMonthResponse(
                        id=featured.id,
                        profile=BaseProfile(**profile_dict),
                        year=featured.year,
                        month=featured.month,
                        reason=featured.reason,
                        curator_notes=featured.curator_notes,
                        featured_at=featured.featured_at,
                    )
                )

        return result

    def get_admin_stats(self, session: Session) -> AdminStatsResponse:
        """Get admin dashboard statistics."""
        total_profiles_result = session.exec(select(func.count(Profile.id))).scalar_one_or_none()
        total_profiles = int(total_profiles_result) if total_profiles_result is not None else 0

        # Count pending verifications - ensure we get Profile objects
        all_profiles = session.exec(select(Profile)).scalars().all()
        pending_count = 0
        verified_count = 0
        
        for profile in all_profiles:
            verification = profile.verification or {}
            soft_verified = verification.get("soft_verified", False)
            accreditation_attested = verification.get("accreditation_attested", False)
            manual_reviewed = verification.get("manual_reviewed", False)
            
            if manual_reviewed:
                verified_count += 1
            elif soft_verified or accreditation_attested:
                pending_count += 1

        total_matches_result = session.exec(select(func.count(Match.id))).scalar_one_or_none()
        total_matches = int(total_matches_result) if total_matches_result is not None else 0

        active_matches_result = session.exec(
            select(func.count(Match.id)).where(Match.status == "active")
        ).scalar_one_or_none()
        active_matches = int(active_matches_result) if active_matches_result is not None else 0

        featured_startup = self.get_current_startup_of_month(session)

        return AdminStatsResponse(
            total_profiles=total_profiles,
            pending_verifications=pending_count,
            verified_profiles=verified_count,
            total_matches=total_matches,
            active_matches=active_matches,
            featured_startup=featured_startup,
        )

    @staticmethod
    def _profile_to_base(profile: Profile) -> dict:
        """Convert Profile model to BaseProfile schema dict."""
        from app.schemas.profile import PromptResponse, VerificationStatus

        prompts = [PromptResponse(**p) for p in (profile.prompts or [])]
        verification = (
            VerificationStatus(**profile.verification)
            if profile.verification
            else VerificationStatus()
        )

        return {
            "id": profile.id,
            "role": profile.role,
            "full_name": profile.full_name,
            "email": profile.email,
            "headline": profile.headline,
            "avatar_url": profile.avatar_url,
            "location": profile.location,
            "prompts": prompts,
            "extra_metadata": profile.extra_metadata,
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


admin_service = AdminService()

