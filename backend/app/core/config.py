from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the FastAPI backend."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "VC × Startup Matching API"
    version: str = "0.1.0"
    api_prefix: str = "/api"
    allowed_hosts: List[str] = ["*"]

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/vc_matcher"
    redis_url: str = "redis://localhost:6379/0"

    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

