from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    ResetPasswordRequest,
    TokenPair,
    UserCreate,
    UserRead,
)
from app.schemas.common import MessageResponse
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    return await AuthService(db).register(payload)


@router.post("/login", response_model=TokenPair)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await AuthService(db).login(payload.email, payload.password)


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    return await AuthService(db).refresh(payload.refresh_token)


@router.post("/logout", response_model=MessageResponse)
async def logout(payload: LogoutRequest, db: AsyncSession = Depends(get_db)):
    await AuthService(db).logout(payload.refresh_token)
    return MessageResponse(message="Logged out successfully.")


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    await AuthService(db).forgot_password(payload.email)
    return MessageResponse(message="If the email exists, password reset instructions will be sent.")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    await AuthService(db).reset_password(payload.token, payload.new_password)
    return MessageResponse(message="Password reset successfully.")


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await AuthService(db).change_password(user, payload.current_password, payload.new_password)
    return MessageResponse(message="Password changed successfully.")


@router.get("/me", response_model=UserRead)
async def me(user: User = Depends(get_current_user)):
    return user
