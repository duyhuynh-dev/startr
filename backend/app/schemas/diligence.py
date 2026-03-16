from datetime import datetime
from typing import List, Literal, Optional, Dict, Any

from pydantic import BaseModel, Field


class Metric(BaseModel):
    name: str
    value: str | float | int
    trend: Literal["up", "flat", "down"] = "flat"
    confidence: float = Field(ge=0, le=1, default=0.7)


class RiskFlag(BaseModel):
    code: str
    severity: Literal["low", "medium", "high"]
    description: str


class ExternalDataSource(BaseModel):
    """Summary of data from an external source."""
    source: str
    status: str
    data: Dict[str, Any] = Field(default_factory=dict)


class DiligenceSummary(BaseModel):
    profile_id: str
    score: float = Field(ge=0, le=100)
    metrics: List[Metric] = Field(default_factory=list)
    risks: List[RiskFlag] = Field(default_factory=list)
    narrative: str | None = None
    strengths: List[str] = Field(default_factory=list, description="LLM-generated strengths / what's good about the company")
    concerns: List[str] = Field(default_factory=list, description="LLM-generated concerns / what's bad or risky")
    sources_used: List[str] = Field(default_factory=list)
    external_data: Optional[Dict[str, Any]] = None
    generated_at: datetime = Field(default_factory=datetime.utcnow)

