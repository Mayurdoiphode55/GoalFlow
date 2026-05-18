"""
GoalFlow — Shared Goals Router
Create, list, and push shared goals to employees.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.core.dependencies import require_role
from app.schemas.goal import SharedGoalCreate, SharedGoalResponse, SharedGoalPushRequest
from app.services import goal_service

router = APIRouter()


@router.get("", response_model=list[SharedGoalResponse])
async def list_shared_goals(
    cycle_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "manager")),
):
    """List shared goals for the current (or specified) cycle."""
    goals = await goal_service.get_shared_goals(db, cycle_id)
    return [SharedGoalResponse.model_validate(g) for g in goals]


@router.post("", response_model=SharedGoalResponse)
async def create_shared_goal(
    data: SharedGoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "manager")),
):
    """Create a new shared goal template."""
    goal = await goal_service.create_shared_goal(db, data, current_user.id)
    return SharedGoalResponse.model_validate(goal)


@router.post("/{shared_goal_id}/push")
async def push_shared_goal(
    shared_goal_id: str,
    data: SharedGoalPushRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "manager")),
):
    """Push a shared goal to target employees."""
    count = await goal_service.push_shared_goal(db, shared_goal_id, data)
    return {"message": f"Shared goal pushed to {count} employee(s)", "count": count}
