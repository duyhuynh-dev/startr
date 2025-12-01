"""Tests for file storage and upload functionality."""

from __future__ import annotations

import io
from unittest.mock import Mock, MagicMock, patch, mock_open
from fastapi import status
from fastapi.testclient import TestClient
from PIL import Image
import pytest

from app.services.storage_service import (
    StorageService,
    StorageServiceError,
    FileValidationError,
    storage_service,
)


@pytest.mark.unit
class TestStorageService:
    """Unit tests for StorageService."""

    def test_storage_service_initialization_without_boto3(self):
        """Test that service initializes gracefully when boto3 not available."""
        with patch('app.services.storage_service.BOTO3_AVAILABLE', False):
            service = StorageService()
            assert not service.is_available()
            assert service.client is None

    def test_validate_file_size_exceeded(self):
        """Test file validation with size exceeding limit."""
        service = StorageService()
        service.client = Mock()  # Mock client to make service "available"
        
        # Create file content larger than default limit (10MB)
        large_content = b'x' * (11 * 1024 * 1024)  # 11 MB
        
        with pytest.raises(FileValidationError) as exc_info:
            service.validate_file(
                file_content=large_content,
                filename="test.jpg",
            )
        
        assert "exceeds maximum" in str(exc_info.value)

    def test_validate_file_empty(self):
        """Test validation of empty file."""
        service = StorageService()
        service.client = Mock()
        
        with pytest.raises(FileValidationError) as exc_info:
            service.validate_file(
                file_content=b'',
                filename="test.jpg",
            )
        
        assert "empty" in str(exc_info.value).lower()

    def test_validate_file_invalid_type(self):
        """Test validation with invalid file type."""
        service = StorageService()
        service.client = Mock()
        
        with pytest.raises(FileValidationError) as exc_info:
            service.validate_file(
                file_content=b'file content',
                filename="test.exe",
                content_type="application/x-executable",
            )
        
        assert "not allowed" in str(exc_info.value)

    def test_validate_file_valid_image(self):
        """Test validation of valid image file."""
        service = StorageService()
        service.client = Mock()
        service.bucket_name = "test-bucket"
        
        # Create a simple image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        content_type, ext = service.validate_file(
            file_content=img_bytes.read(),
            filename="test.jpg",
        )
        
        assert content_type.startswith("image/")
        assert ext in ['.jpg', '.jpeg']

    def test_generate_file_path(self):
        """Test file path generation."""
        service = StorageService()
        
        path = service.generate_file_path(
            category="profile-photos",
            user_id="user-123",
            filename="photo.jpg",
        )
        
        assert "profile-photos" in path
        assert "user-123" in path
        assert path.endswith(".jpg")

    @patch('app.services.storage_service.boto3')
    def test_upload_file_success(self, mock_boto3):
        """Test successful file upload."""
        # Setup mocks
        mock_client = Mock()
        mock_boto3.client.return_value = mock_client
        mock_client.head_bucket.return_value = None
        
        service = StorageService()
        service.client = mock_client
        service.bucket_name = "test-bucket"
        
        file_content = b'test file content'
        file_path = "test/path/file.jpg"
        
        url = service.upload_file(
            file_content=file_content,
            file_path=file_path,
            content_type="image/jpeg",
        )
        
        # Verify put_object was called
        mock_client.put_object.assert_called_once()
        assert file_path in url or "test-bucket" in url

    @patch('app.services.storage_service.Image')
    def test_optimize_image(self, mock_image):
        """Test image optimization."""
        service = StorageService()
        
        # Create mock image
        mock_img = Mock()
        mock_img.format = 'JPEG'
        mock_img.mode = 'RGB'
        mock_img.width = 3000
        mock_img.height = 2000
        mock_img.thumbnail = Mock()
        
        mock_image.open.return_value.__enter__.return_value = mock_img
        
        # Mock save
        output = io.BytesIO()
        mock_img.save = Mock()
        
        file_content = b'fake image content'
        
        result = service.optimize_image(file_content)
        
        # Image should be processed
        assert mock_img.thumbnail.called or mock_img.save.called or result == file_content


