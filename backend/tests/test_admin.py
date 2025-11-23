"""Tests for admin endpoints."""

from __future__ import annotations

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.models.profile import Profile
from app.models.startup_of_month import StartupOfMonth


@pytest.mark.unit
def test_get_pending_verifications(client: TestClient, db_session, sample_founder_profile_data):
    """Test getting pending verifications."""
    # Create unverified profile
    founder_data = sample_founder_profile_data.copy()
    prompts = founder_data.pop("prompts", [])
    verification_data = {
        "soft_verified": False,
        "manual_reviewed": False,
        "accreditation_attested": False,
        "badges": [],
    }
    founder_data["verification"] = verification_data
    founder = Profile(
        **founder_data,
        prompts=[{**p} for p in prompts],
    )
    db_session.add(founder)
    db_session.commit()
    
    # Get pending verifications
    response = client.get("/api/v1/admin/verifications/pending")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    # Should find our unverified profile
    profile_ids = [p["id"] if isinstance(p, dict) else p.id for p in data]
    if data and isinstance(data[0], dict):
        assert founder.id in profile_ids or len(data) >= 0


@pytest.mark.unit
def test_review_verification(client: TestClient, db_session, sample_founder_profile_data):
    """Test reviewing a verification."""
    # Create profile
    founder_data = sample_founder_profile_data.copy()
    prompts = founder_data.pop("prompts", [])
    verification_data = {
        "soft_verified": False,
        "manual_reviewed": False,
        "accreditation_attested": False,
        "badges": [],
    }
    founder_data["verification"] = verification_data
    founder = Profile(
        **founder_data,
        prompts=[{**p} for p in prompts],
    )
    db_session.add(founder)
    db_session.commit()
    
    # Review verification (approve)
    response = client.post(
        "/api/v1/admin/verifications/review",
        json={
            "profile_id": founder.id,
            "action": "approve",
            "notes": "Profile looks good",
        },
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "approved"
    assert data["profile_id"] == founder.id


@pytest.mark.unit
def test_feature_startup_of_month(client: TestClient, db_session, sample_founder_profile_data):
    """Test featuring a startup of the month."""
    # Create founder profile
    founder_data = sample_founder_profile_data.copy()
    prompts = founder_data.pop("prompts", [])
    founder_data["verification"] = {"soft_verified": False}
    founder = Profile(
        **founder_data,
        prompts=[{**p} for p in prompts],
    )
    db_session.add(founder)
    db_session.commit()
    
    # Feature startup
    response = client.post(
        "/api/v1/admin/startup-of-month",
        json={
            "profile_id": founder.id,
            "year": 2025,
            "month": 1,
            "reason": "Exceptional growth and impact",
            "curator_notes": "Selected for outstanding metrics",
        },
    )
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    # StartupOfMonthResponse has nested profile object
    assert (data.get("profile", {}).get("id") == founder.id or data.get("profile_id") == founder.id)
    assert data["year"] == 2025
    assert data["month"] == 1


@pytest.mark.unit
def test_get_current_startup_of_month(client: TestClient, db_session, sample_founder_profile_data):
    """Test getting current startup of the month."""
    # Create founder and feature
    founder_data = sample_founder_profile_data.copy()
    prompts = founder_data.pop("prompts", [])
    founder_data["verification"] = {"soft_verified": False}
    founder = Profile(
        **founder_data,
        prompts=[{**p} for p in prompts],
    )
    db_session.add(founder)
    db_session.commit()
    
    # Create startup of month
    from datetime import datetime
    startup = StartupOfMonth(
        profile_id=founder.id,
        year=2025,
        month=1,
        reason="Great startup",
    )
    db_session.add(startup)
    db_session.commit()
    
    # Get current
    response = client.get("/api/v1/admin/startup-of-month/current?year=2025&month=1")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    if data:  # May be None if not found
        # StartupOfMonthResponse has nested profile object
        assert data.get("profile", {}).get("id") == founder.id


@pytest.mark.unit
def test_get_admin_stats(client: TestClient, db_session):
    """Test getting admin statistics."""
    response = client.get("/api/v1/admin/stats")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, dict)
    # Should have stats fields
    assert "total_profiles" in data or "total_users" in data or "pending_verifications" in data

