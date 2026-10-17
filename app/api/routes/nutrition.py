from datetime import date
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.core.security import UserRole
from app.models.carecircle import CareCircleAccess
from app.models.nutrition import (
    HydrationLog,
    NutritionCarePlan,
    NutritionInteraction,
    NutritionProfile,
)
from app.models.pcos import PCOSPrediction
from app.models.ppd import PPDAssessment
from app.models.user import MotherProfile, User

router = APIRouter(prefix="/nutrition", tags=["Nutrition & Wellness Guide"])


class HydrationUpdate(BaseModel):
    cups: int = Field(ge=0, le=100)
    target_cups: int = Field(default=8, gt=0, le=100)


class NutritionPreferencesUpdate(BaseModel):
    dietary_preferences: list[str] = Field(default_factory=list, max_length=20)
    dietary_restrictions: list[str] = Field(default_factory=list, max_length=20)
    allergies: list[str] = Field(default_factory=list, max_length=20)
    breastfeeding: bool | None = None


class NutritionMealInput(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    meal_type: str = Field(min_length=1, max_length=32)
    ingredients: list[str] = Field(default_factory=list, max_length=30)
    serving_size: str | None = Field(default=None, max_length=120)
    preparation_instructions: list[str] = Field(default_factory=list, max_length=20)
    preparation_minutes: int | None = Field(default=None, ge=0, le=1440)
    substitutions: list[str] = Field(default_factory=list, max_length=20)
    nutrition_facts: list[str] = Field(default_factory=list, max_length=20)
    nutrition_source: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def require_nutrition_source(self) -> "NutritionMealInput":
        if self.nutrition_facts and not self.nutrition_source:
            raise ValueError("A source is required for nutritional facts")
        return self


class NutritionPlanDraftInput(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    applicable_context: list[str] = Field(default_factory=list, max_length=10)
    meals: list[NutritionMealInput] = Field(min_length=1, max_length=20)
    preparation_guidance: str | None = Field(default=None, max_length=5000)
    clinician_note: str | None = Field(default=None, max_length=5000)


# Curated evidence-based nutrition plans for local Indian contexts
DEFAULT_NUTRITION_PLANS = [
    # Pregnancy
    {
        "category": "pregnancy",
        "phase": "Trimester 1 & 2",
        "meal_type": "breakfast",
        "title": "Ragi Dosa with Mint Chutney",
        "description": "A familiar meal idea using ragi, urad dal, and mint. Follow your clinician's pregnancy-specific dietary guidance.",
        "local_foods": "Ragi flour, Urad dal, Fresh mint, Coconut, Green chillies",
        "key_nutrients": "No sourced nutrient values provided",
        "is_affordable_local": True,
    },
    {
        "category": "pregnancy",
        "phase": "Trimester 2 & 3",
        "meal_type": "lunch",
        "title": "Drumstick (Moringa) & Lentil Sambar with Brown Rice",
        "description": "A cooked meal idea with lentils, vegetables, and rice. Follow your clinician's pregnancy-specific dietary guidance.",
        "local_foods": "Toor dal, Moringa leaves, Drumstick pods, Tomatoes, Local rice",
        "key_nutrients": "No sourced nutrient values provided",
        "is_affordable_local": True,
    },
    {
        "category": "pregnancy",
        "phase": "All Trimesters",
        "meal_type": "snack",
        "title": "Roasted Chana & Sesame-Jaggery Ladoo",
        "description": "A snack idea with roasted chickpeas and sesame. Check ingredients against your recorded allergies and preferences.",
        "local_foods": "Roasted chickpeas (bhuna chana), White sesame seeds, Pure jaggery",
        "key_nutrients": "No sourced nutrient values provided",
        "is_affordable_local": True,
    },
    # Postpartum Recovery
    {
        "category": "postpartum",
        "phase": "Lactation & Healing",
        "meal_type": "breakfast",
        "title": "Warm Daliya (Broken Wheat) Porridge with Fenugreek (Methi)",
        "description": "A warm porridge idea. Discuss herbs or supplements, including fenugreek, with a qualified clinician.",
        "local_foods": "Broken wheat (daliya), Fenugreek seeds, Milk or Almond milk, Ghee",
        "key_nutrients": "No sourced nutrient values provided",
        "is_affordable_local": True,
    },
    {
        "category": "postpartum",
        "phase": "Postpartum Recovery",
        "meal_type": "lunch",
        "title": "Spinach Moong Dal Khichdi with Pure Cow Ghee",
        "description": "A simple cooked meal idea with lentils, spinach, rice, and seasoning.",
        "local_foods": "Yellow split moong dal, Palak (spinach), Jeera (cumin), Ghee",
        "key_nutrients": "No sourced nutrient values provided",
        "is_affordable_local": True,
    },
    # PCOS Friendly
    {
        "category": "pcos",
        "phase": "Insulin Sensitivity & Hormone Balance",
        "meal_type": "breakfast",
        "title": "Moong & Vegetable Cheela with Curd",
        "description": "A general meal idea. A screening result is not a diagnosis; seek individualized nutrition advice from a qualified clinician.",
        "local_foods": "Sprouted whole green moong, Besan, Grated carrots, Plain fresh curd",
        "key_nutrients": "No sourced nutrient values provided",
        "is_affordable_local": True,
    },
    {
        "category": "pcos",
        "phase": "Anti-Inflammatory",
        "meal_type": "dinner",
        "title": "Foxtail Millet Khichdi with Mixed Seasonal Vegetables",
        "description": "A general meal idea using millet and vegetables. It is not a treatment for PCOS or metabolic conditions.",
        "local_foods": "Foxtail millet (kangni/navane), Green peas, Beans, Turmeric, Ginger",
        "key_nutrients": "No sourced nutrient values provided",
        "is_affordable_local": True,
    },
    {
        "category": "pcos",
        "phase": "Hormone Harmony",
        "meal_type": "snack",
        "title": "Roasted Pumpkin and Flaxseed Mix",
        "description": "A general snack idea. Check ingredients against allergies and ask a clinician about individual concerns.",
        "local_foods": "Alsi (flaxseeds), Kaddu beej (pumpkin seeds), Chaat masala",
        "key_nutrients": "No sourced nutrient values provided",
        "is_affordable_local": True,
    },
]

HEALTH_MYTHS = [
    {
        "id": "myth-1",
        "category": "PCOS",
        "myth": "Women with PCOS can never get pregnant naturally.",
        "fact": "With early lifestyle modifications, insulin regulation, anti-inflammatory nutrition, and targeted medical guidance, many women with PCOS ovulate and conceive naturally.",
        "verification_source": "World Health Organization (WHO) & Endocrine Society Clinical Guidelines",
    },
    {
        "id": "myth-2",
        "category": "Postpartum Mental Health",
        "myth": "Postpartum depression is just normal exhaustion or sadness ('baby blues') that always passes in a few days.",
        "fact": "While baby blues resolve within 1-2 weeks, clinical Postpartum Depression (PPD) lasts longer, affects bonding, and requires supportive medical care, screening (EPDS), and compassionate counseling.",
        "verification_source": "Edinburgh Postnatal Depression Scale (EPDS) & American College of Obstetricians and Gynecologists (ACOG)",
    },
    {
        "id": "myth-3",
        "category": "Menstruation",
        "myth": "Irregular periods are always normal and nothing to investigate.",
        "fact": "Occasional slight shifts occur, but cycles consistently shorter than 21 days, longer than 35 days, or absent for over 90 days warrant clinical screening for hormonal or metabolic imbalances.",
        "verification_source": "International Federation of Gynecology and Obstetrics (FIGO)",
    },
    {
        "id": "myth-4",
        "category": "Nutrition",
        "myth": "Pregnant mothers need to 'eat for two' adults and double their calorie intake.",
        "fact": "In the first trimester, caloric needs barely increase. In the second and third trimesters, only about 300-450 nutrient-dense extra calories (not double food volume) are clinically recommended.",
        "verification_source": "ICMR-National Institute of Nutrition (NIN) Dietary Guidelines for Indians",
    },
    {
        "id": "myth-5",
        "category": "Postpartum Recovery",
        "myth": "Mothers should avoid drinking water postpartum to avoid bloating.",
        "fact": "Hydration is critical for tissue healing, breastmilk production, and preventing urinary tract infections. Mothers should drink at least 8 to 10 glasses of clean water daily.",
        "verification_source": "UNICEF & Ministry of Health and Family Welfare (MoHFW) India",
    },
]


MOTHER_ROLE = Depends(require_roles(UserRole.MOTHER))
CAREGIVER_ROLE = Depends(require_roles(UserRole.CAREGIVER))
DOCTOR_ROLE = Depends(require_roles(UserRole.DOCTOR, UserRole.ADMIN))

DAILY_FOOD_SUGGESTIONS: list[dict[str, object]] = [
    {
        "key": "breakfast-oats",
        "name": "Oats with banana",
        "meal_type": "breakfast",
        "portion": "One bowl; adjust to appetite.",
        "reason": "A simple grain-based breakfast option.",
        "ingredients": ["½ cup oats", "1 cup milk or suitable alternative", "½ banana"],
        "preparation_instructions": ["Cook the oats in the milk or water until soft.", "Top with sliced banana."],
        "preparation_minutes": 10,
        "substitutions": ["Use water or an alternative that suits your preferences."],
        "contexts": ["general", "pregnancy", "postpartum", "pcos_screening", "ppd_screening"],
    },
    {
        "key": "lunch-dal-rice",
        "name": "Dal, rice, and cooked vegetables",
        "meal_type": "lunch",
        "portion": "Serve a comfortable portion of each.",
        "reason": "A familiar meal that combines pulses, grains, and vegetables.",
        "ingredients": ["½ cup dry lentils", "½ cup dry rice", "1 cup seasonal vegetables", "Water and usual seasonings"],
        "preparation_instructions": ["Cook the lentils until soft.", "Cook rice and vegetables thoroughly.", "Serve together."],
        "preparation_minutes": 35,
        "substitutions": ["Choose grains and vegetables that suit your preferences."],
        "contexts": ["general", "pregnancy", "postpartum", "pcos_screening", "ppd_screening"],
    },
    {
        "key": "snack-fruit-curd",
        "name": "Seasonal fruit with plain curd",
        "meal_type": "snack",
        "portion": "One piece of fruit with a small bowl of curd.",
        "reason": "A low-preparation snack option; use foods that fit your preferences.",
        "ingredients": ["1 seasonal fruit", "½ cup plain curd"],
        "preparation_instructions": ["Wash and prepare the fruit.", "Serve with plain curd if suitable."],
        "preparation_minutes": 5,
        "substitutions": ["Replace curd with a suitable alternative or omit it."],
        "contexts": ["general", "pregnancy", "postpartum", "pcos_screening", "ppd_screening"],
    },
    {
        "key": "dinner-khichdi",
        "name": "Moong dal khichdi with vegetables",
        "meal_type": "dinner",
        "portion": "One bowl; adjust to appetite.",
        "reason": "A practical one-pot meal that can be prepared in advance.",
        "ingredients": ["¼ cup rice", "¼ cup split moong dal", "1 cup vegetables", "Water and usual seasonings"],
        "preparation_instructions": ["Rinse rice and dal.", "Cook with vegetables and water until soft.", "Serve freshly cooked or reheat safely."],
        "preparation_minutes": 35,
        "substitutions": ["Use vegetables and grains that suit your preferences."],
        "contexts": ["general", "pregnancy", "postpartum", "pcos_screening", "ppd_screening"],
    },
]


def _clean_terms(values: list[str]) -> list[str]:
    return [value.strip()[:80] for value in values if value.strip()]


async def _nutrition_context(user_id: UUID, db: AsyncSession) -> tuple[dict[str, object], NutritionProfile | None]:
    mother_profile = await db.scalar(select(MotherProfile).where(MotherProfile.user_id == user_id))
    nutrition_profile = await db.scalar(select(NutritionProfile).where(NutritionProfile.user_id == user_id))
    pcos = await db.scalar(
        select(PCOSPrediction).where(PCOSPrediction.user_id == user_id).order_by(desc(PCOSPrediction.created_at)).limit(1)
    )
    ppd = await db.scalar(
        select(PPDAssessment).where(PPDAssessment.user_id == user_id).order_by(desc(PPDAssessment.created_at)).limit(1)
    )
    status_value = mother_profile.pregnancy_status.strip() if mother_profile and mother_profile.pregnancy_status else None
    delivery_date = mother_profile.delivery_date if mother_profile else None
    today = date.today()
    is_recent_postpartum = bool(delivery_date and 0 <= (today - delivery_date).days <= 365)
    context: dict[str, object] = {
        "pregnancy_stage": status_value,
        "postpartum": is_recent_postpartum or bool(status_value and "postpartum" in status_value.lower()),
        "breastfeeding": nutrition_profile.breastfeeding if nutrition_profile else None,
        "pcos_screening_recorded": pcos is not None,
        "ppd_screening_recorded": ppd is not None,
    }
    return context, nutrition_profile


def _applicable_tags(context: dict[str, object]) -> set[str]:
    tags = {"general"}
    pregnancy_stage = context.get("pregnancy_stage")
    pregnancy_text = pregnancy_stage.lower() if isinstance(pregnancy_stage, str) else ""
    explicitly_not_pregnant = any(value in pregnancy_text for value in ("not pregnant", "non-pregnant", "no pregnancy"))
    if not explicitly_not_pregnant and any(value in pregnancy_text for value in ("pregnan", "trimester")):
        tags.add("pregnancy")
    if context.get("postpartum"):
        tags.add("postpartum")
    if context.get("pcos_screening_recorded"):
        tags.add("pcos_screening")
    if context.get("ppd_screening_recorded"):
        tags.add("ppd_screening")
    if context.get("breastfeeding") is True:
        tags.add("breastfeeding")
    return tags


def _context_guidance(context: dict[str, object]) -> list[str]:
    guidance: list[str] = []
    tags = _applicable_tags(context)
    if "pregnancy" in tags:
        guidance.append("Pregnancy stage is recorded. Follow your obstetric clinician's dietary and food-safety advice.")
    if "postpartum" in tags:
        guidance.append("Postpartum context is recorded. Practical meals and help with preparation may make daily nourishment easier.")
    if "breastfeeding" in tags:
        guidance.append("Breastfeeding is recorded. Follow your clinician's guidance for your individual food and fluid needs.")
    if "pcos_screening" in tags:
        guidance.append("A PCOS screening is recorded; screening is not a diagnosis. These general meal ideas do not treat PCOS.")
    if "ppd_screening" in tags:
        guidance.append("A PPD screening is recorded. Food suggestions are not treatment; continue professional mental-health support as needed.")
    if not guidance:
        guidance.append("No pregnancy, postpartum, or screening context is recorded. These are general educational food ideas.")
    return guidance


def _food_suggestions(context: dict[str, object], profile: NutritionProfile | None) -> list[dict[str, object]]:
    contexts = _applicable_tags(context)
    restrictions = [
        term.lower()
        for term in ((profile.dietary_restrictions if profile else []) + (profile.dietary_preferences if profile else []))
        if term.strip()
    ]
    excluded_terms = [term.lower() for term in (profile.allergies if profile else []) if term.strip()]
    restriction_exclusions = {
        "vegan": ("milk", "curd", "dairy", "ghee", "egg"),
        "dairy-free": ("milk", "curd", "dairy", "ghee"),
        "lactose-free": ("milk", "curd", "dairy"),
        "gluten-free": ("wheat", "dalia", "daliya"),
    }
    for restriction, terms in restriction_exclusions.items():
        if any(restriction.split("-")[0] in value for value in restrictions):
            excluded_terms.extend(terms)

    allergy_aliases = {
        "milk": ("milk", "curd", "dairy", "ghee"),
        "dairy": ("milk", "curd", "dairy", "ghee"),
        "lactose": ("milk", "curd", "dairy"),
        "banana": ("banana",),
        "gluten": ("wheat", "dalia", "daliya"),
        "wheat": ("wheat", "dalia", "daliya"),
    }
    for allergy in tuple(excluded_terms):
        for allergen, terms in allergy_aliases.items():
            if allergen in allergy:
                excluded_terms.extend(terms)
    suggestions = []
    for item in DAILY_FOOD_SUGGESTIONS:
        if not contexts.intersection(item["contexts"]):  # type: ignore[arg-type]
            continue
        searchable_foods = " ".join([str(item["name"]), *(str(food) for food in item["ingredients"])]).lower()  # type: ignore[union-attr]
        if any(term in searchable_foods for term in excluded_terms):
            continue
        suggestions.append(item)
    return suggestions


async def _serialize_active_plan(mother_id: UUID, db: AsyncSession) -> dict[str, object] | None:
    plan = await db.scalar(
        select(NutritionCarePlan)
        .where(NutritionCarePlan.mother_id == mother_id, NutritionCarePlan.status == "active")
        .order_by(desc(NutritionCarePlan.reviewed_at), desc(NutritionCarePlan.created_at))
        .limit(1)
    )
    if not plan:
        return None
    return {
        "id": str(plan.id),
        "title": plan.title,
        "applicable_context": plan.applicable_context,
        "meals": plan.meals,
        "preparation_guidance": plan.preparation_guidance,
        "clinician_note": plan.clinician_note,
        "source": plan.source,
        "status": plan.status,
        "version": plan.version,
        "reviewed_at": plan.reviewed_at.isoformat() if plan.reviewed_at else None,
        "archived_at": plan.archived_at.isoformat() if plan.archived_at else None,
    }


def _serialize_plan(plan: NutritionCarePlan) -> dict[str, object]:
    return {
        "id": str(plan.id),
        "title": plan.title,
        "applicable_context": plan.applicable_context,
        "meals": plan.meals,
        "preparation_guidance": plan.preparation_guidance,
        "clinician_note": plan.clinician_note,
        "source": plan.source,
        "status": plan.status,
        "version": plan.version,
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
        "reviewed_at": plan.reviewed_at.isoformat() if plan.reviewed_at else None,
    }


@router.get("/me")
async def get_my_nutrition(
    user: User = MOTHER_ROLE,
    db: AsyncSession = Depends(get_db),
):
    context, profile = await _nutrition_context(user.id, db)
    interactions = (
        await db.scalars(
            select(NutritionInteraction).where(
                NutritionInteraction.user_id == user.id,
                NutritionInteraction.log_date == date.today(),
            )
        )
    ).all()
    return {
        "context": context,
        "context_guidance": _context_guidance(context),
        "preferences": {
            "dietary_preferences": profile.dietary_preferences if profile else [],
            "dietary_restrictions": profile.dietary_restrictions if profile else [],
            "allergies": profile.allergies if profile else [],
            "breastfeeding": profile.breastfeeding if profile else None,
        },
        "suggestions": _food_suggestions(context, profile),
        "interactions": {
            item.recommendation_key: {"completed": item.completed, "saved": item.saved}
            for item in interactions
        },
        "active_plan": await _serialize_active_plan(user.id, db),
        "disclaimer": (
            "These are general educational food ideas, not medical treatment. Follow your clinician's advice; "
            "food suggestions do not treat PCOS or postpartum depression."
        ),
    }


@router.put("/preferences")
async def update_nutrition_preferences(
    payload: NutritionPreferencesUpdate,
    user: User = MOTHER_ROLE,
    db: AsyncSession = Depends(get_db),
):
    profile = await db.scalar(select(NutritionProfile).where(NutritionProfile.user_id == user.id))
    if not profile:
        profile = NutritionProfile(user_id=user.id)
        db.add(profile)
    profile.dietary_preferences = _clean_terms(payload.dietary_preferences)
    profile.dietary_restrictions = _clean_terms(payload.dietary_restrictions)
    profile.allergies = _clean_terms(payload.allergies)
    profile.breastfeeding = payload.breastfeeding
    await db.commit()
    return {
        "dietary_preferences": profile.dietary_preferences,
        "dietary_restrictions": profile.dietary_restrictions,
        "allergies": profile.allergies,
        "breastfeeding": profile.breastfeeding,
    }


@router.put("/interactions/{recommendation_key}")
async def update_nutrition_interaction(
    recommendation_key: str,
    completed: bool = Query(...),
    saved: bool = Query(...),
    user: User = MOTHER_ROLE,
    db: AsyncSession = Depends(get_db),
):
    if len(recommendation_key) > 100:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid nutrition suggestion")
    context, profile = await _nutrition_context(user.id, db)
    available_keys = {str(item["key"]) for item in _food_suggestions(context, profile)}
    if recommendation_key not in available_keys:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nutrition suggestion not found")
    item = await db.scalar(
        select(NutritionInteraction).where(
            NutritionInteraction.user_id == user.id,
            NutritionInteraction.recommendation_key == recommendation_key,
            NutritionInteraction.log_date == date.today(),
        )
    )
    if not item:
        item = NutritionInteraction(user_id=user.id, recommendation_key=recommendation_key)
        db.add(item)
    item.completed = completed
    item.saved = saved
    await db.commit()
    return {"recommendation_key": recommendation_key, "completed": item.completed, "saved": item.saved}


@router.get("/caregiver/connections/{access_id}")
async def get_caregiver_nutrition(
    access_id: UUID,
    user: User = CAREGIVER_ROLE,
    db: AsyncSession = Depends(get_db),
):
    access = await db.scalar(
        select(CareCircleAccess).where(
            CareCircleAccess.id == access_id,
            CareCircleAccess.requester_id == user.id,
            CareCircleAccess.status == "approved",
            CareCircleAccess.revoked_at.is_(None),
        )
    )
    if not access:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approved CareCircle connection not found")
    if not access.share_nutrition:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Mother has not enabled nutrition sharing")
    mother = await db.scalar(
        select(User).where(User.id == access.user_id, User.role == UserRole.MOTHER, User.is_active.is_(True))
    )
    if not mother:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approved CareCircle connection not found")
    context, profile = await _nutrition_context(mother.id, db)
    return {
        "mother_name": mother.name,
        "context": context,
        "context_guidance": _context_guidance(context),
        "preferences": {
            "dietary_preferences": profile.dietary_preferences if profile else [],
            "dietary_restrictions": profile.dietary_restrictions if profile else [],
            "allergies": profile.allergies if profile else [],
            "breastfeeding": profile.breastfeeding if profile else None,
        },
        "general_suggestions": _food_suggestions(context, profile),
        "active_plan": await _serialize_active_plan(mother.id, db),
        "disclaimer": "Support the mother's active plan. Confirm food-safety and individual concerns with her clinician.",
    }


async def _authorized_doctor_patient(
    patient_id: UUID,
    doctor: User,
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
    access = await db.scalar(
        select(CareCircleAccess).where(
            CareCircleAccess.user_id == patient.id,
            CareCircleAccess.requester_id == doctor.id,
            CareCircleAccess.status == "approved",
            CareCircleAccess.revoked_at.is_(None),
        )
    )
    if not access:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    if not access.share_nutrition:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient has not enabled nutrition sharing")
    return patient, access


@router.get("/doctor/patients")
async def list_doctor_nutrition_patients(
    doctor: User = DOCTOR_ROLE,
    db: AsyncSession = Depends(get_db),
):
    if doctor.role == UserRole.ADMIN:
        stmt = select(User).where(User.role == UserRole.MOTHER, User.is_active.is_(True)).order_by(User.name)
    else:
        stmt = (
            select(User)
            .join(CareCircleAccess, CareCircleAccess.user_id == User.id)
            .where(
                User.role == UserRole.MOTHER,
                User.is_active.is_(True),
                CareCircleAccess.requester_id == doctor.id,
                CareCircleAccess.status == "approved",
                CareCircleAccess.revoked_at.is_(None),
                CareCircleAccess.share_nutrition.is_(True),
            )
            .order_by(User.name)
        )
    patients = (await db.scalars(stmt)).unique().all()
    return [{"id": str(patient.id), "name": patient.name} for patient in patients]


@router.get("/doctor/patients/{patient_id}")
async def get_doctor_patient_nutrition(
    patient_id: UUID,
    doctor: User = DOCTOR_ROLE,
    db: AsyncSession = Depends(get_db),
):
    patient, _ = await _authorized_doctor_patient(patient_id, doctor, db)
    context, profile = await _nutrition_context(patient.id, db)
    mother_profile = await db.scalar(select(MotherProfile).where(MotherProfile.user_id == patient.id))
    plans = (
        await db.scalars(
            select(NutritionCarePlan)
            .where(NutritionCarePlan.mother_id == patient.id)
            .order_by(desc(NutritionCarePlan.created_at))
        )
    ).all()
    return {
        "patient": {
            "id": str(patient.id),
            "name": patient.name,
            "age": mother_profile.age if mother_profile else None,
            "pregnancy_stage": context["pregnancy_stage"],
            "postpartum": context["postpartum"],
            "breastfeeding": context["breastfeeding"],
            "pcos_screening": (
                await db.scalar(
                    select(PCOSPrediction.risk_level)
                    .where(PCOSPrediction.user_id == patient.id)
                    .order_by(desc(PCOSPrediction.created_at))
                    .limit(1)
                )
            ),
            "ppd_screening": (
                await db.scalar(
                    select(PPDAssessment.risk_level)
                    .where(PPDAssessment.user_id == patient.id)
                    .order_by(desc(PPDAssessment.created_at))
                    .limit(1)
                )
            ),
            "dietary_preferences": profile.dietary_preferences if profile else [],
            "dietary_restrictions": profile.dietary_restrictions if profile else [],
            "allergies": profile.allergies if profile else [],
        },
        "plans": [_serialize_plan(plan) for plan in plans],
        "disclaimer": "Nutrition information supports clinical review and is not a diagnosis or substitute for clinical judgment.",
    }


@router.post("/doctor/patients/{patient_id}/plans")
async def create_doctor_nutrition_draft(
    patient_id: UUID,
    payload: NutritionPlanDraftInput,
    doctor: User = DOCTOR_ROLE,
    db: AsyncSession = Depends(get_db),
):
    await _authorized_doctor_patient(patient_id, doctor, db)
    latest_version = await db.scalar(
        select(NutritionCarePlan.version)
        .where(NutritionCarePlan.mother_id == patient_id)
        .order_by(desc(NutritionCarePlan.version))
        .limit(1)
    )
    plan = NutritionCarePlan(
        mother_id=patient_id,
        title=payload.title.strip(),
        applicable_context=payload.applicable_context,
        meals=[meal.model_dump() for meal in payload.meals],
        preparation_guidance=payload.preparation_guidance,
        clinician_note=payload.clinician_note,
        source="doctor_authored",
        status="draft",
        version=(latest_version or 0) + 1,
        created_by_id=doctor.id,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return _serialize_plan(plan)


@router.put("/doctor/patients/{patient_id}/plans/{plan_id}")
async def update_doctor_nutrition_draft(
    patient_id: UUID,
    plan_id: UUID,
    payload: NutritionPlanDraftInput,
    doctor: User = DOCTOR_ROLE,
    db: AsyncSession = Depends(get_db),
):
    await _authorized_doctor_patient(patient_id, doctor, db)
    plan = await db.scalar(
        select(NutritionCarePlan).where(
            NutritionCarePlan.id == plan_id,
            NutritionCarePlan.mother_id == patient_id,
            NutritionCarePlan.created_by_id == doctor.id,
            NutritionCarePlan.status == "draft",
        )
    )
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nutrition draft not found")
    plan.title = payload.title.strip()
    plan.applicable_context = payload.applicable_context
    plan.meals = [meal.model_dump() for meal in payload.meals]
    plan.preparation_guidance = payload.preparation_guidance
    plan.clinician_note = payload.clinician_note
    await db.commit()
    await db.refresh(plan)
    return _serialize_plan(plan)


@router.post("/doctor/patients/{patient_id}/plans/{plan_id}/publish")
async def publish_doctor_nutrition_plan(
    patient_id: UUID,
    plan_id: UUID,
    doctor: User = DOCTOR_ROLE,
    db: AsyncSession = Depends(get_db),
):
    await _authorized_doctor_patient(patient_id, doctor, db)
    plan = await db.scalar(
        select(NutritionCarePlan).where(
            NutritionCarePlan.id == plan_id,
            NutritionCarePlan.mother_id == patient_id,
            NutritionCarePlan.created_by_id == doctor.id,
            NutritionCarePlan.status == "draft",
        )
    )
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nutrition draft not found")
    previous_plans = (
        await db.scalars(
            select(NutritionCarePlan).where(
                NutritionCarePlan.mother_id == patient_id,
                NutritionCarePlan.status == "active",
            )
        )
    ).all()
    for previous in previous_plans:
        previous.status = "archived"
        previous.archived_by_id = doctor.id
        previous.archived_at = datetime.now(timezone.utc)
    plan.source = "doctor_reviewed"
    plan.status = "active"
    plan.reviewer_id = doctor.id
    plan.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(plan)
    return _serialize_plan(plan)


@router.post("/doctor/patients/{patient_id}/plans/{plan_id}/discontinue")
async def discontinue_doctor_nutrition_plan(
    patient_id: UUID,
    plan_id: UUID,
    doctor: User = DOCTOR_ROLE,
    db: AsyncSession = Depends(get_db),
):
    await _authorized_doctor_patient(patient_id, doctor, db)
    plan = await db.scalar(
        select(NutritionCarePlan).where(
            NutritionCarePlan.id == plan_id,
            NutritionCarePlan.mother_id == patient_id,
            NutritionCarePlan.status == "active",
        )
    )
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active nutrition plan not found")
    plan.status = "archived"
    plan.archived_by_id = doctor.id
    plan.archived_at = datetime.now(timezone.utc)
    await db.commit()
    return {"id": str(plan.id), "status": plan.status}


@router.get("/plans")
async def list_nutrition_plans(
    category: Optional[str] = Query(None, description="Filter by pregnancy, postpartum, or pcos"),
):
    """Retrieve evidence-based, culturally appropriate Indian meal plans."""
    # Ensure plans exist in DB or return curated catalog
    plans = DEFAULT_NUTRITION_PLANS
    if category:
        plans = [p for p in plans if p["category"].lower() == category.lower()]
    return {
        "count": len(plans),
        "plans": plans,
        "disclaimer": "This nutrition guide offers general dietary guidance and does not replace personalized clinical advice from a certified dietician or obstetrician.",
    }


@router.get("/hydration")
async def get_hydration(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve today's hydration tracking score."""
    today = date.today()
    log = await db.scalar(
        select(HydrationLog).where(HydrationLog.user_id == user.id, HydrationLog.log_date == today)
    )
    if not log:
        return {"cups": 0, "target_cups": 8, "date": today.isoformat(), "percent": 0}

    percent = min(100, int((log.cups / log.target_cups) * 100))
    return {
        "cups": log.cups,
        "target_cups": log.target_cups,
        "date": today.isoformat(),
        "percent": percent,
    }


@router.post("/hydration")
async def update_hydration(
    payload: HydrationUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Log or increment hydration cups for today."""
    today = date.today()
    log = await db.scalar(
        select(HydrationLog).where(HydrationLog.user_id == user.id, HydrationLog.log_date == today)
    )
    if not log:
        log = HydrationLog(user_id=user.id, log_date=today, cups=payload.cups, target_cups=payload.target_cups)
        db.add(log)
    else:
        log.cups = max(0, payload.cups)
        log.target_cups = payload.target_cups

    await db.commit()
    await db.refresh(log)
    percent = min(100, int((log.cups / log.target_cups) * 100))
    return {"cups": log.cups, "target_cups": log.target_cups, "percent": percent, "message": "Hydration updated"}


@router.get("/myths")
async def get_health_myths():
    """Retrieve curated health myth-busters with clinical verification notes."""
    return HEALTH_MYTHS
