from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

Role = Literal["investor", "founder"]


class PromptTemplateBase(BaseModel):
    text: str = Field(..., max_length=500)
    role: Role
    category: Optional[str] = None
    display_order: int = Field(default=0, ge=0)
    is_active: bool = Field(default=True)


class PromptTemplateCreate(PromptTemplateBase):
    pass


class PromptTemplateUpdate(BaseModel):
    text: Optional[str] = Field(None, max_length=500)
    role: Optional[Role] = None
    category: Optional[str] = None
    display_order: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class PromptTemplateResponse(PromptTemplateBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

