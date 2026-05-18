"""
GoalFlow — Auth Service
Login, token refresh, user creation, and password management.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.core.security import verify_password, hash_password, create_access_token, create_refresh_token, decode_token
from app.core.exceptions import UnauthorizedException, ConflictException, NotFoundException
from app.schemas.user import UserCreate, TokenResponse, UserResponse
from jose import JWTError


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    """Verify email/password and return user, or raise 401."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        raise UnauthorizedException("Invalid email or password")

    if not user.is_active:
        raise UnauthorizedException("Account is deactivated")

    return user


async def create_tokens(user: User) -> dict:
    """Generate access + refresh token pair for a user."""
    token_data = {"sub": user.id, "email": user.email, "role": user.role}
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type": "bearer",
    }


async def refresh_access_token(db: AsyncSession, refresh_token: str) -> dict:
    """Validate a refresh token and issue a new access token."""
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise UnauthorizedException("Invalid token type")

        user_id = payload.get("sub")
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user or not user.is_active:
            raise UnauthorizedException("User not found or inactive")

        token_data = {"sub": user.id, "email": user.email, "role": user.role}
        return {
            "access_token": create_access_token(token_data),
            "token_type": "bearer",
        }
    except JWTError:
        raise UnauthorizedException("Invalid refresh token")


async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
    """Create a new user (admin action). Checks email uniqueness."""
    # Check email uniqueness
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise ConflictException(f"Email '{user_data.email}' is already registered")

    # Validate manager assignment
    if user_data.manager_id:
        mgr_result = await db.execute(select(User).where(User.id == user_data.manager_id))
        manager = mgr_result.scalar_one_or_none()
        if not manager:
            raise NotFoundException("Manager not found")
        if manager.role != "manager" and manager.role != "admin":
            raise ConflictException("Assigned manager must have 'manager' or 'admin' role")

    user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        manager_id=user_data.manager_id,
        department=user_data.department,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user
