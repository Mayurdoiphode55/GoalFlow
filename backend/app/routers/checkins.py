"""
GoalFlow — CheckIns Router
Quarterly check-in CRUD, manager comments, team view.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.core.dependencies import get_current_user, require_role
from app.schemas.checkin import (
    CheckInUpsert, CheckInBatchUpsert, CheckInResponse, ManagerCommentRequest,
)
from app.services import checkin_service

router = APIRouter()


@router.get("/goal/{goal_id}", response_model=list[CheckInResponse])
async def get_checkins_for_goal(
    goal_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all check-ins for a specific goal (all quarters)."""
    checkins = await checkin_service.get_checkins_for_goal(db, goal_id)
    return [CheckInResponse.model_validate(c) for c in checkins]


@router.get("/quarter/{quarter}")
async def get_checkins_for_quarter(
    quarter: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all check-ins for the current user's goals in a quarter."""
    return await checkin_service.get_checkins_for_quarter(db, current_user.id, quarter)


@router.post("", response_model=CheckInResponse)
async def upsert_checkin(
    data: CheckInUpsert,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or update a check-in (upsert by goal_id + quarter)."""
    admin_override = current_user.role == "admin"
    checkin = await checkin_service.upsert_checkin(db, data, current_user.id, admin_override)
    return CheckInResponse.model_validate(checkin)


@router.post("/batch", response_model=list[CheckInResponse])
async def batch_upsert_checkins(
    data: CheckInBatchUpsert,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Batch update multiple check-ins (Save All button)."""
    admin_override = current_user.role == "admin"
    results = []
    for ci_data in data.checkins:
        checkin = await checkin_service.upsert_checkin(db, ci_data, current_user.id, admin_override)
        results.append(CheckInResponse.model_validate(checkin))
    return results


@router.post("/{checkin_id}/manager-comment", response_model=CheckInResponse)
async def add_manager_comment(
    checkin_id: str,
    data: ManagerCommentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("manager", "admin")),
):
    """Manager adds a comment to a check-in."""
    checkin = await checkin_service.add_manager_comment(
        db, checkin_id, current_user.id, data.comment
    )
    return CheckInResponse.model_validate(checkin)


@router.get("/team/{quarter}")
async def get_team_checkins(
    quarter: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("manager", "admin")),
):
    """Manager: get all team check-ins for a quarter."""
    return await checkin_service.get_team_checkins(db, current_user.id, quarter)
