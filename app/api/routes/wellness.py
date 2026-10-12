from uuid import UUID

from fastapi import APIRouter, Depends, status
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
    MotherProfileRead,
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
    from sqlalchemy import select
    from app.models.user import MotherProfile

    profile = await db.scalar(select(MotherProfile).where(MotherProfile.user_id == user.id))
    if not profile:
        profile = MotherProfile(user_id=user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    return {
        "id": str(profile.id),
        "user_id": str(user.id),
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "preferred_language": user.preferred_language,
        "age": profile.age,
        "weight": profile.weight,
        "height": profile.height,
        "blood_group": profile.blood_group,
        "pregnancy_status": profile.pregnancy_status,
        "delivery_date": str(profile.delivery_date) if profile.delivery_date else None,
        "emergency_contact": profile.emergency_contact,
        "district": profile.district,
        "village": profile.village,
    }


@router.put("/profile")
async def update_profile(
    payload: MotherProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.user import MotherProfile

    profile = await db.scalar(select(MotherProfile).where(MotherProfile.user_id == user.id))
    if not profile:
        profile = MotherProfile(user_id=user.id)
        db.add(profile)

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, val)

    await db.commit()
    await db.refresh(profile)
    return {
        "id": str(profile.id),
        "age": profile.age,
        "weight": profile.weight,
        "height": profile.height,
        "blood_group": profile.blood_group,
        "pregnancy_status": profile.pregnancy_status,
        "delivery_date": str(profile.delivery_date) if profile.delivery_date else None,
        "emergency_contact": profile.emergency_contact,
        "district": profile.district,
        "village": profile.village,
        "message": "Health profile updated successfully.",
    }


@router.post("/doctor-visit-summary")
async def generate_doctor_visit_summary(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate an AI-powered doctor-visit summary combining symptoms, moods, and screenings."""
    from datetime import datetime
    from sqlalchemy import desc, select
    from app.models.pcos import PCOSPrediction
    from app.models.ppd import PPDAssessment
    from app.models.user import MotherProfile
    from app.models.wellness import Cycle, Journal, Mood, Symptom

    profile = await db.scalar(select(MotherProfile).where(MotherProfile.user_id == user.id))
    pcos = await db.scalar(select(PCOSPrediction).where(PCOSPrediction.user_id == user.id).order_by(desc(PCOSPrediction.created_at)).limit(1))
    ppd = await db.scalar(select(PPDAssessment).where(PPDAssessment.user_id == user.id).order_by(desc(PPDAssessment.created_at)).limit(1))
    recent_moods = (await db.execute(select(Mood).where(Mood.user_id == user.id).order_by(desc(Mood.created_at)).limit(7))).scalars().all()
    recent_symptoms = (await db.execute(select(Symptom).where(Symptom.user_id == user.id).order_by(desc(Symptom.created_at)).limit(7))).scalars().all()
    latest_cycle = await db.scalar(select(Cycle).where(Cycle.user_id == user.id).order_by(desc(Cycle.created_at)).limit(1))
    recent_journals = (await db.execute(select(Journal).where(Journal.user_id == user.id).order_by(desc(Journal.created_at)).limit(3))).scalars().all()

    # Determine symptom trends
    fatigue_count = sum(1 for s in recent_symptoms if s.fatigue)
    headache_count = sum(1 for s in recent_symptoms if s.headache)
    sleep_count = sum(1 for s in recent_symptoms if s.sleep_issue)
    anxiety_count = sum(1 for s in recent_symptoms if s.anxiety)

    # Questions to ask doctor
    questions = [
        "Are my reported physical symptoms (e.g. fatigue/sleep issues) within expected parameters for my current health status?",
        "Do you recommend any confirmatory pelvic ultrasound or hormone panel tests (FSH/LH, fasting insulin) regarding my PCOS risk?",
        "Could my sleep and energy fluctuations benefit from mild nutritional adjustments or medical support?",
    ]
    if ppd and ppd.risk_level.lower() in ("moderate", "high"):
        questions.append("My recent screening indicated emotional stress and postpartum mood shifts; can you recommend local counseling or support resources?")
    if profile and profile.pregnancy_status:
        questions.append(f"Regarding my current pregnancy/postpartum stage ({profile.pregnancy_status}), what are the red-flag warning symptoms requiring emergency hospital care?")

    return {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "patient_name": user.name,
        "age": profile.age if profile else None,
        "pregnancy_stage": profile.pregnancy_status if profile else "Not recorded",
        "emergency_contact": profile.emergency_contact if profile else "Not recorded",
        "summary": {
            "pcos_screening": {
                "risk_level": pcos.risk_level if pcos else "Not screened",
                "probability": pcos.probability if pcos else None,
                "notes": pcos.recommendations if pcos else "No recent PCOS assessment",
            },
            "ppd_screening": {
                "risk_level": ppd.risk_level if ppd else "Not screened",
                "epds_score": ppd.epds_score if ppd else None,
                "sentiment": ppd.sentiment if ppd else None,
            },
            "symptom_frequency_last_7_days": {
                "fatigue_days": fatigue_count,
                "headache_days": headache_count,
                "sleep_issue_days": sleep_count,
                "anxiety_days": anxiety_count,
            },
            "recent_mood_trend": [m.mood for m in recent_moods],
            "cycle_status": {
                "last_period_date": str(latest_cycle.last_period_date) if latest_cycle else "Not tracked",
                "cycle_length": latest_cycle.cycle_length if latest_cycle else None,
                "next_predicted_date": str(latest_cycle.next_period_prediction) if latest_cycle else None,
            },
        },
        "questions_to_ask_doctor": questions,
        "suggested_records_to_bring": [
            "Previous ultrasound (USG) pelvic or abdominal scan records",
            "Latest Complete Blood Count (CBC) and Thyroid (TSH) lab reports",
            "Current daily medication and iron/calcium prenatal supplement list",
            "This NurtureHer AI screening summary report",
        ],
        "disclaimer": "This document is an AI-generated preparation brief designed to support your clinical consultation. It is NOT a medical diagnosis, prescription, or clinical evaluation.",
    }


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

