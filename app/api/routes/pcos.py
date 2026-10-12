from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import PaginationParams, pagination_params, require_roles
from app.core.database import get_db
from app.core.security import UserRole
from app.models.user import User
from app.schemas.health import PCOSPredictRequest, PCOSPredictionRead
from app.services.health import PCOSService

router = APIRouter(prefix="/pcos", tags=["PCOS Prediction"])
mother_user = Depends(require_roles(UserRole.MOTHER, UserRole.ADMIN))


@router.post("/predict", response_model=PCOSPredictionRead)
async def predict(payload: PCOSPredictRequest, user: User = mother_user, db: AsyncSession = Depends(get_db)):
    return await PCOSService(db).predict(user, payload)


@router.get("/history", response_model=list[PCOSPredictionRead])
async def history(
    pagination: PaginationParams = Depends(pagination_params),
    user: User = mother_user,
    db: AsyncSession = Depends(get_db),
):
    return await PCOSService(db).history(user, pagination.limit, pagination.offset)
