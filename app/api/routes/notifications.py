from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import PaginationParams, get_current_user, pagination_params
from app.core.database import get_db
from app.models.user import User
from app.repositories.health import AlertRepository
from app.schemas.health import AlertRead

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[AlertRead])
async def list_notifications(
    pagination: PaginationParams = Depends(pagination_params),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AlertRepository(db).for_user(user.id, pagination.limit, pagination.offset)
