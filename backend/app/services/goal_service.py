"""
GoalFlow — Goal Service
Business logic for cycles, goal sheets, goals, and shared goals.
Enforces all validation rules from the prompt.
"""

from decimal import Decimal
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm import selectinload

from app.models.goal import Cycle, GoalSheet, Goal, SharedGoal
from app.models.user import User
from app.core.exceptions import (
    NotFoundException, ForbiddenException, ValidationException,
    ConflictException, BadRequestException,
)
from app.schemas.goal import (
    CycleCreate, CycleUpdate, GoalCreate, GoalUpdate,
    SharedGoalCreate, SharedGoalPushRequest, GoalSheetReturnRequest,
)
from app.services.audit_service import log_audit


# ─── Cycle Management ────────────────────────────────────────────────────

async def get_cycles(db: AsyncSession) -> list[Cycle]:
    result = await db.execute(select(Cycle).order_by(Cycle.year.desc()))
    return list(result.scalars().all())


async def get_active_cycle(db: AsyncSession) -> Cycle | None:
    result = await db.execute(select(Cycle).where(Cycle.is_active == True))
    return result.scalar_one_or_none()


async def create_cycle(db: AsyncSession, data: CycleCreate, user_id: str) -> Cycle:
    cycle = Cycle(
        year=data.year,
        name=data.name or f"FY {data.year}-{str(data.year + 1)[-2:]}",
        goal_setting_opens=data.goal_setting_opens,
        created_by=user_id,
    )
    db.add(cycle)
    await db.flush()
    await db.refresh(cycle)
    return cycle


