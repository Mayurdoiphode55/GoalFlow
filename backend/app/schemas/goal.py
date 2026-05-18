"""
GoalFlow — Goal Schemas
Pydantic models for Cycle, GoalSheet, Goal, SharedGoal.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


# ─── Cycle ────────────────────────────────────────────────────────────────

class CycleCreate(BaseModel):
    year: int = Field(..., ge=2020, le=2100)
    name: Optional[str] = Field(None, max_length=100)
    goal_setting_opens: Optional[date] = None


class CycleUpdate(BaseModel):
    year: Optional[int] = Field(None, ge=2020, le=2100)
    name: Optional[str] = Field(None, max_length=100)
    goal_setting_opens: Optional[date] = None


class CycleResponse(BaseModel):
    id: str
    year: int
    name: Optional[str] = None
    goal_setting_opens: Optional[date] = None
    is_active: bool
    created_by: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── GoalSheet ────────────────────────────────────────────────────────────

class GoalSheetCreate(BaseModel):
    cycle_id: Optional[str] = None  # If None, uses active cycle


class GoalSheetResponse(BaseModel):
    id: str
    employee_id: str
    cycle_id: str
    status: str
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    return_reason: Optional[str] = None
    is_locked: bool
    created_at: datetime
    updated_at: datetime
    goals: list["GoalResponse"] = []
    employee_name: Optional[str] = None
    employee_department: Optional[str] = None
    total_weightage: Optional[Decimal] = None

    model_config = {"from_attributes": True}


class GoalSheetReturnRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=2000)


# ─── Goal ─────────────────────────────────────────────────────────────────

class GoalCreate(BaseModel):
    goal_sheet_id: str
    thrust_area: str = Field(..., min_length=1, max_length=255)
    title: str = Field(..., min_length=3, max_length=500)
    description: Optional[str] = Field(None, max_length=1000)
    uom_type: str = Field(
        ...,
        pattern="^(numeric_min|numeric_max|percentage_min|percentage_max|timeline|zero_based)$"
    )
    target_value: Optional[Decimal] = None
    target_date: Optional[date] = None
    weightage: Decimal = Field(..., ge=10, le=90)


class GoalUpdate(BaseModel):
    thrust_area: Optional[str] = Field(None, min_length=1, max_length=255)
    title: Optional[str] = Field(None, min_length=3, max_length=500)
    description: Optional[str] = Field(None, max_length=1000)
    uom_type: Optional[str] = Field(
        None,
        pattern="^(numeric_min|numeric_max|percentage_min|percentage_max|timeline|zero_based)$"
    )
    target_value: Optional[Decimal] = None
    target_date: Optional[date] = None
    weightage: Optional[Decimal] = Field(None, ge=10, le=90)


class GoalResponse(BaseModel):
    id: str
    goal_sheet_id: str
    thrust_area: str
    title: str
    description: Optional[str] = None
    uom_type: str
    target_value: Optional[Decimal] = None
    target_date: Optional[date] = None
    weightage: Decimal
    is_shared: bool
    shared_goal_id: Optional[str] = None
    display_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GoalReorderRequest(BaseModel):
    """List of goal IDs in desired display order."""
    goal_ids: list[str]


# ─── SharedGoal ───────────────────────────────────────────────────────────

class SharedGoalCreate(BaseModel):
    thrust_area: str = Field(..., min_length=1, max_length=255)
    title: str = Field(..., min_length=3, max_length=500)
    description: Optional[str] = Field(None, max_length=1000)
    uom_type: str = Field(
        ...,
        pattern="^(numeric_min|numeric_max|percentage_min|percentage_max|timeline|zero_based)$"
    )
    target_value: Optional[Decimal] = None
    target_date: Optional[date] = None
    target_department: Optional[str] = Field(None, max_length=100)


class SharedGoalResponse(BaseModel):
    id: str
    cycle_id: str
    created_by: str
    thrust_area: str
    title: str
    description: Optional[str] = None
    uom_type: str
    target_value: Optional[Decimal] = None
    target_date: Optional[date] = None
    target_department: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SharedGoalPushRequest(BaseModel):
    employee_ids: Optional[list[str]] = None
    department: Optional[str] = None


# Resolve forward references
GoalSheetResponse.model_rebuild()
