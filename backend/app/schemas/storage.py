"""Schemas for file storage and upload."""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class FileUploadResponse(BaseModel):
    """Response after file upload."""
    file_url: str
    file_path: str
    file_size: int
    content_type: str
    metadata: Optional[dict] = None


class SignedUrlRequest(BaseModel):
    """Request for signed URL generation."""
    file_path: str
    expires_in_seconds: Optional[int] = Field(None, ge=60, le=604800, description="Expiration time in seconds (60 to 604800)")


class SignedUrlResponse(BaseModel):
    """Response with signed URL."""
    signed_url: str
    expires_in_seconds: int


class FileDeleteResponse(BaseModel):
    """Response after file deletion."""
    message: str
    file_path: str

