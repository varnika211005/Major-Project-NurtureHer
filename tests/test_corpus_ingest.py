"""Corpus ingestion tests: validation gates, chunk determinism, artifact integrity.

Reads the artifacts written by scripts/ops/ingest_medical_corpus.py (no
model loading, no network). Rebuilding the index must reproduce the same
chunk ids and manifest shape without hand-editing vectors or sources.
"""

import hashlib
import json
from pathlib import Path

import pytest

from app.rag_v2.ingest import chunk_text, validate_corpus
from app.rag_v2.schemas import MedicalDocument, SourceProvenance

INDEX_DIR = Path("data") / "rag_index"
CORPUS_DIR = Path("data") / "medical_corpus"


def _approved_doc(doc_id="d1"):
    return MedicalDocument(
        id=doc_id,
        title="T",
        body="Some guidance text about recovery and care.",
        language="en",
        topics=("postnatal-recovery",),
        source=SourceProvenance(
            publisher="World Health Organization",
            url_or_path="data/medical_corpus/x.pdf",
            publication_date="2022",
            review_status="approved",
        ),
    )


def test_approved_document_is_eligible():
    result, manifest = validate_corpus([_approved_doc()], manifest_version="t")
    assert len(result.eligible) == 1 and result.quarantined == ()
    assert manifest.eligible_ids == ("d1",)


def test_unattributed_or_pending_documents_quarantined():
    from dataclasses import replace

    pending = replace(_approved_doc("d2"), source=replace(_approved_doc("d2").source, review_status="pending"))
    missing = replace(_approved_doc("d3"), source=None)
    result, _manifest = validate_corpus([pending, missing], manifest_version="t")
    assert result.eligible == ()
    assert {issue.doc_id: issue.reason for issue in result.quarantined} == {
        "d2": "review-pending",
        "d3": "missing-provenance",
    }


def test_chunking_is_deterministic_with_page_metadata():
    first = chunk_text("doc", "word " * 500, "en", ("t",), max_chars=1200, overlap_chars=180)
    second = chunk_text("doc", "word " * 500, "en", ("t",), max_chars=1200, overlap_chars=180)
    assert [c.text for c in first] == [c.text for c in second]
    assert all(c.doc_id == "doc" and c.language == "en" for c in first)
    assert len(first) > 1


def test_index_artifacts_are_internally_consistent():
    manifest = json.loads((INDEX_DIR / "manifest.json").read_text(encoding="utf-8"))
    chunks = json.loads((INDEX_DIR / "chunks.json").read_text(encoding="utf-8"))
    quarantine = json.loads((INDEX_DIR / "quarantine.json").read_text(encoding="utf-8"))
    assert manifest["counts"]["chunks"] == len(chunks) > 1000
    assert manifest["embedding"]["threshold_default"] == pytest.approx(0.254)
    assert manifest["chunking"]["max_chars"] == 1200
    assert manifest["chunking"]["overlap_chars"] == 180
    assert manifest["chunking"]["strategy"] == "per-page sliding window"
    assert manifest["chunking"]["min_page_chars"] == 100
    assert "section_metadata" in manifest["chunking"]
    assert len({c["id"] for c in chunks}) == len(chunks)
    for chunk in chunks:
        assert chunk["id"].startswith(chunk["doc_id"] + "#p")
        assert chunk["pages"] and chunk["text"].strip()
        assert chunk["title"] and chunk["publisher"]
    assert any(q["doc_id"] == "mohfw-pnc-note" and q["reason"] == "review-pending" for q in quarantine)
    for doc in manifest["documents"]:
        assert doc["sha256"] and len(doc["sha256"]) == 64
        assert doc["license_note"]
        assert doc["chunks"] > 0


def test_index_vectors_align_with_chunks():
    import numpy as np

    vectors = np.load(INDEX_DIR / "vectors.npy")
    chunks = json.loads((INDEX_DIR / "chunks.json").read_text(encoding="utf-8"))
    assert vectors.shape == (len(chunks), 384)
    assert vectors.dtype == np.float32


def test_manifest_hashes_match_source_pdfs():
    manifest = json.loads((INDEX_DIR / "manifest.json").read_text(encoding="utf-8"))
    recorded = {doc["filename"]: doc["sha256"] for doc in manifest["documents"]}
    assert len(recorded) == 5
    for filename, digest in recorded.items():
        path = CORPUS_DIR / filename
        assert path.exists(), filename
        assert hashlib.sha256(path.read_bytes()).hexdigest() == digest, filename
