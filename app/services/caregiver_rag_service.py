import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import httpx
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.core.config import settings
from app.core.security import UserRole
from app.models.carecircle import CareCircleAccess
from app.models.caregiver_chat import CaregiverChatMessage
from app.models.pcos import PCOSPrediction
from app.models.ppd import PPDAssessment
from app.models.user import MotherProfile, User
from app.models.wellness import Mood, Symptom

logger = logging.getLogger(__name__)

NON_DIAGNOSTIC_DISCLAIMER = (
    "Clinical Notice: NurtureHer Caregiver Coach provides informational, educational support for family caregivers. "
    "It is not a diagnostic tool or medical prescription. Always consult a licensed healthcare professional for clinical concerns."
)

URGENT_POSTPARTUM_SIGNS = [
    {
        "keywords": ["heavy bleeding", "soaking pad", "blood clot", "hemorrhage", "excessive bleeding"],
        "advice": "CRITICAL EMERGENCY: Heavy postpartum bleeding soaking more than one pad per hour is an obstetric emergency. Immediately call 112 or take the mother to the nearest hospital emergency room.",
    },
    {
        "keywords": ["severe headache", "blurring vision", "spots in vision", "high blood pressure", "swelling face"],
        "advice": "URGENT WARNING: Severe headache, blurred vision, or facial swelling can indicate postpartum preeclampsia/eclampsia. Seek immediate emergency clinical evaluation.",
    },
    {
        "keywords": ["high fever", "foul smelling", "foul lochia", "chills", "fever above 100"],
        "advice": "URGENT: High fever or foul-smelling postpartum discharge may indicate a serious uterine infection (endometritis/sepsis). Contact a doctor immediately.",
    },
    {
        "keywords": ["harming herself", "harm the baby", "suicidal", "severe depression", "hear voices"],
        "advice": "CRITICAL: Expressions of self-harm, harming the infant, or postpartum psychosis require immediate urgent care. Call Tele-MANAS (14416) or 112 immediately and do not leave the mother alone.",
    },
    {
        "keywords": ["chest pain", "shortness of breath", "coughing blood", "difficulty breathing"],
        "advice": "CRITICAL EMERGENCY: Sudden chest pain or difficulty breathing could indicate a pulmonary embolism. Call emergency ambulance 112/108 immediately.",
    },
]


class CitationSource(BaseModel):
    id: str
    title: str
    publisher: str
    page: int
    excerpt: str


class CaregiverChatResponse(BaseModel):
    id: str
    message: str
    response: str
    language: str
    sources: list[CitationSource] = []
    clinical_disclaimer: str
    has_maternal_data: bool = False
    maternal_consent_status: str | None = None
    created_at: str


