from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import PaginationParams, pagination_params, require_roles
from app.core.database import get_db
from app.core.security import UserRole
from app.schemas.common import MessageResponse
from app.schemas.health import CaregiverContentCreate, CaregiverContentRead, CaregiverContentUpdate
from app.services.health import CaregiverService

router = APIRouter(prefix="/caregiver", tags=["Caregiver"])
caregiver_access = Depends(require_roles(UserRole.MOTHER, UserRole.CAREGIVER, UserRole.ADMIN))
admin_access = Depends(require_roles(UserRole.ADMIN))


@router.get("/videos", response_model=list[CaregiverContentRead])
async def videos(
    pagination: PaginationParams = Depends(pagination_params),
    _: object = caregiver_access,
    db: AsyncSession = Depends(get_db),
):
    return await CaregiverService(db).content("video", pagination.limit, pagination.offset)


@router.get("/tips", response_model=list[CaregiverContentRead])
async def tips(
    pagination: PaginationParams = Depends(pagination_params),
    _: object = caregiver_access,
    db: AsyncSession = Depends(get_db),
):
    return await CaregiverService(db).content("tip", pagination.limit, pagination.offset)


@router.get("/articles", response_model=list[CaregiverContentRead])
async def articles(
    pagination: PaginationParams = Depends(pagination_params),
    _: object = caregiver_access,
    db: AsyncSession = Depends(get_db),
):
    return await CaregiverService(db).content("article", pagination.limit, pagination.offset)


@router.get("/content/{content_id}", response_model=CaregiverContentRead)
async def get_content(content_id: UUID, _: object = caregiver_access, db: AsyncSession = Depends(get_db)):
    return await CaregiverService(db).get_content(content_id)


@router.post("/content", response_model=CaregiverContentRead, status_code=status.HTTP_201_CREATED)
async def create_content(payload: CaregiverContentCreate, _: object = admin_access, db: AsyncSession = Depends(get_db)):
    return await CaregiverService(db).create_content(payload)


@router.patch("/content/{content_id}", response_model=CaregiverContentRead)
async def update_content(content_id: UUID, payload: CaregiverContentUpdate, _: object = admin_access, db: AsyncSession = Depends(get_db)):
    return await CaregiverService(db).update_content(content_id, payload)


@router.delete("/content/{content_id}", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def delete_content(content_id: UUID, _: object = admin_access, db: AsyncSession = Depends(get_db)):
    await CaregiverService(db).delete_content(content_id)
    return MessageResponse(message="Caregiver content deleted")
