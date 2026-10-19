import logging
import time

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.health import ChatRepository
from app.rag.prompt_templates import build_health_coach_prompt, ensure_disclaimer
from app.rag_v2.citations import validate as validate_citations
from app.schemas.health import ChatRequest
from app.services.corpus_evidence import CorpusUnavailableError, EvidenceVerdict, get_corpus_index
from app.services.escalation import escalate_from_chat
from app.services.gemini_service import GeminiService
from app.services.memory_service import ConversationMemoryService
from app.services.rag_service import RAGService
from app.services.safety import REVIEW_STATUS as SAFETY_REVIEW_STATUS
from app.services.safety import TEMPLATE_VERSION as SAFETY_TEMPLATE_VERSION
from app.services.safety import detect_urgent_symptoms, urgent_response
from app.services.translation_service import TranslationService
from app.services.triage import TRIAGE_RULES_VERSION, TriageLevel, triage_message

logger = logging.getLogger(__name__)


class ChatbotService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.gemini = GeminiService()
        self.rag = RAGService(db)
        self.memory = ConversationMemoryService()
        self.translator = TranslationService()

    async def message(self, user: User, payload: ChatRequest):
        # 1. Safety first: urgent/crisis language bypasses retrieval and
        # generation entirely so urgent advice is never delayed.
        urgent_kind = detect_urgent_symptoms(payload.message)
        if urgent_kind is not None:
            logger.info(
                "Chat safety escalation kind=%s templates=%s review=%s",
                urgent_kind,
                SAFETY_TEMPLATE_VERSION,
                SAFETY_REVIEW_STATUS,
            )
            urgent_language = self.translator.normalize_language(
                self.translator.detect_language(payload.message) or payload.language,
                user.preferred_language,
            )
            chat = await self._persist(user, payload, urgent_response(urgent_kind), urgent_language)
            # Escalation never delays or alters the urgent reply above.
            await self._escalate_best_effort(user, TriageLevel.URGENT, urgent_kind, payload.message)
            return chat

        # 2. Language: detected script/keywords win, else the request field,
        # else the user's profile preference.
        detected_language = self.translator.detect_language(payload.message)
        language = self.translator.normalize_language(detected_language or payload.language, user.preferred_language)

        # 3. English-first retrieval: best-effort query translation for
        # non-English queries. The original query is always preserved for
        # context, history, and as the safe fallback.
        retrieval_query = payload.message
        if language != "en":
            started = time.monotonic()
            try:
                translated = await self.gemini.translate_to_english(payload.message, language)
            except Exception as exc:
                logger.info("Chat query translation errored (%s->en): %s", language, exc)
                translated = None
            elapsed_ms = round((time.monotonic() - started) * 1000)
            if translated:
                retrieval_query = translated
                logger.info("Chat query translated %s->en in %dms", language, elapsed_ms)
            else:
                logger.info(
                    "Chat query translation unavailable (%s->en) after %dms; using original query",
                    language,
                    elapsed_ms,
                )

        # 4. Retrieve with diagnostics. Corpus-first (authoritative passages
        # with evidence gating); the existing v1 KB path is the fallback, and
        # degraded backends and empty results count as no evidence.
        triage = triage_message(payload.message)
        logger.info(
            "Chat triage level=%s rules=%s reason=%s",
            triage.level.value,
            TRIAGE_RULES_VERSION,
            triage.reason,
        )
        retrieved_context, user_context, cited_ids = await self._retrieve(user, retrieval_query, language)
        if not cited_ids:
            return await self._persist_insufficient_evidence(user, payload, language)

        # 5. Generate with cited IDs only, then enforce the disclaimer.
        history = await self.memory.get_recent_messages(user.id)
        prompt = self._build_prompt(payload.message, language, retrieved_context, user_context, history, cited_ids)
        started = time.monotonic()
        response = await self.gemini.generate_response(prompt, language)
        logger.info("Chat generation completed in %dms", round((time.monotonic() - started) * 1000))
        validated = validate_citations(response, cited_ids)
        if validated.report.stripped_unknown or validated.report.stripped_malformed_count:
            logger.info(
                "Chat citations stripped unknown=%d malformed=%d",
                len(validated.report.stripped_unknown),
                validated.report.stripped_malformed_count,
            )
            response = validated.text
        chat = await self._persist(user, payload, response, language)
        if triage.level == TriageLevel.NEEDS_ATTENTION:
            # Case-only escalation per policy (no notifications); never alters the reply.
            await self._escalate_best_effort(
                user, TriageLevel.NEEDS_ATTENTION, triage.matched or "distress-signal", payload.message
            )
        return chat

    async def _retrieve(
        self, user: User, query: str, language: str
    ) -> tuple[str, str, tuple[str, ...]]:
        """Corpus-first retrieval; falls back to the v1 KB path on any non-sufficient outcome."""
        try:
            corpus = get_corpus_index()
        except CorpusUnavailableError as exc:
            logger.info("Chat corpus unavailable (%s); using v1 KB path", exc)
            return await self.rag.build_context(user, query, language)
        try:
            evidence = corpus.retrieve(query)
        except Exception as exc:
            logger.info("Chat corpus retrieval errored (%s); using v1 KB path", type(exc).__name__)
            return await self.rag.build_context(user, query, language)
        if evidence.verdict != EvidenceVerdict.SUFFICIENT:
            logger.info(
                "Chat corpus %s (%s); using v1 KB path",
                evidence.verdict.value,
                evidence.reason,
            )
            return await self.rag.build_context(user, query, language)
        logger.info(
            "Chat corpus sufficient n_docs=%d top_score=%.3f",
            len(evidence.cited_ids),
            evidence.top_score,
        )
        user_context = await self.rag.context_builder._build_user_context(user, language)
        return "\n".join(evidence.context_lines), user_context, evidence.cited_ids

    async def _escalate_best_effort(self, user: User, level: TriageLevel, kind: str, message: str) -> None:
        try:
            await escalate_from_chat(self.db, user=user, level=level, kind=kind, trigger_message=message)
        except Exception as exc:
            logger.info("Chat escalation failed (%s); reply already persisted", type(exc).__name__)

    async def _persist(self, user: User, payload: ChatRequest, response: str, language: str):
        final_response = ensure_disclaimer(response)
        chat = await ChatRepository(self.db).create(user_id=user.id, message=payload.message, response=final_response, language=language)
        await self.db.commit()
        await self.memory.append(user.id, payload.message, final_response)
        return chat

    async def _persist_insufficient_evidence(self, user: User, payload: ChatRequest, language: str):
        from app.rag.prompt_templates import build_insufficient_evidence_response

        response = build_insufficient_evidence_response(language)
        return await self._persist(user, payload, response, language)

    async def history(self, user: User, limit: int = 50, offset: int = 0):
        return await ChatRepository(self.db).for_user(user.id, limit, offset)

    def _build_prompt(
        self,
        message: str,
        language: str,
        retrieved_context: str,
        user_context: str,
        history: list[dict[str, str]],
        cited_ids: tuple[str, ...] = (),
    ):
        history_text = "\n".join(f"User: {item['message']}\nAssistant: {item['response']}" for item in history)
        return build_health_coach_prompt(
            message=message,
            language=language,
            retrieved_context=retrieved_context,
            user_context=user_context,
            history_text=history_text,
            cited_ids=cited_ids,
        )
