"""
GoalFlow — Auth Router
POST /auth/login, POST /auth/refresh, GET /auth/me, POST /auth/logout
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.core.dependencies import get_current_user
from app.schemas.user import LoginRequest, TokenResponse, RefreshRequest, UserResponse
from app.services.auth_service import authenticate_user, create_tokens, refresh_access_token

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return JWT tokens."""
    user = await authenticate_user(db, data.email, data.password)
    tokens = await create_tokens(user)
    return {
        **tokens,
        "user": UserResponse.model_validate(user),
    }


@router.post("/refresh")
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a refresh token for a new access token."""
    return await refresh_access_token(db, data.refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the current authenticated user's profile."""
    return UserResponse.model_validate(current_user)


@router.post("/logout")
async def logout():
    """Logout (client-side token deletion). Server acknowledges."""
    return {"message": "Logged out successfully"}
