import asyncio
import os
from datetime import date, datetime, timedelta
import uuid

from sqlalchemy import select

from app.core.database import AsyncSessionLocal, Base, engine, ensure_sqlite_schema
import app.models  # ensure all models registered
from app.core.security import UserRole, hash_password
from app.models.carecircle import CareCircleQR
from app.models.caregiver import CaregiverContent
from app.models.enums import MoodOption, RiskLevel
from app.models.nutrition import HydrationLog, NutritionPlan
from app.models.pcos import PCOSPrediction
from app.models.ppd import PPDAssessment
from app.models.user import MotherProfile, User
from app.models.wellness import Cycle, Journal, Mood, Symptom


async def ensure_user(db, email: str, name: str, password: str, role: UserRole) -> User:
    existing = await db.scalar(select(User).where(User.email == email))
    if existing:
        return existing
    new_user = User(
        email=email,
        name=name,
        password_hash=hash_password(password),
        role=role,
        is_verified=True,
        is_active=True,
    )
    db.add(new_user)
    await db.flush()
    return new_user


async def ensure_content(db, title: str, description: str, category: str, video_url: str | None = None) -> None:
    existing = await db.scalar(select(CaregiverContent).where(CaregiverContent.title == title))
    if existing:
        return
    db.add(CaregiverContent(title=title, description=description, video_url=video_url, category=category))


