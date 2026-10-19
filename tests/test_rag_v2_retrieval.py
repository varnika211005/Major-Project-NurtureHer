"""P2: embedding/store/retrieval unit tests.

Fully deterministic and offline: synthetic vectors only, no model weights,
no downloads, no API calls. Real-model comparison lives in the benchmark
report script (needs approved weight download).
"""

import numpy as np
import pytest

from app.rag_v2.benchmark import BenchmarkCase, BenchmarkReport
from app.rag_v2.cases import CASES
from app.rag_v2.embeddings import EmbeddingBackend, ModelUnavailableError
from app.rag_v2.retrieve import MissingThresholdError, Retriever, ThresholdTable
from app.rag_v2.store import CosineStore

KNOWN_DOC_IDS = {
    "safety_urgent_001",
    "pregnancy_support_001",
    "pcos_guidance_001",
    "ppd_guidance_001",
    "nutrition_001",
    "exercise_001",
    "mental_wellness_001",
    "cycle_tracking_001",
}


def _store() -> CosineStore:
    docs = {"d1": "alpha beta", "d2": "gamma delta", "d3": "epsilon zeta"}
    vectors = np.array(
        [[1.0, 0.0, 0.0], [0.0, 2.0, 0.0], [0.0, 0.0, 0.5]],
        dtype="float32",
    )
    return CosineStore(docs, vectors)


def test_cosine_score_semantics():
    store = _store()
    assert store.rank(np.array([1.0, 0.0, 0.0]), k=3)[0] == ("d1", 1.0)
    ranked = dict(store.rank(np.array([1.0, 1.0, 0.0], dtype="float32"), k=3))
    assert ranked["d1"] == pytest.approx(0.7071068, abs=1e-5)
    assert ranked["d2"] == pytest.approx(0.7071068, abs=1e-5)
    assert ranked["d3"] == pytest.approx(0.0, abs=1e-6)
    for _doc_id, score in store.rank(np.array([0.3, -0.4, 0.9], dtype="float32"), k=3):
        assert -1.0 <= score <= 1.0


def test_ranking_order_and_k():
    store = _store()
    ranked = store.rank(np.array([0.0, 0.0, 1.0], dtype="float32"), k=2)
    assert [doc_id for doc_id, _ in ranked] == ["d3", "d2"]
    assert len(store.rank(np.array([1.0, 0.0, 0.0]), k=10)) == 3


def test_store_rejects_bad_inputs():
    docs = {"d1": "x"}
    with pytest.raises(ValueError):
        CosineStore(docs, np.zeros((1, 3), dtype="float32"))
    store = _store()
    with pytest.raises(ValueError):
        store.rank(np.array([1.0, 0.0]), k=1)
    with pytest.raises(ValueError):
        store.rank(np.zeros(3, dtype="float32"), k=1)
    with pytest.raises(ValueError):
        CosineStore({"a": "x", "b": "y"}, np.ones((3, 3), dtype="float32"))


def test_missing_model_raises_without_substitution(monkeypatch):
    import sentence_transformers

    captured: dict = {}

    def _boom(model_id, **kwargs):
        captured.update(kwargs)
        captured["model_id"] = model_id
        raise ConnectionError("offline")

    monkeypatch.setattr(sentence_transformers, "SentenceTransformer", _boom)
    with pytest.raises(ModelUnavailableError, match="test-model"):
        EmbeddingBackend(name="t", model_id="test-model", dimension=16, revision="abc123")
    assert captured == {"revision": "abc123", "model_id": "test-model"}


def test_dimension_mismatch_raises(monkeypatch):
    import sentence_transformers

    class _Fake:
        def encode(self, texts, **kwargs):
            return np.zeros((len(texts), 8), dtype="float32")

    monkeypatch.setattr(sentence_transformers, "SentenceTransformer", lambda *a, **k: _Fake())
    backend = EmbeddingBackend(name="t", model_id="test-model", dimension=16)
    assert backend.load_ms is not None and backend.load_ms >= 0.0
    with pytest.raises(ModelUnavailableError, match="dimension mismatch"):
        backend.embed(["hello"])


