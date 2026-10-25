from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import PaginationParams, get_current_user, pagination_params, require_roles
from app.core.database import get_db
from app.core.security import UserRole
from app.models.user import User
from app.analytics.dashboard import MotherAnalyticsService
from app.schemas.common import MessageResponse
from app.schemas.wellness import (
    DashboardStats,
    JournalCreate,
    JournalRead,
    JournalUpdate,
    MoodCreate,
    MoodRead,
    MoodUpdate,
    MotherProfileUpdate,
    SymptomCreate,
    SymptomRead,
    SymptomUpdate,
    WellnessInsightsRead,
)
from app.services.wellness import WellnessService

router = APIRouter(prefix="/wellness", tags=["Mother Wellness"])
mother_user = Depends(require_roles(UserRole.MOTHER, UserRole.ADMIN))


@router.post("/mood", response_model=MoodRead)
async def create_mood(payload: MoodCreate, user: User = mother_user, db: AsyncSession = Depends(get_db)):
    return await WellnessService(db).create_mood(user, payload)


@router.get("/mood", response_model=list[MoodRead])
async def list_moods(
    pagination: PaginationParams = Depends(pagination_params),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await WellnessService(db).moods(user, pagination.limit, pagination.offset)


@router.get("/mood/{mood_id}", response_model=MoodRead)
async def get_mood(mood_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await WellnessService(db).get_mood(user, mood_id)


@router.patch("/mood/{mood_id}", response_model=MoodRead)
async def update_mood(mood_id: UUID, payload: MoodUpdate, user: User = mother_user, db: AsyncSession = Depends(get_db)):
    return await WellnessService(db).update_mood(user, mood_id, payload)


@router.delete("/mood/{mood_id}", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def delete_mood(mood_id: UUID, user: User = mother_user, db: AsyncSession = Depends(get_db)):
    await WellnessService(db).delete_mood(user, mood_id)
    return MessageResponse(message="Mood entry deleted")


@router.post("/symptoms", response_model=SymptomRead)
async def create_symptoms(payload: SymptomCreate, user: User = mother_user, db: AsyncSession = Depends(get_db)):
    return await WellnessService(db).create_symptom(user, payload)


@router.get("/symptoms", response_model=list[SymptomRead])
async def list_symptoms(
    pagination: PaginationParams = Depends(pagination_params),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await WellnessService(db).symptoms(user, pagination.limit, pagination.offset)


@router.get("/symptoms/{symptom_id}", response_model=SymptomRead)
async def get_symptom(symptom_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await WellnessService(db).get_symptom(user, symptom_id)


@router.patch("/symptoms/{symptom_id}", response_model=SymptomRead)
async def update_symptom(symptom_id: UUID, payload: SymptomUpdate, user: User = mother_user, db: AsyncSession = Depends(get_db)):
    return await WellnessService(db).update_symptom(user, symptom_id, payload)


@router.delete("/symptoms/{symptom_id}", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def delete_symptom(symptom_id: UUID, user: User = mother_user, db: AsyncSession = Depends(get_db)):
    await WellnessService(db).delete_symptom(user, symptom_id)
    return MessageResponse(message="Symptom entry deleted")


@router.post("/journal", response_model=JournalRead)
async def create_journal(payload: JournalCreate, user: User = mother_user, db: AsyncSession = Depends(get_db)):
    return await WellnessService(db).create_journal(user, payload)


@router.get("/journal", response_model=list[JournalRead])
async def list_journals(
    pagination: PaginationParams = Depends(pagination_params),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await WellnessService(db).journals(user, pagination.limit, pagination.offset)


@router.get("/journal/{journal_id}", response_model=JournalRead)
async def get_journal(journal_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await WellnessService(db).get_journal(user, journal_id)


@router.patch("/journal/{journal_id}", response_model=JournalRead)
async def update_journal(journal_id: UUID, payload: JournalUpdate, user: User = mother_user, db: AsyncSession = Depends(get_db)):
    return await WellnessService(db).update_journal(user, journal_id, payload)


@router.delete("/journal/{journal_id}", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def delete_journal(journal_id: UUID, user: User = mother_user, db: AsyncSession = Depends(get_db)):
    await WellnessService(db).delete_journal(user, journal_id)
    return MessageResponse(message="Journal entry deleted")


@router.get("/dashboard", response_model=DashboardStats)
async def dashboard(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await WellnessService(db).dashboard(user)


@router.get("/analytics")
async def analytics(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await MotherAnalyticsService(db).dashboard(user)


@router.get("/insights", response_model=WellnessInsightsRead)
async def insights(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await WellnessService(db).insights(user)


@router.get("/profile")
async def get_profile(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import or_, select
    from app.models.carecircle import CareCircleAccess
    from app.models.doctor import DoctorPatient
    from app.models.user import MotherProfile, User

    db_user = await db.get(User, user.id)
    if db_user:
        user = db_user

    base_response = {
        "id": str(user.id),
        "user_id": str(user.id),
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "preferred_language": user.preferred_language,
        "custom_id": user.custom_id,
        "is_verified": user.is_verified,
        "age": user.age,
    }

    if user.role == UserRole.MOTHER:
        profile = await db.scalar(select(MotherProfile).where(MotherProfile.user_id == user.id))
        if not profile:
            profile = MotherProfile(user_id=user.id, age=user.age)
            db.add(profile)
            await db.commit()
            await db.refresh(profile)

        # Retrieve active assigned doctors from DoctorPatient
        assigned_docs_res = await db.execute(
            select(User)
            .join(DoctorPatient, DoctorPatient.doctor_id == User.id)
            .where(
                DoctorPatient.patient_id == user.id,
                DoctorPatient.status == "active",
                DoctorPatient.deleted_at.is_(None),
            )
        )
        assigned_doctors = [
            {"id": str(d.id), "name": d.name, "custom_id": d.custom_id}
            for d in assigned_docs_res.scalars().all()
        ]

        if not assigned_doctors and user.assigned_doctor_id:
            doc = await db.scalar(
                select(User).where(
                    User.role == UserRole.DOCTOR,
                    or_(
                        User.custom_id == user.assigned_doctor_id,
                        User.custom_id == user.assigned_doctor_id.upper(),
                    ),
                )
            )
            if doc:
                assigned_doctors.append({"id": str(doc.id), "name": doc.name, "custom_id": doc.custom_id})

        base_response.update({
            "mother_id": user.custom_id,
            "age": profile.age if profile.age is not None else user.age,
            "weight": profile.weight,
            "height": profile.height,
            "blood_group": profile.blood_group,
            "pregnancy_status": profile.pregnancy_status,
            "delivery_date": str(profile.delivery_date) if profile.delivery_date else None,
            "emergency_contact": profile.emergency_contact,
            "district": profile.district,
            "village": profile.village,
            "assigned_doctor_id": user.assigned_doctor_id,
            "assigned_doctors": assigned_doctors,
        })
        return base_response

    elif user.role == UserRole.DOCTOR:
        base_response.update({
            "doctor_id": user.custom_id,
            "medical_license": user.medical_license,
            "specialization": user.specialization,
            "qualifications": user.qualifications,
            "experience_years": user.experience_years,
            "hospital_clinic": user.hospital_clinic,
        })
        return base_response

    elif user.role == UserRole.CAREGIVER:
        linked_mother = None
        caregiver_status = "not_linked"
        relationship_label = user.relationship_label or "Caregiver"

        mth = None
        if user.assigned_mother_id:
            mth = await db.scalar(
                select(User).where(
                    User.role == UserRole.MOTHER,
                    or_(
                        User.custom_id == user.assigned_mother_id,
                        User.custom_id == user.assigned_mother_id.upper(),
                    ),
                )
            )

        cca = None
        if mth:
            cca = await db.scalar(
                select(CareCircleAccess).where(
                    CareCircleAccess.user_id == mth.id,
                    CareCircleAccess.requester_id == user.id,
                ).order_by(CareCircleAccess.requested_at.desc())
            )
        else:
            # Fallback: check if connected via CareCircle QR code / invite
            cca = await db.scalar(
                select(CareCircleAccess).where(
                    CareCircleAccess.requester_id == user.id,
                ).order_by(CareCircleAccess.requested_at.desc())
            )
            if cca:
                mth = await db.get(User, cca.user_id)

        if mth:
            linked_mother = {"id": str(mth.id), "name": mth.name, "custom_id": mth.custom_id}
            if cca:
                if cca.revoked_at is not None or cca.status == "revoked":
                    caregiver_status = "revoked"
                else:
                    caregiver_status = cca.status

                if cca.relationship_label:
                    relationship_label = cca.relationship_label
            else:
                caregiver_status = "pending"
        else:
            caregiver_status = "not_linked"

        base_response.update({
            "caregiver_id": user.custom_id,
            "assigned_mother_id": user.assigned_mother_id or (linked_mother["custom_id"] if linked_mother else None),
            "linked_mother": linked_mother,
            "caregiver_status": caregiver_status,
            "relationship_label": relationship_label,
        })
        return base_response

    return base_response


@router.put("/profile")
async def update_profile(
    payload: MotherProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.carecircle import CareCircleAccess
    from app.models.user import MotherProfile, User

    db_user = await db.get(User, user.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    data = payload.model_dump(exclude_unset=True)

    if "name" in data and data["name"]:
        db_user.name = data["name"].strip()
    if "phone" in data:
        db_user.phone = data["phone"].strip() if data["phone"] else None
    if "preferred_language" in data and data["preferred_language"]:
        db_user.preferred_language = data["preferred_language"].strip()

    if db_user.role == UserRole.MOTHER:
        profile = await db.scalar(select(MotherProfile).where(MotherProfile.user_id == db_user.id))
        if not profile:
            profile = MotherProfile(user_id=db_user.id)
            db.add(profile)

        mother_fields = [
            "age", "weight", "height", "blood_group", "pregnancy_status",
            "delivery_date", "emergency_contact", "district", "village"
        ]
        for field in mother_fields:
            if field in data:
                setattr(profile, field, data[field])

        if "age" in data and data["age"] is not None:
            db_user.age = data["age"]

    elif db_user.role == UserRole.DOCTOR:
        if "age" in data:
            db_user.age = data["age"]
        if "specialization" in data:
            db_user.specialization = data["specialization"].strip() if data["specialization"] else None
        if "qualifications" in data:
            db_user.qualifications = data["qualifications"].strip() if data["qualifications"] else None
        if "experience_years" in data:
            db_user.experience_years = data["experience_years"]
        if "hospital_clinic" in data:
            db_user.hospital_clinic = data["hospital_clinic"].strip() if data["hospital_clinic"] else None

    elif db_user.role == UserRole.CAREGIVER:
        if "relationship_label" in data:
            rel = data["relationship_label"].strip() if data["relationship_label"] else None
            db_user.relationship_label = rel
            access = await db.scalar(
                select(CareCircleAccess).where(
                    CareCircleAccess.requester_id == db_user.id,
                    CareCircleAccess.revoked_at.is_(None),
                )
            )
            if access and rel:
                access.relationship_label = rel

    await db.commit()
    await db.refresh(db_user)

    return await get_profile(user=db_user, db=db)


@router.get("/reports")
async def list_reports(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all completed clinical screenings and generated reports for the Reports Zone."""
    from sqlalchemy import desc, select
    from app.models.pcos import PCOSPrediction
    from app.models.ppd import PPDAssessment

    pcos_list = (await db.execute(select(PCOSPrediction).where(PCOSPrediction.user_id == user.id).order_by(desc(PCOSPrediction.created_at)))).scalars().all()
    ppd_list = (await db.execute(select(PPDAssessment).where(PPDAssessment.user_id == user.id).order_by(desc(PPDAssessment.created_at)))).scalars().all()

    reports = []
    for p in pcos_list:
        reports.append({
            "id": f"pcos-{p.id}",
            "type": "PCOS Screening",
            "title": f"PCOS Clinical Assessment ({p.risk_level.upper()} RISK)",
            "date": p.created_at.strftime("%b %d, %Y - %H:%M"),
            "iso_date": p.created_at.isoformat(),
            "risk_level": p.risk_level,
            "score": f"{int(p.probability * 100)}% Probability",
            "recommendations": p.recommendations,
            "status": "Completed",
        })

    for d in ppd_list:
        reports.append({
            "id": f"ppd-{d.id}",
            "type": "PPD Screening",
            "title": f"EPDS Postpartum Depression Assessment ({d.risk_level.upper()} RISK)",
            "date": d.created_at.strftime("%b %d, %Y - %H:%M"),
            "iso_date": d.created_at.isoformat(),
            "risk_level": d.risk_level,
            "score": f"EPDS Score: {d.epds_score} / 30",
            "sentiment": d.sentiment,
            "recommendations": f"Sentiment indication: {d.sentiment}. Consult an obstetrician or mental healthcare counselor for supportive care.",
            "status": "Completed",
        })

    reports.sort(key=lambda r: r["iso_date"], reverse=True)
    return {
        "count": len(reports),
        "reports": reports,
        "disclaimer": "These records reflect initial AI/clinical screening risk indications and do not constitute formal diagnostic confirmation.",
    }

