"""
GoalFlow — CheckIn Model
Quarterly progress check-ins with score computation.
"""

import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import (
    String, ForeignKey, Enum as SAEnum, DateTime, Date,
    Text, Numeric, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class Quarter(str, enum.Enum):
    Q1 = "Q1"
    Q2 = "Q2"
    Q3 = "Q3"
    Q4 = "Q4"


class CheckInStatus(str, enum.Enum):
    not_started = "not_started"
    on_track = "on_track"
    completed = "completed"


class CheckIn(Base):
    __tablename__ = "checkins"
    __table_args__ = (
        UniqueConstraint("goal_id", "quarter", name="uq_goal_quarter"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    goal_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("goals.id"), nullable=False
    )
    quarter: Mapped[str] = mapped_column(
        SAEnum("Q1", "Q2", "Q3", "Q4", name="quarter_enum"),
        nullable=False,
    )
    actual_value: Mapped[Decimal | None] = mapped_column(Numeric(15, 4), nullable=True)
    actual_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        SAEnum("not_started", "on_track", "completed", name="checkin_status_enum"),
        nullable=False,
    )
    computed_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    employee_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    manager_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    manager_comment_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    manager_comment_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    employee_updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    goal = relationship("Goal", back_populates="checkins")
    commenter = relationship("User", foreign_keys=[manager_comment_by])

    def __repr__(self):
        return f"<CheckIn {self.goal_id} {self.quarter} — {self.status}>"
