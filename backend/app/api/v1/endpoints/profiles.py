from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlmodel import Session

from app.db.session import get_session
from app.models.profile import Profile
from app.schemas.profile import BaseProfile, ProfileCreate, ProfileUpdate
from datetime import datetime

router = APIRouter()


@router.post("", response_model=BaseProfile, status_code=status.HTTP_201_CREATED)
def create_profile(payload: ProfileCreate, session: Session = Depends(get_session)) -> BaseProfile:
    data = payload.model_dump()
    if data.get("verification"):
        data["verification"] = data["verification"].model_dump()
    profile = Profile(**data)
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return BaseProfile(**profile.model_dump())


@router.get("/{profile_id}", response_model=BaseProfile)
def get_profile(profile_id: str, session: Session = Depends(get_session)) -> BaseProfile:
    profile = session.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return BaseProfile(**profile.model_dump())


@router.put("/{profile_id}", response_model=BaseProfile)
def update_profile(
    profile_id: str,
    payload: ProfileUpdate,
    session: Session = Depends(get_session),
) -> BaseProfile:
    profile = session.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    update_data = payload.model_dump(exclude_unset=True)
    if update_data.get("verification"):
        update_data["verification"] = update_data["verification"].model_dump()
    for key, value in update_data.items():
        setattr(profile, key, value)
    profile.updated_at = datetime.utcnow()
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return BaseProfile(**profile.model_dump())


@router.get("", response_model=List[BaseProfile])
def list_profiles(role: str | None = None, session: Session = Depends(get_session)) -> List[BaseProfile]:
    query = select(Profile)
    if role:
        query = query.where(Profile.role == role)
    results = session.exec(query).all()
    return [BaseProfile(**profile.model_dump()) for profile in results]

