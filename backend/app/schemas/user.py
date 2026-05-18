"""
GoalFlow — User Schemas
Pydantic models for user CRUD, auth, and token responses.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# ─── Auth ─────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class RefreshRequest(BaseModel):
    refresh_token: str


# ─── User CRUD ────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(..., pattern="^(employee|manager|admin)$")
    manager_id: Optional[str] = None
    department: Optional[str] = Field(None, max_length=100)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    role: Optional[str] = Field(None, pattern="^(employee|manager|admin)$")
    manager_id: Optional[str] = None
    department: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    manager_id: Optional[str] = None
    department: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserBrief(BaseModel):
    """Lightweight user reference for embedding in other responses."""
    id: str
    name: str
    email: str
    role: str
    department: Optional[str] = None

    model_config = {"from_attributes": True}


# Resolve forward reference
TokenResponse.model_rebuild()
