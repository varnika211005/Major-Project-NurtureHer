from dataclasses import dataclass


@dataclass(frozen=True)
class KnowledgeEntry:
    id: str
    category: str
    title: str
    content: str
    language: str = "en"


KNOWLEDGE_BASE: list[KnowledgeEntry] = [
    KnowledgeEntry(
        id="safety_urgent_001",
        category="safety",
        title="Urgent warning signs",
        content=(
            "Recommend urgent medical care for heavy bleeding, severe abdominal pain, fainting, breathing difficulty, "
            "seizures, high fever, chest pain, severe headache with vision changes, or thoughts of self-harm. Do not "
            "give diagnosis, medication changes, or emergency treatment instructions beyond seeking care."
        ),
    ),
    KnowledgeEntry(
        id="pregnancy_support_001",
        category="pregnancy",
        title="Pregnancy support",
        content=(
            "Pregnancy support should focus on antenatal visits, prescribed supplements, hydration, balanced meals, "
            "safe rest, warning-sign awareness, and preparing questions for a doctor or ASHA worker."
        ),
    ),
    KnowledgeEntry(
        id="pcos_guidance_001",
        category="pcos",
        title="PCOS guidance",
        content=(
            "PCOS risk may be associated with irregular cycles, higher BMI, excess hair growth, acne, skin darkening, "
            "weight gain, and follicle count. Encourage cycle tracking and clinical review for hormonal or metabolic testing."
        ),
    ),
    KnowledgeEntry(
        id="ppd_guidance_001",
        category="ppd",
        title="Postpartum depression guidance",
        content=(
            "Postpartum depression support should validate feelings, encourage social support, sleep help, professional "
            "care for moderate or high risk, and urgent care for self-harm thoughts or inability to care for self or baby."
        ),
    ),
    KnowledgeEntry(
        id="nutrition_001",
        category="nutrition",
        title="Nutrition guidance",
        content=(
            "General nutrition guidance includes regular meals, iron-rich foods, protein, fruits, vegetables, hydration, "
            "and following clinician advice for supplements, diabetes, anemia, hypertension, pregnancy, or breastfeeding."
        ),
    ),
    KnowledgeEntry(
        id="exercise_001",
        category="exercise",
        title="Exercise recommendations",
        content=(
            "Exercise recommendations should be gentle and safety-aware: walking, stretching, breathing exercises, and "
            "postpartum pelvic-floor guidance only when cleared by a healthcare professional."
        ),
    ),
    KnowledgeEntry(
        id="mental_wellness_001",
        category="mental_wellness",
        title="Mental wellness",
        content=(
            "Mental wellness guidance can include journaling, asking for practical help, sleep protection, grounding "
            "exercises, and contacting a trusted person or clinician when distress persists."
        ),
    ),
    KnowledgeEntry(
        id="cycle_tracking_001",
        category="cycle",
        title="Cycle tracking",
        content=(
            "Cycle predictions are estimates based on last period date and cycle length. Tracking bleeding, pain, mood, "
            "symptoms, and cycle variation helps identify patterns but does not diagnose disease."
        ),
    ),
]


def all_entries() -> list[KnowledgeEntry]:
    return list(KNOWLEDGE_BASE)
