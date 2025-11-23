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

