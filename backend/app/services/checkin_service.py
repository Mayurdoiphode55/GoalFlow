"""
GoalFlow — CheckIn Service
Quarter window enforcement, score computation, shared goal sync.
"""

from datetime import datetime, date
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.checkin import CheckIn
from app.models.goal import Goal
from app.models.user import User
from app.core.exceptions import (
    NotFoundException, BadRequestException, ValidationException, ForbiddenException,
)
from app.schemas.checkin import CheckInUpsert
from app.services.audit_service import log_audit


# ─── Quarter Window Config ───────────────────────────────────────────────

QUARTER_WINDOWS = {
    "Q1": [7],           # July
    "Q2": [10],          # October
    "Q3": [1],           # January
    "Q4": [3, 4],        # March + April
}
GOAL_SETTING_MONTHS = [5]  # May


def is_quarter_window_open(quarter: str) -> bool:
    """Check if the current month falls in the allowed window for the quarter."""
    current_month = datetime.utcnow().month
    allowed_months = QUARTER_WINDOWS.get(quarter, [])
    return current_month in allowed_months


def get_current_open_quarter() -> str | None:
    """Return which quarter's window is currently open, or None."""
    current_month = datetime.utcnow().month
    for q, months in QUARTER_WINDOWS.items():
        if current_month in months:
            return q
    return None


# ─── Score Computation ───────────────────────────────────────────────────

def compute_score(
    uom_type: str,
    target_value: Decimal | None,
    actual_value: Decimal | None,
    target_date: date | None,
    actual_date: date | None,
) -> Decimal | None:
    """
    Compute achievement score based on UoM type.
    Returns score 0-150 (capped), or None if insufficient data.
    """
    if uom_type in ("numeric_min", "percentage_min"):
        # Higher is better
        if target_value and actual_value is not None:
            if target_value == 0:
                return Decimal("150.00")
            score = (actual_value / target_value) * 100
            return min(score, Decimal("150.00")).quantize(Decimal("0.01"))
    elif uom_type in ("numeric_max", "percentage_max"):
        # Lower is better
        if target_value is not None and actual_value is not None:
            if actual_value == 0:
                return Decimal("150.00")
            score = (target_value / actual_value) * 100
            return min(score, Decimal("150.00")).quantize(Decimal("0.01"))
    elif uom_type == "timeline":
        if target_date and actual_date:
            if actual_date <= target_date:
                days_early = (target_date - actual_date).days
                score = Decimal("100") + Decimal(str(days_early)) * Decimal("0.5")
                return min(score, Decimal("120.00")).quantize(Decimal("0.01"))
            else:
                days_late = (actual_date - target_date).days
                score = Decimal("100") - Decimal(str(days_late)) * Decimal("2")
                return max(score, Decimal("0.00")).quantize(Decimal("0.01"))
    elif uom_type == "zero_based":
        if actual_value is not None:
            return Decimal("100.00") if actual_value == 0 else Decimal("0.00")
    return None


# ─── CheckIn CRUD ────────────────────────────────────────────────────────

async def get_checkins_for_goal(db: AsyncSession, goal_id: str) -> list[CheckIn]:
    result = await db.execute(
        select(CheckIn).where(CheckIn.goal_id == goal_id)
        .order_by(CheckIn.quarter)
    )
    return list(result.scalars().all())


async def get_checkins_for_quarter(
    db: AsyncSession, user_id: str, quarter: str
) -> list[dict]:
    """Get all check-ins for a user's goals in a specific quarter, enriched with goal info."""
    from app.models.goal import GoalSheet
    
    sheets = await db.execute(
        select(GoalSheet).where(GoalSheet.employee_id == user_id)
    )
    sheet_ids = [s.id for s in sheets.scalars().all()]
    if not sheet_ids:
        return []

    goals_result = await db.execute(
        select(Goal).where(Goal.goal_sheet_id.in_(sheet_ids))
    )
    goals = {g.id: g for g in goals_result.scalars().all()}

    checkins_result = await db.execute(
        select(CheckIn).where(
            CheckIn.goal_id.in_(list(goals.keys())),
            CheckIn.quarter == quarter,
        )
    )
    checkins = checkins_result.scalars().all()

    result = []
    for goal_id, goal in goals.items():
        ci = next((c for c in checkins if c.goal_id == goal_id), None)
        result.append({
            "goal_id": goal_id,
            "goal_title": goal.title,
            "goal_uom_type": goal.uom_type,
            "goal_target_value": goal.target_value,
            "goal_target_date": goal.target_date,
            "goal_weightage": goal.weightage,
            "checkin": ci,
        })
    return result


