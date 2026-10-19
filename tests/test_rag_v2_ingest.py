"""P1: ingestion validation, provenance manifests, benchmark scaffolding.

All fixtures are synthetic, non-medical content (bridges, bicycles). No
model downloads, no network calls, no database access.
"""

import pytest

from app.rag_v2.benchmark import (
    BenchmarkBackend,
    BenchmarkCase,
    SyntheticBackend,
    run_benchmark,
)
from app.rag_v2.ingest import (
    chunk_text,
    clean_text,
    clean_with_map,
    extract_headings,
    is_bibliography_chunk,
    record_language,
    section_at,
    validate_corpus,
    validate_document,
)
from app.rag_v2.schemas import CorpusManifest, MedicalDocument, SourceProvenance


def _approved_doc(doc_id="bridge-001", **overrides):
    kwargs = {
        "title": "Bridge maintenance",
        "body": "Inspect suspension cables yearly. Repaint steel beams every five years.",
        "language": "en",
        "topics": ("engineering",),
        "source": SourceProvenance(
            publisher="Example Standards Org",
            url_or_path="https://example.invalid/bridge-guide",
            publication_date="2024-01-01",
            review_date="2024-06-01",
            review_status="approved",
        ),
    }
    kwargs.update(overrides)
    return MedicalDocument(id=doc_id, **kwargs)


def test_clean_text_collapses_whitespace():
    assert clean_text("  a\n\n  b\t c ") == "a b c"
    assert clean_text("   ") == ""


def test_record_language_accepts_supported_only():
    assert record_language(_approved_doc(language="hi")) == "hi"
    assert record_language(_approved_doc(language="xx")) == "unknown"


def test_chunk_text_is_deterministic_with_overlap():
    body = "word " * 500
    first = chunk_text("d1", body, "en", ("t",), max_chars=100, overlap_chars=20)
    second = chunk_text("d1", body, "en", ("t",), max_chars=100, overlap_chars=20)
    assert first == second
    assert [c.index for c in first] == list(range(len(first)))
    assert all(c.of == len(first) for c in first)
    assert all(len(c.text) <= 100 for c in first)
    assert chunk_text("d1", "", "en", ("t",)) == []


def test_chunk_text_rejects_bad_windows():
    with pytest.raises(ValueError):
        chunk_text("d1", "abc", "en", (), max_chars=0)
    with pytest.raises(ValueError):
        chunk_text("d1", "abc", "en", (), max_chars=50, overlap_chars=50)


def test_approved_document_is_eligible():
    assert validate_document(_approved_doc()) is None


def test_pending_documents_are_quarantined_not_eligible():
    pending = _approved_doc(
        doc_id="bridge-002",
        source=SourceProvenance(publisher="Example Org", url_or_path="https://example.invalid/x", review_status="pending"),
    )
    issue = validate_document(pending)
    assert issue is not None
    assert issue.reason == "review-pending"


@pytest.mark.parametrize(
    "kwargs,reason",
    [
        ({"title": ""}, "missing-title"),
        ({"body": "   "}, "missing-body"),
        ({"language": "xx"}, "unsupported-language"),
        ({"source": None}, "missing-provenance"),
    ],
)
def test_incomplete_provenance_is_quarantined(kwargs, reason):
    issue = validate_document(_approved_doc(doc_id="b", **kwargs))
    assert issue is not None
    assert issue.reason == reason


def test_missing_publisher_or_location_is_quarantined():
    no_pub = _approved_doc(
        doc_id="b1",
        source=SourceProvenance(publisher=" ", url_or_path="https://example.invalid/x", review_status="approved"),
    )
    assert validate_document(no_pub).reason == "missing-publisher"
    no_loc = _approved_doc(
        doc_id="b2",
        source=SourceProvenance(publisher="Example Org", url_or_path="  ", review_status="approved"),
    )
    assert validate_document(no_loc).reason == "missing-source-location"


def test_validate_corpus_splits_and_manifest_is_deterministic():
    pending_source = SourceProvenance(publisher="Example Org", url_or_path="https://example.invalid/y")
    docs = [
        _approved_doc("ok-1"),
        _approved_doc("ok-2"),
        MedicalDocument(
            id="pend-1",
            title="T",
            body="Some body text here.",
            language="en",
            topics=(),
            source=pending_source,
        ),
    ]
    result, manifest = validate_corpus(docs, manifest_version="v1")
    assert [d.id for d in result.eligible] == ["ok-1", "ok-2"]
    assert [i.doc_id for i in result.quarantined] == ["pend-1"]
    assert manifest.eligible_ids == ("ok-1", "ok-2")
    _, manifest2 = validate_corpus(list(reversed(docs)), manifest_version="v1")
    assert manifest.to_text() == manifest2.to_text()
    assert isinstance(manifest, CorpusManifest)


