# NurtureHer RAG + Chat Operations Runbook

## Ingest the medical corpus

Prerequisites: Python venv with `pip install -r requirements.txt` (includes
`pypdf`; MiniLM weights resolve from the HuggingFace cache, no download in
normal operation).

```powershell
python scripts/ops/ingest_medical_corpus.py
```

Reads `data/medical_corpus/*.pdf`, writes deterministic artifacts to
`data/rag_index/` (`vectors.npy`, `chunks.json`, `manifest.json`,
`quarantine.json`). Re-running reproduces the index; the manifest records
model, thresholds, chunking parameters, per-document hashes, license notes
as stated in the documents, extraction warnings, and quarantine reasons.
Expect: 5 eligible documents, 1 quarantined (`mohfw-pnc-note`,
unattributed provenance), ~1265 chunks. Local indexing only.

## Run the chatbot locally

```powershell
uvicorn app.main:app
```

`POST /api/v1/chat/message` (`{"message": "...", "language": "en"}`) with a
JWT bearer token. Flow: safety gate (unchanged, first) → deterministic
triage (routine / needs_attention / urgent) → corpus-first gated retrieval
(existing 0.254 MiniLM cutoff + evidence floor) with v1 KB fallback →
Gemini generation → citation validation → disclaimer → persist. Missing
index or failed retrieval degrades to the v1 path automatically.

Triage outcomes: ROUTINE replies normally; NEEDS_ATTENTION opens a review
case without SMS; URGENT replies with the safety template immediately and
opens a case plus caregiver/doctor alerts (24h cooldown dedupes repeats).

## Escalation recipients and SMS configuration

- Doctor: active `doctor_patients` link. Caregivers: approved
  `CareCircleAccess` with an emergency or risk scope. No link or no phone
  is recorded (`unassigned_doctor`, `skipped_no_phone`), never silent.
- SMS uses Twilio/Fast2SMS via `SMS_PROVIDER` + credentials (see
  `.env.example`). Without credentials the provider simulates delivery in
  non-production and refuses in production; treat non-production `sent`
  statuses as simulated, not real delivery. Real delivery requires
  credentials plus the Celery worker/beat processes.

## Test the completed workflow

```powershell
python -m pytest tests/test_triage.py tests/test_escalation.py tests/test_shared_history.py tests/test_corpus_eval.py tests/test_chat_corpus_integration.py tests/test_corpus_ingest.py --no-cov -p no:cacheprovider -q
python -m pytest -q
python scripts/ops/eval_corpus_retrieval.py   # 18-question v1-vs-corpus comparison
python scripts/ops/run_rag_v2_benchmark.py   # MiniLM vs MPNet component benchmark
```

Routine tests need no API keys and no network (MiniLM weights cached).
`test_chat_eval_live.py` stays double-gated (explicit approval + real key).

## What remains blocked

- Clinical validation of triage rules, safety templates, thresholds, and
  generated answers: requires clinicians; all artifacts are labeled
  pending-clinical-review.
- PCOS corpus coverage: thin (STG mention only); candidate follow-up is
  the 2023 International Evidence-based PCOS Guideline after provenance
  and reuse verification.
- PostgreSQL/Docker verification: unavailable in this environment; SQLite
  evidence is documented as partial in the migration tests.
