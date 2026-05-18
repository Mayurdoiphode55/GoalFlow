"""
GoalFlow — Users Router
Admin CRUD + manager team view.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.core.dependencies import get_current_user, require_role
from app.core.exceptions import NotFoundException
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services.auth_service import create_user
from app.core.security import hash_password

router = APIRouter()


@router.get("", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "manager")),
    department: str | None = Query(None),
    role: str | None = Query(None),
):
    """List users. Admin sees all; manager sees their team."""
    query = select(User)
    if current_user.role == "manager":
        query = query.where(User.manager_id == current_user.id)
    if department:
        query = query.where(User.department == department)
    if role:
        query = query.where(User.role == role)
    query = query.order_by(User.name)
    result = await db.execute(query)
    return [UserResponse.model_validate(u) for u in result.scalars().all()]


@router.post("", response_model=UserResponse)
async def create_new_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Create a new user (admin only)."""
    user = await create_user(db, data)
    return UserResponse.model_validate(user)


@router.get("/me/team", response_model=list[UserResponse])
async def get_my_team(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("manager", "admin")),
):
    """Get the current manager's direct reports."""
    result = await db.execute(
        select(User).where(User.manager_id == current_user.id, User.is_active == True)
        .order_by(User.name)
    )
    return [UserResponse.model_validate(u) for u in result.scalars().all()]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("User not found")
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str, data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Update user details (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("User not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    await db.flush()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Soft-delete a user (set is_active=false)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("User not found")
    user.is_active = False
    await db.flush()
    return {"message": f"User {user.name} deactivated"}
