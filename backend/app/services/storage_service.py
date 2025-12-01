"""File storage service for MinIO/S3 integration."""

from __future__ import annotations

import io
import logging
import mimetypes
import uuid
from pathlib import Path
from typing import Optional, Tuple

try:
    import boto3
    from botocore.client import Config
    from botocore.exceptions import ClientError, BotoCoreError
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False
    boto3 = None
    Config = None
    ClientError = Exception
    BotoCoreError = Exception

try:
    from PIL import Image
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False
    Image = None

from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageServiceError(Exception):
    """Base exception for storage service errors."""
    pass


class FileValidationError(StorageServiceError):
    """File validation failed."""
    pass


class StorageService:
    """Service for file storage operations using MinIO or S3."""

    def __init__(self):
        """Initialize storage service."""
        self.client = None
        self.bucket_name = None
        self.storage_type = settings.storage_type
        
        if not BOTO3_AVAILABLE:
            logger.warning(
                "boto3 not installed. File uploads will be disabled. "
                "Install with: pip install boto3"
            )
            return
        
        try:
            self._init_client()
        except Exception as e:
            logger.error(f"Failed to initialize storage client: {e}")
            self.client = None

    def _init_client(self) -> None:
        """Initialize S3/MinIO client."""
        if self.storage_type == "minio":
            # MinIO configuration
            endpoint = settings.minio_endpoint
            access_key = settings.minio_access_key
            secret_key = settings.minio_secret_key
            self.bucket_name = settings.minio_bucket
            use_ssl = settings.minio_use_ssl
            
            # Create S3-compatible client for MinIO
            self.client = boto3.client(
                's3',
                endpoint_url=f"{'https' if use_ssl else 'http'}://{endpoint}",
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                config=Config(signature_version='s3v4'),
            )
            
        elif self.storage_type == "s3":
            # AWS S3 configuration (or S3-compatible like DigitalOcean Spaces)
            if not all([settings.aws_access_key_id, settings.aws_secret_access_key, settings.aws_s3_bucket]):
                raise StorageServiceError("AWS S3 credentials not configured")
            
            self.bucket_name = settings.aws_s3_bucket
            
            # Support custom endpoints for S3-compatible services (e.g., DigitalOcean Spaces)
            client_config = {
                'aws_access_key_id': settings.aws_access_key_id,
                'aws_secret_access_key': settings.aws_secret_access_key,
                'region_name': settings.aws_region,
            }
            
            if settings.aws_endpoint_url:
                client_config['endpoint_url'] = settings.aws_endpoint_url
            
            self.client = boto3.client('s3', **client_config)
        else:
            raise StorageServiceError(f"Unsupported storage type: {self.storage_type}")
        
        # Ensure bucket exists
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self) -> None:
        """Create bucket if it doesn't exist."""
        if not self.client:
            return
        
        try:
            self.client.head_bucket(Bucket=self.bucket_name)
        except ClientError:
            try:
                if self.storage_type == "minio":
                    # MinIO - create bucket
                    self.client.create_bucket(Bucket=self.bucket_name)
                else:
                    # AWS S3 or S3-compatible - create bucket
                    create_params = {'Bucket': self.bucket_name}
                    # Only add LocationConstraint for AWS S3 (not for S3-compatible services)
                    if not settings.aws_endpoint_url and settings.aws_region != "us-east-1":
                        create_params['CreateBucketConfiguration'] = {'LocationConstraint': settings.aws_region}
                    self.client.create_bucket(**create_params)
                logger.info(f"Created bucket: {self.bucket_name}")
            except Exception as e:
                logger.error(f"Failed to create bucket {self.bucket_name}: {e}")
                raise StorageServiceError(f"Failed to create bucket: {e}")

    def is_available(self) -> bool:
        """Check if storage service is available."""
        return self.client is not None and BOTO3_AVAILABLE

    def validate_file(
        self,
        file_content: bytes,
        filename: str,
        content_type: Optional[str] = None,
        allowed_types: Optional[list] = None,
        max_size_mb: Optional[int] = None,
    ) -> Tuple[str, str]:
        """Validate file before upload.
        
        Args:
            file_content: File content as bytes
            filename: Original filename
            content_type: MIME type (will be detected if not provided)
            allowed_types: List of allowed MIME types (defaults to settings)
            max_size_mb: Maximum file size in MB (defaults to settings)
            
        Returns:
            Tuple of (content_type, file_extension)
            
        Raises:
            FileValidationError: If validation fails
        """
        if not self.is_available():
            raise StorageServiceError("Storage service is not available")
        
        # Check file size
        max_size = (max_size_mb or settings.max_file_size_mb) * 1024 * 1024  # Convert to bytes
        file_size = len(file_content)
        
        if file_size > max_size:
            raise FileValidationError(
                f"File size ({file_size / 1024 / 1024:.2f} MB) exceeds maximum "
                f"allowed size ({max_size / 1024 / 1024} MB)"
            )
        
        if file_size == 0:
            raise FileValidationError("File is empty")
        
        # Detect content type
        if not content_type:
            content_type, _ = mimetypes.guess_type(filename)
            if not content_type:
                # Try to detect from file content
                if filename.lower().endswith(('.jpg', '.jpeg')):
                    content_type = 'image/jpeg'
                elif filename.lower().endswith('.png'):
                    content_type = 'image/png'
                elif filename.lower().endswith('.pdf'):
                    content_type = 'application/pdf'
                else:
                    raise FileValidationError(f"Could not determine content type for {filename}")
        
        # Validate content type
        allowed = allowed_types or (settings.allowed_image_types + settings.allowed_document_types)
        
        if content_type not in allowed:
            raise FileValidationError(
                f"File type {content_type} is not allowed. Allowed types: {', '.join(allowed)}"
            )
        
        # Get file extension
        ext = Path(filename).suffix.lower() or mimetypes.guess_extension(content_type) or ''
        
        return content_type, ext

    def upload_file(
        self,
        file_content: bytes,
        file_path: str,
        content_type: str,
        metadata: Optional[dict] = None,
    ) -> str:
        """Upload file to storage.
        
        Args:
            file_content: File content as bytes
            file_path: Path within bucket (e.g., "profile-photos/user-id/photo.jpg")
            content_type: MIME type
            metadata: Optional metadata dict
            
        Returns:
            Public URL or object key
        """
        if not self.is_available():
            raise StorageServiceError("Storage service is not available")
        
        try:
            extra_args = {
                'ContentType': content_type,
            }
            
            if metadata:
                # Convert metadata to S3 metadata format (keys must be prefixed)
                s3_metadata = {f'x-amz-meta-{k}': str(v) for k, v in metadata.items()}
                extra_args['Metadata'] = s3_metadata
            
            self.client.put_object(
                Bucket=self.bucket_name,
                Key=file_path,
                Body=file_content,
                **extra_args
            )
            
            # Return object key or URL
            if self.storage_type == "minio":
                # For MinIO, construct URL
                endpoint = settings.minio_endpoint
                use_ssl = settings.minio_use_ssl
                protocol = "https" if use_ssl else "http"
                return f"{protocol}://{endpoint}/{self.bucket_name}/{file_path}"
            else:
                # For S3, return object key (will use signed URLs)
                return file_path
                
        except (ClientError, BotoCoreError) as e:
            logger.error(f"Failed to upload file {file_path}: {e}")
            raise StorageServiceError(f"Failed to upload file: {e}")

    def generate_signed_url(
        self,
        file_path: str,
        expires_in_seconds: Optional[int] = None,
    ) -> str:
        """Generate a signed URL for file access.
        
        Args:
            file_path: Path within bucket
            expires_in_seconds: URL expiration time (defaults to settings)
            
        Returns:
            Signed URL string
        """
        if not self.is_available():
            raise StorageServiceError("Storage service is not available")
        
        expires = expires_in_seconds or settings.signed_url_expire_seconds
        
        try:
            url = self.client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': file_path,
                },
                ExpiresIn=expires,
            )
            return url
        except (ClientError, BotoCoreError) as e:
            logger.error(f"Failed to generate signed URL for {file_path}: {e}")
            raise StorageServiceError(f"Failed to generate signed URL: {e}")

    def delete_file(self, file_path: str) -> bool:
        """Delete file from storage.
        
        Args:
            file_path: Path within bucket
            
        Returns:
            True if deleted, False otherwise
        """
        if not self.is_available():
            return False
        
        try:
            self.client.delete_object(
                Bucket=self.bucket_name,
                Key=file_path,
            )
            return True
        except (ClientError, BotoCoreError) as e:
            logger.error(f"Failed to delete file {file_path}: {e}")
            return False

    def optimize_image(self, file_content: bytes, max_width: int = 1920, max_height: int = 1920, quality: int = 85) -> bytes:
        """Optimize image by resizing and compressing.
        
        Args:
            file_content: Original image bytes
            max_width: Maximum width (maintains aspect ratio)
            max_height: Maximum height (maintains aspect ratio)
            quality: JPEG quality (1-100, higher = better quality)
            
        Returns:
            Optimized image bytes
        """
        if not PILLOW_AVAILABLE:
            logger.warning("Pillow not available, skipping image optimization")
            return file_content
        
        try:
            image = Image.open(io.BytesIO(file_content))
            
            # Convert RGBA to RGB for JPEG
            if image.format == 'JPEG' and image.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode in ('RGBA', 'LA') else None)
                image = background
            
            # Resize if needed
            if image.width > max_width or image.height > max_height:
                image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
            
            # Save optimized image
            output = io.BytesIO()
            format = image.format or 'JPEG'
            
            if format in ('JPEG', 'JPG'):
                image.save(output, format='JPEG', quality=quality, optimize=True)
            elif format == 'PNG':
                image.save(output, format='PNG', optimize=True)
            elif format == 'WEBP':
                image.save(output, format='WEBP', quality=quality)
            else:
                # Unsupported format, return original
                return file_content
            
            output.seek(0)
            return output.read()
            
        except Exception as e:
            logger.warning(f"Failed to optimize image: {e}, returning original")
            return file_content

    def generate_file_path(self, category: str, user_id: str, filename: str, file_id: Optional[str] = None) -> str:
        """Generate a standardized file path.
        
        Args:
            category: File category (e.g., "profile-photos", "verification-docs", "attachments")
            user_id: User ID
            filename: Original filename
            file_id: Optional unique file ID (will be generated if not provided)
            
        Returns:
            File path string (e.g., "profile-photos/user-id/file-id-extension")
        """
        if not file_id:
            file_id = str(uuid.uuid4())
        
        # Clean filename
        clean_filename = Path(filename).stem
        ext = Path(filename).suffix.lower()
        
        # Generate path: category/user-id/file-id.extension
        file_path = f"{category}/{user_id}/{file_id}{ext}"
        
        return file_path


# Singleton instance
storage_service = StorageService()

