"""
GoalFlow — Audit Schemas
Pydantic models for audit log responses and queries.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AuditLogResponse(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    action: str
    changed_by: str
    changed_by_name: Optional[str] = None
    change_details: Optional[dict] = None
    timestamp: datetime

    model_config = {"from_attributes": True}


class AuditLogQuery(BaseModel):
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    changed_by: Optional[str] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    page: int = Field(1, ge=1)
    per_page: int = Field(20, ge=1, le=100)


class AuditLogPage(BaseModel):
    items: list[AuditLogResponse]
    total: int
    page: int
    per_page: int
    pages: int
