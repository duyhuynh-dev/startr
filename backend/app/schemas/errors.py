"""Error response schemas."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """Detailed error information."""
    field: Optional[str] = None
    message: str
    code: Optional[str] = None


class ErrorResponse(BaseModel):
    """Standard error response format."""
    error: str = Field(..., description="Error message")
    code: Optional[str] = Field(None, description="Error code")
    status_code: int = Field(..., description="HTTP status code")
    details: List[ErrorDetail] = Field(default_factory=list, description="Detailed error information")
    timestamp: Optional[str] = None


class ValidationErrorResponse(BaseModel):
    """Validation error response (for Pydantic validation errors)."""
    error: str = "Validation Error"
    status_code: int = 422
    details: List[ErrorDetail] = Field(..., description="Validation error details")

