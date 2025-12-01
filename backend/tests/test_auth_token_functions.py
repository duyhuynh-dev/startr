"""Tests for auth token creation and validation functions."""

from __future__ import annotations

import pytest
from app.core.auth import (
    create_password_reset_token,
    create_email_verification_token,
    get_password_reset_token_data,
    get_email_verification_token_data,
    decode_token,
)


@pytest.mark.unit
def test_create_password_reset_token():
    """Test password reset token creation."""
    user_id = "test-user-id"
    email = "test@example.com"
    
    token = create_password_reset_token(user_id, email)
    
    assert isinstance(token, str)
    assert len(token) > 0
    
    # Decode and verify
    payload = get_password_reset_token_data(token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["email"] == email
    assert payload["type"] == "password_reset"
    assert "exp" in payload


@pytest.mark.unit
def test_create_email_verification_token():
    """Test email verification token creation."""
    user_id = "test-user-id"
    email = "test@example.com"
    
    token = create_email_verification_token(user_id, email)
    
    assert isinstance(token, str)
    assert len(token) > 0
    
    # Decode and verify
    payload = get_email_verification_token_data(token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["email"] == email
    assert payload["type"] == "email_verification"
    assert "exp" in payload


@pytest.mark.unit
def test_get_password_reset_token_data_invalid_token():
    """Test getting password reset token data from invalid token."""
    # Regular access token shouldn't work
    from app.core.auth import create_access_token
    access_token = create_access_token({"sub": "user-id"})
    
    payload = get_password_reset_token_data(access_token)
    assert payload is None


@pytest.mark.unit
def test_get_password_reset_token_data_wrong_type():
    """Test getting password reset token data from wrong token type."""
    user_id = "test-user-id"
    email = "test@example.com"
    
    # Create email verification token
    verify_token = create_email_verification_token(user_id, email)
    
    # Try to get as password reset token (should fail)
    payload = get_password_reset_token_data(verify_token)
    assert payload is None


@pytest.mark.unit
def test_get_email_verification_token_data_invalid_token():
    """Test getting email verification token data from invalid token."""
    # Regular access token shouldn't work
    from app.core.auth import create_access_token
    access_token = create_access_token({"sub": "user-id"})
    
    payload = get_email_verification_token_data(access_token)
    assert payload is None


@pytest.mark.unit
def test_get_email_verification_token_data_wrong_type():
    """Test getting email verification token data from wrong token type."""
    user_id = "test-user-id"
    email = "test@example.com"
    
    # Create password reset token
    reset_token = create_password_reset_token(user_id, email)
    
    # Try to get as email verification token (should fail)
    payload = get_email_verification_token_data(reset_token)
    assert payload is None

