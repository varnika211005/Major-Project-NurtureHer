"""Pipeline tests: disclaimer enforcement, citations, evidence gating,
translation fallback safety, language persistence, and isolation."""

from types import SimpleNamespace
from unittest.mock import patch

from app.rag.prompt_templates import REQUIRED_DISCLAIMER, ensure_disclaimer
from app.rag.retriever import HealthKnowledgeRetriever
from app.rag_v2.evidence import EvidenceVerdict
from app.schemas.health import ChatRequest
from app.services.chat_service import ChatbotService
from app.services.memory_service import ConversationMemoryService
from app.services.rag_service import RAGService
from tests.conftest import make_chat_user


def test_ensure_disclaimer_appends_once():
    assert ensure_disclaimer("hello") == "hello\n" + REQUIRED_DISCLAIMER
    assert ensure_disclaimer("hello\n") == "hello\n" + REQUIRED_DISCLAIMER
    once = ensure_disclaimer("hello")
    assert ensure_disclaimer(once) == once
    assert ensure_disclaimer("") == REQUIRED_DISCLAIMER


def test_fallback_cites_only_retrieved_ids():
    from app.services.gemini_service import GeminiService

    prompt = (
        "Retrieved medical education context:\n"
        "- [pcos_guidance_001] PCOS guidance: track cycles\n"
        "- [nutrition_001] Nutrition guidance: eat well\n\n"
        "User health context:\nName: A\n\n"
        "User message:\nWhat is PCOS?\n"
    )
    response = GeminiService()._fallback_response(prompt, "en")
    assert "[source:pcos_guidance_001]" in response
    assert "[source:nutrition_001]" in response
    assert "[source:safety_urgent_001]" not in response


def test_fallback_without_context_cites_nothing():
    from app.services.gemini_service import GeminiService

    prompt = "User health context:\nName: A\n\nUser message:\nHello\n"
    response = GeminiService()._fallback_response(prompt, "en")
    assert "[source:" not in response


def _degraded_store():
    class _Embedding:
        is_degraded = True

    class _Store:
        embedding_service = _Embedding()

        def search(self, query, k=4):
            return [], "numpy-fallback"

    return _Store()


def test_degraded_backend_yields_no_evidence(monkeypatch):
    monkeypatch.setattr("app.rag.retriever.get_vector_store", lambda: _degraded_store())
    result = HealthKnowledgeRetriever().retrieve("What are signs of PCOS?")
    assert result.documents == ()
    assert result.diagnostics.degraded is True
    assert result.has_evidence is False


def test_below_threshold_yields_no_evidence(monkeypatch):
    from app.rag.documents import Document
    from app.rag.vector_store import RetrievedDocument

    class _Embedding:
        is_degraded = False

    class _Store:
        embedding_service = _Embedding()

        def search(self, query, k=4):
            doc = Document(page_content="unrelated", metadata={"id": "x", "category": "y", "title": "t"})
            return [RetrievedDocument(document=doc, score=0.01)], "faiss-ip"

    monkeypatch.setattr("app.rag.retriever.get_vector_store", lambda: _Store())
    result = HealthKnowledgeRetriever(min_score=0.30).retrieve("What is the capital of France?")
    assert result.has_evidence is False
    assert result.diagnostics.top_score == 0.0


async def test_insufficient_evidence_path_has_disclaimer_and_no_answer(db_session, monkeypatch):
    monkeypatch.setattr("app.rag.retriever.get_vector_store", lambda: _degraded_store())
    user = await make_chat_user(db_session, email="low-ev@example.com")
    service = ChatbotService(db_session)
    chat = await service.message(user, ChatRequest(message="What is the capital of France?", language="en"))
    assert "don't have enough reliable information" in chat.response
    assert REQUIRED_DISCLAIMER in chat.response
    assert "Paris" not in chat.response


