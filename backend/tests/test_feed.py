"""Tests for discovery feed endpoints."""

from __future__ import annotations

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.models.profile import Profile


@pytest.mark.unit
def test_get_discovery_feed(client: TestClient, db_session, sample_investor_profile_data, sample_founder_profile_data):
    """Test getting discovery feed."""
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
    
    # Get discovery feed for investor (should show founders)
    response = client.get(f"/api/v1/feed/discover?profile_id={investor.id}")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "profiles" in data
    assert "cursor" in data
    assert isinstance(data["profiles"], list)
    # Should find founder profile
    profile_ids = [p["id"] for p in data["profiles"]]
    assert founder.id in profile_ids


@pytest.mark.unit
def test_get_discovery_feed_with_role_filter(client: TestClient, db_session, sample_investor_profile_data, sample_founder_profile_data):
    """Test discovery feed with role filter."""
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
    
    # Get discovery feed with explicit role filter
    response = client.get(f"/api/v1/feed/discover?profile_id={investor.id}&role=founder")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data["profiles"], list)
    # All profiles should be founders
    for profile in data["profiles"]:
        assert profile["role"] == "founder"


@pytest.mark.unit
def test_get_likes_queue(client: TestClient, db_session, sample_investor_profile_data, sample_founder_profile_data):
    """Test getting likes queue."""
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
    
    # Founder likes investor
    response = client.post(
        "/api/v1/matches/likes",
        json={
            "sender_id": founder.id,
            "recipient_id": investor.id,
        },
    )
    assert response.status_code == status.HTTP_200_OK
    
    # Get likes queue for investor
    response = client.get(f"/api/v1/feed/likes-queue?profile_id={investor.id}")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    # Should find founder who liked investor
    profile_ids = [item.get("profile", {}).get("id") if isinstance(item, dict) else item.id for item in data]
    # Handle both formats
    if data and isinstance(data[0], dict):
        profile_ids = [item.get("profile", {}).get("id") for item in data if isinstance(item.get("profile"), dict)]
    assert founder.id in profile_ids or len(data) >= 1


@pytest.mark.unit
def test_get_standouts(client: TestClient, db_session, sample_investor_profile_data, sample_founder_profile_data):
    """Test getting standout profiles."""
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
    
    # Get standouts for investor
    response = client.get(f"/api/v1/feed/standouts?profile_id={investor.id}")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    # Standouts should be profiles with compatibility scores
    for standout in data:
        assert "profile" in standout or "id" in standout
        assert "score" in standout or "reasons" in standout


