"""
GoalFlow API — Main Entry Point
FastAPI application with all routers, middleware, and lifespan management.
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import engine, Base
from app.core.scheduler import start_scheduler, shutdown_scheduler
from app.config import get_settings

settings = get_settings()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    # Startup
    logger.info("🚀 GoalFlow API starting up...")

    # Create database tables
    async with engine.begin() as conn:
        # Import all models to ensure they're registered
        from app import models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Database tables created/verified")

    # Start scheduler
    start_scheduler()
    logger.info("✅ Scheduler started")

    yield

    # Shutdown
    shutdown_scheduler()
    logger.info("👋 GoalFlow API shutting down")


# ─── FastAPI App ──────────────────────────────────────────────────────────

app = FastAPI(
    title="GoalFlow API",
    description="Enterprise Goal Setting & Tracking Portal — Align. Track. Achieve.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Include Routers ─────────────────────────────────────────────────────

from app.routers import auth, users, goals, shared_goals, checkins, reports, analytics, audit, escalation, ai, admin, ws  # noqa: E402

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(goals.router, prefix="/goals", tags=["Goals"])
app.include_router(shared_goals.router, prefix="/shared-goals", tags=["Shared Goals"])
app.include_router(checkins.router, prefix="/checkins", tags=["Check-ins"])
app.include_router(reports.router, prefix="/reports", tags=["Reports"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(audit.router, prefix="/audit", tags=["Audit"])
app.include_router(escalation.router, prefix="/escalation", tags=["Escalation"])
app.include_router(ai.router, prefix="/ai", tags=["AI"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(ws.router, prefix="/ws", tags=["WebSocket"])


# ─── Health Check ─────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health():
    return {
        "status": "ok",
        "service": "GoalFlow API",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
    }
