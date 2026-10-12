from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.core.security import UserRole
from app.models.doctor import DoctorNote, DoctorPatient
from app.models.pcos import PCOSPrediction
from app.models.ppd import PPDAssessment
from app.models.user import MotherProfile, User
from app.models.wellness import Cycle, Journal, Mood, Symptom

router = APIRouter(prefix="/doctor", tags=["Doctor Portal"])
doctor_or_admin = Depends(require_roles(UserRole.DOCTOR, UserRole.ADMIN))


class DoctorNoteCreate(BaseModel):
    clinical_observations: str
    follow_up_recommendation: str | None = None
    prescribed_advice: str | None = None


class DoctorNoteRead(BaseModel):
    id: UUID
    doctor_id: UUID
    patient_id: UUID
    clinical_observations: str
    follow_up_recommendation: str | None
    prescribed_advice: str | None
    created_at: str


@router.get("/patients")
async def list_patients(
    doctor: User = doctor_or_admin,
    db: AsyncSession = Depends(get_db),
):
    """List all mothers / patients authorized for or assigned to this doctor."""
    # Query all mothers
    stmt = (
        select(User, MotherProfile)
        .outerjoin(MotherProfile, MotherProfile.user_id == User.id)
        .where(User.role == UserRole.MOTHER, User.is_active == True)
        .order_by(desc(User.created_at))
    )
    result = await db.execute(stmt)
    records = result.all()

    patient_list = []
    for user_obj, profile in records:
        # Fetch latest PCOS and PPD
        pcos_stmt = select(PCOSPrediction).where(PCOSPrediction.user_id == user_obj.id).order_by(desc(PCOSPrediction.created_at)).limit(1)
        ppd_stmt = select(PPDAssessment).where(PPDAssessment.user_id == user_obj.id).order_by(desc(PPDAssessment.created_at)).limit(1)

        latest_pcos = (await db.execute(pcos_stmt)).scalar_one_or_none()
        latest_ppd = (await db.execute(ppd_stmt)).scalar_one_or_none()

        patient_list.append({
            "id": str(user_obj.id),
            "name": user_obj.name,
            "email": user_obj.email,
            "phone": user_obj.phone,
            "preferred_language": user_obj.preferred_language,
            "age": profile.age if profile else None,
            "pregnancy_status": profile.pregnancy_status if profile else None,
            "delivery_date": str(profile.delivery_date) if profile and profile.delivery_date else None,
            "blood_group": profile.blood_group if profile else None,
            "emergency_contact": profile.emergency_contact if profile else None,
            "latest_pcos_risk": latest_pcos.risk_level if latest_pcos else "Not screened",
            "latest_ppd_risk": latest_ppd.risk_level if latest_ppd else "Not screened",
            "created_at": user_obj.created_at.isoformat() if user_obj.created_at else None,
        })
    return patient_list


@router.get("/patients/{patient_id}/timeline")
async def get_patient_timeline(
    patient_id: UUID,
    doctor: User = doctor_or_admin,
    db: AsyncSession = Depends(get_db),
):
    patient = await db.scalar(select(User).where(User.id == patient_id))
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    profile = await db.scalar(select(MotherProfile).where(MotherProfile.user_id == patient_id))
    moods = (await db.execute(select(Mood).where(Mood.user_id == patient_id).order_by(desc(Mood.created_at)).limit(15))).scalars().all()
    symptoms = (await db.execute(select(Symptom).where(Symptom.user_id == patient_id).order_by(desc(Symptom.created_at)).limit(15))).scalars().all()
    pcos_list = (await db.execute(select(PCOSPrediction).where(PCOSPrediction.user_id == patient_id).order_by(desc(PCOSPrediction.created_at)).limit(5))).scalars().all()
    ppd_list = (await db.execute(select(PPDAssessment).where(PPDAssessment.user_id == patient_id).order_by(desc(PPDAssessment.created_at)).limit(5))).scalars().all()
    cycles = (await db.execute(select(Cycle).where(Cycle.user_id == patient_id).order_by(desc(Cycle.created_at)).limit(5))).scalars().all()
    notes = (await db.execute(select(DoctorNote).where(DoctorNote.patient_id == patient_id).order_by(desc(DoctorNote.created_at)))).scalars().all()

    return {
        "patient": {
            "id": str(patient.id),
            "name": patient.name,
            "email": patient.email,
            "phone": patient.phone,
            "age": profile.age if profile else None,
            "blood_group": profile.blood_group if profile else None,
            "pregnancy_status": profile.pregnancy_status if profile else None,
            "emergency_contact": profile.emergency_contact if profile else None,
        },
        "moods": [{"id": str(m.id), "mood": m.mood, "note": m.note, "created_at": m.created_at.isoformat()} for m in moods],
        "symptoms": [{"id": str(s.id), "fatigue": s.fatigue, "headache": s.headache, "sleep_issue": s.sleep_issue, "anxiety": s.anxiety, "cramps": s.cramps, "created_at": s.created_at.isoformat()} for s in symptoms],
        "pcos_screenings": [{"id": str(p.id), "risk_level": p.risk_level, "probability": p.probability, "recommendations": p.recommendations, "created_at": p.created_at.isoformat()} for p in pcos_list],
        "ppd_screenings": [{"id": str(d.id), "risk_level": d.risk_level, "epds_score": d.epds_score, "sentiment": d.sentiment, "created_at": d.created_at.isoformat()} for d in ppd_list],
        "cycles": [{"id": str(c.id), "last_period_date": str(c.last_period_date), "cycle_length": c.cycle_length, "next_period_prediction": str(c.next_period_prediction)} for c in cycles],
        "doctor_notes": [{"id": str(n.id), "clinical_observations": n.clinical_observations, "follow_up_recommendation": n.follow_up_recommendation, "prescribed_advice": n.prescribed_advice, "created_at": n.created_at.isoformat()} for n in notes],
    }


@router.post("/patients/{patient_id}/notes")
async def add_doctor_note(
    patient_id: UUID,
    payload: DoctorNoteCreate,
    doctor: User = doctor_or_admin,
    db: AsyncSession = Depends(get_db),
):
    note = DoctorNote(
        doctor_id=doctor.id,
        patient_id=patient_id,
        clinical_observations=payload.clinical_observations,
        follow_up_recommendation=payload.follow_up_recommendation,
        prescribed_advice=payload.prescribed_advice,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return {
        "id": str(note.id),
        "doctor_id": str(note.doctor_id),
        "patient_id": str(note.patient_id),
        "clinical_observations": note.clinical_observations,
        "follow_up_recommendation": note.follow_up_recommendation,
        "prescribed_advice": note.prescribed_advice,
        "created_at": note.created_at.isoformat(),
    }
