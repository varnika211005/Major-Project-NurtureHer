"""Ingest the curated medical PDF corpus into a reproducible RAG v2 index.

Reads data/medical_corpus/*.pdf, extracts per-page text (pypdf; pages with
<100 chars are reported as extraction warnings, not silently indexed),
validates provenance via app.rag_v2.ingest (publisher-reviewed sources are
eligible; unattributed material is quarantined), chunks per page with page
metadata, embeds with the pinned MiniLM backend, and writes deterministic
artifacts to data/rag_index/:

  vectors.npy    float32 unit vectors, row i == chunks.json[i]
  chunks.json    [{id, doc_id, chunk_index, pages, text, topics, title, publisher}]
  manifest.json  source manifest: per-document provenance, license notes as
                 stated in the documents, counts, hashes, model + chunking
                 parameters, extraction warnings, quarantine reasons
  quarantine.json machine-readable quarantine report

Deterministic: filenames sorted, fixed chunking parameters recorded in the
manifest, chunk ids f"{doc_id}#p{page}c{index}". Re-running reproduces the
index (model weights pinned by cache; see manifest for backend details).
Local indexing only -- this script redistributes nothing.
"""

from __future__ import annotations

import hashlib
import json
import sys
import warnings
from datetime import datetime, timezone
from pathlib import Path

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from app.rag_v2.embeddings import MINILM_DIMENSION, MINILM_MODEL_ID, minilm_backend  # noqa: E402
from app.rag_v2.ingest import chunk_text, clean_text, clean_with_map, extract_headings, is_bibliography_chunk, section_at, validate_corpus  # noqa: E402
from app.rag_v2.schemas import Chunk, MedicalDocument, SourceProvenance  # noqa: E402
from app.rag_v2.store import CosineStore  # noqa: E402

CORPUS_DIR = ROOT / "data" / "medical_corpus"
OUT_DIR = ROOT / "data" / "rag_index"
MIN_PAGE_CHARS = 100
MAX_CHARS = 1200
OVERLAP_CHARS = 180

# Bibliographic facts verified from document contents during the corpus audit.
# review_status "approved" = publisher-authoritative guideline approved for
# indexing. It does NOT mean chatbot answers using the source are clinically
# validated -- that validation is still pending (see manifest + safety docs).
DOCS = [
    {
        "filename": "who_perinatal_mental_health.pdf",
        "id": "who-pmh-2022",
        "title": "Guide for integration of perinatal mental health in maternal and child health services",
        "publisher": "World Health Organization",
        "publication_date": "2022",
        "review_status": "approved",
        "topics": ("ppd-symptoms", "ppd-screening", "ppd-support", "ppd-treatment", "ppd-urgent",
                   "breastfeeding", "sleep-wellbeing", "postnatal-recovery", "nutrition"),
    },
    {
        "filename": "who_postnatal_care.pdf",
        "id": "who-pnc-2022",
        "title": "WHO recommendations on maternal and newborn care for a positive postnatal experience",
        "publisher": "World Health Organization",
        "publication_date": "2022",
        "review_status": "approved",
        "topics": ("postnatal-recovery", "breastfeeding", "nutrition", "ppd-screening", "ppd-support",
                   "warning-signs", "sleep-wellbeing", "preg-care"),
    },
    {
        "filename": "High-Risk-Conditions-in-preg-modified-Final.pdf",
        "id": "mohfw-hrp",
        "title": "High risk factors of pregnancy and their management at an ANC clinic (PMSMA)",
        "publisher": "MoHFW, Government of India (PMSMA/NHM)",
        "publication_date": "",
        "review_status": "approved",
        "topics": ("preg-care", "warning-signs", "nutrition", "sleep-wellbeing"),
    },
    {
        "filename": "Maternal Health*Guidance Booklet for CHOs (English).pdf",
        "id": "mohfw-cho",
        "title": "Maternal Health - Guidance Booklet for CHOs (English)",
        "publisher": "MoHFW, Government of India",
        "publication_date": "",
        "review_status": "approved",
        "topics": ("preg-care", "warning-signs", "postnatal-recovery", "breastfeeding", "nutrition",
                   "ppd-support", "ppd-urgent", "sleep-wellbeing"),
    },
    {
        "filename": "Standard Treatment Guidelines*Obstetrics and Gynaecology.pdf",
        "id": "mohfw-stg-og",
        "title": "Standard Treatment Guidelines - Obstetrics and Gynaecology",
        "publisher": "MoHFW, Government of India",
        "publication_date": "",
        "review_status": "approved",
        "topics": ("diagnostics", "treatment-clinician-directed", "warning-signs", "fertility",
                   "metabolic", "preg-care", "postnatal-recovery", "nutrition", "ppd-support"),
    },
    {
        "filename": "Guidance Note on Optimizing Postnatal Care.pdf",
        "id": "mohfw-pnc-note",
        "title": "Guidance Note on Optimizing Post-Natal Care",
        "publisher": "Unattributed (references MoHFW schemes and WHO 2022)",
        "publication_date": "",
        # Unattributed provenance: quarantined by the validation gate until a
        # publisher/version can be verified. Content overlaps WHO postnatal care.
        "review_status": "pending",
        "topics": ("postnatal-recovery", "warning-signs", "breastfeeding"),
    },
]

