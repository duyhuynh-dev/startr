"""Tests for authentication endpoints and services."""

from __future__ import annotations

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.core.auth import create_access_token, verify_password, get_password_hash
from app.models.user import User


@pytest.mark.unit
def test_password_hashing():
    """Test password hashing and verification."""
    password = "TestPassword123!"
    hashed = get_password_hash(password)
    
    # Hash should be different from plain password
    assert hashed != password
    
    # Should verify correctly
    assert verify_password(password, hashed) is True
    
    # Wrong password should fail
    assert verify_password("WrongPassword", hashed) is False


@pytest.mark.unit
def test_jwt_token_creation():
    """Test JWT token creation and validation."""
    from app.core.auth import decode_token
    
    data = {"sub": "user-id", "email": "test@example.com"}
    token = create_access_token(data)
    
    # Token should be a string
    assert isinstance(token, str)
    assert len(token) > 0
    
    # Should decode correctly
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "user-id"
    assert payload["email"] == "test@example.com"


@pytest.mark.integration
def test_signup_success(client: TestClient, db_session):
    """Test successful user signup."""
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "newuser@test.com",
            "password": "SecurePass123!",
            "role": "investor",
            "full_name": "New User",
        },
    )
    
    if response.status_code != status.HTTP_201_CREATED:
        print(f"\nERROR: Status {response.status_code}")
        print(f"Response: {response.text}")
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == "newuser@test.com"
    assert data["profile_id"] is not None
    assert data["is_active"] is True
    assert data["is_verified"] is False
    assert "id" in data


@pytest.mark.integration
def test_signup_duplicate_email(client: TestClient, db_session):
    """Test signup with duplicate email."""
    # Create first user
    client.post(
        "/api/v1/auth/signup",
        json={
            "email": "duplicate@test.com",
            "password": "SecurePass123!",
            "role": "investor",
            "full_name": "First User",
        },
    )
    
    # Try to create duplicate
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "duplicate@test.com",
            "password": "SecurePass123!",
            "role": "founder",
            "full_name": "Second User",
        },
    )
    
    assert response.status_code == status.HTTP_409_CONFLICT


@pytest.mark.integration
def test_signup_invalid_role(client: TestClient, db_session):
    """Test signup with invalid role."""
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "invalid@test.com",
            "password": "SecurePass123!",
            "role": "invalid_role",
            "full_name": "Invalid User",
        },
    )
    
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.integration
def test_signup_weak_password(client: TestClient, db_session):
    """Test signup with weak password."""
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "weak@test.com",
            "password": "short",  # Too short
            "role": "investor",
            "full_name": "Weak User",
        },
    )
    
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.integration
def test_login_success(client: TestClient, db_session):
    """Test successful login."""
    # Create user first
    signup_response = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "login@test.com",
            "password": "SecurePass123!",
            "role": "investor",
            "full_name": "Login User",
        },
    )
    assert signup_response.status_code == status.HTTP_201_CREATED
    
    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "login@test.com",
            "password": "SecurePass123!",
        },
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert "expires_in" in data
    assert len(data["access_token"]) > 0
    assert len(data["refresh_token"]) > 0


@pytest.mark.integration
def test_login_invalid_credentials(client: TestClient, db_session):
    """Test login with invalid credentials."""
    # Try to login with non-existent user
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "nonexistent@test.com",
            "password": "SomePassword123!",
        },
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.integration
def test_login_wrong_password(client: TestClient, db_session):
    """Test login with wrong password."""
    # Create user first
    client.post(
        "/api/v1/auth/signup",
        json={
            "email": "wrongpass@test.com",
            "password": "CorrectPass123!",
            "role": "investor",
            "full_name": "Wrong Pass User",
        },
    )
    
    # Login with wrong password
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "wrongpass@test.com",
            "password": "WrongPassword123!",
        },
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.integration
def test_refresh_token_success(client: TestClient, db_session):
    """Test successful token refresh."""
    # Create user and login
    client.post(
        "/api/v1/auth/signup",
        json={
            "email": "refresh@test.com",
            "password": "SecurePass123!",
            "role": "investor",
            "full_name": "Refresh User",
        },
    )
    
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "refresh@test.com",
            "password": "SecurePass123!",
        },
    )
    refresh_token = login_response.json()["refresh_token"]
    
    # Refresh access token
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "expires_in" in data
    # Note: Access tokens may be identical if generated within the same second
    # The important thing is that the refresh works, not that tokens are different


