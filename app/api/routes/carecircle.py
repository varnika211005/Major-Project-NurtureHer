from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.carecircle import CareCircleAccess, CareCircleQR
from app.models.pcos import PCOSPrediction
from app.models.ppd import PPDAssessment
from app.models.user import MotherProfile, User
from app.models.wellness import Mood, Symptom

router = APIRouter(prefix="/carecircle", tags=["CareCircle QR TrustVault"])


class AccessRequestPayload(BaseModel):
    token: str
    relationship_label: str = "Caregiver"


class AccessResponsePayload(BaseModel):
    action: str  # approve or reject
    share_emergency: bool = True
    share_risk_category: bool = True
    share_wellness_summary: bool = True
    share_doctor_notes: bool = False


@router.post("/qr/generate")
async def generate_qr_token(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate or refresh a secure QR token for the mother."""
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
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(CareCircleQR)
        .where(CareCircleQR.user_id == user.id, CareCircleQR.expires_at > datetime.now(timezone.utc))
        .order_by(desc(CareCircleQR.created_at))
        .limit(1)
    )
    qr = await db.scalar(stmt)
    if not qr:
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
    qr = await db.scalar(select(CareCircleQR).where(CareCircleQR.token == payload.token))
    if not qr or qr.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired QR token")

    if qr.user_id == requester.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot request access to your own profile")

    # Check existing access request
    existing = await db.scalar(
        select(CareCircleAccess).where(
            CareCircleAccess.user_id == qr.user_id,
            CareCircleAccess.requester_id == requester.id,
            CareCircleAccess.status.in_(["pending", "approved"]),
        )
    )
    if existing:
        return {
            "id": str(existing.id),
            "status": existing.status,
            "message": f"Access request is already {existing.status}",
        }

    access = CareCircleAccess(
        user_id=qr.user_id,
        requester_id=requester.id,
        relationship_label=payload.relationship_label,
        status="pending",
    )
    db.add(access)
    await db.commit()
    await db.refresh(access)
    return {
        "id": str(access.id),
        "status": access.status,
        "message": "Access requested successfully. Waiting for mother's explicit approval.",
    }


@router.get("/requests")
async def list_mother_requests(
    user: User = Depends(get_current_user),
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
            "requested_at": access.requested_at.isoformat(),
            "responded_at": access.responded_at.isoformat() if access.responded_at else None,
            "revoked_at": access.revoked_at.isoformat() if access.revoked_at else None,
        })
    return requests_list


@router.post("/requests/{request_id}/respond")
async def respond_to_request(
    request_id: UUID,
    payload: AccessResponsePayload,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mother approves or rejects the access request and sets sharing permissions."""
    access = await db.scalar(
        select(CareCircleAccess).where(CareCircleAccess.id == request_id, CareCircleAccess.user_id == user.id)
    )
    if not access:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Access request not found")

    access.status = "approved" if payload.action.lower() == "approve" else "rejected"
    access.share_emergency = payload.share_emergency
    access.share_risk_category = payload.share_risk_category
    access.share_wellness_summary = payload.share_wellness_summary
    access.share_doctor_notes = payload.share_doctor_notes
    access.responded_at = datetime.now(timezone.utc)

    await db.commit()
    return {"id": str(access.id), "status": access.status, "message": f"Access request has been {access.status}"}


@router.post("/requests/{request_id}/revoke")
async def revoke_access(
    request_id: UUID,
    user: User = Depends(get_current_user),
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


@router.get("/connections")
async def list_caregiver_connections(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Requester (caregiver/doctor) lists approved connections to mothers."""
    stmt = (
        select(CareCircleAccess, User)
        .join(User, User.id == CareCircleAccess.user_id)
        .where(CareCircleAccess.requester_id == user.id, CareCircleAccess.status == "approved")
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
            },
        })
    return connections


@router.get("/shared-summary/{access_id}")
async def get_shared_summary(
    access_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Permitted caregiver or worker views the mother's consent-filtered summary."""
    access = await db.scalar(select(CareCircleAccess).where(CareCircleAccess.id == access_id))
    if not access:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")

    if access.requester_id != user.id and access.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized access")

    if access.status != "approved":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Access is {access.status}")

    mother = await db.scalar(select(User).where(User.id == access.user_id))
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
