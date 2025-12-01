from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select
from sqlmodel import Session

from app.core.exceptions import NotFoundError
from app.core.config import settings
from app.core.dependencies import get_optional_user
from app.core.rate_limit import limiter
from app.db.session import get_session
from app.models.profile import Profile
from app.models.user import User
from app.schemas.profile import BaseProfile, ProfileCreate, ProfileUpdate
from app.services.profile_cache import profile_cache_service

router = APIRouter()


@router.post(
    "",
    response_model=BaseProfile,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new profile",
    description="""
    Create a new investor or founder profile with prompts and verification information.
    
    **Investor Profile Example:**
    - Include firm, check size range, focus sectors/stages
    - Add prompts answering template questions
    - Optionally include accreditation notes
    
    **Founder Profile Example:**
    - Include company name, URL, revenue, team size
    - Add prompts about mission, traction, vision
    - Include runway and focus markets
    """,
    response_description="The created profile with generated ID and timestamps",
)
# Note: Rate limiting temporarily removed due to slowapi/FastAPI body parsing conflict
# TODO: Re-implement with middleware-based rate limiting or fix slowapi integration
def create_profile(
    payload: ProfileCreate,  # Body parameter
    session: Session = Depends(get_session),
    user: Optional[User] = Depends(get_optional_user),
) -> BaseProfile:
    """Create or update a profile. If user is authenticated, links it to their account.
    
    During onboarding, this will:
    - Update existing profile if user has one
    - Link existing profile if found by email
    - Create new profile and link it
    """
    data = payload.model_dump()
    
    # If user is authenticated, check if they already have a profile
    if user:
        # IMPORTANT: Always update existing profile if user has one
        # This handles the case where signup created a basic profile
        if user.profile_id:
            existing_profile = session.get(Profile, user.profile_id)
            if existing_profile:
                # Update existing profile with new data
                for key, value in data.items():
                    if key != "id" and value is not None:  # Don't overwrite ID
                        setattr(existing_profile, key, value)
                existing_profile.updated_at = datetime.utcnow()
                session.add(existing_profile)
                session.commit()
                session.refresh(existing_profile)
                
                # Invalidate cache
                profile_cache_service.invalidate_profile(existing_profile.id)
                
                base_profile = profile_cache_service._profile_to_base(existing_profile)
                from app.core.cache import CACHE_TTL_LONG, cache_service
                cache_service.set(cache_service.get_profile_key(existing_profile.id), base_profile.model_dump(), CACHE_TTL_LONG)
                
                return base_profile
        
        # If no linked profile, check if there's an unlinked profile with same email
        profile_by_email = session.exec(
            select(Profile).where(Profile.email == payload.email)
        ).first()
        if profile_by_email:
            # Link existing profile to user
            user.profile_id = profile_by_email.id
            session.add(user)
            
            # Update the profile with new data
            for key, value in data.items():
                if key != "id" and value is not None:
                    setattr(profile_by_email, key, value)
            profile_by_email.updated_at = datetime.utcnow()
            session.add(profile_by_email)
            session.commit()
            session.refresh(profile_by_email)
            
            # Invalidate cache
            profile_cache_service.invalidate_profile(profile_by_email.id)
            
            base_profile = profile_cache_service._profile_to_base(profile_by_email)
            from app.core.cache import CACHE_TTL_LONG, cache_service
            cache_service.set(cache_service.get_profile_key(profile_by_email.id), base_profile.model_dump(), CACHE_TTL_LONG)
            
            return base_profile
    
    # Ensure verification is a dict, not None
    if not data.get("verification"):
        data["verification"] = {
            "soft_verified": False,
            "manual_reviewed": False,
            "accreditation_attested": False,
            "badges": [],
        }
    elif hasattr(data["verification"], "model_dump"):
        data["verification"] = data["verification"].model_dump()
    
    # Create new profile
    profile = Profile(**data)
    session.add(profile)
    session.flush()  # Get profile ID before linking
    
    # Link to user if authenticated
    if user:
        user.profile_id = profile.id
        session.add(user)
    
    session.commit()
    session.refresh(profile)
    
    # Convert SQLModel Profile to Pydantic BaseProfile using profile_cache_service helper
    base_profile = profile_cache_service._profile_to_base(profile)
    from app.core.cache import CACHE_TTL_LONG, cache_service
    cache_service.set(cache_service.get_profile_key(profile.id), base_profile.model_dump(), CACHE_TTL_LONG)
    
    return base_profile


@router.get(
    "/{profile_id}",
    response_model=BaseProfile,
    summary="Get a profile by ID",
    description="Retrieve a profile by its unique ID. Results are cached for 1 hour.",
    responses={
        200: {"description": "Profile found and returned"},
        404: {"description": "Profile not found"},
    },
)
def get_profile(profile_id: str, session: Session = Depends(get_session)) -> BaseProfile:
    """Get a profile by ID (cached)."""
    profile = profile_cache_service.get_profile(profile_id, session)
    if not profile:
        raise NotFoundError(resource="Profile", identifier=profile_id)
    return profile


@router.put(
    "/{profile_id}",
    response_model=BaseProfile,
    summary="Update a profile",
    description="Partially update a profile. Only provided fields will be updated. Cache is invalidated on success.",
    responses={
        200: {"description": "Profile updated successfully"},
        404: {"description": "Profile not found"},
    },
)
def update_profile(
    profile_id: str,
    payload: ProfileUpdate,
    session: Session = Depends(get_session),
) -> BaseProfile:
    """Update a profile."""
    profile = session.get(Profile, profile_id)
    if not profile:
        raise NotFoundError(resource="Profile", identifier=profile_id)
    update_data = payload.model_dump(exclude_unset=True)
    if update_data.get("verification"):
        update_data["verification"] = update_data["verification"].model_dump()
    for key, value in update_data.items():
        setattr(profile, key, value)
    profile.updated_at = datetime.utcnow()
    session.add(profile)
    session.commit()
    session.refresh(profile)
    
    # Invalidate cache for this profile and related caches
    profile_cache_service.invalidate_profile(profile_id)
    
    # Cache the updated profile - use profile_cache_service helper for proper conversion
    base_profile = profile_cache_service._profile_to_base(profile)
    from app.core.cache import CACHE_TTL_LONG, cache_service
    cache_service.set(cache_service.get_profile_key(profile.id), base_profile.model_dump(), CACHE_TTL_LONG)
    
    return base_profile


@router.get(
    "",
    response_model=List[BaseProfile],
    summary="List profiles",
    description="List all profiles, optionally filtered by role (investor or founder).",
    responses={
        200: {"description": "List of profiles"},
    },
)
def list_profiles(
    role: str | None = None,
    session: Session = Depends(get_session),
) -> List[BaseProfile]:
    query = select(Profile)
    if role:
        query = query.where(Profile.role == role)
    # Use scalars() to get Profile instances, not Row objects
    results = session.exec(query).scalars().all()
    # Convert SQLModel Profile to Pydantic BaseProfile using profile_cache_service helper
    return [profile_cache_service._profile_to_base(profile) for profile in results]

