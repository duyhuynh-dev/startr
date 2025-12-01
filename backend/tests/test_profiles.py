"""Tests for profile endpoints."""

from __future__ import annotations

import pytest
from fastapi import status

from app.models.profile import Profile
from app.schemas.profile import ProfileCreate


@pytest.mark.unit
def test_create_profile(client, db_session, sample_investor_profile_data):
    """Test creating an investor profile."""
    response = client.post(
        "/api/v1/profiles",
        json={
            "role": "investor",
            "full_name": sample_investor_profile_data["full_name"],
            "email": sample_investor_profile_data["email"],
            "headline": sample_investor_profile_data["headline"],
            "location": sample_investor_profile_data["location"],
            "firm": sample_investor_profile_data["firm"],
            "check_size_min": sample_investor_profile_data["check_size_min"],
            "check_size_max": sample_investor_profile_data["check_size_max"],
            "focus_sectors": sample_investor_profile_data["focus_sectors"],
            "focus_stages": sample_investor_profile_data["focus_stages"],
            "prompts": sample_investor_profile_data["prompts"],
        },
    )
    
    if response.status_code != status.HTTP_201_CREATED:
        print(f"Unexpected status: {response.status_code}")
        print(f"Response: {response.json()}")
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["role"] == "investor"
    assert data["full_name"] == sample_investor_profile_data["full_name"]
    assert data["email"] == sample_investor_profile_data["email"]
    assert "id" in data


@pytest.mark.unit
def test_get_profile(client, db_session, sample_investor_profile_data):
    """Test getting a profile by ID."""
    # Create a profile first
    profile_data = sample_investor_profile_data.copy()
    prompts = profile_data.pop("prompts", [])
    verification = profile_data.pop("verification", {})
    
    profile = Profile(
        **profile_data,
        prompts=[{**p} for p in prompts],
        verification=verification,
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(profile)
    
    # Get the profile
    response = client.get(f"/api/v1/profiles/{profile.id}")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == profile.id
    assert data["full_name"] == profile.full_name


@pytest.mark.unit
def test_get_profile_not_found(client):
    """Test getting a non-existent profile."""
    response = client.get("/api/v1/profiles/nonexistent-id")
    
    assert response.status_code == status.HTTP_404_NOT_FOUND
    data = response.json()
    assert "error" in data


@pytest.mark.unit
def test_list_profiles(client, db_session, sample_investor_profile_data, sample_founder_profile_data):
    """Test listing profiles with optional role filter."""
    # Create profiles
    investor_data = sample_investor_profile_data.copy()
    prompts = investor_data.pop("prompts", [])
    verification = investor_data.pop("verification", {})
    investor = Profile(
        **investor_data,
        prompts=[{**p} for p in prompts],
        verification=verification,
    )
    
    founder_data = sample_founder_profile_data.copy()
    prompts = founder_data.pop("prompts", [])
    verification = founder_data.pop("verification", {})
    founder = Profile(
        **founder_data,
        prompts=[{**p} for p in prompts],
        verification=verification,
    )
    
    db_session.add(investor)
    db_session.add(founder)
    db_session.commit()
    
    # List all profiles
    response = client.get("/api/v1/profiles")
    if response.status_code != status.HTTP_200_OK:
        print(f"Unexpected status: {response.status_code}")
        print(f"Response: {response.json()}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 2
    
    # List investor profiles only
    response = client.get("/api/v1/profiles?role=investor")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["role"] == "investor"

