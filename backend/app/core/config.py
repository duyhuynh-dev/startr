from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the FastAPI backend."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "VC × Startup Matching API"
    version: str = "0.1.0"
    api_prefix: str = "/api"
    allowed_hosts: List[str] = ["*"]

    # Database
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/vc_matcher"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Logging
    log_level: str = "INFO"

    # Rate Limiting
    rate_limit_enabled: bool = True
    rate_limit_default: str = "100/minute"  # Default rate limit
    rate_limit_auth: str = "1000/hour"  # Higher limit for authenticated endpoints

    # External API Keys (Optional - for ETL services)
    crunchbase_api_key: Optional[str] = None
    clearbit_api_key: Optional[str] = None

    # ML Configuration
    embedding_model: str = "all-MiniLM-L6-v2"  # Sentence transformer model
    ml_enabled: bool = True  # Enable/disable ML features
    ml_similarity_weight: float = 0.6  # Weight for embedding similarity in ranking
    ml_diligence_weight: float = 0.3  # Weight for diligence scores in ranking
    ml_engagement_weight: float = 0.1  # Weight for user engagement signals

    # Authentication Configuration
    secret_key: str = "your-secret-key-change-in-production"  # JWT secret key - MUST be changed in production
    algorithm: str = "HS256"  # JWT algorithm
    access_token_expire_minutes: int = 30  # Access token expiration
    refresh_token_expire_days: int = 7  # Refresh token expiration
    
    # OAuth Configuration (Optional - add API keys when ready)
    firebase_project_id: Optional[str] = None
    firebase_private_key: Optional[str] = None
    firebase_client_email: Optional[str] = None
    linkedin_client_id: Optional[str] = None
    linkedin_client_secret: Optional[str] = None
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    
    # Email Configuration (Optional - for password reset and verification)
    smtp_host: Optional[str] = None  # e.g., "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: Optional[str] = None  # Email address
    smtp_password: Optional[str] = None  # Email password or app password
    smtp_from_email: Optional[str] = None  # From address for emails
    smtp_from_name: str = "VC × Startup Matching"
    smtp_use_tls: bool = True
    frontend_url: str = "http://localhost:3000"  # Frontend URL for email links
    
    # CORS Configuration
    cors_origins: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]  # Allowed CORS origins
    
    # Token expiration
    password_reset_token_expire_hours: int = 24  # Password reset tokens valid for 24 hours
    email_verification_token_expire_hours: int = 48  # Email verification tokens valid for 48 hours
    
    # File Storage Configuration (MinIO or S3)
    storage_type: str = "minio"  # "minio" or "s3"
    # MinIO Configuration
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_use_ssl: bool = False
    minio_bucket: str = "vc-matcher"
    # AWS S3 Configuration (Alternative)
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_s3_bucket: Optional[str] = None
    aws_region: str = "us-east-1"
    aws_endpoint_url: Optional[str] = None  # Custom endpoint for S3-compatible services (e.g., DigitalOcean Spaces)
    # File Upload Limits
    max_file_size_mb: int = 10  # Maximum file size in MB
    allowed_image_types: List[str] = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
    allowed_document_types: List[str] = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
    signed_url_expire_seconds: int = 3600  # Signed URLs expire in 1 hour


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