async def upsert_checkin(
    db: AsyncSession, data: CheckInUpsert, user_id: str, admin_override: bool = False,
) -> CheckIn:
    """Create or update a check-in (upsert by goal_id + quarter)."""
    # Verify goal exists and belongs to user
    goal_result = await db.execute(
        select(Goal).options(selectinload(Goal.goal_sheet)).where(Goal.id == data.goal_id)
    )
    goal = goal_result.scalar_one_or_none()
    if not goal:
        raise NotFoundException("Goal not found")

    if goal.goal_sheet.employee_id != user_id and not admin_override:
        raise ForbiddenException("You can only update check-ins for your own goals")

    # Quarter window enforcement
    if not admin_override and not is_quarter_window_open(data.quarter):
        raise BadRequestException(
            f"Check-in window for {data.quarter} is not currently open"
        )

    # Validation: completed status requires actual_value
    if data.status == "completed":
        if goal.uom_type == "timeline" and not data.actual_date:
            raise ValidationException("Completed timeline goals require an actual_date")
        elif goal.uom_type != "timeline" and data.actual_value is None:
            raise ValidationException("Completed goals require an actual_value")

    # Compute score
    score = compute_score(
        goal.uom_type, goal.target_value, data.actual_value,
        goal.target_date, data.actual_date,
    )

    # Upsert
    existing = await db.execute(
        select(CheckIn).where(
            CheckIn.goal_id == data.goal_id,
            CheckIn.quarter == data.quarter,
        )
    )
    checkin = existing.scalar_one_or_none()

    if checkin:
        old_vals = {
            "actual_value": [str(checkin.actual_value), str(data.actual_value)],
            "status": [checkin.status, data.status],
        }
        checkin.actual_value = data.actual_value
        checkin.actual_date = data.actual_date
        checkin.status = data.status
        checkin.computed_score = score
        checkin.employee_notes = data.employee_notes
        checkin.employee_updated_at = datetime.utcnow()
        checkin.updated_at = datetime.utcnow()
        await log_audit(db, "checkin", checkin.id, "updated", user_id, old_vals)
    else:
        checkin = CheckIn(
            goal_id=data.goal_id,
            quarter=data.quarter,
            actual_value=data.actual_value,
            actual_date=data.actual_date,
            status=data.status,
            computed_score=score,
            employee_notes=data.employee_notes,
            employee_updated_at=datetime.utcnow(),
        )
        db.add(checkin)
        await log_audit(db, "checkin", checkin.id, "created", user_id, {})

    await db.flush()
    await db.refresh(checkin)

    # Shared goal sync
    if goal.is_shared and goal.shared_goal_id:
        await sync_shared_checkin(db, goal, checkin, data)

    return checkin


async def sync_shared_checkin(
    db: AsyncSession, source_goal: Goal, source_checkin: CheckIn,
    data: CheckInUpsert,
) -> None:
    """Sync check-in data across all linked shared goals."""
    linked = await db.execute(
        select(Goal).where(
            Goal.shared_goal_id == source_goal.shared_goal_id,
            Goal.id != source_goal.id,
        )
    )
    for linked_goal in linked.scalars().all():
        existing = await db.execute(
            select(CheckIn).where(
                CheckIn.goal_id == linked_goal.id,
                CheckIn.quarter == data.quarter,
            )
        )
        linked_ci = existing.scalar_one_or_none()
        score = compute_score(
            linked_goal.uom_type, linked_goal.target_value,
            data.actual_value, linked_goal.target_date, data.actual_date,
        )
        if linked_ci:
            linked_ci.actual_value = data.actual_value
            linked_ci.actual_date = data.actual_date
            linked_ci.computed_score = score
            linked_ci.updated_at = datetime.utcnow()
        else:
            new_ci = CheckIn(
                goal_id=linked_goal.id, quarter=data.quarter,
                actual_value=data.actual_value, actual_date=data.actual_date,
                status=data.status, computed_score=score,
            )
            db.add(new_ci)
    await db.flush()


async def add_manager_comment(
    db: AsyncSession, checkin_id: str, manager_id: str, comment: str,
) -> CheckIn:
    result = await db.execute(select(CheckIn).where(CheckIn.id == checkin_id))
    checkin = result.scalar_one_or_none()
    if not checkin:
        raise NotFoundException("Check-in not found")

    checkin.manager_comment = comment
    checkin.manager_comment_by = manager_id
    checkin.manager_comment_at = datetime.utcnow()
    checkin.updated_at = datetime.utcnow()

    await log_audit(db, "checkin", checkin.id, "manager_commented", manager_id, {
        "comment": comment,
    })
    await db.flush()
    await db.refresh(checkin)
    return checkin


async def get_team_checkins(
    db: AsyncSession, manager_id: str, quarter: str,
) -> list[dict]:
    """Get all team members' check-ins for a quarter."""
    team_result = await db.execute(
        select(User).where(User.manager_id == manager_id, User.is_active == True)
    )
    team = team_result.scalars().all()

    results = []
    for member in team:
        member_checkins = await get_checkins_for_quarter(db, member.id, quarter)
        total_score = Decimal("0")
        total_weight = Decimal("0")
        for item in member_checkins:
            ci = item.get("checkin")
            if ci and ci.computed_score is not None:
                w = item["goal_weightage"] or Decimal("0")
                total_score += ci.computed_score * w / 100
                total_weight += w

        results.append({
            "employee_id": member.id,
            "employee_name": member.name,
            "employee_department": member.department,
            "checkins": member_checkins,
            "overall_score": (total_score).quantize(Decimal("0.01")) if total_weight > 0 else None,
        })
    return results