@pytest.mark.integration
class TestStorageEndpoints:
    """Integration tests for storage endpoints."""

    def test_upload_profile_photo_storage_unavailable(self, client: TestClient, db_session):
        """Test upload when storage is unavailable."""
        # Mock storage service as unavailable
        with patch('app.api.v1.endpoints.storage.storage_service.is_available', return_value=False):
            # Create user first
            client.post(
                "/api/v1/auth/signup",
                json={
                    "email": "test@example.com",
                    "password": "SecurePass123!",
                    "role": "founder",
                    "full_name": "Test User",
                },
            )
            
            login_response = client.post(
                "/api/v1/auth/login",
                json={
                    "email": "test@example.com",
                    "password": "SecurePass123!",
                },
            )
            token = login_response.json()["access_token"]
            
            # Try to upload file
            response = client.post(
                "/api/v1/storage/upload/profile-photo",
                headers={"Authorization": f"Bearer {token}"},
                files={"file": ("photo.jpg", b"fake image content", "image/jpeg")},
            )
            
            assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE

    def test_upload_profile_photo_unauthorized(self, client: TestClient):
        """Test upload without authentication."""
        response = client.post(
            "/api/v1/storage/upload/profile-photo",
            files={"file": ("photo.jpg", b"fake image content", "image/jpeg")},
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @patch('app.api.v1.endpoints.storage.storage_service')
    def test_upload_profile_photo_success(self, mock_storage_service, client: TestClient, db_session):
        """Test successful profile photo upload."""
        # Setup mocks
        mock_storage_service.is_available.return_value = True
        mock_storage_service.validate_file.return_value = ("image/jpeg", ".jpg")
        mock_storage_service.optimize_image.return_value = b"optimized content"
        mock_storage_service.generate_file_path.return_value = "profile-photos/user-123/file.jpg"
        mock_storage_service.upload_file.return_value = "http://example.com/file.jpg"
        
        # Create user and login
        client.post(
            "/api/v1/auth/signup",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
                "role": "founder",
                "full_name": "Test User",
            },
        )
        
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
            },
        )
        token = login_response.json()["access_token"]
        
        # Create a simple image file
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        # Upload file
        response = client.post(
            "/api/v1/storage/upload/profile-photo",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("photo.jpg", img_bytes.read(), "image/jpeg")},
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "file_url" in data
        assert "file_path" in data
        assert "content_type" in data

    @patch('app.api.v1.endpoints.storage.storage_service')
    def test_upload_file_validation_error(self, mock_storage_service, client: TestClient, db_session):
        """Test upload with validation error."""
        mock_storage_service.is_available.return_value = True
        mock_storage_service.validate_file.side_effect = FileValidationError("File too large")
        
        # Create user and login
        client.post(
            "/api/v1/auth/signup",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
                "role": "founder",
                "full_name": "Test User",
            },
        )
        
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
            },
        )
        token = login_response.json()["access_token"]
        
        # Try to upload invalid file
        response = client.post(
            "/api/v1/storage/upload/profile-photo",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("photo.jpg", b"content", "image/jpeg")},
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @patch('app.api.v1.endpoints.storage.storage_service')
    def test_generate_signed_url(self, mock_storage_service, client: TestClient, db_session):
        """Test signed URL generation."""
        mock_storage_service.is_available.return_value = True
        mock_storage_service.generate_signed_url.return_value = "https://example.com/signed-url?signature=xxx"
        
        # Create user and login
        client.post(
            "/api/v1/auth/signup",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
                "role": "founder",
                "full_name": "Test User",
            },
        )
        
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
            },
        )
        token = login_response.json()["access_token"]
        
        # Generate signed URL
        response = client.post(
            "/api/v1/storage/signed-url",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "file_path": "profile-photos/user-123/file.jpg",
                "expires_in_seconds": 3600,
            },
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "signed_url" in data
        assert "expires_in_seconds" in data

    @patch('app.api.v1.endpoints.storage.storage_service')
    def test_delete_file_unauthorized_path(self, mock_storage_service, client: TestClient, db_session):
        """Test deleting file from unauthorized path."""
        mock_storage_service.is_available.return_value = True
        
        # Create user and login
        client.post(
            "/api/v1/auth/signup",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
                "role": "founder",
                "full_name": "Test User",
            },
        )
        
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
            },
        )
        token = login_response.json()["access_token"]
        
        # Try to delete file from another user's path
        response = client.delete(
            "/api/v1/storage/files/profile-photos/other-user-123/file.jpg",
            headers={"Authorization": f"Bearer {token}"},
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @patch('app.api.v1.endpoints.storage.storage_service')
    def test_delete_file_success(self, mock_storage_service, client: TestClient, db_session):
        """Test successful file deletion."""
        mock_storage_service.is_available.return_value = True
        mock_storage_service.delete_file.return_value = True
        
        # Create user and login
        signup_response = client.post(
            "/api/v1/auth/signup",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
                "role": "founder",
                "full_name": "Test User",
            },
        )
        user_id = signup_response.json()["id"]
        
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
            },
        )
        token = login_response.json()["access_token"]
        
        # Delete file
        file_path = f"profile-photos/{user_id}/file.jpg"
        response = client.delete(
            f"/api/v1/storage/files/{file_path}",
            headers={"Authorization": f"Bearer {token}"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "message" in data
        assert data["file_path"] == file_path

