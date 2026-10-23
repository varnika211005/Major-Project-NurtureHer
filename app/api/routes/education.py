from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import PaginationParams, pagination_params, require_roles
from app.core.database import get_db
from app.core.security import UserRole
from app.schemas.common import MessageResponse
from app.schemas.education import (
    EducationCategoriesRead,
    EducationalResourceCreate,
    EducationalResourceRead,
    EducationalResourceUpdate,
)
from app.services.education_service import EducationService

router = APIRouter(prefix="/education", tags=["Educational Library"])
admin_access = Depends(require_roles(UserRole.ADMIN))


@router.get("/categories", response_model=EducationCategoriesRead)
async def get_categories(
    db: AsyncSession = Depends(get_db),
):
    return await EducationService(db).get_categories()


@router.get("/resources", response_model=list[EducationalResourceRead])
async def list_resources(
    content_type: str | None = Query(default=None, description="'video' or 'article'"),
    language: str | None = Query(default=None, description="Language code e.g. 'en', 'hi', 'kn', 'ta', 'te', 'ml', or 'all'"),
    category: str | None = Query(default=None),
    search: str | None = Query(default=None),
    pagination: PaginationParams = Depends(pagination_params),
    db: AsyncSession = Depends(get_db),
):
    return await EducationService(db).list_resources(
        content_type=content_type,
        language=language,
        category=category,
        search=search,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.get("/videos", response_model=list[EducationalResourceRead])
async def list_videos(
    language: str | None = Query(default=None, description="Language code e.g. 'en', 'hi', 'kn', 'ta', 'te', 'ml', or 'all'"),
    category: str | None = Query(default=None),
    search: str | None = Query(default=None),
    pagination: PaginationParams = Depends(pagination_params),
    db: AsyncSession = Depends(get_db),
):
    return await EducationService(db).list_resources(
        content_type="video",
        language=language,
        category=category,
        search=search,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.get("/articles", response_model=list[EducationalResourceRead])
async def list_articles(
    language: str | None = Query(default=None, description="Language code e.g. 'en', 'hi', 'kn', 'ta', 'te', 'ml', or 'all'"),
    category: str | None = Query(default=None),
    search: str | None = Query(default=None),
    pagination: PaginationParams = Depends(pagination_params),
    db: AsyncSession = Depends(get_db),
):
    return await EducationService(db).list_resources(
        content_type="article",
        language=language,
        category=category,
        search=search,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.get("/resources/{resource_id}", response_model=EducationalResourceRead)
async def get_resource(
    resource_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    return await EducationService(db).get_resource(resource_id)


@router.post("/resources", response_model=EducationalResourceRead, status_code=status.HTTP_201_CREATED)
async def create_resource(
    payload: EducationalResourceCreate,
    _: object = admin_access,
    db: AsyncSession = Depends(get_db),
):
    return await EducationService(db).create_resource(payload)


@router.patch("/resources/{resource_id}", response_model=EducationalResourceRead)
async def update_resource(
    resource_id: UUID,
    payload: EducationalResourceUpdate,
    _: object = admin_access,
    db: AsyncSession = Depends(get_db),
):
    return await EducationService(db).update_resource(resource_id, payload)


@router.delete("/resources/{resource_id}", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def delete_resource(
    resource_id: UUID,
    _: object = admin_access,
    db: AsyncSession = Depends(get_db),
):
    await EducationService(db).delete_resource(resource_id)
    return MessageResponse(message="Educational resource deleted successfully")