LICENSE_PATTERNS = ("©", "creative commons", "some rights reserved", "permission",
                    "reproduction", "all rights reserved", "open access")


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for block in iter(lambda: handle.read(65536), b""):
            digest.update(block)
    return digest.hexdigest()


def extract_pages(path: Path) -> tuple[list[str], list[int]]:
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    texts = [(page.extract_text() or "") for page in reader.pages]
    weak = [i + 1 for i, text in enumerate(texts) if len(clean_text(text)) < MIN_PAGE_CHARS]
    return texts, weak


def license_note(page_texts: list[str]) -> str:
    sample = " ".join(page_texts[:3] + page_texts[-2:])
    lowered = sample.lower()
    hits = [line.strip()[:200] for line in sample.splitlines()
            if any(pat in line.lower() for pat in LICENSE_PATTERNS) and line.strip()]
    if hits:
        return "Statements found in document: " + " | ".join(hits[:3])
    if "world health organization" in lowered or "who.int" in lowered:
        return ("No explicit reuse statement detected in extracted text; WHO publication. "
                "Local indexing only, no redistribution. Verify licence before any other use.")
    return ("No reuse statement detected in extracted text. "
            "Local indexing only, no redistribution.")


def main() -> int:
    from pypdf import PdfReader  # noqa: F401 (version probe)
    import numpy as np

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    documents: list[MedicalDocument] = []
    page_store: dict[str, list[str]] = {}
    doc_meta: dict[str, dict] = {}

    for spec in sorted(DOCS, key=lambda d: d["filename"]):
        matches = sorted(CORPUS_DIR.glob(spec["filename"]))
        if not matches:
            print(f"SKIP missing file pattern: {spec['filename']}")
            continue
        path = matches[0]
        page_texts, weak_pages = extract_pages(path)
        body = "\n".join(page_texts)
        page_store[spec["id"]] = page_texts
        doc_meta[spec["id"]] = {
            "filename": path.name,
            "sha256": sha256_of(path),
            "pages": len(page_texts),
            "chars": len(clean_text(body)),
            "weak_pages": weak_pages,
            "license_note": license_note(page_texts),
        }
        documents.append(
            MedicalDocument(
                id=spec["id"],
                title=spec["title"],
                body=body,
                language="en",
                topics=tuple(spec["topics"]),
                source=SourceProvenance(
                    publisher=spec["publisher"],
                    url_or_path=f"data/medical_corpus/{spec['filename']}",
                    publication_date=spec["publication_date"],
                    review_status=spec["review_status"],
                ),
            )
        )

    result, manifest = validate_corpus(documents, manifest_version="medical-corpus-v1")
    print(f"eligible={len(result.eligible)} quarantined={len(result.quarantined)}")
    for issue in result.quarantined:
        print(f"  quarantined {issue.doc_id}: {issue.reason}")

    # Chunk per page so every passage retains source + page metadata.
    # Each window inherits its nearest preceding document-structure heading
    # (carried across pages); chunks before any heading keep topics only.
    step = MAX_CHARS - OVERLAP_CHARS
    chunks: list[Chunk] = []
    chunk_ids: list[str] = []
    chunk_sections: list[str] = []
    chunk_biblio: list[bool] = []
    for doc in result.eligible:
        carry = ""
        for page_no, page_text in enumerate(page_store[doc.id], start=1):
            headings = extract_headings(page_text)
            # Window starts index cleaned coordinates; map them back to raw
            # offsets so heading lookup is exact (whitespace collapsing
            # shifts positions).
            _, raw_map = clean_with_map(page_text)
            for window in chunk_text(doc.id, page_text, doc.language, doc.topics,
                                     max_chars=MAX_CHARS, overlap_chars=OVERLAP_CHARS):
                raw_start = raw_map[window.index * step] if window.index * step < len(raw_map) else len(page_text)
                raw_end_idx = window.index * step + len(window.text)
                raw_end = raw_map[raw_end_idx] if raw_end_idx < len(raw_map) else len(page_text)
                section = section_at(headings, raw_start, carry)
                # Bibliography detection needs raw line structure (chunk text
                # is whitespace-collapsed); evaluate the raw window span.
                is_biblio = is_bibliography_chunk(page_text[raw_start:raw_end])
                if headings:
                    carry = section_at(headings, len(page_text), carry)
                chunk_ids.append(f"{doc.id}#p{page_no}c{window.index}")
                chunk_sections.append(section)
                chunk_biblio.append(is_biblio)
                chunk_sections.append(section)
                chunks.append(
                    Chunk(
                        doc_id=window.doc_id,
                        index=len(chunks),
                        of=-1,
                        text=window.text,
                        language=window.language,
                        topics=window.topics,
                        pages=(page_no,),
                    )
                )
    print(f"chunks={len(chunks)}")
    # Bibliography chunks are never servable evidence (reference lists can
    # score highly on topical queries while offering no guidance). Dropped
    # here, before embedding, with ids of survivors unchanged.
    kept = [
        (cid, section, chunk)
        for cid, section, chunk, biblio in zip(chunk_ids, chunk_sections, chunks, chunk_biblio)
        if not biblio
    ]
    bibliography_dropped = len(chunks) - len(kept)
    print(f"bibliography chunks dropped={bibliography_dropped}")
    chunk_ids, chunk_sections, chunks = (
        [item[0] for item in kept],
        [item[1] for item in kept],
        [item[2] for item in kept],
    )

    backend = minilm_backend()
    texts = [chunk.text for chunk in chunks]
    vectors_list = []
    batch = 64
    for start in range(0, len(texts), batch):
        vectors_list.append(backend.embed(texts[start:start + batch]))

    vectors = np.vstack(vectors_list).astype("float32")
    store = CosineStore({cid: chunks[i].text for i, cid in enumerate(chunk_ids)}, vectors)
    assert len(store.rank(vectors[0], k=1)) == 1  # smoke: index answers

    np.save(OUT_DIR / "vectors.npy", vectors)
    doc_lookup = {doc.id: doc for doc in result.eligible}
    with open(OUT_DIR / "chunks.json", "w", encoding="utf-8") as handle:
        json.dump(
            [
                {
                    "id": cid,
                    "doc_id": chunk.doc_id,
                    "chunk_index": chunk.index,
                    "pages": list(chunk.pages),
                    "section": section,
                    "text": chunk.text,
                    "topics": list(chunk.topics),
                    "title": doc_lookup[chunk.doc_id].title,
                    "publisher": doc_lookup[chunk.doc_id].source.publisher,
                    "publication_date": doc_lookup[chunk.doc_id].source.publication_date,
                }
                for (cid, section), chunk in zip(zip(chunk_ids, chunk_sections), chunks)
            ],
            handle,
            ensure_ascii=False,
        )
    manifest_doc = {
        "manifest_version": "medical-corpus-v1",
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "embedding": {"model_id": MINILM_MODEL_ID, "dimension": MINILM_DIMENSION,
                      "backend": "minilm", "threshold_default": 0.254,
                      "threshold_source": "app/rag_v2/thresholds.json (existing calibration)"},
        "chunking": {"max_chars": MAX_CHARS, "overlap_chars": OVERLAP_CHARS,
                     "strategy": "per-page sliding window", "min_page_chars": MIN_PAGE_CHARS,
                     "section_metadata": "nearest preceding document-structure heading per window "
                     "(numbered sections, chapters, RECOMMENDATION lines, reference entries; "
                     "carried across pages; empty before the first heading)"},
        "counts": {"documents": len(documents), "eligible": len(result.eligible),
                   "quarantined": len(result.quarantined), "chunks": len(chunks),
                   "bibliography_dropped": bibliography_dropped},
        "documents": [
            {**doc_meta[doc.id],
             "id": doc.id,
             "title": doc.title,
             "publisher": doc.source.publisher,
             "publication_date": doc.source.publication_date,
             "review_status": doc.source.review_status,
             "topics": list(doc.topics),
             "chunks": sum(1 for c in chunks if c.doc_id == doc.id)}
            for doc in result.eligible
        ],
        "quarantined": [{"doc_id": i.doc_id, "reason": i.reason} for i in result.quarantined],
        "corpus_manifest_text": manifest.to_text(),
        "notes": [
            "review_status=approved means publisher-authoritative guideline approved for indexing.",
            "It does NOT mean chatbot answers using the source are clinically validated.",
            "Bibliography (reference-list) chunks are excluded from the index: they can score",
            "highly on topical queries while offering no guidance.",
            "PCOS-specific coverage is thin (see coverage matrix); STG + internal KB entry only.",
            "Local indexing only; no document redistribution.",
        ],
    }
    with open(OUT_DIR / "manifest.json", "w", encoding="utf-8") as handle:
        json.dump(manifest_doc, handle, ensure_ascii=False, indent=2)
    with open(OUT_DIR / "quarantine.json", "w", encoding="utf-8") as handle:
        json.dump(manifest_doc["quarantined"], handle, ensure_ascii=False, indent=2)
    print(f"wrote {OUT_DIR}/vectors.npy chunks.json manifest.json quarantine.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
