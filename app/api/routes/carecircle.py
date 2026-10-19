import re
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import PaginationParams, get_current_user, pagination_params, require_roles
from app.core.database import get_db
from app.core.security import UserRole
from app.models.carecircle import CareCircleAccess, CareCircleQR
from app.models.chat import ChatMessage
from app.models.pcos import PCOSPrediction
from app.models.ppd import PPDAssessment
from app.models.user import MotherProfile, User
from app.models.wellness import Mood, Symptom

router = APIRouter(prefix="/carecircle", tags=["CareCircle QR TrustVault"])
mother_user = Depends(require_roles(UserRole.MOTHER))


class AccessRequestPayload(BaseModel):
    token: str
    relationship_label: str = "Caregiver"


class AccessResponsePayload(BaseModel):
    action: str  # approve or reject
    share_emergency: bool = True
    share_risk_category: bool = True
    share_wellness_summary: bool = True
    share_doctor_notes: bool = False
    share_nutrition: bool = False
    share_chat_history: bool = False


@router.post("/qr/generate")
async def generate_qr_token(
    user: User = mother_user,
    db: AsyncSession = Depends(get_db),
):
    """Generate or refresh a secure QR token for the mother."""
    now = datetime.now(timezone.utc)
    active_qrs = (
        await db.scalars(
            select(CareCircleQR).where(
                CareCircleQR.user_id == user.id,
                CareCircleQR.expires_at > now,
            )
        )
    ).all()
    for active_qr in active_qrs:
        active_qr.expires_at = now

    qr_record = CareCircleQR.create_token(user_id=user.id, valid_days=30)
    db.add(qr_record)
    await db.commit()
    await db.refresh(qr_record)
    return {
        "token": qr_record.token,
        "expires_at": qr_record.expires_at.isoformat(),
        "qr_payload": f"/verify-access?token={qr_record.token}",
        "message": "Secure CareCircle token generated successfully. Does not contain sensitive medical data.",
    }


@router.get("/qr")
async def get_active_qr(
    user: User = mother_user,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(CareCircleQR)
        .where(CareCircleQR.user_id == user.id, CareCircleQR.expires_at > datetime.now(timezone.utc))
        .order_by(desc(CareCircleQR.created_at))
    )
    active_qrs = list((await db.scalars(stmt)).all())
    if active_qrs:
        qr = active_qrs[0]
        now = datetime.now(timezone.utc)
        for stale_qr in active_qrs[1:]:
            stale_qr.expires_at = now
        if len(active_qrs) > 1:
            await db.commit()
            await db.refresh(qr)
    else:
        # Automatically generate one
        qr = CareCircleQR.create_token(user_id=user.id, valid_days=30)
        db.add(qr)
        await db.commit()
        await db.refresh(qr)

    return {
        "token": qr.token,
        "expires_at": qr.expires_at.isoformat(),
        "qr_payload": f"/verify-access?token={qr.token}",
    }


