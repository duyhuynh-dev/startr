from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


Role = Literal["investor", "founder"]


class PromptResponse(BaseModel):
    prompt_id: str
    content: str = Field(..., max_length=2000)


class PhotoItem(BaseModel):
    url: str
    caption: str | None = None
    prompt_id: str | None = None


class Dealbreakers(BaseModel):
    min_check_size: int | None = None
    max_check_size: int | None = None
    required_sectors: List[str] = Field(default_factory=list)
    required_stages: List[str] = Field(default_factory=list)
    required_locations: List[str] = Field(default_factory=list)
    min_revenue: float | None = None
    min_team_size: int | None = None


class VerificationStatus(BaseModel):
    soft_verified: bool = False
    manual_reviewed: bool = False
    accreditation_attested: bool = False
    badges: List[str] = Field(default_factory=list)


class FinancialHealth(BaseModel):
    """Inferred financial health from enrichment (runway, funding velocity)."""
    estimated_runway_months: Optional[float] = None
    funding_velocity: Optional[str] = None  # e.g. "Strong", "Moderate"


class MarketIntelligence(BaseModel):
    """Market & Niche Intelligence layer (AI-enriched, verifiable)."""
    financial_health: Optional[FinancialHealth] = None
    market_sentiment: Optional[str] = None  # e.g. "Bullish", "Mixed"
    niche_moat: Optional[str] = None        # One-sentence reasoning trace
    competitor_gap: List[str] = Field(default_factory=list)
    sources: List[str] = Field(default_factory=list)  # URLs for verifiability


class BaseProfile(BaseModel):
    id: str
    role: Role
    full_name: str
    email: str  # Using str instead of EmailStr to allow test domains like .test
    headline: str | None = None
    avatar_url: str | None = None
    location: str | None = None
    prompts: List[PromptResponse] = Field(default_factory=list)
    photos: List[PhotoItem] = Field(default_factory=list, description="Photo gallery with captions")
    extra_metadata: dict | None = None
    dealbreakers: Dealbreakers = Field(default_factory=Dealbreakers)
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
    financial_health: Optional[dict] = None
    market_sentiment: Optional[str] = None
    niche_moat: Optional[str] = None
    competitor_gap: List[str] = Field(default_factory=list)
    intelligence_sources: List[str] = Field(default_factory=list, description="URLs used for enrichment (verifiability)")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_active_at: Optional[str] = Field(None, description="ISO timestamp of last login/activity")

    @property
    def profile_completeness(self) -> float:
        """Calculate profile completeness percentage (0-100)"""
        total_fields = 0
        filled_fields = 0

        # Core fields (always count)
        core_fields = [
            self.full_name, self.email, self.headline, self.avatar_url,
            self.location, len(self.prompts) >= 3, len(self.photos) >= 3
        ]
        total_fields += len(core_fields)
        filled_fields += sum(1 for f in core_fields if f)

        # Role-specific fields
        if self.role == "investor":
            investor_fields = [
                self.firm, self.check_size_min, self.check_size_max,
                len(self.focus_sectors) > 0, len(self.focus_stages) > 0
            ]
            total_fields += len(investor_fields)
            filled_fields += sum(1 for f in investor_fields if f)
        else:  # founder
            founder_fields = [
                self.company_name, self.company_url, self.revenue_run_rate,
                self.team_size, self.runway_months, len(self.focus_markets) > 0
            ]
            total_fields += len(founder_fields)
            filled_fields += sum(1 for f in founder_fields if f)

        return round((filled_fields / total_fields) * 100, 1) if total_fields > 0 else 0.0


class ProfileCreate(BaseModel):
    role: Role
    full_name: str
    email: str  # Using str instead of EmailStr to allow test domains like .test
    headline: str | None = None
    avatar_url: str | None = None
    location: str | None = None
    prompts: List[PromptResponse] = Field(default_factory=list)
    photos: List[PhotoItem] = Field(default_factory=list)
    extra_metadata: dict | None = None
    dealbreakers: Dealbreakers | None = None
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
    photos: List[PhotoItem] | None = None
    extra_metadata: dict | None = None
    dealbreakers: Dealbreakers | None = None
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
    financial_health: Optional[dict] = None
    market_sentiment: Optional[str] = None
    niche_moat: Optional[str] = None
    competitor_gap: Optional[List[str]] = None
    intelligence_sources: Optional[List[str]] = None
    verification: VerificationStatus | None = None

