"""Corpus retrieval evaluation: PPD/PCOS coverage, determinism, resolution.

Uses the real MiniLM backend (cached weights) and the real indexed corpus
built by scripts/ops/ingest_medical_corpus.py. No network, no LLM.
Relevance expectations below come from the human-reviewed eval run; the
PCOS-ambiguous expectation documents a known corpus weakness (the v1 KB
fallback serves those questions).
"""

import pytest

from app.rag_v2.evidence import EvidenceVerdict
from app.services.corpus_evidence import (
    CorpusUnavailableError,
    get_corpus_index,
    reset_corpus_index,
)


@pytest.fixture(scope="module")
def index():
    reset_corpus_index()
    idx = get_corpus_index()
    yield idx
    reset_corpus_index()


def test_index_loads_with_expected_scale(index):
    assert index.chunk_count > 1000
    assert index.threshold == pytest.approx(0.254)


def test_epds_question_returns_sufficient_who_evidence(index):
    evidence = index.retrieve("How is postpartum depression screened? What is the EPDS questionnaire?")
    assert evidence.verdict == EvidenceVerdict.SUFFICIENT
    assert len(evidence.cited_ids) > 0
    assert evidence.cited_ids[0].startswith("who-pnc-2022#")
    assert evidence.top_score >= index.threshold


def test_retrieval_is_deterministic(index):
    query = "What should I eat after delivery? Do I need iron tablets?"
    first = index.retrieve(query)
    second = index.retrieve(query)
    assert first.cited_ids == second.cited_ids
    assert first.verdict == second.verdict


def test_every_cited_id_resolves_to_indexed_passage(index):
    evidence = index.retrieve("When can I start exercising after a normal delivery?")
    assert evidence.verdict == EvidenceVerdict.SUFFICIENT
    for chunk_id in evidence.cited_ids:
        passage = index.passage(chunk_id)
        assert passage is not None
        assert passage["title"] and passage["text"].strip()
        assert isinstance(passage["pages"], list) and passage["pages"]
        assert passage["publisher"]


def test_pcos_signs_ambiguous_documents_fallback_design(index):
    # Known corpus weakness: PCOS-specific passages are thin, so competing
    # topics tie and the gate refuses to decide. Callers must use v1 fallback.
    evidence = index.retrieve("What are the signs of PCOS?")
    assert evidence.verdict == EvidenceVerdict.AMBIGUOUS
    assert evidence.cited_ids == ()


def test_irrelevant_question_yields_no_evidence(index):
    for query in ("What is the capital of France?", "How do I file my phone tax return?"):
        evidence = index.retrieve(query)
        assert evidence.verdict == EvidenceVerdict.INSUFFICIENT
        assert evidence.cited_ids == ()
        assert evidence.top_score == 0.0


def test_missing_index_fails_closed(tmp_path):
    from app.services import corpus_evidence

    reset_corpus_index()
    try:
        with pytest.raises(CorpusUnavailableError):
            corpus_evidence.CorpusIndex(tmp_path / "does-not-exist")
    finally:
        reset_corpus_index()