@router.post("/request-access")
async def request_access(
    payload: AccessRequestPayload,
    requester: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Scanned user or caregiver requests access using the token."""
    if not re.fullmatch(r"[A-Za-z0-9_-]{20,128}", payload.token):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid QR token")

    qr = await db.scalar(select(CareCircleQR).where(CareCircleQR.token == payload.token))
    if not qr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid QR token")
    expires_at = qr.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="QR token expired")

    if qr.user_id == requester.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot request access to your own profile")

    mother = await db.scalar(
        select(User).where(
            User.id == qr.user_id,
            User.role == UserRole.MOTHER,
            User.is_active.is_(True),
        )
    )
    if not mother:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid QR token")

    existing = await db.scalar(
        select(CareCircleAccess)
        .where(
            CareCircleAccess.user_id == mother.id,
            CareCircleAccess.requester_id == requester.id,
        )
        .order_by(desc(CareCircleAccess.requested_at))
        .limit(1)
    )
    existing_status = "revoked" if existing and existing.revoked_at is not None else existing.status if existing else None
    if existing and existing_status in {"pending", "approved"}:
        message = {
            "pending": "Access request is waiting for the mother's approval.",
            "approved": "Access is approved with the mother's selected sharing permissions.",
        }[existing_status]
        return {
            "id": str(existing.id),
            "status": existing_status,
            "message": message,
        }

    if existing:
        access = existing
        access.relationship_label = payload.relationship_label
        access.status = "pending"
        access.revoked_at = None
        access.responded_at = None
        access.share_emergency = False
        access.share_risk_category = False
        access.share_wellness_summary = False
        access.share_doctor_notes = False
        access.share_nutrition = False
        access.share_chat_history = False
    else:
        access = CareCircleAccess(
            user_id=mother.id,
            requester_id=requester.id,
            relationship_label=payload.relationship_label,
            status="pending",
            share_emergency=False,
            share_risk_category=False,
            share_wellness_summary=False,
            share_doctor_notes=False,
            share_nutrition=False,
            share_chat_history=False,
        )
        db.add(access)
    await db.commit()
    await db.refresh(access)
    if existing_status == "revoked":
        message = "Previous access was revoked. This new request is pending the mother's explicit approval."
    elif existing_status == "rejected":
        message = "The previous request was declined. This new request is pending the mother's explicit approval."
    else:
        message = "Access requested successfully. Waiting for mother's explicit approval."
    return {
        "id": str(access.id),
        "status": access.status,
        "message": message,
    }


@router.get("/requests")
async def list_mother_requests(
    user: User = mother_user,
    db: AsyncSession = Depends(get_db),
):
    """Mother lists all incoming CareCircle access requests."""
    stmt = (
        select(CareCircleAccess, User)
        .join(User, User.id == CareCircleAccess.requester_id)
        .where(CareCircleAccess.user_id == user.id)
        .order_by(desc(CareCircleAccess.requested_at))
    )
    results = (await db.execute(stmt)).all()

    requests_list = []
    for access, req_user in results:
        requests_list.append({
            "id": str(access.id),
            "requester_name": req_user.name,
            "requester_email": req_user.email,
            "requester_role": req_user.role,
            "relationship_label": access.relationship_label,
            "status": access.status,
            "share_emergency": access.share_emergency,
            "share_risk_category": access.share_risk_category,
            "share_wellness_summary": access.share_wellness_summary,
            "share_nutrition": access.share_nutrition,
            "share_chat_history": access.share_chat_history,
            "requested_at": access.requested_at.isoformat(),
            "responded_at": access.responded_at.isoformat() if access.responded_at else None,
            "revoked_at": access.revoked_at.isoformat() if access.revoked_at else None,
        })
    return requests_list


@router.post("/requests/{request_id}/respond")
async def respond_to_request(
    request_id: UUID,
    payload: AccessResponsePayload,
    user: User = mother_user,
    db: AsyncSession = Depends(get_db),
):
    """Mother approves or rejects the access request and sets sharing permissions."""
    access = await db.scalar(
        select(CareCircleAccess).where(CareCircleAccess.id == request_id, CareCircleAccess.user_id == user.id)
    )
    if not access:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Access request not found")

    access.status = "approved" if payload.action.lower() == "approve" else "rejected"
    if payload.action.lower() == "approve":
        access.revoked_at = None
    access.share_emergency = payload.share_emergency
    access.share_risk_category = payload.share_risk_category
    access.share_wellness_summary = payload.share_wellness_summary
    access.share_doctor_notes = payload.share_doctor_notes
    access.share_nutrition = payload.share_nutrition
    access.share_chat_history = payload.share_chat_history
    access.responded_at = datetime.now(timezone.utc)

    await db.commit()
    return {"id": str(access.id), "status": access.status, "message": f"Access request has been {access.status}"}


@router.post("/requests/{request_id}/revoke")
async def revoke_access(
    request_id: UUID,
    user: User = mother_user,
    db: AsyncSession = Depends(get_db),
):
    """Mother revokes previously approved access immediately."""
    access = await db.scalar(
        select(CareCircleAccess).where(CareCircleAccess.id == request_id, CareCircleAccess.user_id == user.id)
    )
    if not access:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Access request not found")

    access.status = "revoked"
    access.revoked_at = datetime.now(timezone.utc)
    await db.commit()
    return {"id": str(access.id), "status": "revoked", "message": "Access revoked immediately."}


@router.get("/requests/{request_id}/status")
async def get_access_request_status(
    request_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Let a requester check only their own access request state."""
    access = await db.scalar(
        select(CareCircleAccess).where(
            CareCircleAccess.id == request_id,
            CareCircleAccess.requester_id == user.id,
        )
    )
    if not access:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Access request not found")
    access_status = "revoked" if access.revoked_at is not None else access.status
    return {"id": str(access.id), "status": access_status}


@router.get("/connections")
async def list_caregiver_connections(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Requester (caregiver/doctor) lists approved connections to mothers."""
    stmt = (
        select(CareCircleAccess, User)
        .join(User, User.id == CareCircleAccess.user_id)
        .where(
            CareCircleAccess.requester_id == user.id,
            CareCircleAccess.status == "approved",
            CareCircleAccess.revoked_at.is_(None),
            User.role == UserRole.MOTHER,
            User.is_active.is_(True),
        )
    )
    results = (await db.execute(stmt)).all()

    connections = []
    for access, mother in results:
        connections.append({
            "access_id": str(access.id),
            "mother_id": str(mother.id),
            "mother_name": mother.name,
            "relationship_label": access.relationship_label,
            "permissions": {
                "emergency": access.share_emergency,
                "risk_category": access.share_risk_category,
                "wellness_summary": access.share_wellness_summary,
                "nutrition": access.share_nutrition,
                "chat_history": access.share_chat_history,
            },
        })
    return connections


@router.get("/shared-summary/{access_id}")
async def get_shared_summary(
    access_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Permitted caregiver or doctor views the mother's consent-filtered summary."""
    access = await db.scalar(select(CareCircleAccess).where(CareCircleAccess.id == access_id))
    if not access:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")

    if access.requester_id != user.id and access.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized access")

    if access.status != "approved" or access.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Access is {access.status}")

    mother = await db.scalar(
        select(User).where(
            User.id == access.user_id,
            User.role == UserRole.MOTHER,
            User.is_active.is_(True),
        )
    )
    if not mother:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
    profile = await db.scalar(select(MotherProfile).where(MotherProfile.user_id == access.user_id))

    response_data = {
        "mother_name": mother.name,
        "relationship_label": access.relationship_label,
        "status": "approved",
    }

    if access.share_emergency:
        response_data["emergency"] = {
            "emergency_contact": profile.emergency_contact if profile else "Not configured",
            "blood_group": profile.blood_group if profile else "Not recorded",
            "national_sos": "112",
        }

    if access.share_risk_category:
        pcos = await db.scalar(select(PCOSPrediction).where(PCOSPrediction.user_id == mother.id).order_by(desc(PCOSPrediction.created_at)).limit(1))
        ppd = await db.scalar(select(PPDAssessment).where(PPDAssessment.user_id == mother.id).order_by(desc(PPDAssessment.created_at)).limit(1))
        response_data["screenings"] = {
            "pcos_risk": pcos.risk_level if pcos else "Not screened",
            "ppd_risk": ppd.risk_level if ppd else "Not screened",
            "disclaimer": "Early risk indication only. Please consult a qualified healthcare provider for clinical diagnosis.",
        }

    if access.share_wellness_summary:
        latest_mood = await db.scalar(select(Mood).where(Mood.user_id == mother.id).order_by(desc(Mood.created_at)).limit(1))
        latest_symptom = await db.scalar(select(Symptom).where(Symptom.user_id == mother.id).order_by(desc(Symptom.created_at)).limit(1))
        response_data["wellness"] = {
            "today_mood": latest_mood.mood if latest_mood else "Not logged today",
            "recent_fatigue": latest_symptom.fatigue if latest_symptom else False,
            "recent_sleep_issue": latest_symptom.sleep_issue if latest_symptom else False,
            "recent_anxiety": latest_symptom.anxiety if latest_symptom else False,
        }

    return response_data


@router.get("/chat-history/{access_id}")
async def get_shared_chat_history(
    access_id: UUID,
    pagination: PaginationParams = Depends(pagination_params),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Approved caregiver views the mother's chat history only with chat consent."""
    access = await db.scalar(select(CareCircleAccess).where(CareCircleAccess.id == access_id))
    if not access:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")

    if access.requester_id != user.id and access.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized access")

    if access.status != "approved" or access.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Access is {access.status}")

    if not access.share_chat_history:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chat history sharing is not consented")

    chats = (
        await db.execute(
            select(ChatMessage)
            .where(ChatMessage.user_id == access.user_id)
            .order_by(desc(ChatMessage.created_at))
            .limit(pagination.limit)
            .offset(pagination.offset)
        )
    ).scalars().all()
    return [
        {
            "id": str(chat.id),
            "message": chat.message,
            "response": chat.response,
            "language": chat.language,
            "created_at": chat.created_at.isoformat(),
        }
        for chat in chats
    ]
