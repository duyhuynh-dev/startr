"""Verification service for email OTP, domain verification, and badge management."""

from __future__ import annotations

import logging
import random
import string
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from urllib.parse import urlparse

from sqlalchemy import select
from sqlmodel import Session

from app.core.redis import redis_client
from app.core.config import settings
from app.core.exceptions import ValidationError, UnauthorizedError, NotFoundError
from app.models.user import User
from app.models.profile import Profile

logger = logging.getLogger(__name__)


# Verification badge types
class BadgeType:
    EMAIL = "email"  # Email verified via OTP
    DOMAIN = "domain"  # Company domain verified
    LINKEDIN = "linkedin"  # LinkedIn OAuth verified
    GOOGLE = "google"  # Google OAuth verified
    MANUAL = "manual"  # Manually reviewed by admin
    ACCREDITED = "accredited"  # Accredited investor attested


# Verification levels based on badges
# Level 0: No verification
# Level 1: Email verified
# Level 2: Email + OAuth (LinkedIn/Google)
# Level 3: Email + OAuth + Domain
# Level 4: Email + OAuth + Domain + Manual review
# Level 5: All + Accredited investor


class VerificationService:
    """Service for managing verification badges, OTP, and domain verification."""

    # OTP Configuration
    OTP_LENGTH = 6
    OTP_EXPIRY_SECONDS = 600  # 10 minutes
    OTP_MAX_ATTEMPTS = 5
    OTP_COOLDOWN_SECONDS = 60  # 1 minute between OTP requests

    def generate_otp(self) -> str:
        """Generate a 6-digit OTP code."""
        return ''.join(random.choices(string.digits, k=self.OTP_LENGTH))

    def _get_otp_cache_key(self, email: str) -> str:
        """Get Redis key for OTP storage."""
        return f"otp:email:{email.lower()}"

    def _get_otp_attempts_key(self, email: str) -> str:
        """Get Redis key for OTP attempt tracking."""
        return f"otp:attempts:{email.lower()}"

    def _get_otp_cooldown_key(self, email: str) -> str:
        """Get Redis key for OTP cooldown."""
        return f"otp:cooldown:{email.lower()}"

    def request_email_otp(self, session: Session, email: str) -> Dict[str, Any]:
        """Request an OTP code for email verification.
        
        Args:
            session: Database session
            email: User email address
            
        Returns:
            Dict with success status and message
            
        Raises:
            ValidationError: If cooldown not expired or too many attempts
        """
        email_lower = email.lower()
        
        # Check cooldown
        cooldown_key = self._get_otp_cooldown_key(email_lower)
        try:
            if redis_client.exists(cooldown_key):
                ttl = redis_client.ttl(cooldown_key)
                raise ValidationError(
                    f"Please wait {ttl} seconds before requesting another code"
                )
        except Exception as e:
            if isinstance(e, ValidationError):
                raise
            logger.warning(f"Redis error checking cooldown: {e}")

        # Check if user exists
        user = session.exec(select(User).where(User.email == email_lower)).scalars().first()
        if not user:
            # Don't reveal if email exists - return success anyway
            return {"success": True, "message": "If the email exists, a verification code has been sent."}

        # Check if already verified
        if user.is_verified:
            return {"success": True, "message": "Email is already verified."}

        # Generate OTP
        otp_code = self.generate_otp()
        
        # Store OTP in Redis
        otp_key = self._get_otp_cache_key(email_lower)
        try:
            redis_client.setex(otp_key, self.OTP_EXPIRY_SECONDS, otp_code)
            # Set cooldown
            redis_client.setex(cooldown_key, self.OTP_COOLDOWN_SECONDS, "1")
            # Reset attempts
            attempts_key = self._get_otp_attempts_key(email_lower)
            redis_client.delete(attempts_key)
        except Exception as e:
            logger.error(f"Redis error storing OTP: {e}")
            raise ValidationError("Failed to generate verification code. Please try again.")

        # Send OTP email (imported here to avoid circular imports)
        from app.services.email_service import email_service
        email_service.send_otp_email(email_lower, otp_code)

        return {
            "success": True,
            "message": "Verification code sent to your email.",
            "expires_in": self.OTP_EXPIRY_SECONDS,
        }

    def verify_email_otp(self, session: Session, email: str, otp_code: str) -> User:
        """Verify email using OTP code.
        
        Args:
            session: Database session
            email: User email address
            otp_code: 6-digit OTP code
            
        Returns:
            Updated User object with verified status
            
        Raises:
            ValidationError: If OTP is invalid or expired
            UnauthorizedError: If too many failed attempts
        """
        email_lower = email.lower()
        otp_key = self._get_otp_cache_key(email_lower)
        attempts_key = self._get_otp_attempts_key(email_lower)

        # Check attempts
        try:
            attempts = redis_client.get(attempts_key)
            if attempts and int(attempts) >= self.OTP_MAX_ATTEMPTS:
                raise UnauthorizedError(
                    "Too many failed attempts. Please request a new code."
                )
        except Exception as e:
            if isinstance(e, UnauthorizedError):
                raise
            logger.warning(f"Redis error checking attempts: {e}")

        # Get stored OTP
        try:
            stored_otp = redis_client.get(otp_key)
            if not stored_otp:
                raise ValidationError("Verification code expired or not found. Please request a new code.")
            stored_otp = stored_otp.decode() if isinstance(stored_otp, bytes) else stored_otp
        except Exception as e:
            if isinstance(e, ValidationError):
                raise
            logger.error(f"Redis error retrieving OTP: {e}")
            raise ValidationError("Failed to verify code. Please try again.")

        # Verify OTP
        if otp_code != stored_otp:
            # Increment attempts
            try:
                redis_client.incr(attempts_key)
                redis_client.expire(attempts_key, self.OTP_EXPIRY_SECONDS)
            except Exception as e:
                logger.warning(f"Redis error incrementing attempts: {e}")
            raise ValidationError("Invalid verification code.")

        # Get user
        user = session.exec(select(User).where(User.email == email_lower)).scalars().first()
        if not user:
            raise NotFoundError("User not found")

        # Mark user as verified
        user.is_verified = True
        user.updated_at = datetime.now(timezone.utc)
        session.add(user)

        # Add email badge to profile
        if user.profile_id:
            profile = session.get(Profile, user.profile_id)
            if profile:
                self.add_badge(profile, BadgeType.EMAIL)
                session.add(profile)

        session.commit()
        session.refresh(user)

        # Clean up Redis
        try:
            redis_client.delete(otp_key)
            redis_client.delete(attempts_key)
        except Exception as e:
            logger.warning(f"Redis error cleaning up OTP: {e}")

        return user

    def add_badge(self, profile: Profile, badge_type: str) -> bool:
        """Add a verification badge to a profile.
        
        Args:
            profile: Profile object
            badge_type: Badge type (email, domain, linkedin, etc.)
            
        Returns:
            True if badge was added, False if already exists
        """
        verification = profile.verification or {
            "soft_verified": False,
            "manual_reviewed": False,
            "accreditation_attested": False,
            "badges": [],
        }

        badges = verification.get("badges", [])
        
        # Check if badge already exists
        if badge_type in badges:
            return False

        # Add badge
        badges.append(badge_type)
        verification["badges"] = badges

        # Update soft_verified if email is verified
        if badge_type == BadgeType.EMAIL:
            verification["soft_verified"] = True

        # Update manual_reviewed if manually verified
        if badge_type == BadgeType.MANUAL:
            verification["manual_reviewed"] = True

        # Update accreditation if accredited
        if badge_type == BadgeType.ACCREDITED:
            verification["accreditation_attested"] = True

        profile.verification = verification
        return True

    def remove_badge(self, profile: Profile, badge_type: str) -> bool:
        """Remove a verification badge from a profile.
        
        Args:
            profile: Profile object
            badge_type: Badge type to remove
            
        Returns:
            True if badge was removed, False if not found
        """
        verification = profile.verification or {"badges": []}
        badges = verification.get("badges", [])

        if badge_type not in badges:
            return False

        badges.remove(badge_type)
        verification["badges"] = badges
        profile.verification = verification
        return True

    def get_verification_level(self, profile: Profile) -> int:
        """Calculate verification level based on badges.
        
        Args:
            profile: Profile object
            
        Returns:
            Verification level (0-5)
        """
        verification = profile.verification or {"badges": []}
        badges = set(verification.get("badges", []))

        if not badges:
            return 0

        level = 0

        # Level 1: Email verified
        if BadgeType.EMAIL in badges:
            level = 1

        # Level 2: Email + OAuth
        if level >= 1 and (BadgeType.LINKEDIN in badges or BadgeType.GOOGLE in badges):
            level = 2

        # Level 3: Email + OAuth + Domain
        if level >= 2 and BadgeType.DOMAIN in badges:
            level = 3

        # Level 4: Email + OAuth + Domain + Manual
        if level >= 3 and BadgeType.MANUAL in badges:
            level = 4

        # Level 5: All + Accredited
        if level >= 4 and BadgeType.ACCREDITED in badges:
            level = 5

        return level

    def get_verification_status(self, session: Session, profile_id: str) -> Dict[str, Any]:
        """Get verification status for a profile.
        
        Args:
            session: Database session
            profile_id: Profile ID
            
        Returns:
            Dict with verification status details
        """
        profile = session.get(Profile, profile_id)
        if not profile:
            raise NotFoundError(f"Profile {profile_id} not found")

        verification = profile.verification or {"badges": []}
        badges = verification.get("badges", [])
        level = self.get_verification_level(profile)

        # Get user for email verification status
        user = session.exec(
            select(User).where(User.profile_id == profile_id)
        ).scalars().first()

        return {
            "profile_id": profile_id,
            "level": level,
            "level_name": self._get_level_name(level),
            "badges": badges,
            "email_verified": user.is_verified if user else False,
            "domain_verified": BadgeType.DOMAIN in badges,
            "oauth_verified": BadgeType.LINKEDIN in badges or BadgeType.GOOGLE in badges,
            "manually_reviewed": verification.get("manual_reviewed", False),
            "accreditation_attested": verification.get("accreditation_attested", False),
        }

    def _get_level_name(self, level: int) -> str:
        """Get human-readable name for verification level."""
        names = {
            0: "Unverified",
            1: "Email Verified",
            2: "Identity Verified",
            3: "Domain Verified",
            4: "Fully Verified",
            5: "Accredited",
        }
        return names.get(level, "Unknown")

    def verify_domain(self, session: Session, profile_id: str) -> Dict[str, Any]:
        """Initiate domain verification for a founder's company.
        
        Args:
            session: Database session
            profile_id: Profile ID
            
        Returns:
            Dict with verification instructions
        """
        profile = session.get(Profile, profile_id)
        if not profile:
            raise NotFoundError(f"Profile {profile_id} not found")

        if profile.role != "founder":
            raise ValidationError("Domain verification is only available for founders")

        if not profile.company_url:
            raise ValidationError("Please add your company URL first")

        # Extract domain from company URL
        try:
            parsed = urlparse(profile.company_url)
            domain = parsed.netloc or parsed.path
            domain = domain.replace("www.", "")
        except Exception:
            raise ValidationError("Invalid company URL")

        # Check if user email matches company domain
        user = session.exec(
            select(User).where(User.profile_id == profile_id)
        ).scalars().first()

        if not user:
            raise NotFoundError("User not found")

        user_email_domain = user.email.split("@")[1].lower()
        company_domain = domain.lower()

        # Auto-verify if email domain matches company domain
        if user_email_domain == company_domain:
            self.add_badge(profile, BadgeType.DOMAIN)
            session.add(profile)
            session.commit()
            return {
                "verified": True,
                "message": f"Domain verified! Your email domain matches {company_domain}",
                "domain": company_domain,
            }

        # Otherwise, provide manual verification options
        return {
            "verified": False,
            "message": "Domain verification requires manual review",
            "domain": company_domain,
            "user_email_domain": user_email_domain,
            "instructions": [
                f"Your email domain ({user_email_domain}) doesn't match your company domain ({company_domain}).",
                "Options to verify:",
                f"1. Sign up with an email from {company_domain}",
                "2. Request manual verification by our team",
            ],
        }


# Singleton instance
verification_service = VerificationService()
