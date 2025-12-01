"""Tests for diligence endpoints."""

from __future__ import annotations

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.models.profile import Profile


@pytest.mark.unit
def test_get_diligence_summary(client: TestClient, db_session, sample_founder_profile_data):
    """Test getting due diligence summary for a profile."""
    # Create founder profile
    founder_data = sample_founder_profile_data.copy()
    prompts = founder_data.pop("prompts", [])
    verification = founder_data.pop("verification", {})
    founder = Profile(
        **founder_data,
        prompts=[{**p} for p in prompts],
        verification=verification,
    )
    db_session.add(founder)
    db_session.commit()
    
    # Get diligence summary
    response = client.get(f"/api/v1/diligence/{founder.id}")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "score" in data  # DiligenceSummary uses "score" not "overall_score"
    assert "metrics" in data
    assert "risks" in data or "risk_flags" in data
    assert isinstance(data["score"], (int, float))
    assert 0 <= data["score"] <= 100


@pytest.mark.unit
def test_get_diligence_summary_not_found(client: TestClient):
    """Test getting diligence for non-existent profile."""
    response = client.get("/api/v1/diligence/nonexistent-id")
    
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.unit
def test_get_diligence_summary_force_refresh(client: TestClient, db_session, sample_founder_profile_data):
    """Test getting diligence summary with force refresh."""
    # Create founder profile
    founder_data = sample_founder_profile_data.copy()
    prompts = founder_data.pop("prompts", [])
    verification = founder_data.pop("verification", {})
    founder = Profile(
        **founder_data,
        prompts=[{**p} for p in prompts],
        verification=verification,
    )
    db_session.add(founder)
    db_session.commit()
    
    # Get diligence with force refresh
    response = client.get(f"/api/v1/diligence/{founder.id}?force_refresh=true")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "score" in data  # DiligenceSummary uses "score"
    assert "metrics" in data


@pytest.mark.unit
def test_get_diligence_summary_cached(client: TestClient, db_session, sample_founder_profile_data):
    """Test that diligence summary can be cached."""
    founder_data = sample_founder_profile_data.copy()
    prompts = founder_data.pop("prompts", [])
    verification = founder_data.pop("verification", {})
    founder = Profile(
        **founder_data,
        prompts=[{**p} for p in prompts],
        verification=verification,
    )
    db_session.add(founder)
    db_session.commit()
    
    # First request
    response1 = client.get(f"/api/v1/diligence/{founder.id}")
    assert response1.status_code == status.HTTP_200_OK
    
    # Second request (should use cache if implemented)
    response2 = client.get(f"/api/v1/diligence/{founder.id}")
    assert response2.status_code == status.HTTP_200_OK
    assert response2.json()["score"] == response1.json()["score"]


@pytest.mark.unit
def test_get_diligence_summary_investor(client: TestClient, db_session, sample_investor_profile_data):
    """Test getting diligence for investor profile (may have different scoring)."""
    investor_data = sample_investor_profile_data.copy()
    prompts = investor_data.pop("prompts", [])
    verification = investor_data.pop("verification", {})
    investor = Profile(
        **investor_data,
        prompts=[{**p} for p in prompts],
        verification=verification,
    )
    db_session.add(investor)
    db_session.commit()
    
    response = client.get(f"/api/v1/diligence/{investor.id}")
    
    # Should work for investors too, though scoring may differ
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "score" in data
    assert 0 <= data["score"] <= 100

