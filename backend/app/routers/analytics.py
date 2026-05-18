"""
GoalFlow — Analytics Router
QoQ trends, heatmaps, thrust distribution, manager effectiveness.
"""

from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User
from app.models.goal import GoalSheet, Goal, Cycle
from app.models.checkin import CheckIn
from app.core.dependencies import get_current_user, require_role
from app.services.goal_service import get_active_cycle

router = APIRouter()


@router.get("/qoq")
async def qoq_trends(
    cycle_id: str | None = Query(None),
    employee_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Quarter-over-quarter achievement trend data."""
    if not cycle_id:
        cycle = await get_active_cycle(db)
        if not cycle:
            return {"data_points": []}
        cycle_id = cycle.id

    data_points = []
    for quarter in ["Q1", "Q2", "Q3", "Q4"]:
        # Employee score
        emp_score = None
        if employee_id:
            emp_sheets = await db.execute(
                select(GoalSheet).where(
                    GoalSheet.employee_id == employee_id,
                    GoalSheet.cycle_id == cycle_id,
                )
            )
            emp_sheet = emp_sheets.scalar_one_or_none()
            if emp_sheet:
                goals_r = await db.execute(
                    select(Goal).where(Goal.goal_sheet_id == emp_sheet.id)
                )
                goals = goals_r.scalars().all()
                total_w, weighted_s = Decimal(0), Decimal(0)
                for g in goals:
                    ci_r = await db.execute(
                        select(CheckIn).where(
                            CheckIn.goal_id == g.id, CheckIn.quarter == quarter
                        )
                    )
                    ci = ci_r.scalar_one_or_none()
                    if ci and ci.computed_score is not None:
                        weighted_s += ci.computed_score * g.weightage / 100
                        total_w += g.weightage
                if total_w > 0:
                    emp_score = weighted_s.quantize(Decimal("0.01"))

        # Org average
        all_checkins = await db.execute(
            select(CheckIn.computed_score).join(Goal).join(GoalSheet)
            .where(GoalSheet.cycle_id == cycle_id, CheckIn.quarter == quarter,
                   CheckIn.computed_score.isnot(None))
        )
        scores = [r[0] for r in all_checkins.all()]
        org_avg = sum(scores) / len(scores) if scores else None

        data_points.append({
            "quarter": quarter,
            "employee_score": emp_score,
            "org_avg": org_avg.quantize(Decimal("0.01")) if org_avg else None,
        })

    return {"cycle_id": cycle_id, "employee_id": employee_id, "data_points": data_points}


@router.get("/completion-heatmap")
async def completion_heatmap(
    cycle_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Completion % by department + quarter."""
    if not cycle_id:
        cycle = await get_active_cycle(db)
        if not cycle:
            return {"data": []}
        cycle_id = cycle.id

    # Get departments
    dept_r = await db.execute(
        select(User.department).where(User.department.isnot(None)).distinct()
    )
    departments = [r[0] for r in dept_r.all()]

    data = []
    for dept in departments:
        # Get employees in this department
        emp_r = await db.execute(
            select(User.id).where(User.department == dept, User.role == "employee")
        )
        emp_ids = [r[0] for r in emp_r.all()]
        if not emp_ids:
            continue

        for quarter in ["Q1", "Q2", "Q3", "Q4"]:
            # Count check-ins done
            total_goals = 0
            done_checkins = 0
            for eid in emp_ids:
                sheet_r = await db.execute(
                    select(GoalSheet).where(
                        GoalSheet.employee_id == eid, GoalSheet.cycle_id == cycle_id
                    )
                )
                sheet = sheet_r.scalar_one_or_none()
                if not sheet:
                    continue
                goals_r = await db.execute(
                    select(Goal).where(Goal.goal_sheet_id == sheet.id)
                )
                goals = goals_r.scalars().all()
                total_goals += len(goals)
                for g in goals:
                    ci_r = await db.execute(
                        select(CheckIn).where(
                            CheckIn.goal_id == g.id, CheckIn.quarter == quarter
                        )
                    )
                    if ci_r.scalar_one_or_none():
                        done_checkins += 1

            pct = (Decimal(done_checkins) / Decimal(total_goals) * 100).quantize(
                Decimal("0.01")
            ) if total_goals > 0 else Decimal("0")
            data.append({"department": dept, "quarter": quarter, "completion_pct": pct})

    return {"cycle_id": cycle_id, "departments": departments, "data": data}


@router.get("/thrust-distribution")
async def thrust_distribution(
    cycle_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "manager")),
):
    """Goals breakdown by thrust area, UoM type, and status."""
    if not cycle_id:
        cycle = await get_active_cycle(db)
        if not cycle:
            return {"by_thrust_area": [], "by_uom_type": [], "by_status": []}
        cycle_id = cycle.id

    goals_r = await db.execute(
        select(Goal).join(GoalSheet).where(GoalSheet.cycle_id == cycle_id)
    )
    goals = goals_r.scalars().all()
    total = len(goals) or 1

    # By thrust area
    thrust_counts = {}
    uom_counts = {}
    for g in goals:
        thrust_counts[g.thrust_area] = thrust_counts.get(g.thrust_area, 0) + 1
        uom_counts[g.uom_type] = uom_counts.get(g.uom_type, 0) + 1

    by_thrust = [{"thrust_area": k, "count": v, "percentage": Decimal(v * 100 / total).quantize(Decimal("0.01"))}
                 for k, v in thrust_counts.items()]
    by_uom = [{"thrust_area": k, "count": v, "percentage": Decimal(v * 100 / total).quantize(Decimal("0.01"))}
              for k, v in uom_counts.items()]

    return {"cycle_id": cycle_id, "by_thrust_area": by_thrust, "by_uom_type": by_uom}


