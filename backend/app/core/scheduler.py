"""
GoalFlow — APScheduler Setup
Two scheduled jobs:
1. Escalation check — daily at 8:00 AM
2. Check-in window reminder — 1st of each month at 9:00 AM
"""

import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def _run_escalation_job():
    """Daily escalation check job."""
    from app.database import async_session
    from app.services.escalation_service import run_escalation_check

    logger.info("[SCHEDULER] Running daily escalation check...")
    async with async_session() as db:
        try:
            count = await run_escalation_check(db)
            await db.commit()
            logger.info(f"[SCHEDULER] Escalation check complete: {count} triggered")
        except Exception as e:
            await db.rollback()
            logger.error(f"[SCHEDULER] Escalation check failed: {e}")


async def _run_checkin_reminder_job():
    """Monthly check-in window reminder job."""
    from datetime import datetime
    from app.database import async_session
    from app.services.email_service import notify_checkin_reminder
    from app.services.checkin_service import get_current_open_quarter
    from app.models.user import User
    from sqlalchemy import select

    quarter = get_current_open_quarter()
    if not quarter:
        logger.info("[SCHEDULER] No check-in window open this month, skipping reminder")
        return

    logger.info(f"[SCHEDULER] Sending {quarter} check-in reminders...")
    async with async_session() as db:
        try:
            result = await db.execute(
                select(User).where(User.role == "employee", User.is_active == True)
            )
            employees = result.scalars().all()
            for emp in employees:
                await notify_checkin_reminder(emp.email, emp.name, quarter)
            logger.info(f"[SCHEDULER] Sent {quarter} reminders to {len(employees)} employees")
        except Exception as e:
            logger.error(f"[SCHEDULER] Reminder job failed: {e}")


def start_scheduler():
    """Start the APScheduler with all configured jobs."""
    scheduler.add_job(
        _run_escalation_job,
        trigger=CronTrigger(hour=8, minute=0),
        id="escalation_check",
        name="Daily Escalation Check",
        replace_existing=True,
    )

    scheduler.add_job(
        _run_checkin_reminder_job,
        trigger=CronTrigger(day=1, hour=9, minute=0),
        id="checkin_reminder",
        name="Monthly Check-in Reminder",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("[SCHEDULER] Started with 2 jobs (escalation + reminder)")


def shutdown_scheduler():
    """Gracefully shutdown the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("[SCHEDULER] Shut down")
