"""
GoalFlow — Escalation Service
Business logic for checking escalation conditions and triggering notifications.
"""

from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.escalation import EscalationRule, EscalationLog
from app.models.goal import GoalSheet, Cycle
from app.models.checkin import CheckIn
from app.models.user import User
from app.services.email_service import notify_escalation
from app.services.checkin_service import get_current_open_quarter
import logging

logger = logging.getLogger(__name__)


async def run_escalation_check(db: AsyncSession) -> int:
    """
    Run all active escalation rules.
    Returns count of escalations triggered.
    """
    # Get active cycle
    cycle_r = await db.execute(select(Cycle).where(Cycle.is_active == True))
    cycle = cycle_r.scalar_one_or_none()
    if not cycle:
        return 0

    # Get active rules
    rules_r = await db.execute(
        select(EscalationRule).where(EscalationRule.is_active == True)
    )
    rules = rules_r.scalars().all()
    count = 0

    for rule in rules:
        try:
            if rule.trigger_type == "goal_not_submitted":
                count += await _check_goal_not_submitted(db, rule, cycle)
            elif rule.trigger_type == "goal_not_approved":
                count += await _check_goal_not_approved(db, rule, cycle)
            elif rule.trigger_type == "checkin_not_done":
                count += await _check_checkin_not_done(db, rule, cycle)
        except Exception as e:
            logger.error(f"Escalation rule {rule.name} failed: {e}")

    return count


async def _check_goal_not_submitted(
    db: AsyncSession, rule: EscalationRule, cycle: Cycle
) -> int:
    """Find employees who haven't submitted goals within N days of cycle opening."""
    if not cycle.goal_setting_opens:
        return 0

    threshold_date = datetime.combine(cycle.goal_setting_opens, datetime.min.time()) + timedelta(days=rule.days_threshold)
    if datetime.utcnow() < threshold_date:
        return 0  # Not past threshold yet

    # Find employees without submitted sheets
    all_emp = await db.execute(
        select(User).where(User.role == "employee", User.is_active == True)
    )
    count = 0
    for emp in all_emp.scalars().all():
        sheet_r = await db.execute(
            select(GoalSheet).where(
                GoalSheet.employee_id == emp.id, GoalSheet.cycle_id == cycle.id,
                GoalSheet.status.in_(["submitted", "approved"]),
            )
        )
        if sheet_r.scalar_one_or_none():
            continue  # Already submitted

        # Check if already escalated
        existing = await db.execute(
            select(EscalationLog).where(
                EscalationLog.rule_id == rule.id,
                EscalationLog.employee_id == emp.id,
                EscalationLog.status == "sent",
            )
        )
        if existing.scalar_one_or_none():
            continue

        target = await _get_escalation_target(db, emp, rule.escalate_to)
        if target:
            log = EscalationLog(
                rule_id=rule.id, employee_id=emp.id,
                escalated_to=target.id,
            )
            db.add(log)
            await notify_escalation(
                target.email, target.name, emp.name,
                "submitted their goals", rule.days_threshold,
            )
            count += 1

    await db.flush()
    return count


async def _check_goal_not_approved(
    db: AsyncSession, rule: EscalationRule, cycle: Cycle
) -> int:
    """Find submitted sheets not approved within N days."""
    threshold = datetime.utcnow() - timedelta(days=rule.days_threshold)

    pending_r = await db.execute(
        select(GoalSheet).where(
            GoalSheet.cycle_id == cycle.id,
            GoalSheet.status == "submitted",
            GoalSheet.submitted_at <= threshold,
        )
    )
    count = 0
    for sheet in pending_r.scalars().all():
        existing = await db.execute(
            select(EscalationLog).where(
                EscalationLog.rule_id == rule.id,
                EscalationLog.employee_id == sheet.employee_id,
                EscalationLog.status == "sent",
            )
        )
        if existing.scalar_one_or_none():
            continue

        emp_r = await db.execute(select(User).where(User.id == sheet.employee_id))
        emp = emp_r.scalar_one_or_none()
        if not emp:
            continue

        target = await _get_escalation_target(db, emp, rule.escalate_to)
        if target:
            log = EscalationLog(
                rule_id=rule.id, employee_id=emp.id,
                escalated_to=target.id,
            )
            db.add(log)
            await notify_escalation(
                target.email, target.name, emp.name,
                "had their goals approved", rule.days_threshold,
            )
            count += 1

    await db.flush()
    return count


async def _check_checkin_not_done(
    db: AsyncSession, rule: EscalationRule, cycle: Cycle
) -> int:
    """Find employees who haven't completed check-in in the active quarter."""
    quarter = get_current_open_quarter()
    if not quarter:
        return 0

    all_emp = await db.execute(
        select(User).where(User.role == "employee", User.is_active == True)
    )
    count = 0
    for emp in all_emp.scalars().all():
        sheet_r = await db.execute(
            select(GoalSheet).where(
                GoalSheet.employee_id == emp.id, GoalSheet.cycle_id == cycle.id,
                GoalSheet.status == "approved",
            )
        )
        sheet = sheet_r.scalar_one_or_none()
        if not sheet:
            continue

        # Check if any check-in exists for this quarter
        from app.models.goal import Goal
        goals_r = await db.execute(
            select(Goal.id).where(Goal.goal_sheet_id == sheet.id)
        )
        goal_ids = [r[0] for r in goals_r.all()]
        if not goal_ids:
            continue

        ci_r = await db.execute(
            select(CheckIn).where(
                CheckIn.goal_id.in_(goal_ids), CheckIn.quarter == quarter,
            )
        )
        if ci_r.scalars().all():
            continue  # Has check-ins

        existing = await db.execute(
            select(EscalationLog).where(
                EscalationLog.rule_id == rule.id,
                EscalationLog.employee_id == emp.id,
                EscalationLog.status == "sent",
            )
        )
        if existing.scalar_one_or_none():
            continue

        target = await _get_escalation_target(db, emp, rule.escalate_to)
        if target:
            log = EscalationLog(
                rule_id=rule.id, employee_id=emp.id,
                escalated_to=target.id,
            )
            db.add(log)
            await notify_escalation(
                target.email, target.name, emp.name,
                f"completed their {quarter} check-in", rule.days_threshold,
            )
            count += 1

    await db.flush()
    return count


async def _get_escalation_target(
    db: AsyncSession, employee: User, escalate_to: str
) -> User | None:
    """Determine escalation target user."""
    if escalate_to == "manager" and employee.manager_id:
        r = await db.execute(select(User).where(User.id == employee.manager_id))
        return r.scalar_one_or_none()
    elif escalate_to == "skip_level" and employee.manager_id:
        mgr_r = await db.execute(select(User).where(User.id == employee.manager_id))
        mgr = mgr_r.scalar_one_or_none()
        if mgr and mgr.manager_id:
            r = await db.execute(select(User).where(User.id == mgr.manager_id))
            return r.scalar_one_or_none()
        return mgr
    elif escalate_to == "hr":
        r = await db.execute(select(User).where(User.role == "admin", User.is_active == True))
        return r.scalars().first()
    return None
