import json
from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import and_, desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import PaginationParams, pagination_params, require_roles
from app.core.database import get_db
from app.core.security import UserRole
from app.models.alert import HighRiskCase
from app.models.audit import AuditLog
from app.models.carecircle import CareCircleAccess
from app.models.chat import ChatMessage
from app.models.doctor import DoctorNote, DoctorPatient
from app.models.enums import CaseStatus
from app.models.pcos import PCOSPrediction
from app.models.ppd import PPDAssessment
from app.models.user import MotherProfile, User
from app.models.wellness import Mood, Symptom

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


class PatientAssignRequest(BaseModel):
    patient_id: UUID | None = None
    mother_id: str | None = None
    doctor_id: UUID | None = None  # Admin only can specify a different doctor_id


async def _get_authorized_patient(
    doctor: User,
    patient_id: UUID,
    db: AsyncSession,
) -> tuple[User, CareCircleAccess | None]:
    patient = await db.scalar(
        select(User).where(
            User.id == patient_id,
            User.role == UserRole.MOTHER,
            User.is_active.is_(True),
        )
    )
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    if doctor.role == UserRole.ADMIN:
        return patient, None

    # Check active doctor-patient assignment (authoritative)
    dp = await db.scalar(
        select(DoctorPatient).where(
            DoctorPatient.doctor_id == doctor.id,
            DoctorPatient.patient_id == patient.id,
            DoctorPatient.status == "active",
            DoctorPatient.deleted_at.is_(None),
        )
    )

    # Check approved CareCircle access
    access = await db.scalar(
        select(CareCircleAccess).where(
            CareCircleAccess.user_id == patient.id,
            CareCircleAccess.requester_id == doctor.id,
            CareCircleAccess.status == "approved",
            CareCircleAccess.revoked_at.is_(None),
        )
    )
    if not dp and not access:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return patient, access


@router.get("/patients")
async def list_patients(
    doctor: User = doctor_or_admin,
    db: AsyncSession = Depends(get_db),
):
    """List mothers with an active doctor-patient assignment or approved CareCircle authorization for this doctor."""
    if doctor.role == UserRole.ADMIN:
        stmt = (
            select(User, MotherProfile)
            .outerjoin(MotherProfile, MotherProfile.user_id == User.id)
            .where(User.role == UserRole.MOTHER, User.is_active.is_(True))
            .order_by(desc(User.created_at))
        )
        result = await db.execute(stmt)
        records = [(user, profile, None) for user, profile in result.all()]
    else:
        stmt = (
            select(User, MotherProfile, CareCircleAccess)
            .outerjoin(
                DoctorPatient,
                and_(
                    DoctorPatient.patient_id == User.id,
                    DoctorPatient.doctor_id == doctor.id,
                    DoctorPatient.status == "active",
                    DoctorPatient.deleted_at.is_(None),
                ),
            )
            .outerjoin(
                CareCircleAccess,
                and_(
                    CareCircleAccess.user_id == User.id,
                    CareCircleAccess.requester_id == doctor.id,
                    CareCircleAccess.status == "approved",
                    CareCircleAccess.revoked_at.is_(None),
                ),
            )
            .outerjoin(MotherProfile, MotherProfile.user_id == User.id)
            .where(
                User.role == UserRole.MOTHER,
                User.is_active.is_(True),
                or_(
                    DoctorPatient.id.is_not(None),
                    CareCircleAccess.id.is_not(None),
                ),
            )
            .order_by(desc(User.created_at))
        )
        result = await db.execute(stmt)
        records = result.all()

    patient_list = []
    seen_patient_ids: set[UUID] = set()
    for user_obj, profile, access in records:
        if user_obj.id in seen_patient_ids:
            continue
        seen_patient_ids.add(user_obj.id)

        share_risk_category = access is None or access.share_risk_category
        latest_pcos = None
        latest_ppd = None
        if share_risk_category:
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
            "blood_group": profile.blood_group if profile and (access is None or access.share_emergency) else None,
            "emergency_contact": profile.emergency_contact if profile and (access is None or access.share_emergency) else None,
            "latest_pcos_risk": latest_pcos.risk_level if latest_pcos else "Not screened" if share_risk_category else "Not shared",
            "latest_ppd_risk": latest_ppd.risk_level if latest_ppd else "Not screened" if share_risk_category else "Not shared",
            "created_at": user_obj.created_at.isoformat() if user_obj.created_at else None,
        })
    return patient_list


