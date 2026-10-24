"""
Builds an isolated Caregiver RAG knowledge index from trusted medical corpus documents.
Target location: data/caregiver_rag/
Keeps all legacy RAG indexes (data/rag_index/) completely untouched.
"""

import json
import logging
import re
from pathlib import Path
import pypdf

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DOC_METADATA = {
    "who_postnatal_care.pdf": {
        "id": "who-pnc-2022",
        "title": "WHO Recommendations on Maternal and Newborn Care for a Positive Postnatal Experience",
        "publisher": "World Health Organization (WHO)",
        "year": "2022",
        "focus": "Postnatal recovery, maternal care, newborn feeding, postpartum depression, emotional wellbeing",
    },
    "who_perinatal_mental_health.pdf": {
        "id": "who-pmh-2022",
        "title": "Guide for Integration of Perinatal Mental Health in Maternal and Child Health Services",
        "publisher": "World Health Organization (WHO)",
        "year": "2022",
        "focus": "Perinatal depression, anxiety, postpartum blues, partner and family support strategies",
    },
    "Guidance Note on Optimizing Postnatal Care.pdf": {
        "id": "mohfw-pnc-guidance",
        "title": "Guidance Note on Optimizing Post-Natal Care",
        "publisher": "Ministry of Health and Family Welfare (MoHFW), Government of India",
        "year": "2021",
        "focus": "Postnatal home visits, Danger signs in mother and baby, maternal hydration and nutrition, rest",
    },
    "High-Risk-Conditions-in-preg-modified-Final.pdf": {
        "id": "mohfw-high-risk",
        "title": "High Risk Factors of Pregnancy and Management at ANC Clinic (PMSMA)",
        "publisher": "MoHFW, Government of India",
        "year": "2019",
        "focus": "Preeclampsia, gestational diabetes, severe anemia, warning signs requiring emergency transport",
    },
    "Maternal Health – Guidance Booklet for CHOs (English).pdf": {
        "id": "mohfw-cho-handbook",
        "title": "Maternal Health Guidance Booklet for Community Health Officers",
        "publisher": "MoHFW, Government of India",
        "year": "2020",
        "focus": "Postpartum hemorrhage prevention, newborn warmth, hygiene, maternal nutrition, SUMAN initiative",
    },
}


def clean_text(raw: str) -> str:
    text = re.sub(r"\s+", " ", raw)
    text = re.sub(r"[^\x20-\x7E\u0900-\u097F\n]", " ", text)
    return text.strip()


def chunk_document(pdf_path: Path, meta: dict, target_chunk_size: int = 800, overlap: int = 150) -> list[dict]:
    reader = pypdf.PdfReader(str(pdf_path))
    chunks = []
    chunk_index = 0

    for page_idx, page in enumerate(reader.pages):
        page_num = page_idx + 1
        raw_text = page.extract_text() or ""
        cleaned = clean_text(raw_text)
        if len(cleaned) < 80:
            continue

        # Split into windows
        start = 0
        while start < len(cleaned):
            end = min(start + target_chunk_size, len(cleaned))
            # Try to snap to sentence or period boundary
            if end < len(cleaned):
                period_idx = cleaned.rfind(".", start + 200, end)
                if period_idx != -1 and period_idx > start + 300:
                    end = period_idx + 1

            chunk_text = cleaned[start:end].strip()
            if len(chunk_text) >= 100:
                chunk_id = f"{meta['id']}#p{page_num}c{chunk_index}"
                chunks.append({
                    "id": chunk_id,
                    "doc_id": meta["id"],
                    "doc_title": meta["title"],
                    "publisher": meta["publisher"],
                    "year": meta["year"],
                    "page": page_num,
                    "text": chunk_text,
                })
                chunk_index += 1

            if end >= len(cleaned):
                break
            start = end - overlap

    return chunks


def build_index():
    workspace = Path(__file__).resolve().parent.parent
    corpus_dir = workspace / "data" / "medical_corpus"
    output_dir = workspace / "data" / "caregiver_rag"
    output_dir.mkdir(parents=True, exist_ok=True)

    all_chunks = []
    indexed_docs = []

    for filename, meta in DOC_METADATA.items():
        pdf_path = corpus_dir / filename
        if not pdf_path.exists():
            # Check unicode variations
            found = False
            for p in corpus_dir.glob("*.pdf"):
                if p.name.replace("–", "-").replace("—", "-") == filename.replace("–", "-").replace("—", "-"):
                    pdf_path = p
                    found = True
                    break
            if not found:
                logger.warning("Corpus file not found: %s", filename)
                continue

        logger.info("Chunking %s ...", pdf_path.name)
        chunks = chunk_document(pdf_path, meta)
        logger.info("  Extracted %d chunks from %s", len(chunks), pdf_path.name)
        all_chunks.extend(chunks)
        indexed_docs.append({
            "doc_id": meta["id"],
            "title": meta["title"],
            "publisher": meta["publisher"],
            "filename": pdf_path.name,
            "chunks_count": len(chunks),
        })

    # Save caregiver_chunks.json
    chunks_path = output_dir / "caregiver_chunks.json"
    with open(chunks_path, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=2)

    # Save caregiver_manifest.json
    manifest_path = output_dir / "caregiver_manifest.json"
    manifest = {
        "version": "caregiver-rag-v1",
        "description": "Isolated Caregiver Health & Postpartum RAG Knowledge Index",
        "total_documents": len(indexed_docs),
        "total_chunks": len(all_chunks),
        "documents": indexed_docs,
    }
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    logger.info("Successfully built Caregiver RAG index with %d chunks across %d documents.", len(all_chunks), len(indexed_docs))
    logger.info("Saved to %s", output_dir)


if __name__ == "__main__":
    build_index()
