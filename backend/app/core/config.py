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
    plaid_client_id: Optional[str] = None
    plaid_secret: Optional[str] = None
    plaid_environment: str = "sandbox"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

