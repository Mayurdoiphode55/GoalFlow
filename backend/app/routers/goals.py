"""
GoalFlow — Goals Router
CRUD for goal sheets and goals with full validation.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.core.dependencies import get_current_user, require_role
from app.schemas.goal import (
    GoalSheetCreate, GoalSheetResponse, GoalSheetReturnRequest,
    GoalCreate, GoalUpdate, GoalResponse, GoalReorderRequest,
)
from app.services import goal_service

router = APIRouter()


# ─── Goal Sheets ──────────────────────────────────────────────────────────

@router.get("/sheets/mine", response_model=GoalSheetResponse | None)
async def get_my_sheet(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's goal sheet for the active cycle."""
    sheet = await goal_service.get_my_goal_sheet(db, current_user.id)
    if not sheet:
        return None
    resp = GoalSheetResponse.model_validate(sheet)
    resp.employee_name = sheet.employee.name if sheet.employee else None
    resp.employee_department = sheet.employee.department if sheet.employee else None
    resp.total_weightage = sum(g.weightage for g in sheet.goals)
    return resp


@router.get("/sheets/team", response_model=list[GoalSheetResponse])
async def get_team_sheets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("manager", "admin")),
):
    """Manager: get all team goal sheets for the active cycle."""
    sheets = await goal_service.get_team_goal_sheets(db, current_user.id)
    results = []
    for sheet in sheets:
        resp = GoalSheetResponse.model_validate(sheet)
        resp.employee_name = sheet.employee.name if sheet.employee else None
        resp.employee_department = sheet.employee.department if sheet.employee else None
        resp.total_weightage = sum(g.weightage for g in sheet.goals)
        results.append(resp)
    return results


@router.get("/sheets/{sheet_id}", response_model=GoalSheetResponse)
async def get_sheet_detail(
    sheet_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get goal sheet detail by ID."""
    sheet = await goal_service.get_goal_sheet_by_id(db, sheet_id)
    resp = GoalSheetResponse.model_validate(sheet)
    resp.employee_name = sheet.employee.name if sheet.employee else None
    resp.employee_department = sheet.employee.department if sheet.employee else None
    resp.total_weightage = sum(g.weightage for g in sheet.goals)
    return resp


@router.post("/sheets", response_model=GoalSheetResponse)
async def create_sheet(
    data: GoalSheetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new goal sheet for the current user."""
    sheet = await goal_service.create_goal_sheet(db, current_user.id, data.cycle_id)
    return GoalSheetResponse.model_validate(sheet)


@router.post("/sheets/{sheet_id}/submit", response_model=GoalSheetResponse)
async def submit_sheet(
    sheet_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit goal sheet for manager approval."""
    sheet = await goal_service.submit_goal_sheet(db, sheet_id, current_user.id)
    return GoalSheetResponse.model_validate(sheet)


@router.post("/sheets/{sheet_id}/approve", response_model=GoalSheetResponse)
async def approve_sheet(
    sheet_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("manager", "admin")),
):
    """Manager approves a submitted goal sheet."""
    sheet = await goal_service.approve_goal_sheet(db, sheet_id, current_user.id)
    return GoalSheetResponse.model_validate(sheet)


@router.post("/sheets/{sheet_id}/return", response_model=GoalSheetResponse)
async def return_sheet(
    sheet_id: str, data: GoalSheetReturnRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("manager", "admin")),
):
    """Manager returns a goal sheet for rework."""
    sheet = await goal_service.return_goal_sheet(db, sheet_id, current_user.id, data)
    return GoalSheetResponse.model_validate(sheet)


@router.post("/sheets/{sheet_id}/unlock", response_model=GoalSheetResponse)
async def unlock_sheet(
    sheet_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin unlocks a locked goal sheet."""
    sheet = await goal_service.unlock_goal_sheet(db, sheet_id, current_user.id)
    return GoalSheetResponse.model_validate(sheet)


# ─── Goals ────────────────────────────────────────────────────────────────

@router.get("", response_model=list[GoalResponse])
async def list_goals(
    sheet_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List goals for a specific goal sheet."""
    goals = await goal_service.get_goals_for_sheet(db, sheet_id)
    return [GoalResponse.model_validate(g) for g in goals]


@router.post("", response_model=GoalResponse)
async def create_goal(
    data: GoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new goal with validation."""
    goal = await goal_service.create_goal(db, data, current_user.id)
    return GoalResponse.model_validate(goal)


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str, data: GoalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a goal (blocked if sheet locked unless admin)."""
    is_admin = current_user.role == "admin"
    goal = await goal_service.update_goal(db, goal_id, data, current_user.id, is_admin)
    return GoalResponse.model_validate(goal)


@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a goal (blocked if sheet locked)."""
    await goal_service.delete_goal(db, goal_id, current_user.id)
    return {"message": "Goal deleted"}


@router.post("/reorder", response_model=list[GoalResponse])
async def reorder_goals(
    data: GoalReorderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reorder goals for drag-and-drop."""
    goals = await goal_service.reorder_goals(db, data.goal_ids)
    return [GoalResponse.model_validate(g) for g in goals]
