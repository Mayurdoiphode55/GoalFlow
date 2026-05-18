"""
GoalFlow — User Model
Roles: employee, manager, admin
Manager self-referencing FK for org hierarchy.
"""

import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, ForeignKey, Enum as SAEnum, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    employee = "employee"
    manager = "manager"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        SAEnum("employee", "manager", "admin", name="user_role_enum"),
        nullable=False,
    )
    manager_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    manager = relationship("User", remote_side="User.id", backref="direct_reports")
    goal_sheets = relationship("GoalSheet", back_populates="employee", foreign_keys="GoalSheet.employee_id")

    def __repr__(self):
        return f"<User {self.name} ({self.role})>"
