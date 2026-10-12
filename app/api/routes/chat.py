from fastapi import APIRouter, Depends, File, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import PaginationParams, get_current_user, pagination_params
from app.core.database import get_db
from app.models.user import User
from app.schemas.health import ChatRead, ChatRequest
from app.services.health import ChatService
from app.services.voice_service import VoiceService

router = APIRouter(prefix="/chat", tags=["AI Health Coach"])


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    language: str = Field(default="en", min_length=2, max_length=16)


class TTSResponse(BaseModel):
    audio_base64: str
    encoding: str = "base64"
    media_type: str = "audio/plain"


@router.post("/message", response_model=ChatRead)
async def message(payload: ChatRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await ChatService(db).message(user, payload)


@router.post("/voice", response_model=ChatRead)
async def voice(language: str = "en", file: UploadFile = File(...), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    content = await file.read()
    transcript = await VoiceService().transcribe(content, language)
    return await ChatService(db).message(user, ChatRequest(message=transcript, language=language))


@router.post("/tts", response_model=TTSResponse)
async def text_to_speech(payload: TTSRequest, _: User = Depends(get_current_user)):
    audio = await VoiceService().synthesize(payload.text, payload.language)
    return TTSResponse(audio_base64=audio)


@router.get("/history", response_model=list[ChatRead])
async def history(
    pagination: PaginationParams = Depends(pagination_params),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ChatService(db).history(user, pagination.limit, pagination.offset)
