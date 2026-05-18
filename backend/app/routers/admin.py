"""
GoalFlow — Admin Router
Cycle management, goal sheet unlock, completion dashboard stats.
"""

from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User
from app.models.goal import Cycle, GoalSheet, Goal
from app.models.checkin import CheckIn
from app.core.dependencies import require_role
from app.schemas.goal import CycleCreate, CycleUpdate, CycleResponse
from app.services import goal_service

router = APIRouter()


# ─── Cycles ───────────────────────────────────────────────────────────────

@router.get("/cycles", response_model=list[CycleResponse])
async def list_cycles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    cycles = await goal_service.get_cycles(db)
    return [CycleResponse.model_validate(c) for c in cycles]


@router.post("/cycles", response_model=CycleResponse)
async def create_cycle(
    data: CycleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    cycle = await goal_service.create_cycle(db, data, current_user.id)
    return CycleResponse.model_validate(cycle)


@router.put("/cycles/{cycle_id}", response_model=CycleResponse)
async def update_cycle(
    cycle_id: str, data: CycleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    cycle = await goal_service.update_cycle(db, cycle_id, data)
    return CycleResponse.model_validate(cycle)


@router.post("/cycles/{cycle_id}/activate", response_model=CycleResponse)
async def activate_cycle(
    cycle_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    cycle = await goal_service.activate_cycle(db, cycle_id)
    return CycleResponse.model_validate(cycle)


# ─── Completion Dashboard ─────────────────────────────────────────────────

@router.get("/completion-stats")
async def completion_dashboard_stats(
    cycle_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Real-time org-wide completion statistics."""
    if not cycle_id:
        cycle = await goal_service.get_active_cycle(db)
        if not cycle:
            return {"total_employees": 0, "departments": []}
        cycle_id = cycle.id

    # Total employees
    total_emp_r = await db.execute(
        select(func.count(User.id)).where(User.role == "employee", User.is_active == True)
    )
    total_employees = total_emp_r.scalar() or 0

    # Goal sheets
    submitted_r = await db.execute(
        select(func.count(GoalSheet.id)).where(
            GoalSheet.cycle_id == cycle_id,
            GoalSheet.status.in_(["submitted", "approved"]),
        )
    )
    sheets_submitted = submitted_r.scalar() or 0

    approved_r = await db.execute(
        select(func.count(GoalSheet.id)).where(
            GoalSheet.cycle_id == cycle_id, GoalSheet.status == "approved"
        )
    )
    sheets_approved = approved_r.scalar() or 0

    # Check-ins done
    checkins_r = await db.execute(
        select(func.count(CheckIn.id))
        .join(Goal).join(GoalSheet)
        .where(GoalSheet.cycle_id == cycle_id)
    )
    checkins_done = checkins_r.scalar() or 0

    # Department breakdown
    dept_r = await db.execute(
        select(User.department).where(
            User.department.isnot(None), User.role == "employee"
        ).distinct()
    )
    departments = []
    for row in dept_r.all():
        dept = row[0]
        dept_emp_r = await db.execute(
            select(func.count(User.id)).where(
                User.department == dept, User.role == "employee", User.is_active == True
            )
        )
        dept_total = dept_emp_r.scalar() or 0

        dept_sub_r = await db.execute(
            select(func.count(GoalSheet.id))
            .join(User, GoalSheet.employee_id == User.id)
            .where(User.department == dept, GoalSheet.cycle_id == cycle_id,
                   GoalSheet.status.in_(["submitted", "approved"]))
        )
        dept_submitted = dept_sub_r.scalar() or 0

        pct = Decimal(dept_submitted * 100 / dept_total).quantize(Decimal("0.01")) if dept_total > 0 else Decimal(0)
        departments.append({
            "department": dept, "total_employees": dept_total,
            "sheets_submitted": dept_submitted, "completion_pct": pct,
        })

    return {
        "total_employees": total_employees,
        "goal_sheets_submitted": sheets_submitted,
        "goal_sheets_approved": sheets_approved,
        "checkins_done": checkins_done,
        "departments": departments,
    }
