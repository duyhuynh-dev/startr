"""Email service for sending verification and password reset emails."""

from __future__ import annotations

import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails (verification, password reset, etc.)."""

    def __init__(self):
        """Initialize email service."""
        self.enabled = bool(
            settings.smtp_host
            and settings.smtp_user
            and settings.smtp_password
            and settings.smtp_from_email
        )
        
        if not self.enabled:
            logger.warning(
                "Email service is disabled. Configure SMTP settings in .env to enable email sending."
            )

    def _send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
    ) -> bool:
        """Send an email.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_body: HTML email body
            text_body: Optional plain text email body
            
        Returns:
            True if email sent successfully, False otherwise
        """
        if not self.enabled:
            logger.warning(f"Email service disabled. Would send email to {to_email} with subject: {subject}")
            logger.warning(f"Email body: {html_body[:200]}...")
            return False
        
        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
            msg["To"] = to_email

            # Add text and HTML parts
            if text_body:
                text_part = MIMEText(text_body, "plain")
                msg.attach(text_part)
            
            html_part = MIMEText(html_body, "html")
            msg.attach(html_part)

            # Send email
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                if settings.smtp_use_tls:
                    server.starttls()
                server.login(settings.smtp_user, settings.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    def send_verification_email(self, email: str, verification_token: str) -> bool:
        """Send email verification email.
        
        Args:
            email: User email address
            verification_token: Email verification token
            
        Returns:
            True if email sent successfully, False otherwise
        """
        verification_url = f"{settings.frontend_url}/auth/verify-email?token={verification_token}"
        
        subject = "Verify your email address"
        html_body = f"""
        <html>
          <body>
            <h2>Welcome to VC × Startup Matching!</h2>
            <p>Thank you for signing up. Please verify your email address by clicking the link below:</p>
            <p><a href="{verification_url}">Verify Email Address</a></p>
            <p>Or copy and paste this URL into your browser:</p>
            <p>{verification_url}</p>
            <p>This link will expire in 48 hours.</p>
            <p>If you didn't create an account, you can safely ignore this email.</p>
          </body>
        </html>
        """
        
        text_body = f"""
        Welcome to VC × Startup Matching!
        
        Thank you for signing up. Please verify your email address by visiting this URL:
        
        {verification_url}
        
        This link will expire in 48 hours.
        
        If you didn't create an account, you can safely ignore this email.
        """
        
        return self._send_email(email, subject, html_body, text_body)

    def send_password_reset_email(self, email: str, reset_token: str) -> bool:
        """Send password reset email.
        
        Args:
            email: User email address
            reset_token: Password reset token
            
        Returns:
            True if email sent successfully, False otherwise
        """
        reset_url = f"{settings.frontend_url}/auth/reset-password?token={reset_token}"
        
        subject = "Reset your password"
        html_body = f"""
        <html>
          <body>
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password. Click the link below to reset it:</p>
            <p><a href="{reset_url}">Reset Password</a></p>
            <p>Or copy and paste this URL into your browser:</p>
            <p>{reset_url}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
          </body>
        </html>
        """
        
        text_body = f"""
        Password Reset Request
        
        You requested to reset your password. Visit this URL to reset it:
        
        {reset_url}
        
        This link will expire in 24 hours.
        
        If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
        """
        
        return self._send_email(email, subject, html_body, text_body)


# Singleton instance
email_service = EmailService()

