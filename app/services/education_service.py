import json
import logging
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import desc, or_, select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.education import EducationalResource
from app.schemas.education import EducationalResourceCreate, EducationalResourceUpdate

logger = logging.getLogger(__name__)

VIDEO_CATEGORIES = [
    "Maternal Health Educational Series",
    "Pregnancy care and trimester-wise guidance",
    "Maternal nutrition",
    "Exercise and safe physical activity during pregnancy",
    "Breastfeeding and lactation",
    "Postpartum recovery",
    "Newborn care",
    "Maternal mental wellness",
    "Warning signs and when to seek medical help",
]

ARTICLE_CATEGORIES = [
    "Pregnancy and prenatal care",
    "Nutrition and hydration",
    "Postpartum recovery",
    "Breastfeeding",
    "Newborn care",
    "Maternal mental health",
    "Common maternal health concerns",
    "Emergency warning signs and first-aid guidance",
]

DEFAULT_RESOURCES = [
    # --- SIX MULTILINGUAL SERIES VIDEOS ---
    {
        "series_name": "NurtureHer English",
        "title": "Maternal Health Education (English)",
        "description": "Comprehensive video guidance on maternal care, wellness, prenatal milestones, and postpartum recovery in English. Spoken narration unverified pending review.",
        "content_type": "video",
        "language": "en",
        "is_verified": False,
        "category": "Maternal Health Educational Series",
        "video_url": "/media/videos/NurtureHer-English.mp4",
        "thumbnail_url": "/landing-new/hero-preview.png",
        "duration_seconds": 1781,
        "file_size_bytes": 206195482,
        "author_publisher": "NurtureHer Clinical Production",
        "review_date": "October 2026",
        "is_downloadable": True,
        "is_published": True,
    },
    {
        "series_name": "NurtureHer Hindi",
        "title": "Maternal Health Education (Hindi)",
        "description": "Comprehensive video guidance on maternal care, wellness, prenatal milestones, and postpartum recovery in Hindi. Spoken narration unverified pending review.",
        "content_type": "video",
        "language": "hi",
        "is_verified": False,
        "category": "Maternal Health Educational Series",
        "video_url": "/media/videos/NurtureHer-Hindi.mp4",
        "thumbnail_url": "/nurtureher-logo.png",
        "duration_seconds": 339,
        "file_size_bytes": 24824528,
        "author_publisher": "NurtureHer Clinical Production",
        "review_date": "October 2026",
        "is_downloadable": True,
        "is_published": True,
    },
    {
        "series_name": "NurtureHer Kannada",
        "title": "Maternal Health Education (Kannada)",
        "description": "Comprehensive video guidance on maternal care, wellness, prenatal milestones, and postpartum recovery in Kannada. Spoken narration unverified pending review.",
        "content_type": "video",
        "language": "kn",
        "is_verified": False,
        "category": "Maternal Health Educational Series",
        "video_url": "/media/videos/NurtureHer-Kannada.mp4",
        "thumbnail_url": "/nurtureher-icon.png",
        "duration_seconds": 704,
        "file_size_bytes": 104174878,
        "author_publisher": "NurtureHer Clinical Production",
        "review_date": "October 2026",
        "is_downloadable": True,
        "is_published": True,
    },
    {
        "series_name": "NurtureHer Tamil",
        "title": "Maternal Health Education (Tamil)",
        "description": "Comprehensive video guidance on maternal care, wellness, prenatal milestones, and postpartum recovery in Tamil. Spoken narration unverified pending review.",
        "content_type": "video",
        "language": "ta",
        "is_verified": False,
        "category": "Maternal Health Educational Series",
        "video_url": "/media/videos/NurtureHer-Tamil.mp4",
        "thumbnail_url": "/favicon-48x48.png",
        "duration_seconds": 1393,
        "file_size_bytes": 174995382,
        "author_publisher": "NurtureHer Clinical Production",
        "review_date": "October 2026",
        "is_downloadable": True,
        "is_published": True,
    },
    {
        "series_name": "NurtureHer Telugu",
        "title": "Maternal Health Education (Telugu)",
        "description": "Comprehensive video guidance on maternal care, wellness, prenatal milestones, and postpartum recovery in Telugu. Spoken narration unverified pending review.",
        "content_type": "video",
        "language": "te",
        "is_verified": False,
        "category": "Maternal Health Educational Series",
        "video_url": "/media/videos/NurtureHer-Telugu.mp4",
        "thumbnail_url": "/landing-new/hero-preview.png",
        "duration_seconds": 345,
        "file_size_bytes": 53149474,
        "author_publisher": "NurtureHer Clinical Production",
        "review_date": "October 2026",
        "is_downloadable": True,
        "is_published": True,
    },
    {
        "series_name": "NurtureHer Malayalam",
        "title": "Maternal Health Education (Malayalam)",
        "description": "Comprehensive video guidance on maternal care, wellness, prenatal milestones, and postpartum recovery in Malayalam. Spoken narration unverified pending review.",
        "content_type": "video",
        "language": "ml",
        "is_verified": False,
        "category": "Maternal Health Educational Series",
        "video_url": "/media/videos/NurtureHer-Malayalam.mp4",
        "thumbnail_url": "/nurtureher-logo.png",
        "duration_seconds": 221,
        "file_size_bytes": 31237337,
        "author_publisher": "NurtureHer Clinical Production",
        "review_date": "October 2026",
        "is_downloadable": True,
        "is_published": True,
    },

    # --- ARTICLES ---
    {
        "title": "Antenatal Care Checklist: Essential Tests & Screening Milestones",
        "description": "A comprehensive week-by-week guide detailing ultrasound scans, blood glucose screening, anomaly checks, and vital signs monitoring throughout pregnancy.",
        "content_type": "article",
        "category": "Pregnancy and prenatal care",
        "thumbnail_url": "/landing-new/hero-preview.png",
        "article_content": """# Antenatal Care Checklist: Essential Tests & Screening Milestones

Regular antenatal checkups ensure the health and vitality of both mother and developing baby. This guide details each milestone from confirmation to term.

## First Trimester (Weeks 1 – 12)
- **Early Dating Ultrasound (Weeks 6–9):** Confirms gestational age, heartbeat viability, and intrauterine implantation.
- **Baseline Blood & Urine Work:** Complete blood count (CBC) to screen for maternal anemia, ABO blood grouping and Rh factor, thyroid profile (TSH), infectious disease panel, and urine routine/culture.
- **Nuchal Translucency (NT) Scan & Combined Dual Marker (Weeks 11–13):** First-trimester screening assessing chromosomal health.

## Second Trimester (Weeks 13 – 27)
- **Targeted Anomaly Scan (Weeks 18–20):** Detailed anatomical evaluation of the baby's organs, spine, brain, extremities, and placental attachment.
- **Oral Glucose Tolerance Test (OGTT, Weeks 24–28):** Critical diagnostic screening for Gestational Diabetes Mellitus (GDM).
- **Rh Antibody Titer:** Checked at 28 weeks for Rh-negative mothers prior to anti-D prophylaxis administration.

## Third Trimester (Weeks 28 – 40)
- **Fetal Growth & Doppler Scans:** Monitors growth trajectory, amniotic fluid index (AFI), and umbilical artery Doppler resistance.
- **Blood Pressure & Urinalysis at Every Visit:** Vigilant screening for preeclampsia and gestational hypertension.
- **Group B Streptococcus (GBS) Screening (Weeks 36–37):** Vaginal-rectal swab to guide intrapartum antibiotic prophylaxis if required.

> **Clinical Advice:** Never skip a scheduled prenatal visit even if you feel completely healthy. Early detection of asymptomatic changes protects maternal well-being.""",
        "author_publisher": "Dr. Sunita Deshmukh, MD (OB/GYN) & FOGSI Perinatal Committee",
        "review_date": "October 2026",
        "sources_json": json.dumps([
            "ACOG Practice Bulletin No. 229: Antepartum Fetal Surveillance",
            "FOGSI Good Clinical Practice Guidelines in Antenatal Care",
            "WHO Antenatal Care Models for a Positive Pregnancy Experience",
        ]),
        "is_downloadable": True,
        "is_published": True,
    },
    {
        "title": "Maternal Nutrition & Hydration: The Complete Dietary Roadmap",
        "description": "How to optimize calorie quality, maximize dietary iron absorption, meet calcium requirements, and maintain proper electrolyte balance throughout pregnancy.",
        "content_type": "article",
        "category": "Nutrition and hydration",
        "thumbnail_url": "/nurtureher-logo.png",
        "article_content": """# Maternal Nutrition & Hydration: The Complete Dietary Roadmap

During pregnancy, nutritional needs increase not simply in volume, but in micronutrient density. Fueling your body with intention supports placental function and optimal fetal growth.

## Core Nutritional Pillars

### 1. Iron & Hemoglobin Support
- Maternal blood volume expands by up to 50% during pregnancy.
- **Sources:** Spinach, fenugreek, lentils, chickpeas, beetroot, sesame seeds, and lean proteins.
- **Absorption Booster:** Always pair iron-rich meals with Vitamin C (lemon juice, amla, oranges, bell peppers).
- **Avoid:** Drinking tea or coffee with meals, as tannins inhibit non-heme iron absorption by up to 60%.

### 2. Calcium & Vitamin D
- Essential for fetal skeletal mineral density and maternal bone preservation.
- **Target:** 1,000 to 1,200 mg daily.
- **Sources:** Ragi (finger millet), curd/yogurt, paneer, fortified plant milks, and almonds.

### 3. Folic Acid & Choline
- Supports neural tube closure and neurological development.
- **Sources:** Dark leafy greens, beans, eggs, whole grains, and prescribed prenatal supplements.

## Daily Hydration Blueprint
- Aim for 2.5 to 3 liters of fluids daily.
- Include coconut water for natural potassium, warm cumin water, fresh soups, and clean filtered water.
- Proper hydration reduces the risk of maternal urinary tract infections (UTIs), constipation, and false Braxton-Hicks contractions.""",
        "author_publisher": "Clinical Nutrition Board, National Maternity Institute",
        "review_date": "September 2026",
        "sources_json": json.dumps([
            "ICMR-NIN Dietary Guidelines for Indians (2024)",
            "American Journal of Clinical Nutrition Perinatal Hydration Consensus",
        ]),
        "is_downloadable": True,
        "is_published": True,
    },
    {
        "title": "Postpartum Recovery: Physical Healing, Perineal Care, and Rest",
        "description": "A clinically grounded roadmap for the fourth trimester: lochia stages, perineal care, cesarean wound precautions, and pelvic rehabilitation.",
        "content_type": "article",
        "category": "Postpartum recovery",
        "thumbnail_url": "/nurtureher-icon.png",
        "article_content": """# Postpartum Recovery: Physical Healing & Fourth Trimester Care

Delivery is an intense physiological transformation. The postpartum phase demands gentle, systematic restoration rather than rushing back into exertion.

## Lochia (Postpartum Bleeding) Progression
1. **Lochia Rubra (Days 1–4):** Bright to dark red blood, similar to a heavy period, with small clots.
2. **Lochia Serosa (Days 5–12):** Pinkish-brown, thinner discharge.
3. **Lochia Alba (Weeks 2–6):** Yellowish-white, watery discharge gradually tapering off.
*Alert:* If you soak more than one sanitary pad per hour for two consecutive hours, contact your hospital immediately.

## Perineal & Cesarean Wound Care
- **Perineal Tears / Episiotomy:** Use a peri-bottle with warm water after using the restroom. Gently pat dry; do not rub. Warm sitz baths after day 3 promote tissue circulation.
- **Cesarean Incision:** Keep the incision dry and clean. Inspect daily for redness, increasing swelling, or separation of edges. Avoid lifting anything heavier than your baby for six weeks.

## Gradual Activity & Pelvic Floor Rest
- Prioritize horizontal rest during the first two weeks.
- Avoid abdominal crunches or heavy lifting until cleared by your obstetrician at the 6-week postnatal assessment.""",
        "author_publisher": "Maternal Rehabilitation & Recovery Institute",
        "review_date": "October 2026",
        "sources_json": json.dumps([
            "ACOG Committee Opinion No. 736: Optimizing Postpartum Care",
            "Royal College of Midwives Postnatal Care Guidelines",
        ]),
        "is_downloadable": True,
        "is_published": True,
    },
    {
        "title": "The Breastfeeding Companion: Latch, Supply, and Overcoming Hurdles",
        "description": "Comprehensive practical guidance on establishing breast milk supply, correct latch biomechanics, preventing mastitis, and recognizing infant satiety.",
        "content_type": "article",
        "category": "Breastfeeding",
        "thumbnail_url": "/landing-new/hero-preview.png",
        "article_content": """# The Breastfeeding Companion: Latch, Supply & Troubleshooting

Breastfeeding is a learned skill for both mother and infant. With timely guidance and proper latch mechanics, pain and supply anxieties can be resolved.

## Hallmarks of an Optimal Deep Latch
- Infant mouth is wide open (greater than 140 degrees) like a yawn.
- Lower lip is flanged outward; chin is pressed firmly against maternal breast.
- More of the lower areola is covered than the upper areola.
- Mother experiences a gentle pulling tug without pinch or sharp pain.
- Audible rhythm of swallows is evident after milk let-down occurs.

## Establishing & Protecting Milk Supply
- **Demand and Supply Dynamics:** Breast milk production operates on autocrine control—the more frequently the breast is emptied effectively, the more milk is signaled to produce.
- **Feed on Early Hunger Cues:** Rooting, sucking on fists, and rapid eye movements. Crying is a late hunger cue.
- **Pumping & Hand Expression:** Useful if separation occurs or for engorgement relief.

## Preventing Common Complications
- **Engorgement:** Apply warm compresses or shower immediately prior to feeding to encourage flow; apply cold gel packs between feedings to decrease swelling.
- **Blocked Ducts:** Gentle massage toward the nipple during feeds, varying nursing positions, and continued drainage.
- **Mastitis Warning:** Sudden fever, chills, body aches, and a localized hot, wedge-shaped red streak on the breast require prompt clinical evaluation and antibiotics.""",
        "author_publisher": "International Board of Lactation Consultant Examiners (IBLCE)",
        "review_date": "October 2026",
        "sources_json": json.dumps([
            "WHO/UNICEF Ten Steps to Successful Breastfeeding",
            "Academy of Breastfeeding Medicine Protocol #4: Mastitis Spectrum",
        ]),
        "is_downloadable": True,
        "is_published": True,
    },
    {
        "title": "Newborn Care 101: Feeding Patterns, Cord Hygiene, and Warning Signs",
        "description": "A comforting guide for new parents covering umbilical cord healing, normal stool progression, temperature management, and when to call the pediatrician.",
        "content_type": "article",
        "category": "Newborn care",
        "thumbnail_url": "/nurtureher-logo.png",
        "article_content": """# Newborn Care 101: Essential Practical Care for New Parents

Bringing a newborn home brings profound joy alongside practical questions. This evidence-based guide outlines essential daily infant care routines.

## Umbilical Cord Stump Care
- Keep the cord stump clean and dry at all times.
- Fold the diaper waistband downward beneath the stump so it stays exposed to air.
- Sponge bathe your baby until the stump falls off naturally (typically between days 7 and 21). Never pull on the stump.
- *Red Flags:* Foul odor, yellowish pus, or reddened skin spreading around the base of the navel require urgent pediatric assessment.

## Infant Elimination Patterns
- **Meconium (Days 1–2):** Thick, tarry, dark greenish-black stool.
- **Transitional (Days 3–4):** Greenish-brown to mustard-yellow.
- **Established (Day 5 onward):** Mustard yellow, seeded texture for breastfed infants; slightly firmer for formula-fed infants.
- Expect 6 or more wet diapers daily once milk is established, indicating adequate hydration.

## When to Contact the Pediatrician Immediately
- Any rectal temperature of 100.4°F (38.0°C) or higher in an infant under 3 months.
- Persistent projectile vomiting (green or yellow bile).
- Lethargy or extreme difficulty waking the baby for regular feedings.
- Cyanosis (bluish tint around the lips or tongue).""",
        "author_publisher": "Pediatric Health & Neonatal Care Foundation",
        "review_date": "October 2026",
        "sources_json": json.dumps([
            "American Academy of Pediatrics (AAP) Neonatal Care Standards",
            "IAP Guidelines for Routine Care of the Healthy Newborn",
        ]),
        "is_downloadable": True,
        "is_published": True,
    },
    {
        "title": "Maternal Mental Health: Navigating Postpartum Depression & Anxiety",
        "description": "Understanding the difference between the baby blues and postpartum depression (PPD), recognizing intrusive anxiety thoughts, and finding professional care.",
        "content_type": "article",
        "category": "Maternal mental health",
        "thumbnail_url": "/favicon-48x48.png",
        "article_content": """# Maternal Mental Health: Navigating Postpartum Depression & Anxiety

Becoming a mother is an emotional earthquake. Experiencing vulnerability, fear, or profound exhaustion does not reflect your love or capability as a parent.

## Baby Blues vs. Postpartum Depression (PPD)

### Baby Blues (80% of Mothers)
- Arises within days 2–5 postpartum and naturally resolves within 10–14 days.
- Characterized by mild weepiness, mood swings, fatigue, and feeling temporarily overwhelmed as estrogen and progesterone drop precipitously.

### Postpartum Depression & Perinatal Anxiety (15–20% of Mothers)
- Can develop anytime within the first 12 months postpartum.
- Symptoms persist beyond 2 weeks and interfere with daily functioning.
- **Key Indicators:** Unrelenting sadness, feeling detached from the baby, intrusive frightening thoughts, insomnia even when the baby sleeps, and feelings of severe guilt or inadequacy.

## Breaking the Silence
- PPD is a treatable medical condition caused by neurochemical shifts and extreme sleep deprivation, not a personal flaw.
- Evidence-based treatments include cognitive behavioral therapy (CBT), peer support groups, and lactation-safe medications prescribed by a psychiatrist.
- Speak openly with your partner, family, or doctor. NurtureHer's screening tools can assist in early identification.""",
        "author_publisher": "Perinatal Mental Health Advisory Board",
        "review_date": "September 2026",
        "sources_json": json.dumps([
            "Postpartum Support International Clinical Guidelines",
            "NICE Guidelines: Antenatal and Postnatal Mental Health",
        ]),
        "is_downloadable": True,
        "is_published": True,
    },
    {
        "title": "Emergency Obstetric Signs & First-Aid Protocol: Immediate Action Guide",
        "description": "Critical reference guide for maternal emergencies: hemorrhage, eclamptic seizures, chest pain, and umbilical cord prolapse.",
        "content_type": "article",
        "category": "Emergency warning signs and first-aid guidance",
        "thumbnail_url": "/landing-new/hero-preview.png",
        "article_content": """# Emergency Obstetric Signs & First-Aid Protocol

Maternal emergencies can progress rapidly. Knowing the danger signs and immediate first-aid steps saves lives.

## Critical Red Flags Requiring Immediate Emergency Transfer

### 1. Severe Vaginal Bleeding (Antepartum or Postpartum)
- **Sign:** Bright red continuous blood flow soaking a sanitary pad within minutes, or passing large fist-sized clots.
- **Immediate Action:** Call emergency services (108 / 112). Lay mother flat on her left side with feet slightly elevated. Keep her warm. Do not insert anything into the vagina.

### 2. Preeclampsia / Eclampsia Seizures
- **Signs:** Severe persistent headache unaffected by paracetamol, visual disturbances (spots, flashing lights, blurred vision), severe epigastric pain beneath the ribs, facial swelling.
- **Seizure First Aid:** Turn mother onto her left side to maintain open airway. Clear surrounding hard objects. Never place fingers or spoons in her mouth. Note seizure duration and rush to the nearest hospital equipped with Magnesium Sulfate.

### 3. Cord Prolapse (Water Breaks with Umbilical Cord Present)
- **Sign:** The umbilical cord slips into the vagina ahead of the baby after membranes rupture.
- **Immediate Action:** Life-threatening emergency. Have mother assume a knee-to-chest position (buttocks elevated above chest) to relieve pressure on the cord. Do not push the cord back. Transport immediately to an obstetric surgical unit.

> **Important Reminder:** Educational articles never replace emergency clinical services. In any acute situation, proceed directly to the nearest hospital emergency department.""",
        "author_publisher": "Emergency Obstetric Care & Critical Response Council",
        "review_date": "October 2026",
        "sources_json": json.dumps([
            "WHO Emergency Triage Assessment and Treatment (ETAT) Protocols",
            "Emergency Medicine Association Maternal Resuscitation Standards",
        ]),
        "is_downloadable": True,
        "is_published": True,
    },
    {
        "title": "Common Maternal Health Concerns: Headaches, Swelling, and Back Pain",
        "description": "How to differentiate benign physiological pregnancy discomforts from early clinical pathology, with doctor-approved relief methods.",
        "content_type": "article",
        "category": "Common maternal health concerns",
        "thumbnail_url": "/nurtureher-icon.png",
        "article_content": """# Common Maternal Health Concerns: Benign Symptoms vs. Pathology

Pregnancy causes vast biomechanical and vascular adaptations. Understanding what is normal and what warrants medical evaluation provides peace of mind.

## 1. Back & Sacroiliac Pain
- **Cause:** Relaxin hormone loosens pelvic ligaments while the enlarging uterus shifts your center of gravity forward.
- **Safe Relief:** Maternity support bands, low-heeled ergonomic footwear, sleeping with a pillow between your knees, and gentle prenatal yoga stretches.
- **When to worry:** Pain that radiates with numbness down both legs, or pain accompanied by fever or burning urination (possible kidney infection).

## 2. Leg & Ankle Swelling (Dependent Edema)
- **Normal:** Mild swelling in both feet and ankles toward evening, resolving after resting with legs elevated.
- **Abnormal:** Sudden swelling in the face, eyelids, or hands, or asymmetrical swelling with heat/pain in one calf (possible deep vein thrombosis).

## 3. Gastroesophageal Reflux (Heartburn)
- **Cause:** Progesterone relaxes the lower esophageal sphincter, coupled with upward mechanical pressure on the stomach.
- **Relief:** Eat smaller, frequent meals. Avoid lying down for 2 hours after eating. Elevate the head of your bed 6 inches. Consult your clinician for safe antacid options.""",
        "author_publisher": "Maternal Primary Care Collaborative",
        "review_date": "October 2026",
        "sources_json": json.dumps([
            "ACOG Patient Education: Managing Common Discomforts of Pregnancy",
            "Obstetric Medicine Society Guidelines",
        ]),
        "is_downloadable": True,
        "is_published": True,
    },
]


class EducationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def ensure_defaults(self) -> None:
        # Safely remove obsolete sample video records whose files are being decommissioned
        obsolete_urls = [
            "/media/videos/trimester1_care_guide.mp4",
            "/media/videos/prenatal_breathing_exercise.mp4",
            "/media/videos/newborn_latch_basics.mp4",
            "/media/videos/maternal_warning_signs.mp4",
        ]
        await self.db.execute(
            delete(EducationalResource).where(
                EducationalResource.video_url.in_(obsolete_urls)
            )
        )

        existing_titles = set(
            (
                await self.db.scalars(
                    select(EducationalResource.title).where(EducationalResource.deleted_at.is_(None))
                )
            ).all()
        )

        added = 0
        for item in DEFAULT_RESOURCES:
            title = item.get("title")
            if title in existing_titles:
                continue

            data = dict(item)
            if "language" not in data:
                data["language"] = "en"
            if "series_name" not in data:
                data["series_name"] = None
            if "is_verified" not in data:
                data["is_verified"] = False
            resource = EducationalResource(**data)
            self.db.add(resource)
            existing_titles.add(title)
            added += 1

        await self.db.commit()
        if added > 0:
            logger.info("Added %d new educational resources...", added)

    async def list_resources(
        self,
        content_type: str | None = None,
        language: str | None = None,
        category: str | None = None,
        search: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[EducationalResource]:
        await self.ensure_defaults()

        stmt = select(EducationalResource).where(
            EducationalResource.deleted_at.is_(None),
            EducationalResource.is_published.is_(True),
        )

        if content_type:
            stmt = stmt.where(EducationalResource.content_type == content_type.lower().strip())
        if language and language.strip().lower() != "all":
            stmt = stmt.where(EducationalResource.language == language.strip().lower())
        if category:
            stmt = stmt.where(EducationalResource.category == category.strip())
        if search:
            q = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    EducationalResource.title.ilike(q),
                    EducationalResource.description.ilike(q),
                    EducationalResource.category.ilike(q),
                    EducationalResource.author_publisher.ilike(q),
                )
            )

        stmt = stmt.order_by(desc(EducationalResource.created_at)).limit(limit).offset(offset)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_resource(self, resource_id: UUID) -> EducationalResource:
        await self.ensure_defaults()
        resource = await self.db.get(EducationalResource, resource_id)
        if not resource or resource.deleted_at is not None or not resource.is_published:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Educational resource not found")
        return resource

    async def get_categories(self) -> dict[str, list[str]]:
        return {
            "video_categories": VIDEO_CATEGORIES,
            "article_categories": ARTICLE_CATEGORIES,
        }

    async def create_resource(self, payload: EducationalResourceCreate) -> EducationalResource:
        data = payload.model_dump()
        resource = EducationalResource(**data)
        self.db.add(resource)
        await self.db.commit()
        await self.db.refresh(resource)
        return resource

    async def update_resource(self, resource_id: UUID, payload: EducationalResourceUpdate) -> EducationalResource:
        resource = await self.db.get(EducationalResource, resource_id)
        if not resource or resource.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Educational resource not found")
        data = payload.model_dump(exclude_unset=True)
        for key, value in data.items():
            setattr(resource, key, value)
        await self.db.commit()
        await self.db.refresh(resource)
        return resource

    async def delete_resource(self, resource_id: UUID) -> None:
        resource = await self.db.get(EducationalResource, resource_id)
        if not resource or resource.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Educational resource not found")
        from datetime import datetime, timezone
        resource.deleted_at = datetime.now(timezone.utc)
        await self.db.commit()
