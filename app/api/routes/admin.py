from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import PaginationParams, pagination_params, require_roles
from app.core.database import get_db
from app.core.security import UserRole
from app.models.asha import Alert, HighRiskCase
from app.models.audit import AuditLog
from app.models.caregiver import CaregiverContent
from app.models.chat import ChatMessage
from app.models.pcos import PCOSPrediction
from app.models.ppd import PPDAssessment
from app.models.user import User
from app.schemas.auth import AdminUserUpdate, UserRead
from app.schemas.common import AuditLogRead

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])
admin_user = Depends(require_roles(UserRole.ADMIN))


@router.get("/dashboard")
async def dashboard(_: User = admin_user, db: AsyncSession = Depends(get_db)):
    return {
        "users": await db.scalar(select(func.count()).select_from(User)) or 0,
        "pcos_predictions": await db.scalar(select(func.count()).select_from(PCOSPrediction)) or 0,
        "ppd_assessments": await db.scalar(select(func.count()).select_from(PPDAssessment)) or 0,
        "chat_messages": await db.scalar(select(func.count()).select_from(ChatMessage)) or 0,
        "caregiver_content": await db.scalar(select(func.count()).select_from(CaregiverContent)) or 0,
        "high_risk_cases": await db.scalar(select(func.count()).select_from(HighRiskCase)) or 0,
        "alerts": await db.scalar(select(func.count()).select_from(Alert)) or 0,
        "audit_logs": await db.scalar(select(func.count()).select_from(AuditLog)) or 0,
    }


@router.get("/analytics")
async def analytics(_: User = admin_user, db: AsyncSession = Depends(get_db)):
    return await dashboard(_, db)


@router.get("/users", response_model=list[UserRead])
async def list_users(
    pagination: PaginationParams = Depends(pagination_params),
    role: UserRole | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    _: User = admin_user,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(User.deleted_at.is_(None)).order_by(desc(User.created_at))
    if role:
        stmt = stmt.where(User.role == role)
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)
    result = await db.execute(stmt.limit(pagination.limit).offset(pagination.offset))
    return list(result.scalars().all())


@router.patch("/users/{user_id}", response_model=UserRead)
async def update_user(
    user_id: UUID,
    payload: AdminUserUpdate,
    _: User = admin_user,
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        from app.core.exceptions import AppError
        from fastapi import status

        raise AppError("User not found", status.HTTP_404_NOT_FOUND)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/audit-logs", response_model=list[AuditLogRead])
async def audit_logs(
    pagination: PaginationParams = Depends(pagination_params),
    action: str | None = Query(default=None),
    resource: str | None = Query(default=None),
    _: User = admin_user,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AuditLog).where(AuditLog.deleted_at.is_(None)).order_by(desc(AuditLog.created_at))
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if resource:
        stmt = stmt.where(AuditLog.resource.ilike(f"%{resource}%"))
    result = await db.execute(stmt.limit(pagination.limit).offset(pagination.offset))
    return list(result.scalars().all())
