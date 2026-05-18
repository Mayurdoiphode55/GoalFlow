"""
GoalFlow — Audit Service
Records all changes to entities (goals, goal sheets, check-ins) with JSON diffs.
"""

from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.audit import AuditLog
from app.models.user import User


async def log_audit(
    db: AsyncSession, entity_type: str, entity_id: str,
    action: str, changed_by: str, change_details: dict | None = None,
) -> AuditLog:
    log = AuditLog(
        entity_type=entity_type, entity_id=entity_id,
        action=action, changed_by=changed_by,
        change_details=change_details or {},
        timestamp=datetime.utcnow(),
    )
    db.add(log)
    await db.flush()
    return log


async def get_audit_logs(
    db: AsyncSession, entity_type: str | None = None,
    entity_id: str | None = None, changed_by: str | None = None,
    from_date: datetime | None = None, to_date: datetime | None = None,
    page: int = 1, per_page: int = 20,
) -> tuple[list[dict], int]:
    query = select(AuditLog, User.name.label("changed_by_name")).join(
        User, AuditLog.changed_by == User.id, isouter=True
    )
    count_query = select(func.count(AuditLog.id))

    for q in [query, count_query]:
        if entity_type:
            q = q.where(AuditLog.entity_type == entity_type)
        if entity_id:
            q = q.where(AuditLog.entity_id == entity_id)
        if changed_by:
            q = q.where(AuditLog.changed_by == changed_by)
        if from_date:
            q = q.where(AuditLog.timestamp >= from_date)
        if to_date:
            q = q.where(AuditLog.timestamp <= to_date)

    # Apply filters to both queries separately
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
        count_query = count_query.where(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.where(AuditLog.entity_id == entity_id)
        count_query = count_query.where(AuditLog.entity_id == entity_id)
    if changed_by:
        query = query.where(AuditLog.changed_by == changed_by)
        count_query = count_query.where(AuditLog.changed_by == changed_by)
    if from_date:
        query = query.where(AuditLog.timestamp >= from_date)
        count_query = count_query.where(AuditLog.timestamp >= from_date)
    if to_date:
        query = query.where(AuditLog.timestamp <= to_date)
        count_query = count_query.where(AuditLog.timestamp <= to_date)

    total = (await db.execute(count_query)).scalar() or 0
    offset = (page - 1) * per_page
    query = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(per_page)
    result = await db.execute(query)

    items = []
    for row in result.all():
        log, name = row[0], row[1]
        items.append({
            "id": log.id, "entity_type": log.entity_type,
            "entity_id": log.entity_id, "action": log.action,
            "changed_by": log.changed_by, "changed_by_name": name,
            "change_details": log.change_details, "timestamp": log.timestamp,
        })
    return items, total
