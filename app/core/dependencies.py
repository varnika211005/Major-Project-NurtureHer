from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AppError
from app.core.security import UserRole, decode_token
from app.models.user import User
from app.repositories.users import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None:
        raise AppError("Authentication credentials were not provided", status.HTTP_401_UNAUTHORIZED)
    try:
        payload = decode_token(credentials.credentials, "access")
        user_id = UUID(payload["sub"])
    except (ValueError, KeyError) as exc:
        raise AppError("Invalid authentication credentials", status.HTTP_401_UNAUTHORIZED) from exc

    user = await UserRepository(db).get(user_id)
    if not user or not user.is_active:
        raise AppError("Inactive or missing user", status.HTTP_401_UNAUTHORIZED)
    return user


def require_roles(*roles: UserRole) -> Callable:
    async def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise AppError("Insufficient permissions", status.HTTP_403_FORBIDDEN)
        return user

    return dependency


async def idempotency_key(x_idempotency_key: str | None = Header(default=None)) -> str | None:
    return x_idempotency_key


class PaginationParams(BaseModel):
    limit: int
    offset: int


def pagination_params(
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PaginationParams:
    return PaginationParams(limit=limit, offset=offset)