def test_benchmark_scaffolding_reports_deterministically():
    cases = [
        BenchmarkCase(id="c1", query="bridge cables", relevant_doc_ids=("d1",), language="en"),
        BenchmarkCase(id="c2", query="bicycle brakes", relevant_doc_ids=("d2",), language="en"),
    ]
    backend = SyntheticBackend(name="synthetic", relevance={"bridge cables": {"d1"}, "bicycle brakes": {"d2"}})
    report = run_benchmark(cases, [backend])
    assert report.recall_at_k("synthetic", 1) == 1.0
    assert report.recall_at_k("synthetic", 1) == run_benchmark(cases, [backend]).recall_at_k("synthetic", 1)
    as_dict = report.to_dict()
    assert as_dict["cases"] == ["c1", "c2"]
    assert as_dict["backends"][0]["backend"] == "synthetic"
    assert as_dict["backends"][0]["latency_ms"] >= 0.0

    class _Backend:
        name = "empty"

        def score(self, query: str, doc_id: str) -> float:
            return 0.0

    empty_report = run_benchmark(cases, [_Backend()])
    assert empty_report.recall_at_k("empty", 3) == 0.0
    assert empty_report.recall_at_k("missing-backend", 3) == 0.0


def test_benchmark_backend_protocol_shape():
    backend: BenchmarkBackend = SyntheticBackend()
    assert backend.name == "synthetic"
    assert backend.score("anything", "d1") == 0.0


def test_clean_with_map_matches_clean_text():
    for text in ("", "   ", "a  b\n\nc\td", "  leading and trailing  ", "no-change"):
        cleaned, mapping = clean_with_map(text)
        assert cleaned == clean_text(text)
        assert len(mapping) == len(cleaned)
        for cleaned_idx, raw_idx in enumerate(mapping):
            if cleaned[cleaned_idx] == " ":
                assert not text[raw_idx].isspace()
            else:
                assert cleaned[cleaned_idx] == text[raw_idx]


def test_extract_headings_finds_structure_not_prose():
    page = (
        "A.4.1 Screening for postpartum depression and anxiety\n"
        "Screening helps identify mothers who need support.\n"
        "RECOMMENDATION 18\n"
        "Screen all women using a validated tool.\n"
    )
    headings = extract_headings(page)
    assert [text for _, text in headings] == [
        "A.4.1 Screening for postpartum depression and anxiety",
        "RECOMMENDATION 18",
    ]
    assert headings[0][0] == 0
    # Body sentences are never headings, even when capitalized.
    assert not any("validated tool" in text for _, text in headings)


def test_section_at_uses_nearest_preceding_heading():
    headings = [(0, "A.4 Screening"), (120, "A.4.1 Details")]
    assert section_at(headings, 0) == "A.4 Screening"
    assert section_at(headings, 119) == "A.4 Screening"
    assert section_at(headings, 200) == "A.4.1 Details"
    assert section_at([], 50, carry="prev") == "prev"
    assert section_at([], 50) == ""


def test_reference_lines_are_not_headings():
    page = (
        "181. Willinger M, Hoffman HJ. Infant sleep position.\n"
        "182. Cheng TL, Monteiro N. Child health outcomes.\n"
        "9. Gavin NI, Gaynes BN, Lohr KN. Perinatal depression review.\n"
        "A.4.1 Screening for postpartum depression and anxiety\n"
        "Screen all women using a validated tool.\n"
    )
    headings = extract_headings(page)
    assert [text for _, text in headings] == ["A.4.1 Screening for postpartum depression and anxiety"]


def test_decimal_fragments_and_title_style_refs_are_not_headings():
    page = (
        "30. Self help plus (SH+). A group-based stress management course.\n"
        "Geneva: World Health Organization; 2022.\n"
        "The effect was 0.03 lower). It is uncertain whether this holds.\n"
        "5.8 Infant loss\n"
        "When women lose their infants, support is needed.\n"
    )
    headings = extract_headings(page)
    assert [text for _, text in headings] == ["5.8 Infant loss"]


def test_is_bibliography_chunk():
    refs = (
        "181. Willinger M, Hoffman HJ. Infant sleep position. Pediatrics.\n"
        "182. Cheng TL, Monteiro N. Child health outcomes. Lancet.\n"
        "Some trailing text without references."
    )
    assert is_bibliography_chunk(refs) is True
    title_style_refs = (
        "30. Self help plus (SH+). A group-based stress management course.\n"
        "Geneva: World Health Organization; 2022.\n"
        "40. Thinking healthy. A manual for psychological management.\n"
        "Geneva: World Health Organization; 2021.\n"
        "67. Increasing access to health workers in remote areas.\n"
    )
    assert is_bibliography_chunk(title_style_refs) is True
    guidance = (
        "Screen all women for depression using the EPDS questionnaire. "
        "One trial (Smith J, 2020) supports routine screening."
    )
    assert is_bibliography_chunk(guidance) is False
    assert is_bibliography_chunk("") is False
