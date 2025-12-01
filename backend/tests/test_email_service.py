"""Tests for email service."""

from __future__ import annotations

import pytest
from unittest.mock import Mock, patch, MagicMock
from app.services.email_service import EmailService


@pytest.mark.unit
class TestEmailService:
    """Unit tests for EmailService."""

    def test_email_service_initialization_disabled(self):
        """Test email service initialization when SMTP not configured."""
        with patch('app.services.email_service.settings') as mock_settings:
            mock_settings.smtp_host = None
            mock_settings.smtp_user = None
            mock_settings.smtp_password = None
            mock_settings.smtp_from_email = None
            
            service = EmailService()
            assert service.enabled is False

    def test_email_service_initialization_enabled(self):
        """Test email service initialization when SMTP configured."""
        with patch('app.services.email_service.settings') as mock_settings:
            mock_settings.smtp_host = "smtp.example.com"
            mock_settings.smtp_user = "user@example.com"
            mock_settings.smtp_password = "password"
            mock_settings.smtp_from_email = "noreply@example.com"
            mock_settings.smtp_from_name = "Test App"
            mock_settings.smtp_port = 587
            mock_settings.smtp_use_tls = True
            
            service = EmailService()
            assert service.enabled is True

    def test_send_verification_email_disabled(self):
        """Test sending verification email when service disabled."""
        with patch('app.services.email_service.settings') as mock_settings:
            mock_settings.smtp_host = None
            mock_settings.frontend_url = "http://localhost:3000"
            
            service = EmailService()
            result = service.send_verification_email("test@example.com", "token123")
            
            assert result is False  # Should return False when disabled

    @patch('app.services.email_service.smtplib.SMTP')
    def test_send_verification_email_enabled(self, mock_smtp):
        """Test sending verification email when service enabled."""
        with patch('app.services.email_service.settings') as mock_settings:
            mock_settings.smtp_host = "smtp.example.com"
            mock_settings.smtp_port = 587
            mock_settings.smtp_user = "user@example.com"
            mock_settings.smtp_password = "password"
            mock_settings.smtp_from_email = "noreply@example.com"
            mock_settings.smtp_from_name = "Test App"
            mock_settings.smtp_use_tls = True
            mock_settings.frontend_url = "http://localhost:3000"
            
            # Mock SMTP server
            mock_server = MagicMock()
            mock_smtp.return_value.__enter__.return_value = mock_server
            
            service = EmailService()
            result = service.send_verification_email("test@example.com", "token123")
            
            assert result is True
            mock_server.starttls.assert_called_once()
            mock_server.login.assert_called_once()
            mock_server.send_message.assert_called_once()

    def test_send_password_reset_email_disabled(self):
        """Test sending password reset email when service disabled."""
        with patch('app.services.email_service.settings') as mock_settings:
            mock_settings.smtp_host = None
            mock_settings.frontend_url = "http://localhost:3000"
            
            service = EmailService()
            result = service.send_password_reset_email("test@example.com", "token123")
            
            assert result is False

    @patch('app.services.email_service.smtplib.SMTP')
    def test_send_password_reset_email_enabled(self, mock_smtp):
        """Test sending password reset email when service enabled."""
        with patch('app.services.email_service.settings') as mock_settings:
            mock_settings.smtp_host = "smtp.example.com"
            mock_settings.smtp_port = 587
            mock_settings.smtp_user = "user@example.com"
            mock_settings.smtp_password = "password"
            mock_settings.smtp_from_email = "noreply@example.com"
            mock_settings.smtp_from_name = "Test App"
            mock_settings.smtp_use_tls = True
            mock_settings.frontend_url = "http://localhost:3000"
            
            # Mock SMTP server
            mock_server = MagicMock()
            mock_smtp.return_value.__enter__.return_value = mock_server
            
            service = EmailService()
            result = service.send_password_reset_email("test@example.com", "reset_token")
            
            assert result is True
            mock_server.login.assert_called_once()
            mock_server.send_message.assert_called_once()

    @patch('app.services.email_service.smtplib.SMTP')
    def test_send_email_exception_handling(self, mock_smtp):
        """Test email sending exception handling."""
        with patch('app.services.email_service.settings') as mock_settings:
            mock_settings.smtp_host = "smtp.example.com"
            mock_settings.smtp_port = 587
            mock_settings.smtp_user = "user@example.com"
            mock_settings.smtp_password = "password"
            mock_settings.smtp_from_email = "noreply@example.com"
            mock_settings.smtp_from_name = "Test App"
            mock_settings.smtp_use_tls = True
            mock_settings.frontend_url = "http://localhost:3000"
            
            # Mock SMTP to raise exception
            mock_smtp.side_effect = Exception("SMTP error")
            
            service = EmailService()
            result = service.send_verification_email("test@example.com", "token123")
            
            assert result is False  # Should return False on error

