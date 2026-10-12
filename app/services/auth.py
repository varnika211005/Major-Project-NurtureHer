from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.core.exceptions import AppError
from app.core.security import decode_token, hash_password, verify_password
from app.models.user import User
from app.repositories.users import UserRepository
from app.schemas.auth import TokenPair, UserCreate
from app.services.token_service import TokenService
from app.utils.passwords import validate_password_policy


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.users = UserRepository(db)

    async def register(self, payload: UserCreate) -> User:
        existing = await self.users.get_by_email(payload.email)
        if existing:
            raise AppError("Email already registered", status.HTTP_409_CONFLICT)
        validate_password_policy(payload.password)
        user = await self.users.create(
            email=payload.email.lower(),
            name=payload.name,
            phone=payload.phone,
            password_hash=hash_password(payload.password),
            role=payload.role,
            preferred_language=payload.preferred_language,
        )
        await self.db.commit()
        return user

    async def login(self, email: str, password: str) -> TokenPair:
        user = await self.users.get_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            raise AppError("Invalid credentials", status.HTTP_401_UNAUTHORIZED)
        if not user.is_active:
            raise AppError("User is inactive", status.HTTP_403_FORBIDDEN)
        tokens = await TokenService(self.db).issue_pair(user)
        await self.db.commit()
        return tokens

    async def refresh(self, refresh_token: str) -> TokenPair:
        try:
            token_service = TokenService(self.db)
            user_id, _ = await token_service.rotate_refresh_token(refresh_token)
        except ValueError as exc:
            raise AppError("Invalid refresh token", status.HTTP_401_UNAUTHORIZED) from exc
        user = await self.users.get(UUID(user_id))
        if not user:
            raise AppError("User not found", status.HTTP_404_NOT_FOUND)
        tokens = await token_service.issue_pair(user)
        await self.db.commit()
        return tokens

    async def forgot_password(self, email: str) -> None:
        await self.users.get_by_email(email)

    async def logout(self, refresh_token: str) -> None:
        try:
            await TokenService(self.db).revoke_refresh_token(refresh_token)
            await self.db.commit()
        except ValueError as exc:
            raise AppError("Invalid refresh token", status.HTTP_401_UNAUTHORIZED) from exc

    async def change_password(self, user: User, current_password: str, new_password: str) -> None:
        if not verify_password(current_password, user.password_hash):
            raise AppError("Current password is incorrect", status.HTTP_400_BAD_REQUEST)
        validate_password_policy(new_password)
        user.password_hash = hash_password(new_password)
        await TokenService(self.db).revoke_all_for_user(user.id)
        await self.db.commit()

    async def reset_password(self, token: str, new_password: str) -> None:
        try:
            payload = decode_token(token, "reset")
        except ValueError as exc:
            raise AppError("Invalid reset token", status.HTTP_401_UNAUTHORIZED) from exc
        user = await self.users.get(payload["sub"])
        if not user:
            raise AppError("User not found", status.HTTP_404_NOT_FOUND)
        validate_password_policy(new_password)
        user.password_hash = hash_password(new_password)
        await TokenService(self.db).revoke_all_for_user(user.id)
        await self.db.commit()
