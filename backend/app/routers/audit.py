"""
GoalFlow — Audit Router
Paginated, filterable audit log (admin only).
"""

from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
import math

from app.database import get_db
from app.models.user import User
from app.core.dependencies import require_role
from app.services.audit_service import get_audit_logs

router = APIRouter()


@router.get("")
async def list_audit_logs(
    entity_type: str | None = Query(None),
    entity_id: str | None = Query(None),
    changed_by: str | None = Query(None),
    from_date: datetime | None = Query(None, alias="from"),
    to_date: datetime | None = Query(None, alias="to"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Get paginated audit logs with filters."""
    items, total = await get_audit_logs(
        db, entity_type=entity_type, entity_id=entity_id,
        changed_by=changed_by, from_date=from_date, to_date=to_date,
        page=page, per_page=per_page,
    )
    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": math.ceil(total / per_page) if total > 0 else 0,
    }
