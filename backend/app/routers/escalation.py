"""
GoalFlow — Escalation Router
CRUD for escalation rules + log viewing + manual trigger.
"""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.models.escalation import EscalationRule, EscalationLog
from app.core.dependencies import require_role
from app.core.exceptions import NotFoundException

router = APIRouter()


class EscalationRuleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    trigger_type: str = Field(..., pattern="^(goal_not_submitted|goal_not_approved|checkin_not_done)$")
    days_threshold: int = Field(..., ge=1)
    escalate_to: str = Field(..., pattern="^(manager|skip_level|hr)$")


class EscalationRuleUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    trigger_type: Optional[str] = Field(None, pattern="^(goal_not_submitted|goal_not_approved|checkin_not_done)$")
    days_threshold: Optional[int] = Field(None, ge=1)
    escalate_to: Optional[str] = Field(None, pattern="^(manager|skip_level|hr)$")
    is_active: Optional[bool] = None


@router.get("/rules")
async def list_rules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    result = await db.execute(select(EscalationRule).order_by(EscalationRule.created_at.desc()))
    rules = result.scalars().all()
    return [
        {
            "id": r.id, "name": r.name, "trigger_type": r.trigger_type,
            "days_threshold": r.days_threshold, "escalate_to": r.escalate_to,
            "is_active": r.is_active, "created_at": r.created_at,
        }
        for r in rules
    ]


@router.post("/rules")
async def create_rule(
    data: EscalationRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    rule = EscalationRule(
        name=data.name, trigger_type=data.trigger_type,
        days_threshold=data.days_threshold, escalate_to=data.escalate_to,
        created_by=current_user.id,
    )
    db.add(rule)
    await db.flush()
    await db.refresh(rule)
    return {"id": rule.id, "name": rule.name, "message": "Rule created"}


@router.put("/rules/{rule_id}")
async def update_rule(
    rule_id: str, data: EscalationRuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    result = await db.execute(select(EscalationRule).where(EscalationRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise NotFoundException("Escalation rule not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)

    await db.flush()
    await db.refresh(rule)
    return {"id": rule.id, "message": "Rule updated"}


@router.delete("/rules/{rule_id}")
async def delete_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    result = await db.execute(select(EscalationRule).where(EscalationRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise NotFoundException("Escalation rule not found")
    await db.delete(rule)
    await db.flush()
    return {"message": "Rule deleted"}


@router.get("/logs")
async def list_logs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * per_page
    result = await db.execute(
        select(EscalationLog, User.name.label("emp_name"))
        .join(User, EscalationLog.employee_id == User.id)
        .order_by(EscalationLog.triggered_at.desc())
        .offset(offset).limit(per_page)
    )
    items = []
    for row in result.all():
        log, emp_name = row[0], row[1]
        items.append({
            "id": log.id, "rule_id": log.rule_id,
            "employee_id": log.employee_id, "employee_name": emp_name,
            "triggered_at": log.triggered_at, "status": log.status,
            "resolved_at": log.resolved_at,
        })
    return {"items": items, "page": page}


@router.post("/trigger-check")
async def trigger_check(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Manually trigger escalation check."""
    from app.services.escalation_service import run_escalation_check
    count = await run_escalation_check(db)
    return {"message": f"Escalation check complete. {count} escalation(s) triggered."}