def test_cases_provisional_contract():
    assert len(CASES) > 0
    ids = [c.id for c in CASES]
    assert len(ids) == len(set(ids))
    for case in CASES:
        assert set(case.relevant_doc_ids) <= KNOWN_DOC_IDS
        if case.language == "en" and case.script == "native" and case.relevant_doc_ids:
            assert case.provisional is False
        elif case.relevant_doc_ids:
            assert case.provisional is True
    assert any(c.script == "romanized" for c in CASES)
    assert any(not c.relevant_doc_ids for c in CASES)


def test_mrr_and_recall_by_language():
    from app.rag_v2.benchmark import BackendResult

    cases = (
        BenchmarkCase(id="a", query="q1", relevant_doc_ids=("d1",), language="en"),
        BenchmarkCase(id="b", query="q2", relevant_doc_ids=("d2",), language="hi"),
    )
    report = BenchmarkReport(
        cases=cases,
        results=(
            BackendResult(
                backend="m",
                scores={"a::d1": 0.9, "a::d2": 0.1, "b::d1": 0.2, "b::d2": 0.8},
                latency_ms=1.0,
                peak_kb=1,
            ),
        ),
    )
    assert report.mrr("m") == pytest.approx(1.0)
    assert report.recall_by_language("m", 1) == {"en": 1.0, "hi": 1.0}
    assert report.mrr("missing") == 0.0
    assert report.recall_by_language("missing", 1) == {}
    empty = BenchmarkReport(cases=(), results=())
    assert empty.mrr("m") == 0.0


class _StubBackend:
    name = "stub"

    def __init__(self, query_vector: np.ndarray) -> None:
        self._query_vector = query_vector

    def embed(self, texts: list[str]) -> np.ndarray:
        return np.tile(self._query_vector, (len(texts), 1)).astype("float32")


def test_threshold_table_rejects_malformed_entries():
    bad_tables = [
        {},
        {"stub": {"per_category": {}}},
        {"stub": {"default": "0.5", "per_category": {}}},
        {"stub": {"default": float("nan"), "per_category": {}}},
        {"stub": {"default": float("inf"), "per_category": {}}},
        {"stub": {"default": 1.5, "per_category": {}}},
        {"stub": {"default": -1.5, "per_category": {}}},
        {"stub": {"default": True, "per_category": {}}},
        {"stub": {"default": 0.5, "per_category": {"x": "0.7"}}},
        {"stub": {"default": 0.5, "per_category": ["x"]}},
        {"stub": [0.5]},
    ]
    for bad in bad_tables:
        with pytest.raises(MissingThresholdError):
            ThresholdTable(bad)
    with pytest.raises(MissingThresholdError):
        ThresholdTable.from_dict({})
    with pytest.raises(MissingThresholdError):
        ThresholdTable("not-a-dict")


def test_threshold_table_accepts_int_and_boundary_values():
    table = ThresholdTable({"b": {"default": 0, "per_category": {"c": 1}}})
    assert table.get("b") == 0.0
    assert table.get("b", "c") == 1.0
    assert table.get("b", "missing-cat") == 0.0


def test_threshold_table_non_string_category_fails_closed():
    table = ThresholdTable({"b": {"default": 0.5, "per_category": {}}})
    with pytest.raises(MissingThresholdError):
        table.get("b", ["x"])


def test_retriever_category_passthrough():
    table = ThresholdTable({"stub": {"default": 0.99, "per_category": {"keep": 0.5}}})
    retriever = Retriever(
        backend=_StubBackend(np.array([1.0, 0.2, 0.0], dtype="float32")),
        store=_store(),
        thresholds=table,
    )
    assert retriever.retrieve("q", top_k=3).documents == ()
    result = retriever.retrieve("q", top_k=3, category="keep")
    assert [doc_id for doc_id, _ in result.documents] == ["d1"]
    assert result.diagnostics.threshold == 0.5


def test_real_thresholds_values_pinned():
    import json
    from pathlib import Path

    path = Path(__file__).resolve().parents[1] / "app" / "rag_v2" / "thresholds.json"
    table = ThresholdTable.from_dict(json.loads(path.read_text(encoding="utf-8")))
    # Calibrated values are frozen: this test guards the generated file,
    # not gating behavior.
    assert table.get("minilm") == 0.254
    assert table.get("mpnet") == 0.35
