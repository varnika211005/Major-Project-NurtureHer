"""P3: retrieval, thresholds, and evidence-gating tests.

Deterministic and offline: synthetic vectors and stub backends only — no
model weights, no downloads, no network. Calibrated cutoffs live in
app/rag_v2/thresholds.json (measured, not hand-tuned); tests assert the
gating behavior, not specific production values.
"""

import numpy as np
import pytest

from app.rag_v2.cases import CASES
from app.rag_v2.embeddings import EmbeddingBackend, ModelUnavailableError
from app.rag_v2.evidence import EvidenceGate, EvidenceVerdict
from app.rag_v2.retrieve import MissingThresholdError, Retriever, ThresholdTable
from app.rag_v2.store import CosineStore


def _store() -> CosineStore:
    docs = {"d1": "alpha", "d2": "beta", "d3": "gamma"}
    vectors = np.array(
        [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
        dtype="float32",
    )
    return CosineStore(docs, vectors)


class _StubBackend:
    name = "stub"

    def __init__(self, query_vector: np.ndarray) -> None:
        self._query_vector = query_vector

    def embed(self, texts: list[str]) -> np.ndarray:
        return np.tile(self._query_vector, (len(texts), 1)).astype("float32")


def _retriever_for(query_vector: np.ndarray, threshold: float = 0.5) -> Retriever:
    return Retriever(
        backend=_StubBackend(np.asarray(query_vector, dtype="float32")),
        store=_store(),
        thresholds=ThresholdTable({"stub": {"default": threshold, "per_category": {}}}),
    )


def _topics() -> dict[str, str]:
    return {"d1": "alpha-topic", "d2": "beta-topic", "d3": "gamma-topic"}


def test_ranking_order_and_cutoff():
    retriever = _retriever_for([1.0, 0.2, 0.0], threshold=0.5)
    result = retriever.retrieve("anything", top_k=3)
    assert [doc_id for doc_id, _ in result.documents] == ["d1"]
    assert result.diagnostics.top_score == pytest.approx(0.9805807, abs=1e-4)
    assert result.diagnostics.threshold == 0.5
    assert result.diagnostics.backend == "stub"
    assert result.has_evidence
    assert result.cited_ids == ("d1",)


def test_empty_evidence_below_cutoff():
    retriever = _retriever_for([1.0, 0.2, 0.0], threshold=0.999)
    result = retriever.retrieve("anything", top_k=3)
    assert result.documents == ()
    assert not result.has_evidence
    assert result.diagnostics.doc_count == 0


def test_missing_threshold_table_fails_closed():
    # Empty tables are rejected at construction…
    with pytest.raises(MissingThresholdError):
        ThresholdTable({})
    with pytest.raises(MissingThresholdError):
        ThresholdTable.from_dict({})
    # …and unknown backends refuse to run.
    retriever = Retriever(
        backend=_StubBackend(np.ones(3, dtype="float32")),
        store=_store(),
        thresholds=ThresholdTable({"other": {"default": 0.5, "per_category": {}}}),
    )
    with pytest.raises(MissingThresholdError):
        retriever.retrieve("anything")


def test_degraded_model_never_retrieves(monkeypatch):
    import sentence_transformers

    def _boom(model_id, **kwargs):
        raise ConnectionError("offline")

    monkeypatch.setattr(sentence_transformers, "SentenceTransformer", _boom)
    with pytest.raises(ModelUnavailableError, match="test-model"):
        EmbeddingBackend(name="t", model_id="test-model", dimension=16)


def test_evidence_sufficient_clear_winner():
    gate = EvidenceGate()
    decision = gate.decide([("d1", 0.9), ("d2", 0.2), ("d3", 0.1)], _topics())
    assert decision.verdict == EvidenceVerdict.SUFFICIENT
    assert decision.candidate_topics == ("alpha-topic",)


def test_evidence_empty_result_is_insufficient():
    gate = EvidenceGate()
    decision = gate.decide([], _topics())
    assert decision.verdict == EvidenceVerdict.INSUFFICIENT
    assert "empty" in decision.reason


def test_evidence_ambiguous_competing_topics():
    gate = EvidenceGate()
    decision = gate.decide([("d1", 0.80), ("d2", 0.78), ("d3", 0.10)], _topics())
    assert decision.verdict == EvidenceVerdict.AMBIGUOUS
    assert set(decision.candidate_topics) == {"alpha-topic", "beta-topic"}
    question = decision.clarification_question()
    assert "alpha-topic" in question and "beta-topic" in question
    # Clarification carries no medical advice, facts, or recommendations.
    for banned in ("should", "take", "diagnos", "risk", "mg", "dose"):
        assert banned not in question.lower()


def test_evidence_same_topic_near_tie_is_sufficient():
    gate = EvidenceGate()
    topics = {"d1": "same", "d2": "same", "d3": "other"}
    decision = gate.decide([("d1", 0.80), ("d2", 0.79), ("d3", 0.10)], topics)
    assert decision.verdict == EvidenceVerdict.SUFFICIENT


def test_clarification_with_topic_labels():
    gate = EvidenceGate()
    decision = gate.decide([("d1", 0.7), ("d2", 0.69)], {"d1": "x", "d2": "y"})
    question = decision.clarification_question({"x": "X Label", "y": "Y Label"})
    assert "X Label" in question and "Y Label" in question
    assert "could you say a little more" in gate.decide([], {}).clarification_question().lower()


def test_generated_threshold_table_shape():
    import json
    from pathlib import Path

    path = Path(__file__).resolve().parents[1] / "app" / "rag_v2" / "thresholds.json"
    table = json.loads(path.read_text(encoding="utf-8"))
    assert set(table.keys()) == {"minilm", "mpnet"}
    for backend, entry in table.items():
        assert 0.0 < entry["default"] < 1.0, backend
        assert isinstance(entry["per_category"], dict)


def test_p2_cases_provisional_contract():
    assert len(CASES) > 0
    for case in CASES:
        if case.language == "en" and case.script == "native" and case.relevant_doc_ids:
            assert case.provisional is False
        elif case.relevant_doc_ids:
            assert case.provisional is True


def test_gate_floor_rejects_weak_winner():
    gate = EvidenceGate(min_score=0.5)
    decision = gate.decide([("d1", 0.4)], _topics())
    assert decision.verdict == EvidenceVerdict.INSUFFICIENT
    assert "minimum" in decision.reason
    assert decision.top_score == pytest.approx(0.4)


def test_gate_floor_boundary_is_sufficient():
    gate = EvidenceGate(min_score=0.5)
    decision = gate.decide([("d1", 0.5), ("d2", 0.1)], _topics())
    assert decision.verdict == EvidenceVerdict.SUFFICIENT
    assert decision.top_score == pytest.approx(0.5)


def test_gate_nonfinite_scores_are_insufficient():
    for bad in (float("nan"), float("inf"), float("-inf")):
        assert EvidenceGate(min_score=0.1).decide([("d1", bad)], _topics()).verdict == (
            EvidenceVerdict.INSUFFICIENT
        )
        # Also without a floor: the gate itself must never call a NaN top hit sufficient.
        assert EvidenceGate().decide([("d1", bad)], _topics()).verdict == (
            EvidenceVerdict.INSUFFICIENT
        )


def test_gate_unknown_topics_only_is_insufficient():
    gate = EvidenceGate()
    decision = gate.decide([("d1", 0.9)], {})
    assert decision.verdict == EvidenceVerdict.INSUFFICIENT
    assert "known topics" in decision.reason
    assert decision.top_score == pytest.approx(0.9)


def test_gate_mixed_known_and_unknown_topics_preserves_behavior():
    gate = EvidenceGate()
    decision = gate.decide([("d1", 0.9), ("d2", 0.2)], {"d1": "alpha-topic"})
    assert decision.verdict == EvidenceVerdict.SUFFICIENT
    assert decision.candidate_topics == ("alpha-topic",)


def test_gate_malformed_entries_are_insufficient():
    gate = EvidenceGate()
    for malformed in ([(123, 0.9)], [("d1", True)], [("d1", "0.9")], ["not-a-pair"], [("d1", None)]):
        decision = gate.decide(malformed, _topics())
        assert decision.verdict == EvidenceVerdict.INSUFFICIENT
        assert "malformed" in decision.reason


def test_gate_invalid_margins_and_floors_raise():
    with pytest.raises(ValueError):
        EvidenceGate(ambiguity_margin=-0.1)
    with pytest.raises(ValueError):
        EvidenceGate(ambiguity_margin=float("nan"))
    with pytest.raises(ValueError):
        EvidenceGate(ambiguity_margin=float("inf"))
    with pytest.raises(ValueError):
        EvidenceGate(min_score=float("nan"))
    with pytest.raises(ValueError):
        EvidenceGate(min_score="0.5")


def test_gate_zero_margin_only_flags_exact_ties():
    gate = EvidenceGate(ambiguity_margin=0.0)
    tied = gate.decide([("d1", 0.8), ("d2", 0.8)], {"d1": "x", "d2": "y"})
    assert tied.verdict == EvidenceVerdict.AMBIGUOUS
    near = gate.decide([("d1", 0.8), ("d2", 0.79)], {"d1": "x", "d2": "y"})
    assert near.verdict == EvidenceVerdict.SUFFICIENT


def test_gate_unsorted_input_is_normalized():
    gate = EvidenceGate()
    shuffled = gate.decide([("d2", 0.2), ("d1", 0.9)], _topics())
    ordered = gate.decide([("d1", 0.9), ("d2", 0.2)], _topics())
    assert shuffled.verdict == ordered.verdict == EvidenceVerdict.SUFFICIENT
    assert shuffled.top_score == ordered.top_score == pytest.approx(0.9)


def test_gate_none_min_score_is_unconfigured_mode():
    gate = EvidenceGate()
    assert gate.min_score is None
    # Without a floor the gate judges topic structure only; orchestration
    # paths must supply the backend-calibrated threshold explicitly.
    decision = gate.decide([("d1", 0.01)], {"d1": "t"})
    assert decision.verdict == EvidenceVerdict.SUFFICIENT