@router.get("/patients/{patient_id}/timeline")
async def get_patient_timeline(
    patient_id: UUID,
    doctor: User = doctor_or_admin,
    db: AsyncSession = Depends(get_db),
):
    patient, access = await _get_authorized_patient(doctor, patient_id, db)
    share_wellness_summary = access is None or access.share_wellness_summary
    share_risk_category = access is None or access.share_risk_category

    profile = await db.scalar(select(MotherProfile).where(MotherProfile.user_id == patient_id))
    moods = (
        (await db.execute(select(Mood).where(Mood.user_id == patient_id).order_by(desc(Mood.created_at)).limit(5))).scalars().all()
        if share_wellness_summary
        else []
    )
    symptoms = (
        (await db.execute(select(Symptom).where(Symptom.user_id == patient_id).order_by(desc(Symptom.created_at)).limit(1))).scalars().all()
        if share_wellness_summary
        else []
    )
    pcos_list = (
        (await db.execute(select(PCOSPrediction).where(PCOSPrediction.user_id == patient_id).order_by(desc(PCOSPrediction.created_at)).limit(5))).scalars().all()
        if share_risk_category
        else []
    )
    ppd_list = (
        (await db.execute(select(PPDAssessment).where(PPDAssessment.user_id == patient_id).order_by(desc(PPDAssessment.created_at)).limit(5))).scalars().all()
        if share_risk_category
        else []
    )
    notes_stmt = select(DoctorNote).where(DoctorNote.patient_id == patient_id)
    if doctor.role != UserRole.ADMIN and not (access and access.share_doctor_notes):
        notes_stmt = notes_stmt.where(DoctorNote.doctor_id == doctor.id)
    notes = (await db.execute(notes_stmt.order_by(desc(DoctorNote.created_at)))).scalars().all()
    return {
        "patient": {
            "id": str(patient.id),
            "name": patient.name,
            "email": patient.email,
            "phone": patient.phone,
            "age": profile.age if profile else None,
            "blood_group": profile.blood_group if profile and (access is None or access.share_emergency) else None,
            "pregnancy_status": profile.pregnancy_status if profile else None,
            "emergency_contact": profile.emergency_contact if profile and (access is None or access.share_emergency) else None,
        },
        "moods": [{"id": str(m.id), "mood": m.mood, "note": None, "created_at": m.created_at.isoformat()} for m in moods],
        "symptoms": [{"id": str(s.id), "fatigue": s.fatigue, "sleep_issue": s.sleep_issue, "anxiety": s.anxiety, "created_at": s.created_at.isoformat()} for s in symptoms],
        "pcos_screenings": [{"id": str(p.id), "risk_level": p.risk_level, "created_at": p.created_at.isoformat()} for p in pcos_list],
        "ppd_screenings": [{"id": str(d.id), "risk_level": d.risk_level, "created_at": d.created_at.isoformat()} for d in ppd_list],
        "cycles": [],
        "doctor_notes": [{"id": str(n.id), "clinical_observations": n.clinical_observations, "follow_up_recommendation": n.follow_up_recommendation, "prescribed_advice": n.prescribed_advice, "created_at": n.created_at.isoformat()} for n in notes],
    }


@router.post("/patients/{patient_id}/notes")
async def add_doctor_note(
    patient_id: UUID,
    payload: DoctorNoteCreate,
    doctor: User = doctor_or_admin,
    db: AsyncSession = Depends(get_db),
):
    await _get_authorized_patient(doctor, patient_id, db)
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


