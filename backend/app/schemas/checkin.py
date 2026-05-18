"""
GoalFlow — CheckIn Schemas
Pydantic models for quarterly check-ins.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


class CheckInUpsert(BaseModel):
    """Create or update a check-in (upsert by goal_id + quarter)."""
    goal_id: str
    quarter: str = Field(..., pattern="^(Q1|Q2|Q3|Q4)$")
    actual_value: Optional[Decimal] = Field(None, ge=0)
    actual_date: Optional[date] = None
    status: str = Field(..., pattern="^(not_started|on_track|completed)$")
    employee_notes: Optional[str] = Field(None, max_length=2000)


class CheckInBatchUpsert(BaseModel):
    """Batch update multiple check-ins at once (Save All button)."""
    checkins: list[CheckInUpsert]


class ManagerCommentRequest(BaseModel):
    comment: str = Field(..., min_length=1, max_length=2000)


class CheckInResponse(BaseModel):
    id: str
    goal_id: str
    quarter: str
    actual_value: Optional[Decimal] = None
    actual_date: Optional[date] = None
    status: str
    computed_score: Optional[Decimal] = None
    employee_notes: Optional[str] = None
    manager_comment: Optional[str] = None
    manager_comment_by: Optional[str] = None
    manager_comment_at: Optional[datetime] = None
    employee_updated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Enriched fields for display
    goal_title: Optional[str] = None
    goal_uom_type: Optional[str] = None
    goal_target_value: Optional[Decimal] = None
    goal_target_date: Optional[date] = None
    goal_weightage: Optional[Decimal] = None

    model_config = {"from_attributes": True}


class TeamCheckInResponse(BaseModel):
    """Check-in data for a team member, includes employee info."""
    employee_id: str
    employee_name: str
    employee_department: Optional[str] = None
    checkins: list[CheckInResponse] = []
    overall_score: Optional[Decimal] = None
