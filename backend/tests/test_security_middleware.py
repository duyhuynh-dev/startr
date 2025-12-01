"""Tests for security middleware."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.security_middleware import SecurityHeadersMiddleware, InputSanitizationMiddleware


@pytest.mark.unit
class TestSecurityHeadersMiddleware:
    """Tests for security headers middleware."""

    def test_security_headers_added(self):
        """Test that security headers are added to responses."""
        app = FastAPI()
        app.add_middleware(SecurityHeadersMiddleware)
        
        @app.get("/test")
        def test_endpoint():
            return {"message": "test"}
        
        client = TestClient(app)
        response = client.get("/test")
        
        assert response.status_code == 200
        assert "X-Content-Type-Options" in response.headers
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert "X-Frame-Options" in response.headers
        assert response.headers["X-Frame-Options"] == "DENY"
        assert "X-XSS-Protection" in response.headers
        assert "Content-Security-Policy" in response.headers
        assert "Referrer-Policy" in response.headers


@pytest.mark.unit
class TestInputSanitizationMiddleware:
    """Tests for input sanitization middleware."""

    def test_sql_injection_detection(self):
        """Test that SQL injection patterns are detected."""
        middleware = InputSanitizationMiddleware(None)
        
        # Test SQL injection patterns
        assert middleware._is_suspicious("SELECT * FROM users") is True
        assert middleware._is_suspicious("DROP TABLE users") is True
        assert middleware._is_suspicious("'; DROP TABLE--") is True
        assert middleware._is_suspicious("normal text") is False

    def test_xss_detection(self):
        """Test that XSS patterns are detected."""
        middleware = InputSanitizationMiddleware(None)
        
        # Test XSS patterns
        assert middleware._is_suspicious("<script>alert('xss')</script>") is True
        assert middleware._is_suspicious("<iframe src='evil.com'></iframe>") is True
        assert middleware._is_suspicious("javascript:alert('xss')") is True
        assert middleware._is_suspicious("normal text") is False

    def test_safe_input_allowed(self):
        """Test that safe input is allowed."""
        app = FastAPI()
        app.add_middleware(InputSanitizationMiddleware)
        
        @app.get("/test")
        def test_endpoint():
            return {"message": "test"}
        
        client = TestClient(app)
        
        # Safe query param
        response = client.get("/test?q=hello world")
        
        assert response.status_code == 200

    def test_sanitize_string(self):
        """Test string sanitization."""
        test_cases = [
            ("<script>alert('xss')</script>", "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;"),
            ("Hello <b>World</b>", "Hello &lt;b&gt;World&lt;/b&gt;"),
            ("Normal text", "Normal text"),
        ]
        
        for input_str, expected in test_cases:
            result = InputSanitizationMiddleware.sanitize_string(input_str)
            assert result == expected

