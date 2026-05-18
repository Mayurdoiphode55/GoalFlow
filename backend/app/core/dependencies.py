"""
GoalFlow — FastAPI Dependencies
Authentication and role-based access control via Depends().
"""

from typing import Callable
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError

from app.database import get_db
from app.models.user import User
from app.core.security import decode_token
from app.core.exceptions import UnauthorizedException, ForbiddenException

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Decode the JWT access token and fetch the corresponding user.
    Raises 401 if token is invalid/expired or user not found/inactive.
    """
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        if user_id is None or token_type != "access":
            raise UnauthorizedException("Invalid token")
    except JWTError:
        raise UnauthorizedException("Could not validate credentials")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise UnauthorizedException("User not found")
    if not user.is_active:
        raise UnauthorizedException("User account is deactivated")

    return user


def require_role(*roles: str) -> Callable:
    """
    Returns a FastAPI dependency that checks if the current user has one of the specified roles.

    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(user: User = Depends(require_role("admin"))):
            ...
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise ForbiddenException(
                f"Role '{current_user.role}' is not authorized. Required: {', '.join(roles)}"
            )
        return current_user

    return role_checker


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Alias ensuring user is active (already checked in get_current_user)."""
    return current_user
