"""
GoalFlow — Goal Models
Cycle, GoalSheet, Goal, SharedGoal
"""

import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import (
    String, Boolean, ForeignKey, Enum as SAEnum, DateTime, Date,
    Integer, Text, Numeric, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


# ─── Enums ────────────────────────────────────────────────────────────────

class GoalSheetStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    returned = "returned"
    approved = "approved"


class UoMType(str, enum.Enum):
    numeric_min = "numeric_min"         # Higher is better (Revenue, Sales)
    numeric_max = "numeric_max"         # Lower is better (Defects, Cost)
    percentage_min = "percentage_min"   # Higher % is better (Satisfaction %)
    percentage_max = "percentage_max"   # Lower % is better (Error Rate %)
    timeline = "timeline"               # Completion by date
    zero_based = "zero_based"           # Success = zero incidents


# ─── Cycle ────────────────────────────────────────────────────────────────

class Cycle(Base):
    __tablename__ = "cycles"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    goal_setting_opens: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    goal_sheets = relationship("GoalSheet", back_populates="cycle")
    shared_goals = relationship("SharedGoal", back_populates="cycle")

    def __repr__(self):
        return f"<Cycle {self.name} (Active: {self.is_active})>"


# ─── GoalSheet ────────────────────────────────────────────────────────────

class GoalSheet(Base):
    __tablename__ = "goal_sheets"
    __table_args__ = (
        UniqueConstraint("employee_id", "cycle_id", name="uq_employee_cycle"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    employee_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    cycle_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cycles.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        SAEnum("draft", "submitted", "returned", "approved", name="goal_sheet_status_enum"),
        default="draft",
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approved_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    return_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    employee = relationship("User", back_populates="goal_sheets", foreign_keys=[employee_id])
    approver = relationship("User", foreign_keys=[approved_by])
    cycle = relationship("Cycle", back_populates="goal_sheets")
    goals = relationship("Goal", back_populates="goal_sheet", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<GoalSheet {self.employee_id} — {self.status}>"


# ─── Goal ─────────────────────────────────────────────────────────────────

class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    goal_sheet_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("goal_sheets.id"), nullable=False
    )
    thrust_area: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    uom_type: Mapped[str] = mapped_column(
        SAEnum(
            "numeric_min", "numeric_max", "percentage_min", "percentage_max",
            "timeline", "zero_based",
            name="uom_type_enum"
        ),
        nullable=False,
    )
    target_value: Mapped[Decimal | None] = mapped_column(Numeric(15, 4), nullable=True)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    weightage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    is_shared: Mapped[bool] = mapped_column(Boolean, default=False)
    shared_goal_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("shared_goals.id"), nullable=True
    )
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    goal_sheet = relationship("GoalSheet", back_populates="goals")
    shared_goal = relationship("SharedGoal", backref="linked_goals")
    checkins = relationship("CheckIn", back_populates="goal", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Goal {self.title[:40]} ({self.weightage}%)>"


# ─── SharedGoal ───────────────────────────────────────────────────────────

class SharedGoal(Base):
    __tablename__ = "shared_goals"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    cycle_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cycles.id"), nullable=False
    )
    created_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    thrust_area: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    uom_type: Mapped[str] = mapped_column(
        SAEnum(
            "numeric_min", "numeric_max", "percentage_min", "percentage_max",
            "timeline", "zero_based",
            name="uom_type_enum"
        ),
        nullable=False,
    )
    target_value: Mapped[Decimal | None] = mapped_column(Numeric(15, 4), nullable=True)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    target_department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    cycle = relationship("Cycle", back_populates="shared_goals")
    creator = relationship("User", foreign_keys=[created_by])

    def __repr__(self):
        return f"<SharedGoal {self.title[:40]}>"
