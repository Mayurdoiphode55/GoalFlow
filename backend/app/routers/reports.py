"""
GoalFlow — Reports Router
CSV/Excel export endpoints.
"""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.core.dependencies import require_role
from app.services.export_service import generate_achievement_report, generate_completion_report

router = APIRouter()


@router.get("/achievement")
async def achievement_report(
    cycle_id: str = Query(...),
    format: str = Query("csv", pattern="^(csv|excel)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "manager")),
):
    """Download achievement report as CSV or Excel."""
    data, content_type = await generate_achievement_report(db, cycle_id, format)
    ext = "xlsx" if format == "excel" else "csv"
    filename = f"goalflow_achievement_report.{ext}"
    return Response(
        content=data,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/completion")
async def completion_report(
    cycle_id: str = Query(...),
    quarter: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "manager")),
):
    """Download completion status report as CSV."""
    data, content_type = await generate_completion_report(db, cycle_id, quarter)
    return Response(
        content=data,
        media_type=content_type,
        headers={"Content-Disposition": 'attachment; filename="goalflow_completion_report.csv"'},
    )
