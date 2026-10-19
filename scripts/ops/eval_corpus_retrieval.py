"""Compare v1 KB retrieval against the corpus index on identical questions.

Prints per-question verdicts, top passages (id/title/pages/score), and a
summary. A human reviewer judges topical relevance from the printed
passages; this script measures evidence behavior, not clinical correctness.
Writes docs/corpus_eval_report.md skeleton with the raw table (reviewer
fills relevance + decision).
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from app.rag.retriever import HealthKnowledgeRetriever  # noqa: E402
from app.services.corpus_evidence import get_corpus_index  # noqa: E402

QUESTIONS = [
    ("ppd-signs", "What are the signs of postpartum depression?"),
    ("ppd-blues", "What is the difference between baby blues and postpartum depression?"),
    ("ppd-epds", "How is postpartum depression screened? What is the EPDS questionnaire?"),
    ("ppd-support", "I feel sad after my delivery. How can I get support?"),
    ("ppd-sleep", "I cannot sleep even when my baby sleeps. What can I do?"),
    ("ppd-bf-mood", "Does breastfeeding affect my mood after delivery?"),
    ("pcos-signs", "What are the signs of PCOS?"),
    ("pcos-lifestyle", "What lifestyle changes help with PCOS?"),
    ("pcos-doctor", "When should I see a doctor for irregular periods?"),
    ("warn-bleed", "I have heavy bleeding after delivery. What should I do?"),
    ("warn-headache", "I have a severe headache and blurry vision during pregnancy."),
    ("warn-fever", "I have high fever after delivery. Is it dangerous?"),
    ("warn-movement", "My baby is moving less than usual. What should I do?"),
    ("pnc-recovery", "How do I take care of myself in the first weeks after delivery?"),
    ("pnc-nutrition", "What should I eat after delivery? Do I need iron tablets?"),
    ("pnc-exercise", "When can I start exercising after a normal delivery?"),
    ("irrelevant-capital", "What is the capital of France?"),
    ("irrelevant-tax", "How do I file my phone tax return?"),
]


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    v1 = HealthKnowledgeRetriever()
    corpus = get_corpus_index()
    print(f"corpus chunks={corpus.chunk_count} threshold={corpus.threshold}")
    rows = []
    for qid, question in QUESTIONS:
        v1_result = v1.retrieve(question)
        corp = corpus.retrieve(question)
        v1_docs = v1_result.documents
        v1_top = [item.document.metadata.get("id") for item in v1_docs]
        print("=" * 100)
        print(f"Q[{qid}]: {question}")
        print(f"  v1: evidence={v1_result.has_evidence} docs={v1_top}")
        print(f"  corpus: verdict={corp.verdict.value} reason={corp.reason} "
              f"top_score={corp.top_score:.3f} n={len(corp.cited_ids)}")
        print("  ranked candidates (above-threshold, pre-gate):")
        for cid, score in corp.candidates:
            passage = corpus.passage(cid)
            topic = passage.get("section") or (passage.get("topics") or [passage["doc_id"]])[0]
            print(f"    - {score:.3f} {cid} | topic={str(topic)[:70]}")
        for cid in corp.cited_ids:
            passage = corpus.passage(cid)
            print(f"    + {cid} | {passage['title'][:60]} | p.{','.join(map(str, passage['pages']))} "
                  f"| {passage['text'][:160]}...")
        rows.append((qid, question, v1_result.has_evidence, v1_top,
                     corp.verdict.value, corp.top_score, list(corp.cited_ids)))
    table = ["<!-- RAW-BEGIN -->",
             "# Corpus eval (raw — reviewer judges relevance)", "",
             "| qid | v1_evidence | v1_docs | corpus_verdict | top_score | corpus_cites |",
             "|---|---|---|---|---|---|"]
    for qid, _q, v1e, v1d, verdict, score, cites in rows:
        table.append(f"| {qid} | {v1e} | {','.join(map(str, v1d))} | {verdict} | {score:.3f} | {','.join(cites)} |")
    table.append("<!-- RAW-END -->")
    report_path = ROOT / "docs" / "corpus_eval_report.md"
    previous = report_path.read_text(encoding="utf-8") if report_path.exists() else ""
    start = previous.find("<!-- RAW-BEGIN -->")
    end = previous.find("<!-- RAW-END -->")
    if start != -1 and end != -1:
        merged = previous[:start] + "\n".join(table) + previous[end + len("<!-- RAW-END -->"):]
    else:
        merged = "\n".join(table) + "\n"
    report_path.write_text(merged, encoding="utf-8")
    print("wrote docs/corpus_eval_report.md (raw table only; reviewer sections preserved)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
