"""
GoalFlow — Analytics Schemas
Pydantic models for analytics and dashboard data.
"""

from pydantic import BaseModel
from typing import Optional
from decimal import Decimal


class QoQTrendPoint(BaseModel):
    quarter: str
    avg_score: Decimal
    employee_score: Optional[Decimal] = None
    team_avg: Optional[Decimal] = None
    org_avg: Optional[Decimal] = None


class QoQTrendResponse(BaseModel):
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    cycle_id: str
    data_points: list[QoQTrendPoint]


class HeatmapCell(BaseModel):
    department: str
    quarter: str
    completion_pct: Decimal


class HeatmapResponse(BaseModel):
    cycle_id: str
    departments: list[str]
    quarters: list[str]
    data: list[HeatmapCell]


class ThrustDistributionItem(BaseModel):
    thrust_area: str
    count: int
    percentage: Decimal


class ThrustDistributionResponse(BaseModel):
    cycle_id: str
    by_thrust_area: list[ThrustDistributionItem]
    by_uom_type: list[ThrustDistributionItem]
    by_status: list[ThrustDistributionItem]


class ManagerEffectivenessRow(BaseModel):
    manager_id: str
    manager_name: str
    team_size: int
    checkin_completion_pct: Decimal
    avg_approval_days: Optional[Decimal] = None
    team_avg_score: Optional[Decimal] = None
    effectiveness_score: Optional[Decimal] = None


class ManagerEffectivenessResponse(BaseModel):
    cycle_id: str
    managers: list[ManagerEffectivenessRow]


class TeamOverviewMember(BaseModel):
    employee_id: str
    employee_name: str
    department: Optional[str] = None
    goal_sheet_status: Optional[str] = None
    goals_count: int = 0
    q1_score: Optional[Decimal] = None
    q2_score: Optional[Decimal] = None
    q3_score: Optional[Decimal] = None
    q4_score: Optional[Decimal] = None
    overall_score: Optional[Decimal] = None


class TeamOverviewResponse(BaseModel):
    manager_id: str
    cycle_id: str
    team_members: list[TeamOverviewMember]
    team_avg_score: Optional[Decimal] = None


class CompletionDashboardStats(BaseModel):
    total_employees: int
    goal_sheets_submitted: int
    goal_sheets_approved: int
    checkins_done: int
    departments: list["DepartmentCompletion"]


class DepartmentCompletion(BaseModel):
    department: str
    total_employees: int
    sheets_submitted: int
    sheets_approved: int
    checkins_done: int
    completion_pct: Decimal


# Resolve forward references
CompletionDashboardStats.model_rebuild()
