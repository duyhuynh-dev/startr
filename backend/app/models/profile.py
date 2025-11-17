from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


class Profile(SQLModel, table=True):
    __tablename__ = "profiles"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    role: str = Field(index=True)
    full_name: str
    email: str = Field(index=True)
    headline: Optional[str] = None
    avatar_url: Optional[str] = None
    location: Optional[str] = None
    prompts: List[dict] = Field(default_factory=list, sa_column=Column(JSON, nullable=False, default=list))
    extra_metadata: dict | None = Field(default=None, sa_column=Column(JSON))

    firm: Optional[str] = None
    check_size_min: Optional[int] = None
    check_size_max: Optional[int] = None
    focus_sectors: List[str] = Field(default_factory=list, sa_column=Column(JSON, nullable=False, default=list))
    focus_stages: List[str] = Field(default_factory=list, sa_column=Column(JSON, nullable=False, default=list))
    accreditation_note: Optional[str] = None

    company_name: Optional[str] = None
    company_url: Optional[str] = None
    revenue_run_rate: Optional[float] = None
    team_size: Optional[int] = None
    runway_months: Optional[int] = None
    focus_markets: List[str] = Field(default_factory=list, sa_column=Column(JSON, nullable=False, default=list))

    verification: dict = Field(
        default_factory=lambda: {
            "soft_verified": False,
            "manual_reviewed": False,
            "accreditation_attested": False,
            "badges": [],
        },
        sa_column=Column(JSON, nullable=False),
    )

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

