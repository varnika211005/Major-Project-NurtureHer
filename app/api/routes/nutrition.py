from datetime import date
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.nutrition import HydrationLog, NutritionPlan
from app.models.user import User

router = APIRouter(prefix="/nutrition", tags=["Nutrition & Wellness Guide"])


class HydrationUpdate(BaseModel):
    cups: int
    target_cups: int = 8


# Curated evidence-based nutrition plans for local Indian contexts
DEFAULT_NUTRITION_PLANS = [
    # Pregnancy
    {
        "category": "pregnancy",
        "phase": "Trimester 1 & 2",
        "meal_type": "breakfast",
        "title": "Iron & Folate Rich Ragi Dosa with Mint Chutney",
        "description": "Finger millet (ragi) provides vital calcium and slow-burning energy, while mint chutney aids early morning digestion and morning sickness relief.",
        "local_foods": "Ragi flour, Urad dal, Fresh mint, Coconut, Green chillies",
        "key_nutrients": "Calcium, Dietary Fiber, Iron, Folate",
        "is_affordable_local": True,
    },
    {
        "category": "pregnancy",
        "phase": "Trimester 2 & 3",
        "meal_type": "lunch",
        "title": "Drumstick (Moringa) & Lentil Sambar with Brown Rice",
        "description": "Moringa leaves and drumsticks are powerhouses of plant-based bioavailable iron, vitamin C, and micronutrients essential for fetal bone development.",
        "local_foods": "Toor dal, Moringa leaves, Drumstick pods, Tomatoes, Local rice",
        "key_nutrients": "Iron, Vitamin C, Plant Protein, Folate",
        "is_affordable_local": True,
    },
    {
        "category": "pregnancy",
        "phase": "All Trimesters",
        "meal_type": "snack",
        "title": "Roasted Chana & Sesame-Jaggery Ladoo",
        "description": "Natural plant-based protein snack providing healthy fats and natural sweetness without refined sugar spikes.",
        "local_foods": "Roasted chickpeas (bhuna chana), White sesame seeds, Pure jaggery",
        "key_nutrients": "Magnesium, Zinc, Non-heme Iron, Healthy Unsaturated Fats",
        "is_affordable_local": True,
    },
    # Postpartum Recovery
    {
        "category": "postpartum",
        "phase": "Lactation & Healing",
        "meal_type": "breakfast",
        "title": "Warm Daliya (Broken Wheat) Porridge with Fenugreek (Methi)",
        "description": "Fenugreek seeds are traditional galactagogues proven to stimulate healthy lactation while gentle broken wheat soothes maternal digestion.",
        "local_foods": "Broken wheat (daliya), Fenugreek seeds, Milk or Almond milk, Ghee",
        "key_nutrients": "Galactagogues, B-complex vitamins, Fiber",
        "is_affordable_local": True,
    },
    {
        "category": "postpartum",
        "phase": "Postpartum Recovery",
        "meal_type": "lunch",
        "title": "Spinach Moong Dal Khichdi with Pure Cow Ghee",
        "description": "Extremely gentle on postpartum intestinal motility while delivering high-quality protein and essential healing amino acids.",
        "local_foods": "Yellow split moong dal, Palak (spinach), Jeera (cumin), Ghee",
        "key_nutrients": "Easily digestible Protein, Iron, Vitamin A, Healthy Lipids",
        "is_affordable_local": True,
    },
    # PCOS Friendly
    {
        "category": "pcos",
        "phase": "Insulin Sensitivity & Hormone Balance",
        "meal_type": "breakfast",
        "title": "Sprouted Moong & Vegetable Cheela with Curd",
        "description": "Low Glycemic Index (GI) and rich in fiber to stabilize blood glucose spikes and reduce androgen excess in PCOS.",
        "local_foods": "Sprouted whole green moong, Besan, Grated carrots, Plain fresh curd",
        "key_nutrients": "Probiotics, Soluble Fiber, Low GI Carbs, Bioflavonoids",
        "is_affordable_local": True,
    },
    {
        "category": "pcos",
        "phase": "Anti-Inflammatory",
        "meal_type": "dinner",
        "title": "Foxtail Millet Khichdi with Mixed Seasonal Vegetables",
        "description": "Foxtail and barnyard millets promote insulin sensitivity, regulate menstrual regularity, and reduce systemic inflammation.",
        "local_foods": "Foxtail millet (kangni/navane), Green peas, Beans, Turmeric, Ginger",
        "key_nutrients": "Low GI, Curcumin (anti-inflammatory), Magnesium, Resistant Starch",
        "is_affordable_local": True,
    },
    {
        "category": "pcos",
        "phase": "Hormone Harmony",
        "meal_type": "snack",
        "title": "Roasted Pumpkin & Flaxseed Seed Mix with Chaat Masala",
        "description": "Flaxseeds contain lignans that assist estrogen clearance in PCOS, while pumpkin seeds furnish zinc for skin and hair health.",
        "local_foods": "Alsi (flaxseeds), Kaddu beej (pumpkin seeds), Chaat masala",
        "key_nutrients": "Omega-3 fatty acids, Lignans, Zinc, Vitamin E",
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


@router.get("/plans")
async def list_nutrition_plans(
    category: Optional[str] = Query(None, description="Filter by pregnancy, postpartum, or pcos"),
    db: AsyncSession = Depends(get_db),
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