async def test_ambiguous_evidence_asks_localized_clarification(db_session, monkeypatch):
    class _AmbiguousCorpus:
        def retrieve(self, query):
            return SimpleNamespace(
                verdict=EvidenceVerdict.AMBIGUOUS,
                reason="competing topics",
                cited_ids=(),
                top_score=0.5,
                context_lines=(),
            )

    async def _no_v1_evidence(self, user, message, language):
        return "", "", ()

    monkeypatch.setattr("app.services.chat_service.get_corpus_index", lambda: _AmbiguousCorpus())
    monkeypatch.setattr(RAGService, "build_context", _no_v1_evidence)
    user = await make_chat_user(db_session, email="ambiguous@example.com")
    chat = await ChatbotService(db_session).message(
        user, ChatRequest(message="Tell me more about this.", language="hi")
    )
    assert "सही जानकारी" in chat.response
    assert "don't have enough reliable information" not in chat.response
    assert chat.sources == []


async def test_translation_failure_falls_back_without_logging_query(db_session, monkeypatch, caplog):
    async def _fail(self, text, source_language):
        raise RuntimeError("provider down")

    monkeypatch.setattr("app.services.gemini_service.GeminiService.translate_to_english", _fail)

    async def _canned(self, prompt, language):
        return "canned guidance without disclaimer"

    monkeypatch.setattr("app.services.chat_service.GeminiService.generate_response", _canned)
    user = await make_chat_user(db_session, email="trans-fail@example.com")
    service = ChatbotService(db_session)
    secret = "swasthya gupt-rog-token-xyz"
    chat = await service.message(user, ChatRequest(message=f"मुझे नींद नहीं आती {secret}", language="hi"))
    assert chat.language == "hi"
    assert chat.message.endswith(secret)
    assert secret not in caplog.text
    assert REQUIRED_DISCLAIMER in chat.response


async def test_no_api_key_means_no_translation_call(db_session):
    with patch("app.services.gemini_service.settings") as mock_settings:
        mock_settings.gemini_api_key = ""
        mock_settings.gemini_model = "gemini-3.5-flash-lite"
        user = await make_chat_user(db_session, email="no-key@example.com")
        service = ChatbotService(db_session)
        chat = await service.message(user, ChatRequest(message="मुझे नींद नहीं आती", language="hi"))
        assert chat.language == "hi"
        assert REQUIRED_DISCLAIMER in chat.response


async def test_resolved_language_is_persisted(db_session, monkeypatch):
    async def _ok(self, prompt, language):
        return "canned guidance"

    async def _no_translate(self, text, source_language):
        return None

    monkeypatch.setattr("app.services.chat_service.GeminiService.generate_response", _ok)
    monkeypatch.setattr("app.services.gemini_service.GeminiService.translate_to_english", _no_translate)
    user = await make_chat_user(db_session, email="lang-store@example.com")
    service = ChatbotService(db_session)
    chat = await service.message(user, ChatRequest(message="ನನಗೆ ಸುಸ್ತಾಗಿದೆ", language="en"))
    assert chat.language == "kn"
    assert REQUIRED_DISCLAIMER in chat.response


async def test_conversation_history_isolated_per_user(db_session):
    from app.repositories.health import ChatRepository

    user_a = await make_chat_user(db_session, email="iso-a@example.com")
    user_b = await make_chat_user(db_session, email="iso-b@example.com")
    repo = ChatRepository(db_session)
    await repo.create(user_id=user_a.id, message="private-a", response="r-a", language="en")
    await db_session.commit()
    assert [m.message for m in await repo.for_user(user_a.id)] == ["private-a"]
    assert await repo.for_user(user_b.id) == []


def test_memory_keys_are_per_user():
    import uuid

    service = ConversationMemoryService()
    assert service._key(uuid.uuid4()) != service._key(uuid.uuid4())
    uid = uuid.uuid4()
    assert service._key(uid) == f"chat-memory:{uid}"