@pytest.mark.integration
def test_refresh_token_invalid(client: TestClient, db_session):
    """Test refresh with invalid token."""
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "invalid-token"},
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.integration
def test_get_current_user_authenticated(client: TestClient, db_session):
    """Test getting current user with valid token."""
    # Create user and login
    client.post(
        "/api/v1/auth/signup",
        json={
            "email": "me@test.com",
            "password": "SecurePass123!",
            "role": "investor",
            "full_name": "Me User",
        },
    )
    
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "me@test.com",
            "password": "SecurePass123!",
        },
    )
    access_token = login_response.json()["access_token"]
    
    # Get current user
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == "me@test.com"
    assert "id" in data
    assert "profile_id" in data


@pytest.mark.integration
def test_get_current_user_unauthenticated(client: TestClient, db_session):
    """Test getting current user without token."""
    response = client.get("/api/v1/auth/me")
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.integration
def test_get_current_user_invalid_token(client: TestClient, db_session):
    """Test getting current user with invalid token."""
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# OAuth Tests
@pytest.mark.integration
def test_oauth_authorize_linkedin_not_configured(client: TestClient, monkeypatch):
    """Test LinkedIn OAuth authorize when not configured."""
    from unittest.mock import patch
    from app.core.exceptions import ValidationError
    
    # Mock the OAuth service to raise ValidationError when credentials are missing
    with patch('app.api.v1.endpoints.auth.oauth_service.get_linkedin_authorization_url') as mock_url:
        mock_url.side_effect = ValidationError("LinkedIn OAuth is not configured. Please add LINKEDIN_CLIENT_ID to .env")
        response = client.get("/api/v1/auth/oauth/linkedin/authorize")
        # Should return 400 because credentials are missing
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.integration
def test_oauth_authorize_google_not_configured(client: TestClient, monkeypatch):
    """Test Google OAuth authorize when not configured."""
    from unittest.mock import patch
    from app.core.exceptions import ValidationError
    
    # Mock the OAuth service to raise ValidationError when credentials are missing
    with patch('app.api.v1.endpoints.auth.oauth_service.get_google_authorization_url') as mock_url:
        mock_url.side_effect = ValidationError("Google OAuth is not configured. Please add GOOGLE_CLIENT_ID to .env")
        response = client.get("/api/v1/auth/oauth/google/authorize")
        # Should return 400 because credentials are missing
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.integration
def test_oauth_authorize_firebase_invalid(client: TestClient):
    """Test Firebase OAuth authorize - Firebase doesn't use this endpoint."""
    response = client.get("/api/v1/auth/oauth/firebase/authorize")
    
    # Firebase doesn't use OAuth authorization flow
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    detail = response.json()["detail"].lower()
    assert "id token" in detail or "id_token" in detail or "firebase" in detail


@pytest.mark.integration
def test_oauth_authorize_invalid_provider(client: TestClient):
    """Test OAuth authorize with invalid provider."""
    response = client.get("/api/v1/auth/oauth/invalid/authorize")
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.integration
def test_oauth_callback_linkedin_no_code(client: TestClient, db_session):
    """Test LinkedIn OAuth callback without code."""
    response = client.post(
        "/api/v1/auth/oauth/linkedin/callback",
        json={},  # No code provided
    )
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.integration
def test_oauth_callback_google_no_code(client: TestClient, db_session):
    """Test Google OAuth callback without code."""
    response = client.post(
        "/api/v1/auth/oauth/google/callback",
        json={},  # No code provided
    )
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.integration
def test_oauth_callback_firebase_no_token(client: TestClient, db_session):
    """Test Firebase OAuth callback without ID token."""
    response = client.post(
        "/api/v1/auth/oauth/firebase/callback",
        json={},  # No id_token provided
    )
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.integration
def test_oauth_callback_invalid_provider(client: TestClient, db_session):
    """Test OAuth callback with invalid provider."""
    response = client.post(
        "/api/v1/auth/oauth/invalid/callback",
        json={"code": "test-code"},
    )
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST

