"""
GoalFlow — Escalation Models
Rules for auto-escalation and escalation log tracking.
"""

import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, ForeignKey, Enum as SAEnum, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class EscalationTriggerType(str, enum.Enum):
    goal_not_submitted = "goal_not_submitted"
    goal_not_approved = "goal_not_approved"
    checkin_not_done = "checkin_not_done"


class EscalationTarget(str, enum.Enum):
    manager = "manager"
    skip_level = "skip_level"
    hr = "hr"


class EscalationLogStatus(str, enum.Enum):
    sent = "sent"
    resolved = "resolved"


class EscalationRule(Base):
    __tablename__ = "escalation_rules"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    trigger_type: Mapped[str] = mapped_column(
        SAEnum(
            "goal_not_submitted", "goal_not_approved", "checkin_not_done",
            name="escalation_trigger_type_enum"
        ),
        nullable=False,
    )
    days_threshold: Mapped[int] = mapped_column(Integer, nullable=False)
    escalate_to: Mapped[str] = mapped_column(
        SAEnum("manager", "skip_level", "hr", name="escalation_target_enum"),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    logs = relationship("EscalationLog", back_populates="rule")

    def __repr__(self):
        return f"<EscalationRule {self.name} ({self.trigger_type})>"


class EscalationLog(Base):
    __tablename__ = "escalation_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    rule_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("escalation_rules.id"), nullable=False
    )
    employee_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    triggered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    escalated_to: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(
        SAEnum("sent", "resolved", name="escalation_log_status_enum"),
        default="sent",
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    rule = relationship("EscalationRule", back_populates="logs")
    employee = relationship("User", foreign_keys=[employee_id])
    escalation_target = relationship("User", foreign_keys=[escalated_to])

    def __repr__(self):
        return f"<EscalationLog {self.employee_id} — {self.status}>"