async def ensure_nutrition_plan(db, category: str, phase: str, meal_type: str, title: str, description: str, local_foods: str, key_nutrients: str) -> None:
    existing = await db.scalar(select(NutritionPlan).where(NutritionPlan.title == title))
    if existing:
        return
    db.add(
        NutritionPlan(
            category=category,
            phase=phase,
            meal_type=meal_type,
            title=title,
            description=description,
            local_foods=local_foods,
            key_nutrients=key_nutrients,
            is_affordable_local=True,
        )
    )


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(ensure_sqlite_schema)

    async with AsyncSessionLocal() as db:
        print("Seeding NurtureHer AI demo environment...")

        # 1. Seed Core Demo Users
        demo_pwd = os.getenv("NURTUREHER_DEMO_PASSWORD", "Password123!")

        mother = await ensure_user(db, "mother@nurtureher.com", "Ananya Sharma", demo_pwd, UserRole.MOTHER)
        doctor = await ensure_user(db, "doctor@nurtureher.com", "Dr. Priya Rao, MD", demo_pwd, UserRole.DOCTOR)
        caregiver = await ensure_user(db, "caregiver@nurtureher.com", "Ramesh Sharma", demo_pwd, UserRole.CAREGIVER)
        admin = await ensure_user(db, "admin@nurtureher.com", "NurtureHer Administrator", demo_pwd, UserRole.ADMIN)

        print(f"Verified demo users: Mother, Doctor, Caregiver, Admin (pwd: {demo_pwd})")

        # 2. Seed Mother Profile
        existing_profile = await db.scalar(select(MotherProfile).where(MotherProfile.user_id == mother.id))
        if not existing_profile:
            db.add(
                MotherProfile(
                    user_id=mother.id,
                    age=28,
                    weight=62.5,
                    height=162.0,
                    blood_group="O+",
                    pregnancy_status="2nd Trimester (Weeks 13-26)",
                    delivery_date=date.today() + timedelta(days=120),
                    emergency_contact="+91 98765 43210",
                    district="Bengaluru Urban",
                    village="Yelahanka",
                )
            )

        # 3. Seed Clinical Screenings for Mother
        existing_pcos = await db.scalar(select(PCOSPrediction).where(PCOSPrediction.user_id == mother.id))
        if not existing_pcos:
            db.add(
                PCOSPrediction(
                    user_id=mother.id,
                    risk_level=RiskLevel.MODERATE,
                    probability=0.58,
                    recommendations="Maintain complex carbohydrate intake, light 30-min walking after dinner, and repeat fasting lipid panel in 3 months.",
                )
            )

        existing_ppd = await db.scalar(select(PPDAssessment).where(PPDAssessment.user_id == mother.id))
        if not existing_ppd:
            db.add(
                PPDAssessment(
                    user_id=mother.id,
                    epds_score=6,
                    sentiment="balanced and peaceful",
                    risk_level=RiskLevel.LOW,
                )
            )

        # 4. Seed Cycles, Moods, Symptoms, Journals, Hydration
        existing_cycle = await db.scalar(select(Cycle).where(Cycle.user_id == mother.id))
        if not existing_cycle:
            db.add(
                Cycle(
                    user_id=mother.id,
                    last_period_date=date.today() - timedelta(days=20),
                    cycle_length=29,
                    next_period_prediction=date.today() + timedelta(days=9),
                )
            )

        existing_mood = await db.scalar(select(Mood).where(Mood.user_id == mother.id))
        if not existing_mood:
            db.add(Mood(user_id=mother.id, mood=MoodOption.HAPPY, note="Feeling baby kicks! Energetic morning."))
            db.add(Mood(user_id=mother.id, mood=MoodOption.TIRED, note="Long afternoon commute, resting now."))

        existing_symptom = await db.scalar(select(Symptom).where(Symptom.user_id == mother.id))
        if not existing_symptom:
            db.add(Symptom(user_id=mother.id, fatigue=True, headache=False, sleep_issue=False, anxiety=False, cramps=False))

        existing_journal = await db.scalar(select(Journal).where(Journal.user_id == mother.id))
        if not existing_journal:
            db.add(
                Journal(
                    user_id=mother.id,
                    title="Week 20 Milestone Check",
                    content="Had our scheduled antenatal checkup with Dr. Priya today. Heartbeat is strong at 142 bpm. Hydration goal on track.",
                )
            )

        existing_hydration = await db.scalar(select(HydrationLog).where(HydrationLog.user_id == mother.id, HydrationLog.log_date == date.today()))
        if not existing_hydration:
            db.add(HydrationLog(user_id=mother.id, log_date=date.today(), cups=6, target_cups=8))

        # 5. Seed CareCircle QR
        existing_qr = await db.scalar(select(CareCircleQR).where(CareCircleQR.user_id == mother.id))
        if not existing_qr:
            db.add(CareCircleQR.create_token(mother.id, valid_days=30))

        # 6. Seed Nutrition Plans
        await ensure_nutrition_plan(
            db,
            category="pregnancy",
            phase="Trimester 2/3",
            meal_type="breakfast",
            title="Iron & Calcium Power Porridge",
            description="Traditional sprouted ragi porridge cooked with milk, sweetened with jaggery, topped with crushed almonds.",
            local_foods="Sprouted Ragi, Milk, Jaggery, Almonds",
            key_nutrients="Iron, Calcium, Folate, Dietary Fiber",
        )
        await ensure_nutrition_plan(
            db,
            category="pregnancy",
            phase="Trimester 2/3",
            meal_type="lunch",
            title="Moringa Leaf Sambar with Brown Rice",
            description="Lentil stew simmered with drumstick leaves and local squash, served with red/brown rice and fresh curd.",
            local_foods="Toor dal, Moringa (drumstick) leaves, Curd, Brown rice",
            key_nutrients="Plant Protein, Vitamin C, Iron, Probiotics",
        )
        await ensure_nutrition_plan(
            db,
            category="pcos",
            phase="Low GI & Anti-Inflammatory",
            meal_type="dinner",
            title="Mixed Sprout Salad with Spiced Chaat",
            description="Steamed green gram and horsegram sprouts tossed with chopped cucumber, tomato, lemon juice, and roasted cumin.",
            local_foods="Green gram sprouts, Horsegram, Lemon, Cumin",
            key_nutrients="Low Glycemic Complex Carb, High Fiber, Zinc",
        )

        # 7. Seed Caregiver Content
        await ensure_content(
            db,
            "Newborn soothing & kangaroo care",
            "Practical step-by-step guidance on skin-to-skin kangaroo care, safe burping techniques, and calming fussy newborns.",
            "video",
        )
        await ensure_content(
            db,
            "Shared nighttime support protocol",
            "Effective nighttime duty shifts for caregivers to ensure new mothers obtain at least 4 hours of uninterrupted REM sleep.",
            "tip",
        )
        await ensure_content(
            db,
            "Recognizing postpartum warning signs",
            "Critical clinical signs (fever > 100.4°F, sudden shortness of breath, heavy bleeding, severe sadness) requiring 112 escalation.",
            "article",
        )

        await db.commit()
        print("Seeding completed successfully! All demo roles, clinical data, and guides are ready.")


if __name__ == "__main__":
    asyncio.run(main())