async def update_cycle(db: AsyncSession, cycle_id: str, data: CycleUpdate) -> Cycle:
    result = await db.execute(select(Cycle).where(Cycle.id == cycle_id))
    cycle = result.scalar_one_or_none()
    if not cycle:
        raise NotFoundException("Cycle not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cycle, field, value)

    await db.flush()
    await db.refresh(cycle)
    return cycle


async def activate_cycle(db: AsyncSession, cycle_id: str) -> Cycle:
    """Activate a cycle and deactivate all others."""
    # Deactivate all
    await db.execute(update(Cycle).values(is_active=False))

    # Activate target
    result = await db.execute(select(Cycle).where(Cycle.id == cycle_id))
    cycle = result.scalar_one_or_none()
    if not cycle:
        raise NotFoundException("Cycle not found")

    cycle.is_active = True
    await db.flush()
    await db.refresh(cycle)
    return cycle


# ─── Goal Sheet Management ───────────────────────────────────────────────

async def get_my_goal_sheet(db: AsyncSession, user_id: str) -> GoalSheet | None:
    """Get the current user's goal sheet for the active cycle."""
    cycle = await get_active_cycle(db)
    if not cycle:
        return None

    result = await db.execute(
        select(GoalSheet)
        .options(selectinload(GoalSheet.goals))
        .where(GoalSheet.employee_id == user_id, GoalSheet.cycle_id == cycle.id)
    )
    return result.scalar_one_or_none()


async def get_team_goal_sheets(db: AsyncSession, manager_id: str) -> list[GoalSheet]:
    """Get all goal sheets for a manager's direct reports in the active cycle."""
    cycle = await get_active_cycle(db)
    if not cycle:
        return []

    # Get direct reports
    team_result = await db.execute(
        select(User.id).where(User.manager_id == manager_id)
    )
    team_ids = [row[0] for row in team_result.all()]

    if not team_ids:
        return []

    result = await db.execute(
        select(GoalSheet)
        .options(selectinload(GoalSheet.goals), selectinload(GoalSheet.employee))
        .where(GoalSheet.employee_id.in_(team_ids), GoalSheet.cycle_id == cycle.id)
        .order_by(GoalSheet.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_goal_sheet_by_id(db: AsyncSession, sheet_id: str) -> GoalSheet:
    result = await db.execute(
        select(GoalSheet)
        .options(selectinload(GoalSheet.goals), selectinload(GoalSheet.employee))
        .where(GoalSheet.id == sheet_id)
    )
    sheet = result.scalar_one_or_none()
    if not sheet:
        raise NotFoundException("Goal sheet not found")
    return sheet


async def create_goal_sheet(db: AsyncSession, user_id: str, cycle_id: str | None = None) -> GoalSheet:
    """Create a new goal sheet for the user in the active (or specified) cycle."""
    if cycle_id:
        result = await db.execute(select(Cycle).where(Cycle.id == cycle_id))
        cycle = result.scalar_one_or_none()
    else:
        cycle = await get_active_cycle(db)

    if not cycle:
        raise NotFoundException("No active cycle found")

    # Check for existing sheet
    existing = await db.execute(
        select(GoalSheet).where(
            GoalSheet.employee_id == user_id,
            GoalSheet.cycle_id == cycle.id
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictException("Goal sheet already exists for this cycle")

    sheet = GoalSheet(employee_id=user_id, cycle_id=cycle.id)
    db.add(sheet)
    await db.flush()
    await db.refresh(sheet)
    return sheet


async def submit_goal_sheet(db: AsyncSession, sheet_id: str, user_id: str) -> GoalSheet:
    """Employee submits their goal sheet for manager approval."""
    sheet = await get_goal_sheet_by_id(db, sheet_id)

    if sheet.employee_id != user_id:
        raise ForbiddenException("You can only submit your own goal sheet")

    if sheet.status not in ("draft", "returned"):
        raise BadRequestException(f"Cannot submit a sheet with status '{sheet.status}'")

    # Validate goals
    goals = sheet.goals
    if not goals:
        raise ValidationException("Goal sheet must have at least 1 goal")

    total_weightage = sum(g.weightage for g in goals)
    if total_weightage != Decimal("100.00"):
        raise ValidationException(
            f"Total weightage must be exactly 100%. Current: {total_weightage}%"
        )

    sheet.status = "submitted"
    sheet.submitted_at = datetime.utcnow()
    sheet.return_reason = None

    await log_audit(db, "goal_sheet", sheet.id, "submitted", user_id, {})
    await db.flush()
    await db.refresh(sheet)
    return sheet


async def approve_goal_sheet(db: AsyncSession, sheet_id: str, approver_id: str) -> GoalSheet:
    """Manager approves a submitted goal sheet (locks it)."""
    sheet = await get_goal_sheet_by_id(db, sheet_id)

    if sheet.status != "submitted":
        raise BadRequestException("Can only approve a submitted goal sheet")

    sheet.status = "approved"
    sheet.approved_at = datetime.utcnow()
    sheet.approved_by = approver_id
    sheet.is_locked = True

    await log_audit(db, "goal_sheet", sheet.id, "approved", approver_id, {})
    await db.flush()
    await db.refresh(sheet)
    return sheet


async def return_goal_sheet(
    db: AsyncSession, sheet_id: str, returner_id: str, data: GoalSheetReturnRequest
) -> GoalSheet:
    """Manager returns a goal sheet for rework with a reason."""
    sheet = await get_goal_sheet_by_id(db, sheet_id)

    if sheet.status != "submitted":
        raise BadRequestException("Can only return a submitted goal sheet")

    sheet.status = "returned"
    sheet.return_reason = data.reason

    await log_audit(
        db, "goal_sheet", sheet.id, "returned", returner_id,
        {"reason": data.reason}
    )
    await db.flush()
    await db.refresh(sheet)
    return sheet


async def unlock_goal_sheet(db: AsyncSession, sheet_id: str, admin_id: str) -> GoalSheet:
    """Admin unlocks a locked goal sheet for editing."""
    sheet = await get_goal_sheet_by_id(db, sheet_id)

    if not sheet.is_locked:
        raise BadRequestException("Goal sheet is not locked")

    sheet.is_locked = False

    await log_audit(db, "goal_sheet", sheet.id, "unlocked", admin_id, {})
    await db.flush()
    await db.refresh(sheet)
    return sheet


# ─── Goal CRUD ────────────────────────────────────────────────────────────

async def get_goals_for_sheet(db: AsyncSession, sheet_id: str) -> list[Goal]:
    result = await db.execute(
        select(Goal)
        .where(Goal.goal_sheet_id == sheet_id)
        .order_by(Goal.display_order)
    )
    return list(result.scalars().all())


async def create_goal(db: AsyncSession, data: GoalCreate, user_id: str) -> Goal:
    """Create a goal with full validation."""
    sheet = await get_goal_sheet_by_id(db, data.goal_sheet_id)

    # Authorization
    if sheet.employee_id != user_id:
        raise ForbiddenException("You can only add goals to your own sheet")

    # Sheet status check
    if sheet.status not in ("draft", "returned"):
        raise BadRequestException("Cannot add goals to a submitted/approved sheet")

    if sheet.is_locked:
        raise BadRequestException("Goal sheet is locked")

    # Max goals check
    existing_goals = await get_goals_for_sheet(db, sheet.id)
    if len(existing_goals) >= 8:
        raise ValidationException("Maximum 8 goals per sheet")

    # Weightage validation
    current_total = sum(g.weightage for g in existing_goals)
    if current_total + data.weightage > Decimal("100.00"):
        remaining = Decimal("100.00") - current_total
        raise ValidationException(
            f"Adding {data.weightage}% would exceed 100%. Remaining budget: {remaining}%"
        )

    # UoM-specific validation
    if data.uom_type == "timeline" and not data.target_date:
        raise ValidationException("Timeline goals require a target_date")
    if data.uom_type != "timeline" and data.uom_type != "zero_based" and not data.target_value:
        raise ValidationException(f"{data.uom_type} goals require a target_value")

    goal = Goal(
        goal_sheet_id=data.goal_sheet_id,
        thrust_area=data.thrust_area,
        title=data.title,
        description=data.description,
        uom_type=data.uom_type,
        target_value=data.target_value,
        target_date=data.target_date,
        weightage=data.weightage,
        display_order=len(existing_goals),
    )
    db.add(goal)
    await log_audit(db, "goal", goal.id, "created", user_id, {
        "title": data.title,
        "weightage": str(data.weightage),
    })
    await db.flush()
    await db.refresh(goal)
    return goal


async def update_goal(db: AsyncSession, goal_id: str, data: GoalUpdate, user_id: str, is_admin: bool = False) -> Goal:
    """Update a goal (blocked if sheet is locked, unless admin)."""
    result = await db.execute(
        select(Goal).options(selectinload(Goal.goal_sheet)).where(Goal.id == goal_id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise NotFoundException("Goal not found")

    sheet = goal.goal_sheet

    # Check lock
    if sheet.is_locked and not is_admin:
        raise BadRequestException("Goal sheet is locked — contact admin to unlock")

    # Check status (allow admin to override)
    if not is_admin and sheet.status not in ("draft", "returned"):
        raise BadRequestException("Cannot edit goals in a submitted/approved sheet")

    # Capture old values for audit
    old_values = {}
    update_data = data.model_dump(exclude_unset=True)

    # Weightage validation if changing
    if "weightage" in update_data:
        new_weightage = update_data["weightage"]
        other_goals = await db.execute(
            select(Goal).where(
                Goal.goal_sheet_id == sheet.id,
                Goal.id != goal_id
            )
        )
        other_total = sum(g.weightage for g in other_goals.scalars().all())
        if other_total + new_weightage > Decimal("100.00"):
            remaining = Decimal("100.00") - other_total
            raise ValidationException(
                f"Setting {new_weightage}% would exceed 100%. Remaining: {remaining}%"
            )

    for field, value in update_data.items():
        old_val = getattr(goal, field)
        if old_val != value:
            old_values[field] = [str(old_val), str(value)]
            setattr(goal, field, value)

    goal.updated_at = datetime.utcnow()

    if old_values:
        await log_audit(db, "goal", goal.id, "updated", user_id, old_values)

    await db.flush()
    await db.refresh(goal)
    return goal


async def delete_goal(db: AsyncSession, goal_id: str, user_id: str) -> None:
    """Delete a goal (blocked if sheet is locked)."""
    result = await db.execute(
        select(Goal).options(selectinload(Goal.goal_sheet)).where(Goal.id == goal_id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise NotFoundException("Goal not found")

    sheet = goal.goal_sheet

    if sheet.is_locked:
        raise BadRequestException("Cannot delete goals from a locked sheet")

    if sheet.status not in ("draft", "returned"):
        raise BadRequestException("Cannot delete goals from a submitted/approved sheet")

    await log_audit(db, "goal", goal.id, "deleted", user_id, {
        "title": goal.title,
        "weightage": str(goal.weightage),
    })
    await db.delete(goal)
    await db.flush()


async def reorder_goals(db: AsyncSession, goal_ids: list[str]) -> list[Goal]:
    """Update display_order for drag-and-drop reordering."""
    goals = []
    for idx, gid in enumerate(goal_ids):
        result = await db.execute(select(Goal).where(Goal.id == gid))
        goal = result.scalar_one_or_none()
        if goal:
            goal.display_order = idx
            goals.append(goal)
    await db.flush()
    return goals


# ─── Shared Goals ─────────────────────────────────────────────────────────

async def get_shared_goals(db: AsyncSession, cycle_id: str | None = None) -> list[SharedGoal]:
    """List shared goals for the current (or specified) cycle."""
    if not cycle_id:
        cycle = await get_active_cycle(db)
        if not cycle:
            return []
        cycle_id = cycle.id

    result = await db.execute(
        select(SharedGoal)
        .where(SharedGoal.cycle_id == cycle_id)
        .order_by(SharedGoal.created_at.desc())
    )
    return list(result.scalars().all())


async def create_shared_goal(db: AsyncSession, data: SharedGoalCreate, user_id: str) -> SharedGoal:
    cycle = await get_active_cycle(db)
    if not cycle:
        raise NotFoundException("No active cycle")

    shared = SharedGoal(
        cycle_id=cycle.id,
        created_by=user_id,
        thrust_area=data.thrust_area,
        title=data.title,
        description=data.description,
        uom_type=data.uom_type,
        target_value=data.target_value,
        target_date=data.target_date,
        target_department=data.target_department,
    )
    db.add(shared)
    await db.flush()
    await db.refresh(shared)
    return shared


async def push_shared_goal(
    db: AsyncSession, shared_goal_id: str, push_data: SharedGoalPushRequest
) -> int:
    """
    Push a shared goal to target employees.
    Creates a Goal record in each employee's goal sheet.
    Returns count of goals created.
    """
    result = await db.execute(select(SharedGoal).where(SharedGoal.id == shared_goal_id))
    shared = result.scalar_one_or_none()
    if not shared:
        raise NotFoundException("Shared goal not found")

    # Determine target employees
    query = select(User).where(User.is_active == True, User.role == "employee")
    if push_data.employee_ids:
        query = query.where(User.id.in_(push_data.employee_ids))
    elif push_data.department:
        query = query.where(User.department == push_data.department)
    else:
        raise BadRequestException("Specify employee_ids or department")

    employees_result = await db.execute(query)
    employees = employees_result.scalars().all()

    count = 0
    for emp in employees:
        # Get or create goal sheet
        sheet_result = await db.execute(
            select(GoalSheet).where(
                GoalSheet.employee_id == emp.id,
                GoalSheet.cycle_id == shared.cycle_id
            )
        )
        sheet = sheet_result.scalar_one_or_none()
        if not sheet:
            sheet = GoalSheet(employee_id=emp.id, cycle_id=shared.cycle_id)
            db.add(sheet)
            await db.flush()
            await db.refresh(sheet)

        # Create goal linked to shared goal
        goal = Goal(
            goal_sheet_id=sheet.id,
            thrust_area=shared.thrust_area,
            title=shared.title,
            description=shared.description,
            uom_type=shared.uom_type,
            target_value=shared.target_value,
            target_date=shared.target_date,
            weightage=Decimal("10.00"),  # Default minimum, employee adjusts
            is_shared=True,
            shared_goal_id=shared.id,
        )
        db.add(goal)
        count += 1

    await db.flush()
    return count
