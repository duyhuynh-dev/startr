from __future__ import annotations

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlmodel import Session

from app.core.exceptions import NotFoundError
from app.db.session import get_session
from app.models.profile import Profile
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
def create_profile(payload: ProfileCreate, session: Session = Depends(get_session)) -> BaseProfile:
    """Create a new profile."""
    data = payload.model_dump()
    if data.get("verification"):
        data["verification"] = data["verification"].model_dump()
    profile = Profile(**data)
    session.add(profile)
    session.commit()
    session.refresh(profile)
    
    # Cache the new profile
    base_profile = BaseProfile(**profile.model_dump())
    from app.core.cache import cache_service
    cache_service.set(cache_service.get_profile_key(profile.id), base_profile.model_dump(), cache_service.CACHE_TTL_LONG)
    
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
    
    # Cache the updated profile
    base_profile = BaseProfile(**profile.model_dump())
    from app.core.cache import cache_service
    cache_service.set(cache_service.get_profile_key(profile.id), base_profile.model_dump(), cache_service.CACHE_TTL_LONG)
    
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
    results = session.exec(query).all()
    return [BaseProfile(**profile.model_dump()) for profile in results]

