from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.core.database import get_db
from app.core.security import UserRole
from app.models.user import User
from app.services.caregiver_rag_service import CaregiverChatResponse, CaregiverRAGService

router = APIRouter(prefix="/caregiver/chat", tags=["Caregiver AI Health Coach"])
caregiver_only = Depends(require_roles(UserRole.CAREGIVER))


class CaregiverChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    language: str = Field(default="en", min_length=2, max_length=16)


class ClearHistoryResponse(BaseModel):
    message: str
    deleted_count: int


@router.post("/message", response_model=CaregiverChatResponse)
async def send_caregiver_chat(
    payload: CaregiverChatRequest,
    user: User = caregiver_only,
    db: AsyncSession = Depends(get_db),
):
    """
    Caregiver-only RAG chatbot message endpoint.
    Answers general maternal-health questions using retrieved medical evidence
    and answers questions about connected mother's dashboard data only with current CareCircle consent.
    Never calls the legacy chatbot endpoint or falls back to it.
    """
    try:
        service = CaregiverRAGService(db)
        return await service.answer_query(
            caregiver=user,
            message=payload.message,
            language=payload.language,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Caregiver chat processing error: {str(exc)}",
        )


@router.get("/history", response_model=list[CaregiverChatResponse])
async def get_caregiver_chat_history(
    user: User = caregiver_only,
    db: AsyncSession = Depends(get_db),
):
    """
    Get persistent conversation history strictly scoped to the authenticated caregiver.
    """
    service = CaregiverRAGService(db)
    return await service.get_history(caregiver=user)


@router.delete("/history", response_model=ClearHistoryResponse)
async def clear_caregiver_chat_history(
    user: User = caregiver_only,
    db: AsyncSession = Depends(get_db),
):
    """
    Clear conversation history strictly for the authenticated caregiver.
    """
    service = CaregiverRAGService(db)
    count = await service.clear_history(caregiver=user)
    return ClearHistoryResponse(
        message="Caregiver chat history cleared successfully.",
        deleted_count=count,
    )
