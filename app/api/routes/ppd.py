from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import PaginationParams, pagination_params, require_roles
from app.core.database import get_db
from app.core.security import UserRole
from app.models.user import User
from app.schemas.health import PPDAssessmentRead, PPDAssessmentRequest
from app.services.health import PPDService

router = APIRouter(prefix="/ppd", tags=["Postpartum Depression"])
mother_user = Depends(require_roles(UserRole.MOTHER, UserRole.ADMIN))


@router.post("/assessment", response_model=PPDAssessmentRead)
async def assessment(payload: PPDAssessmentRequest, user: User = mother_user, db: AsyncSession = Depends(get_db)):
    return await PPDService(db).assess(user, payload)


@router.get("/history", response_model=list[PPDAssessmentRead])
async def history(
    pagination: PaginationParams = Depends(pagination_params),
    user: User = mother_user,
    db: AsyncSession = Depends(get_db),
):
    return await PPDService(db).history(user, pagination.limit, pagination.offset)
