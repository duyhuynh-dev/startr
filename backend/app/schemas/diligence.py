from datetime import datetime
from typing import List, Literal

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


class DiligenceSummary(BaseModel):
    profile_id: str
    score: float = Field(ge=0, le=100)
    metrics: List[Metric] = Field(default_factory=list)
    risks: List[RiskFlag] = Field(default_factory=list)
    narrative: str | None = None
    generated_at: datetime = Field(default_factory=datetime.utcnow)

