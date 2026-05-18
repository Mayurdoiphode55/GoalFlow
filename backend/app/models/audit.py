"""
GoalFlow — Audit Log Model
Captures all changes to goals, goal sheets, and check-ins.
"""

import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    change_details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )

    # Relationships
    user = relationship("User", foreign_keys=[changed_by])

    def __repr__(self):
        return f"<AuditLog {self.entity_type}:{self.action} by {self.changed_by}>"