@router.get("/patients/{patient_id}/chat-history")
async def get_patient_chat_history(
    patient_id: UUID,
    pagination: PaginationParams = Depends(pagination_params),
    doctor: User = doctor_or_admin,
    db: AsyncSession = Depends(get_db),
):
    """Assigned doctor views a patient's AI chat history when the mother consented."""
    patient, access = await _get_authorized_patient(doctor, patient_id, db)
    if doctor.role != UserRole.ADMIN and (access is None or not access.share_chat_history):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chat history sharing is not consented")
    chats = (
        await db.execute(
            select(ChatMessage)
            .where(ChatMessage.user_id == patient.id)
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


@router.get("/escalations")
async def list_escalations(
    doctor: User = doctor_or_admin,
    db: AsyncSession = Depends(get_db),
):
    """Open chat-triage escalation cases for the doctor's authorized patients."""
    stmt = (
        select(HighRiskCase, User)
        .join(User, User.id == HighRiskCase.user_id)
        .where(HighRiskCase.risk_type == "chat_triage", HighRiskCase.status == CaseStatus.OPEN)
        .order_by(desc(HighRiskCase.created_at))
        .limit(50)
    )
    if doctor.role != UserRole.ADMIN:
        assigned_patients = select(DoctorPatient.patient_id).where(
            DoctorPatient.doctor_id == doctor.id,
            DoctorPatient.status == "active",
            DoctorPatient.deleted_at.is_(None),
        )
        consented_patients = select(CareCircleAccess.user_id).where(
            CareCircleAccess.requester_id == doctor.id,
            CareCircleAccess.status == "approved",
            CareCircleAccess.revoked_at.is_(None),
        )
        authorized = assigned_patients.union(consented_patients)
        stmt = stmt.where(HighRiskCase.user_id.in_(authorized))
    queue = []
    for case, mother in (await db.execute(stmt)).all():
        queue.append({
            "case_id": str(case.id),
            "mother_id": str(mother.id),
            "mother_name": mother.name,
            "severity": case.risk_level.value,
            "risk_type": case.risk_type,
            "status": case.status.value,
            "created_at": case.created_at.isoformat(),
        })
    return queue


@router.post("/patients/assign")
async def assign_patient_to_doctor(
    payload: PatientAssignRequest,
    doctor: User = doctor_or_admin,
    db: AsyncSession = Depends(get_db),
):
    """Assign a patient to a doctor. Doctors can assign to themselves; Admins can assign to any verified doctor."""
    target_doctor_id = doctor.id
    if doctor.role == UserRole.ADMIN and payload.doctor_id:
        target_doctor_id = payload.doctor_id

    target_doctor = await db.scalar(
        select(User).where(
            User.id == target_doctor_id,
            User.role == UserRole.DOCTOR,
        )
    )
    if not target_doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    if not target_doctor.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor account is inactive")
    if not target_doctor.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Doctor account is pending verification and cannot accept patients",
        )

    patient = None
    if payload.patient_id:
        patient = await db.scalar(
            select(User).where(
                User.id == payload.patient_id,
                User.role == UserRole.MOTHER,
                User.is_active.is_(True),
            )
        )
    elif payload.mother_id and payload.mother_id.strip():
        m_term = payload.mother_id.strip()
        conditions = [
            User.custom_id == m_term,
            User.custom_id == m_term.upper(),
            User.email == m_term.lower(),
        ]
        try:
            conditions.append(User.id == UUID(m_term))
        except (ValueError, AttributeError):
            pass
        patient = await db.scalar(
            select(User).where(
                User.role == UserRole.MOTHER,
                User.is_active.is_(True),
                or_(*conditions),
            )
        )

    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found or inactive")

    # Check for existing active assignment to prevent duplicates
    existing_active = await db.scalar(
        select(DoctorPatient).where(
            DoctorPatient.doctor_id == target_doctor_id,
            DoctorPatient.patient_id == patient.id,
            DoctorPatient.status == "active",
            DoctorPatient.deleted_at.is_(None),
        )
    )
    if existing_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Patient is already actively assigned to this doctor",
        )

    # If there is an existing completed/inactive assignment, reactivate it
    existing_record = await db.scalar(
        select(DoctorPatient).where(
            DoctorPatient.doctor_id == target_doctor_id,
            DoctorPatient.patient_id == patient.id,
        ).order_by(desc(DoctorPatient.created_at)).limit(1)
    )
    if existing_record and existing_record.status != "active":
        existing_record.status = "active"
        existing_record.deleted_at = None
        existing_record.updated_at = datetime.now(timezone.utc)
        assignment = existing_record
    else:
        assignment = DoctorPatient(
            doctor_id=target_doctor_id,
            patient_id=patient.id,
            status="active",
        )
        db.add(assignment)

    audit = AuditLog(
        user_id=doctor.id,
        action="ASSIGN_PATIENT",
        resource=f"/doctor/patients/{patient.id}/assign",
        metadata_json=json.dumps({
            "doctor_id": str(target_doctor_id),
            "patient_id": str(patient.id),
            "assigned_by": str(doctor.id),
        }),
    )
    db.add(audit)

    await db.commit()
    await db.refresh(assignment)

    return {
        "message": "Patient successfully assigned",
        "assignment_id": str(assignment.id),
        "doctor_id": str(target_doctor_id),
        "patient_id": str(patient.id),
        "patient_name": patient.name,
        "status": assignment.status,
    }


@router.post("/patients/{patient_id}/end-care")
async def end_patient_care(
    patient_id: UUID,
    doctor: User = doctor_or_admin,
    db: AsyncSession = Depends(get_db),
):
    """End care for an assigned patient."""
    stmt = select(DoctorPatient).where(
        DoctorPatient.patient_id == patient_id,
        DoctorPatient.status == "active",
        DoctorPatient.deleted_at.is_(None),
    )
    if doctor.role != UserRole.ADMIN:
        stmt = stmt.where(DoctorPatient.doctor_id == doctor.id)

    assignment = await db.scalar(stmt)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active doctor-patient assignment not found",
        )

    assignment.status = "completed"
    assignment.deleted_at = datetime.now(timezone.utc)
    assignment.updated_at = datetime.now(timezone.utc)

    audit = AuditLog(
        user_id=doctor.id,
        action="END_PATIENT_CARE",
        resource=f"/doctor/patients/{patient_id}/end-care",
        metadata_json=json.dumps({
            "assignment_id": str(assignment.id),
            "doctor_id": str(assignment.doctor_id),
            "patient_id": str(patient_id),
            "ended_by": str(doctor.id),
        }),
    )
    db.add(audit)

    await db.commit()
    return {
        "message": "Patient care ended successfully",
        "assignment_id": str(assignment.id),
        "status": "completed",
    }
