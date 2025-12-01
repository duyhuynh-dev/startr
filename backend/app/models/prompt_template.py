from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class PromptTemplate(SQLModel, table=True):
    __tablename__ = "prompt_templates"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    text: str = Field(index=True)
    role: str = Field(index=True)  # "investor" or "founder"
    category: Optional[str] = None  # e.g., "mission", "traction", "preferences"
    display_order: int = Field(default=0, index=True)
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

