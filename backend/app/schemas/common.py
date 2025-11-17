from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class APIResponse(BaseModel):
    status: Literal["success", "error"] = "success"
    timestamp: datetime = Field(default_factory=datetime.utcnow)

