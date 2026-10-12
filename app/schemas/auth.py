from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.core.security import UserRole
from app.schemas.common import ORMModel


class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    phone: str | None = Field(default=None, max_length=32)
    role: UserRole = UserRole.MOTHER
    preferred_language: str = Field(default="en", min_length=2, max_length=16)


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    preferred_language: str | None = Field(default=None, min_length=2, max_length=16)


class AdminUserUpdate(UserUpdate):
    role: UserRole | None = None
    is_active: bool | None = None
    is_verified: bool | None = None


class UserRead(ORMModel):
    id: UUID
    email: EmailStr
    name: str
    phone: str | None
    role: UserRole
    preferred_language: str
    is_verified: bool
    is_active: bool


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)
