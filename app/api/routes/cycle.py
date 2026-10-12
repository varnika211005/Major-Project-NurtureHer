from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import PaginationParams, pagination_params, require_roles
from app.core.database import get_db
from app.core.security import UserRole
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.wellness import CycleCreate, CyclePredictionRead, CycleRead, CycleUpdate
from app.services.wellness import CycleService

router = APIRouter(prefix="/cycle", tags=["Cycle Tracker"])
mother_user = Depends(require_roles(UserRole.MOTHER, UserRole.ADMIN))


@router.post("", response_model=CycleRead)
async def create_cycle(payload: CycleCreate, user: User = mother_user, db: AsyncSession = Depends(get_db)):
    return await CycleService(db).create_cycle(user, payload)


@router.get("", response_model=list[CycleRead])
async def list_cycles(
    pagination: PaginationParams = Depends(pagination_params),
    user: User = mother_user,
    db: AsyncSession = Depends(get_db),
):
    return await CycleService(db).cycles(user, pagination.limit, pagination.offset)


@router.get("/prediction", response_model=CyclePredictionRead | None)
async def cycle_prediction(user: User = mother_user, db: AsyncSession = Depends(get_db)):
    return await CycleService(db).prediction(user)


@router.get("/{cycle_id}", response_model=CycleRead)
async def get_cycle(cycle_id: UUID, user: User = mother_user, db: AsyncSession = Depends(get_db)):
    return await CycleService(db).get_cycle(user, cycle_id)


@router.patch("/{cycle_id}", response_model=CycleRead)
async def update_cycle(cycle_id: UUID, payload: CycleUpdate, user: User = mother_user, db: AsyncSession = Depends(get_db)):
    return await CycleService(db).update_cycle(user, cycle_id, payload)


@router.delete("/{cycle_id}", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def delete_cycle(cycle_id: UUID, user: User = mother_user, db: AsyncSession = Depends(get_db)):
    await CycleService(db).delete_cycle(user, cycle_id)
    return MessageResponse(message="Cycle entry deleted")
