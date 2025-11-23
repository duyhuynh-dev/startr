"""Tests for prompt template endpoints."""

from __future__ import annotations

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.models.prompt_template import PromptTemplate


@pytest.mark.unit
def test_create_prompt_template(client: TestClient, db_session):
    """Test creating a prompt template."""
    response = client.post(
        "/api/v1/prompts",
        json={
            "text": "What gets you excited about a startup?",
            "role": "investor",
            "category": "mission",
            "display_order": 1,
            "is_active": True,
        },
    )
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["text"] == "What gets you excited about a startup?"
    assert data["role"] == "investor"
    assert data["category"] == "mission"
    assert "id" in data
    assert data["is_active"] is True


@pytest.mark.unit
def test_get_prompt_template(client: TestClient, db_session):
    """Test getting a prompt template by ID."""
    # Create template first
    template = PromptTemplate(
        text="What's your investment thesis?",
        role="investor",
        category="thesis",
        display_order=1,
        is_active=True,
    )
    db_session.add(template)
    db_session.commit()
    
    # Get template
    response = client.get(f"/api/v1/prompts/{template.id}")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == template.id
    assert data["text"] == "What's your investment thesis?"


@pytest.mark.unit
def test_list_prompt_templates(client: TestClient, db_session):
    """Test listing prompt templates with filters."""
    # Create templates
    template1 = PromptTemplate(
        text="Investor question 1",
        role="investor",
        display_order=1,
        is_active=True,
    )
    template2 = PromptTemplate(
        text="Founder question 1",
        role="founder",
        display_order=1,
        is_active=True,
    )
    template3 = PromptTemplate(
        text="Investor question 2 (inactive)",
        role="investor",
        display_order=2,
        is_active=False,
    )
    
    db_session.add(template1)
    db_session.add(template2)
    db_session.add(template3)
    db_session.commit()
    
    # List all active templates
    response = client.get("/api/v1/prompts?is_active=true")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) >= 2
    assert all(t["is_active"] for t in data)
    
    # List investor templates only
    response = client.get("/api/v1/prompts?role=investor&is_active=true")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert all(t["role"] == "investor" for t in data)
    assert all(t["is_active"] for t in data)


@pytest.mark.unit
def test_update_prompt_template(client: TestClient, db_session):
    """Test updating a prompt template."""
    # Create template
    template = PromptTemplate(
        text="Original question",
        role="investor",
        display_order=1,
        is_active=True,
    )
    db_session.add(template)
    db_session.commit()
    
    # Update template
    response = client.put(
        f"/api/v1/prompts/{template.id}",
        json={
            "text": "Updated question",
            "is_active": False,
        },
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["text"] == "Updated question"
    assert data["is_active"] is False


@pytest.mark.unit
def test_delete_prompt_template(client: TestClient, db_session):
    """Test deleting a prompt template."""
    # Create template
    template = PromptTemplate(
        text="Question to delete",
        role="investor",
        display_order=1,
        is_active=True,
    )
    db_session.add(template)
    db_session.commit()
    template_id = template.id
    
    # Delete template
    response = client.delete(f"/api/v1/prompts/{template_id}")
    
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # Verify it's deleted
    response = client.get(f"/api/v1/prompts/{template_id}")
    assert response.status_code == status.HTTP_404_NOT_FOUND


