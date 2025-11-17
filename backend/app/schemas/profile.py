from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field


Role = Literal["investor", "founder"]


class PromptResponse(BaseModel):
    prompt_id: str
    content: str = Field(..., max_length=2000)


class VerificationStatus(BaseModel):
    soft_verified: bool = False
    manual_reviewed: bool = False
    accreditation_attested: bool = False
    badges: List[str] = Field(default_factory=list)


class BaseProfile(BaseModel):
    id: str
    role: Role
    full_name: str
    email: EmailStr
    headline: str | None = None
    avatar_url: str | None = None
    location: str | None = None
    prompts: List[PromptResponse] = Field(default_factory=list)
    extra_metadata: dict | None = None
    verification: VerificationStatus = Field(default_factory=VerificationStatus)
    firm: str | None = None
    check_size_min: Optional[int] = None
    check_size_max: Optional[int] = None
    focus_sectors: List[str] = Field(default_factory=list)
    focus_stages: List[str] = Field(default_factory=list)
    accreditation_note: str | None = None
    company_name: str | None = None
    company_url: str | None = None
    revenue_run_rate: Optional[float] = None
    team_size: Optional[int] = None
    runway_months: Optional[int] = None
    focus_markets: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ProfileCreate(BaseModel):
    role: Role
    full_name: str
    email: EmailStr
    headline: str | None = None
    avatar_url: str | None = None
    location: str | None = None
    prompts: List[PromptResponse] = Field(default_factory=list)
    extra_metadata: dict | None = None
    firm: str | None = None
    check_size_min: Optional[int] = None
    check_size_max: Optional[int] = None
    focus_sectors: List[str] = Field(default_factory=list)
    focus_stages: List[str] = Field(default_factory=list)
    accreditation_note: str | None = None
    company_name: str | None = None
    company_url: str | None = None
    revenue_run_rate: Optional[float] = None
    team_size: Optional[int] = None
    runway_months: Optional[int] = None
    focus_markets: List[str] = Field(default_factory=list)
    verification: VerificationStatus | None = None


class ProfileUpdate(BaseModel):
    headline: str | None = None
    avatar_url: str | None = None
    location: str | None = None
    prompts: List[PromptResponse] | None = None
    extra_metadata: dict | None = None
    firm: str | None = None
    check_size_min: Optional[int] = None
    check_size_max: Optional[int] = None
    focus_sectors: List[str] | None = None
    focus_stages: List[str] | None = None
    accreditation_note: str | None = None
    company_name: str | None = None
    company_url: str | None = None
    revenue_run_rate: Optional[float] = None
    team_size: Optional[int] = None
    runway_months: Optional[int] = None
    focus_markets: List[str] | None = None
    verification: VerificationStatus | None = None