class CaregiverRAGService:
    _vectorizer: TfidfVectorizer | None = None
    _tfidf_matrix = None
    _chunks: list[dict[str, Any]] = []
    _index_loaded: bool = False

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._ensure_index_loaded()

    @classmethod
    def _ensure_index_loaded(cls) -> None:
        if cls._index_loaded:
            return
        index_file = Path("data/caregiver_rag/caregiver_chunks.json")
        if not index_file.exists():
            logger.warning("Caregiver RAG index file not found at %s", index_file)
            return

        try:
            with open(index_file, "r", encoding="utf-8") as f:
                cls._chunks = json.load(f)
            if cls._chunks:
                corpus_texts = [f"{c['doc_title']} {c['text']}" for c in cls._chunks]
                cls._vectorizer = TfidfVectorizer(max_features=10000, stop_words="english")
                cls._tfidf_matrix = cls._vectorizer.fit_transform(corpus_texts)
                cls._index_loaded = True
                logger.info("Loaded Caregiver RAG index with %d chunks.", len(cls._chunks))
        except Exception as exc:
            logger.error("Failed to load Caregiver RAG index: %s", exc)

    def retrieve_passages(self, query: str, top_k: int = 3, min_similarity: float = 0.08) -> list[dict[str, Any]]:
        if not self._index_loaded or not self._vectorizer or self._tfidf_matrix is None:
            return []

        try:
            query_vec = self._vectorizer.transform([query])
            sims = cosine_similarity(query_vec, self._tfidf_matrix).flatten()
            top_indices = sims.argsort()[::-1][:top_k]

            results = []
            for idx in top_indices:
                score = float(sims[idx])
                if score >= min_similarity:
                    chunk = dict(self._chunks[idx])
                    chunk["score"] = score
                    results.append(chunk)
            return results
        except Exception as exc:
            logger.warning("Retrieval calculation error: %s", exc)
            return []

    async def get_permitted_maternal_context(self, caregiver: User, query: str) -> tuple[str, bool, str]:
        """
        Check caregiver permissions and retrieve live maternal dashboard data.
        Returns: (maternal_context_summary, has_maternal_data, consent_status_note)
        """
        # 1. Fetch approved, active CareCircle connections for this caregiver
        stmt = (
            select(CareCircleAccess, User)
            .join(User, User.id == CareCircleAccess.user_id)
            .where(
                CareCircleAccess.requester_id == caregiver.id,
                CareCircleAccess.status == "approved",
                CareCircleAccess.revoked_at.is_(None),
                User.role == UserRole.MOTHER,
                User.is_active.is_(True),
            )
        )
        results = (await self.db.execute(stmt)).all()
        if not results:
            # Check if there are pending or revoked requests
            pending_or_revoked = await self.db.scalar(
                select(CareCircleAccess).where(CareCircleAccess.requester_id == caregiver.id).limit(1)
            )
            if pending_or_revoked:
                if pending_or_revoked.revoked_at is not None or pending_or_revoked.status == "revoked":
                    status_note = "CareCircle access has been revoked. Maternal permission required."
                else:
                    status_note = f"CareCircle status is '{pending_or_revoked.status}'. Maternal permission required."
            else:
                status_note = "No connected mother found. Connect to mother via QR code in Caregiver Companion."
            return ("", False, status_note)

        # Build context from approved mother(s)
        context_parts = []
        has_any_data = False
        query_lower = query.lower()

        for access, mother in results:
            profile = await self.db.scalar(select(MotherProfile).where(MotherProfile.user_id == mother.id))
            mother_label = f"Connected Mother: {mother.name} (Relationship: {access.relationship_label})"
            mother_details = [mother_label]

            # Category 1: Emergency & Vitals
            if access.share_emergency:
                emergency_info = []
                if profile and profile.emergency_contact:
                    emergency_info.append(f"Emergency Contact: {profile.emergency_contact}")
                if profile and profile.blood_group:
                    emergency_info.append(f"Blood Group: {profile.blood_group}")
                if emergency_info:
                    mother_details.append(f"[Permitted Emergency Info]: {', '.join(emergency_info)}")
                    has_any_data = True
            elif any(w in query_lower for w in ["emergency", "contact", "blood"]):
                mother_details.append("[Notice]: Mother has not consented to share emergency/blood group details.")

            # Category 2: Screenings & Risk Category
            if access.share_risk_category:
                pcos = await self.db.scalar(
                    select(PCOSPrediction).where(PCOSPrediction.user_id == mother.id).order_by(desc(PCOSPrediction.created_at)).limit(1)
                )
                ppd = await self.db.scalar(
                    select(PPDAssessment).where(PPDAssessment.user_id == mother.id).order_by(desc(PPDAssessment.created_at)).limit(1)
                )
                screening_items = []
                if pcos:
                    screening_items.append(f"PCOS Screening Risk: {pcos.risk_level.value if hasattr(pcos.risk_level, 'value') else pcos.risk_level}")
                if ppd:
                    screening_items.append(f"PPD Screening Risk: {ppd.risk_level.value if hasattr(ppd.risk_level, 'value') else ppd.risk_level}")
                if screening_items:
                    mother_details.append(f"[Permitted Screening Assessments]: {', '.join(screening_items)}")
                    has_any_data = True
            elif any(w in query_lower for w in ["ppd", "depression", "pcos", "screening", "risk"]):
                mother_details.append("[Notice]: Mother has not consented to share clinical screening records.")

            # Category 3: Wellness & Symptoms
            if access.share_wellness_summary:
                latest_mood = await self.db.scalar(
                    select(Mood).where(Mood.user_id == mother.id).order_by(desc(Mood.created_at)).limit(1)
                )
                latest_symptom = await self.db.scalar(
                    select(Symptom).where(Symptom.user_id == mother.id).order_by(desc(Symptom.created_at)).limit(1)
                )
                wellness_items = []
                if latest_mood:
                    wellness_items.append(f"Recent Logged Mood: {latest_mood.mood}")
                if latest_symptom:
                    symptom_flags = []
                    if latest_symptom.fatigue:
                        symptom_flags.append("Fatigue")
                    if latest_symptom.sleep_issue:
                        symptom_flags.append("Sleep difficulty")
                    if latest_symptom.anxiety:
                        symptom_flags.append("Anxiety")
                    if symptom_flags:
                        wellness_items.append(f"Logged Symptoms: {', '.join(symptom_flags)}")
                if wellness_items:
                    mother_details.append(f"[Permitted Wellness & Symptoms]: {', '.join(wellness_items)}")
                    has_any_data = True
            elif any(w in query_lower for w in ["mood", "sleep", "fatigue", "anxiety", "symptom"]):
                mother_details.append("[Notice]: Mother has not consented to share wellness tracking logs.")

            # Category 4: Nutrition & Hydration (explicitly guarded)
            if any(w in query_lower for w in ["nutrition", "diet", "hydration", "water intake", "meal", "food"]):
                if not getattr(access, "share_nutrition", False):
                    mother_details.append("[Notice]: Mother has not consented to share nutrition or hydration logs.")
                else:
                    mother_details.append("[Notice]: Personal nutrition tracking logs are restricted to the mother's private dashboard.")

            context_parts.append("\n".join(mother_details))

        consent_note = "CareCircle permissions verified for connected mother." if has_any_data else "No specific maternal health data permitted for this query."
        return ("\n\n".join(context_parts), has_any_data, consent_note)

    async def call_gemini(self, prompt: str) -> str:
        api_key = (settings.gemini_api_key or "").strip("'\" \t\r\n")
        if not api_key or api_key == "change-me":
            raise ValueError("Gemini API key is not configured in backend environment (GEMINI_API_KEY).")

        model_name = (settings.gemini_model or "gemini-1.5-flash").strip("'\" \t\r\n")
        if model_name in ("gemini-3.6-flash", "gemini-2.0-flash"):
            model_name = "gemini-1.5-flash"

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 600},
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, params={"key": api_key}, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"Gemini API returned status {resp.status_code}: {resp.text[:200]}")
            data = resp.json()
            candidates = data.get("candidates", [])
            if candidates and "content" in candidates[0]:
                parts = candidates[0]["content"].get("parts", [])
                if parts and "text" in parts[0]:
                    return parts[0]["text"].strip()
            raise RuntimeError("Gemini API returned empty response candidates.")

    async def answer_query(self, caregiver: User, message: str, language: str = "en") -> CaregiverChatResponse:
        clean_msg = message.strip()
        msg_lower = clean_msg.lower()

        # 1. Urgent Warning Signs Check
        for sign in URGENT_POSTPARTUM_SIGNS:
            if any(k in msg_lower for k in sign["keywords"]):
                urgent_resp = f"{sign['advice']}\n\n{NON_DIAGNOSTIC_DISCLAIMER}"
                chat_rec = CaregiverChatMessage(
                    caregiver_id=caregiver.id,
                    message=clean_msg,
                    response=urgent_resp,
                    sources=json.dumps([]),
                    language=language,
                    created_at=datetime.now(timezone.utc),
                )
                self.db.add(chat_rec)
                await self.db.commit()
                try:
                    await self.db.refresh(chat_rec)
                except Exception:
                    pass
                return CaregiverChatResponse(
                    id=str(chat_rec.id),
                    message=clean_msg,
                    response=urgent_resp,
                    language=language,
                    sources=[],
                    clinical_disclaimer=NON_DIAGNOSTIC_DISCLAIMER,
                    has_maternal_data=False,
                    maternal_consent_status="Emergency alert triggered",
                    created_at=(chat_rec.created_at or datetime.now(timezone.utc)).isoformat(),
                )

        # 2. Permitted Maternal Context via CareCircle
        maternal_context, has_maternal_data, consent_note = await self.get_permitted_maternal_context(caregiver, clean_msg)

        # 3. Retrieve relevant medical passages from data/caregiver_rag/
        passages = self.retrieve_passages(clean_msg, top_k=3, min_similarity=0.08)
        citations: list[CitationSource] = []
        passage_texts = []

        for p in passages:
            citation = CitationSource(
                id=p["id"],
                title=p["doc_title"],
                publisher=p["publisher"],
                page=p["page"],
                excerpt=p["text"][:160] + "...",
            )
            citations.append(citation)
            passage_texts.append(f"[{citation.title} (Page {citation.page})]:\n{p['text']}")

        # 4. Check if we have sufficient context or if model provider is available
        retrieved_context_str = "\n\n".join(passage_texts) if passage_texts else "No directly matching medical guideline passages found."

        # If question is asking about specific maternal data but caregiver has no permission:
        personal_data_cues = [
            "her score", "her screening", "her risk", "her result", "her mood",
            "her bp", "her blood pressure", "her symptom", "her record", "her diagnosis",
            "what was her", "how was her", "show her",
            "her diet", "her nutrition", "her hydration", "her daily water intake",
            "her water intake", "her meal", "her meals", "her food log", "her nutrition plan",
            "her nutrition profile", "what did she eat", "what has she eaten", "how much water"
        ]
        is_personal_data_query = any(c in msg_lower for c in personal_data_cues)
        maternal_keywords = [
            "she", "her", "mother", "wife", "partner", "mood", "bp", "blood pressure",
            "score", "screening", "ppd", "pcos", "diet", "nutrition", "hydration", "water intake"
        ]
        is_maternal_query = any(k in msg_lower for k in maternal_keywords)
        if (is_personal_data_query and not has_maternal_data) or (is_maternal_query and not has_maternal_data and not passages):
            ans_text = (
                f"You do not currently have permitted access to the mother's live dashboard data for this category. "
                f"Status: {consent_note}\n\n"
                f"To view permitted health updates, the mother must grant consent in her CareCircle Vault. "
                f"For general guidance, you can ask questions about postpartum recovery, newborn care, or emotional support."
            )
            chat_rec = CaregiverChatMessage(
                caregiver_id=caregiver.id,
                message=clean_msg,
                response=ans_text,
                sources=json.dumps([]),
                language=language,
                created_at=datetime.now(timezone.utc),
            )
            self.db.add(chat_rec)
            await self.db.commit()
            try:
                await self.db.refresh(chat_rec)
            except Exception:
                pass
            return CaregiverChatResponse(
                id=str(chat_rec.id),
                message=clean_msg,
                response=ans_text,
                language=language,
                sources=[],
                clinical_disclaimer=NON_DIAGNOSTIC_DISCLAIMER,
                has_maternal_data=False,
                maternal_consent_status=consent_note,
                created_at=(chat_rec.created_at or datetime.now(timezone.utc)).isoformat(),
            )

        # 5. Build prompt for Gemini
        system_instructions = (
            "You are NurtureHer Caregiver Coach, an AI assistant dedicated exclusively to helping partners, family members, "
            "and caregivers support mothers during pregnancy and the postpartum period.\n"
            "Guidelines:\n"
            "1. Ground all health recommendations in the provided Clinical Evidence passages. Do not invent medical claims.\n"
            "2. When discussing the mother's current status, ONLY reference data in the Permitted Maternal Dashboard Context. "
            "Never guess unpermitted health measurements.\n"
            "3. Frame your advice with compassion and actionable caregiver actions (e.g., preparing warm meals, taking night soothing shifts, monitoring hydration).\n"
            "4. Always conclude with reassurance and non-diagnostic framing.\n"
            f"5. Answer in language: {language}."
        )

        full_prompt = (
            f"{system_instructions}\n\n"
            f"--- CLINICAL EVIDENCE FROM TRUSTED GUIDELINES ---\n"
            f"{retrieved_context_str}\n\n"
            f"--- PERMITTED MATERNAL DASHBOARD CONTEXT ---\n"
            f"{maternal_context or 'No live maternal health data shared.'}\n\n"
            f"--- CAREGIVER QUESTION ---\n"
            f"{clean_msg}\n\n"
            f"--- RESPONSE ---"
        )

        # 6. Execute model inference
        try:
            generated_text = await self.call_gemini(full_prompt)
        except Exception as exc:
            logger.error("Caregiver model provider error: %s", exc)
            raise RuntimeError(f"AI Health Coach provider is unavailable: {exc}")

        # 7. Persist to isolated caregiver_chat_messages
        sources_json = json.dumps([c.model_dump() for c in citations])
        chat_rec = CaregiverChatMessage(
            caregiver_id=caregiver.id,
            message=clean_msg,
            response=generated_text,
            sources=sources_json,
            language=language,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(chat_rec)
        await self.db.commit()
        try:
            await self.db.refresh(chat_rec)
        except Exception:
            pass

        return CaregiverChatResponse(
            id=str(chat_rec.id),
            message=clean_msg,
            response=generated_text,
            language=language,
            sources=citations,
            clinical_disclaimer=NON_DIAGNOSTIC_DISCLAIMER,
            has_maternal_data=has_maternal_data,
            maternal_consent_status=consent_note,
            created_at=(chat_rec.created_at or datetime.now(timezone.utc)).isoformat(),
        )

    async def get_history(self, caregiver: User, limit: int = 50) -> list[CaregiverChatResponse]:
        """Fetch persistent conversation history strictly scoped to the authenticated caregiver."""
        stmt = (
            select(CaregiverChatMessage)
            .where(CaregiverChatMessage.caregiver_id == caregiver.id)
            .order_by(desc(CaregiverChatMessage.created_at))
            .limit(limit)
        )
        records = (await self.db.scalars(stmt)).all()

        responses = []
        for r in records:
            sources_list: list[CitationSource] = []
            if r.sources:
                try:
                    raw_sources = json.loads(r.sources)
                    sources_list = [CitationSource(**s) for s in raw_sources]
                except Exception:
                    pass

            created_time = (r.created_at or datetime.now(timezone.utc)).isoformat()
            responses.append(
                CaregiverChatResponse(
                    id=str(r.id),
                    message=r.message,
                    response=r.response,
                    language=r.language,
                    sources=sources_list,
                    clinical_disclaimer=NON_DIAGNOSTIC_DISCLAIMER,
                    has_maternal_data=False,
                    created_at=created_time,
                )
            )
        return responses

    async def clear_history(self, caregiver: User) -> int:
        """Clear conversation history strictly for the authenticated caregiver."""
        stmt = select(CaregiverChatMessage).where(CaregiverChatMessage.caregiver_id == caregiver.id)
        records = (await self.db.scalars(stmt)).all()
        count = len(records)
        for r in records:
            await self.db.delete(r)
        await self.db.commit()
        return count
