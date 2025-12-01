"""User authentication model."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel


class User(SQLModel, table=True):
    """User account for authentication.
    
    Users are linked 1:1 with Profile. A user must have a profile
    to use the platform (investor or founder profile).
    """
    __tablename__ = "users"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True, index=True)
    email: str = Field(unique=True, index=True)
    password_hash: str  # Hashed password (never store plaintext)
    
    # OAuth providers
    firebase_uid: Optional[str] = Field(default=None, index=True)  # Firebase Auth UID
    linkedin_id: Optional[str] = Field(default=None, index=True)  # LinkedIn OAuth ID
    google_id: Optional[str] = Field(default=None, index=True)  # Google OAuth ID
    
    # Profile relationship (1:1)
    profile_id: Optional[str] = Field(default=None, foreign_key="profiles.id", index=True)
    
    # Account status
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)  # Email verification
    is_admin: bool = Field(default=False)  # Admin access
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    
    # Optional: Relationship to Profile (if we want to use SQLModel relationships)
    # profile: Optional["Profile"] = Relationship(back_populates="user")