@router.get("/manager-effectiveness")
async def manager_effectiveness(
    cycle_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Manager effectiveness scores."""
    if not cycle_id:
        cycle = await get_active_cycle(db)
        if not cycle:
            return {"managers": []}
        cycle_id = cycle.id

    managers_r = await db.execute(select(User).where(User.role == "manager", User.is_active == True))
    managers = managers_r.scalars().all()

    results = []
    for mgr in managers:
        team_r = await db.execute(select(User).where(User.manager_id == mgr.id, User.is_active == True))
        team = team_r.scalars().all()
        team_size = len(team)
        if team_size == 0:
            continue

        total_checkins_expected = 0
        total_checkins_done = 0

        for emp in team:
            sheet_r = await db.execute(
                select(GoalSheet).where(
                    GoalSheet.employee_id == emp.id, GoalSheet.cycle_id == cycle_id
                )
            )
            sheet = sheet_r.scalar_one_or_none()
            if not sheet:
                continue
            goals_r = await db.execute(select(Goal).where(Goal.goal_sheet_id == sheet.id))
            goals = goals_r.scalars().all()
            for g in goals:
                for q in ["Q1", "Q2", "Q3", "Q4"]:
                    total_checkins_expected += 1
                    ci_r = await db.execute(
                        select(CheckIn).where(CheckIn.goal_id == g.id, CheckIn.quarter == q)
                    )
                    if ci_r.scalar_one_or_none():
                        total_checkins_done += 1

        completion_pct = Decimal(total_checkins_done * 100 / total_checkins_expected).quantize(
            Decimal("0.01")
        ) if total_checkins_expected > 0 else Decimal(0)

        results.append({
            "manager_id": mgr.id, "manager_name": mgr.name,
            "team_size": team_size, "checkin_completion_pct": completion_pct,
        })

    results.sort(key=lambda x: x["checkin_completion_pct"], reverse=True)
    return {"cycle_id": cycle_id, "managers": results}


@router.get("/team-overview")
async def team_overview(
    manager_id: str = Query(...),
    cycle_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("manager", "admin")),
):
    """Manager's team performance overview."""
    if not cycle_id:
        cycle = await get_active_cycle(db)
        if not cycle:
            return {"team_members": []}
        cycle_id = cycle.id

    team_r = await db.execute(
        select(User).where(User.manager_id == manager_id, User.is_active == True)
    )
    team = team_r.scalars().all()
    members = []

    for emp in team:
        sheet_r = await db.execute(
            select(GoalSheet).options(selectinload(GoalSheet.goals))
            .where(GoalSheet.employee_id == emp.id, GoalSheet.cycle_id == cycle_id)
        )
        sheet = sheet_r.scalar_one_or_none()

        member = {
            "employee_id": emp.id, "employee_name": emp.name,
            "department": emp.department,
            "goal_sheet_status": sheet.status if sheet else None,
            "goals_count": len(sheet.goals) if sheet else 0,
        }

        if sheet:
            for q in ["Q1", "Q2", "Q3", "Q4"]:
                total_w, weighted_s = Decimal(0), Decimal(0)
                for g in sheet.goals:
                    ci_r = await db.execute(
                        select(CheckIn).where(CheckIn.goal_id == g.id, CheckIn.quarter == q)
                    )
                    ci = ci_r.scalar_one_or_none()
                    if ci and ci.computed_score is not None:
                        weighted_s += ci.computed_score * g.weightage / 100
                        total_w += g.weightage
                member[f"q{q[1]}_score"] = weighted_s.quantize(Decimal("0.01")) if total_w > 0 else None

        members.append(member)

    return {"manager_id": manager_id, "cycle_id": cycle_id, "team_members": members}
