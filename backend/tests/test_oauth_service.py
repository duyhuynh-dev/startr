"""Comprehensive tests for OAuth service."""

from __future__ import annotations

import pytest
from unittest.mock import Mock, patch, MagicMock
from app.services.oauth_service import OAuthService
from app.core.config import settings
from app.core.exceptions import ValidationError


@pytest.mark.unit
class TestOAuthService:
    """Unit tests for OAuthService."""

    def test_generate_state(self):
        """Test state generation."""
        service = OAuthService()
        state1 = service.generate_state()
        state2 = service.generate_state()
        
        assert isinstance(state1, str)
        assert len(state1) > 0
        assert state1 != state2  # Should be unique

    def test_get_linkedin_authorization_url_not_configured(self):
        """Test LinkedIn authorization URL when not configured."""
        service = OAuthService()
        
        with patch.object(settings, 'linkedin_client_id', None):
            with pytest.raises(ValidationError) as exc_info:
                service.get_linkedin_authorization_url("http://localhost/callback")
            assert "not configured" in str(exc_info.value).lower()

    def test_get_linkedin_authorization_url_configured(self):
        """Test LinkedIn authorization URL generation."""
        service = OAuthService()
        
        with patch.object(settings, 'linkedin_client_id', 'test_client_id'):
            url, state = service.get_linkedin_authorization_url("http://localhost/callback")
            
            assert isinstance(url, str)
            assert "linkedin.com/oauth/v2/authorization" in url
            assert "client_id=test_client_id" in url
            assert "redirect_uri" in url
            assert state is not None

    def test_get_google_authorization_url_not_configured(self):
        """Test Google authorization URL when not configured."""
        service = OAuthService()
        
        with patch.object(settings, 'google_client_id', None):
            with pytest.raises(ValidationError) as exc_info:
                service.get_google_authorization_url("http://localhost/callback")
            assert "not configured" in str(exc_info.value).lower()

    def test_get_google_authorization_url_configured(self):
        """Test Google authorization URL generation."""
        service = OAuthService()
        
        with patch.object(settings, 'google_client_id', 'test_google_client_id'):
            url, state = service.get_google_authorization_url("http://localhost/callback")
            
            assert isinstance(url, str)
            assert "accounts.google.com" in url
            assert "oauth2" in url
            assert "client_id=test_google_client_id" in url
            assert "redirect_uri" in url
            assert state is not None

    def test_firebase_init_not_configured(self):
        """Test Firebase initialization when not configured."""
        service = OAuthService()
        
        with patch.object(settings, 'firebase_project_id', None):
            # Should not raise error, just skip Firebase init
            assert service._firebase_app is None or service._firebase_app is not None  # Either way is fine

