# RAG and Chat Operations Runbook

> Verified against the current working tree on 2026-10-21. This runbook describes engineering behavior, not clinical validation. The LLM does not decide emergency status, and retrieval scores do not establish medical correctness.

## 1. Current Pipeline

Served flow for `POST /api/v1/chat/message`:

```text
urgent safety gate
  -> language normalization
  -> conversational-intent short circuit
  -> English-first query translation (best effort)
  -> deterministic triage (ROUTINE / NEEDS_ATTENTION / URGENT)
  -> corpus retrieval (MiniLM, 0.254 threshold, evidence gate)
  -> v1 KB fallback when corpus evidence is not sufficient
  -> Gemini generation
  -> citation validation
  -> disclaimer
  -> persist + Redis memory
  -> best-effort escalation for NEEDS_ATTENTION
```

Urgent detection and the immediate safety response run before translation, retrieval, or generation. Urgent escalation happens after the safety reply is persisted.

### Step detail

1. **Safety gate** — `app/services/safety.py`
   - Self-harm is checked before urgent-medical phrases.
   - Phrase matching is lowercased substring matching across six languages.
   - A hit returns `SELF_HARM_TEMPLATE` or `URGENT_MEDICAL_TEMPLATE` and bypasses retrieval/generation.
   - The urgent reply is persisted, then `escalate_from_chat()` is called best-effort.
   - Crisis templates are English-only by design. The phrase lists are not clinically or natively reviewed.

2. **Language** — `app/services/translation_service.py`
   - Detected script/keywords take precedence, then the request language, then the user's preferred language.
   - For non-English input, the query is translated to English with Gemini, temperature 0.0, 10-second timeout.
   - Translation failure or a missing key falls back to the original query.
   - The persisted reply language is the normalized response language.

3. **Conversational intents** — `app/services/conversation_router.py`
   - Handles narrow greetings, thanks, capability questions, and everyday emotional check-ins.
   - Medical-looking messages do not enter this path.
   - If triage detects distress, a `NEEDS_ATTENTION` case is opened after the conversational reply is persisted.
   - Responses are pending native-speaker review.

4. **Triage** — `app/services/triage.py`
   - Version: `chat-triage-v1`; status: `pending-clinical-review`.
   - URGENT delegates to the same safety phrase lists, so triage cannot contradict the safety gate.
   - NEEDS_ATTENTION uses conservative distress phrases and opens a case-only escalation.
   - ROUTINE does not escalate.
   - Triage is logged but does not otherwise change the routine reply.

5. **Corpus retrieval** — `app/services/corpus_evidence.py`
   - Loads `data/rag_index/{chunks.json,manifest.json,vectors.npy}`.
   - Query embedding: MiniLM `sentence-transformers/all-MiniLM-L6-v2`, 384 dimensions.
   - Ranking: cosine over normalized vectors, `top_k=4`.
   - Threshold: `0.254`, read from the manifest's `threshold_default`, with fallback to `app/rag_v2/thresholds.json`.
   - `EvidenceGate` applies the same minimum-score floor and an ambiguity margin of `0.05`.
   - SUFFICIENT returns cited chunk IDs and formatted context.
   - INSUFFICIENT and AMBIGUOUS trigger the v1 fallback.
   - A missing/unreadable index raises `CorpusUnavailableError`; callers fall back to v1.

6. **v1 fallback** — `app/rag/`
   - Eight English internal knowledge entries with stable IDs.
   - MiniLM embeddings, FAISS/NumPy store, `top_k=4`, default threshold `0.30`.
   - Entries are explicitly marked unverified and pending clinical review.
   - If corpus was AMBIGUOUS and v1 also finds no evidence, the response is the clarification template; otherwise it is the insufficient-evidence template.

7. **Generation** — `app/services/gemini_service.py`
   - Gemini request uses temperature `0.3`, `maxOutputTokens=512`, 20-second timeout.
   - Configured model first, then a fallback model chain.
   - `gemini-3.6-flash` and several legacy names are normalized to `gemini-3.5-flash-lite` in code.
   - Without a key, a local templated fallback is returned.
   - The prompt requires educational, non-diagnostic language and citations only from the retrieved IDs.

8. **Citation validation and sources**
   - `validate_citations(response, cited_ids)` strips unknown/malformed markers, deduplicates the report, and returns cleaned text.
   - The cleaned text is used when validation reports any stripped markers.
   - `resolve_citation_sources()` maps only known internal IDs or indexed corpus chunk IDs to titles, pages, sections, and publisher metadata; it never invents metadata.
   - Unknown/unretrieved markers are not resolved.

9. **Persistence and memory**
   - Reply is persisted in `chat_messages` after appending the disclaimer.
   - Redis memory: `chat-memory:{user_id}`, up to 20 messages, 1-hour TTL, read back as the latest 6 turns.
   - Redis failure degrades memory but does not fail the reply.
   - There is one stream per user; no conversation threads.

## 2. Corpus Snapshot

Current artifacts:

| Item | Value |
| --- | --- |
| Corpus ID | `medical-corpus-v1` |
| Manifest created | `2026-10-16T03:31:12.276009+00:00` |
| Source documents | 6 PDFs in `data/medical_corpus/` |
| Eligible | 5 |
| Quarantined | 1 (`mohfw-pnc-note`, provenance pending) |
| Indexed chunks | 1,167 |
| Bibliography chunks dropped | 98 |
| Embedding | `all-MiniLM-L6-v2`, 384-d |
| Default threshold | `0.254` |
| Vector shape | `(1167, 384)` |

`review_status: approved` in the manifest means approved for indexing as a publisher-authoritative source. It is not clinical approval of the content or the chatbot.

The index was built with per-page sliding-window chunking, 1,200 max characters, 180-character overlap, and 100-character minimum pages. Section metadata tracks the nearest preceding document-structure heading. The four artifacts are `vectors.npy`, `chunks.json`, `manifest.json`, and `quarantine.json`.

## 3. Ingestion

Prerequisites: Python environment with project requirements installed, source PDFs present, and the MiniLM model available. A first-time model load may download weights if they are not cached; do not run it on a restricted network without approval.

```powershell
python scripts/ops/ingest_medical_corpus.py
```

Behavior:

- Reads `data/medical_corpus/*.pdf`.
- Validates provenance and quarantines documents that are unattributed or incomplete.
- Extracts page text, reports weak pages, and drops bibliography-only chunks.
- Embeds and writes deterministic artifacts to `data/rag_index/`.
- Rewrites existing artifacts, so do not run it casually on a working index.

Expected result in the current snapshot: 5 eligible, 1 quarantined, 1,167 chunks, 98 bibliography chunks dropped.

`data/` is ignored by Git and `.dockerignore`. A clone or image without explicit data packaging will lack the corpus. That causes v1 fallback, not a crash.

## 4. Escalation and Notification Behavior

Policy: `app/services/escalation.py`, risk type `chat_triage`.

| Triage | Case | SMS/notification | Reply timing |
| --- | --- | --- | --- |
| ROUTINE | None | None | Normal |
| NEEDS_ATTENTION | Open case, moderate | No notifications | Reply already persisted |
| URGENT | Open case, high | Doctor + consented caregivers | Reply persisted before escalation |

Details:

- Doctor recipient: active `DoctorPatient` link. If none, the result records `unassigned_doctor`.
- Caregiver recipients: approved, unrevoked `CareCircleAccess` where either `share_emergency` or `share_risk_category` is true.
- A missing phone is tracked as `skipped_no_phone`; it is never silent.
- An already-open case for the same mother within 24 hours is reused; no duplicate case or alert is created.
- URGENT notification text currently includes the mother's name and up to 500 characters of the trigger message excerpt. Treat queued SMS content as sensitive. The mother's reply does not wait for escalation.
- SMS uses Twilio/Fast2SMS via `SMS_PROVIDER` and credentials. Without credentials, non-production behaves as simulated and production fails closed. Real delivery also requires Celery worker/beat.

Do not log trigger text, recipient phone numbers, or SMS bodies in documentation or tickets.

## 5. Evaluation and Tests

Focused, no-network checks:

```powershell
python -m pytest tests/test_triage.py tests/test_escalation.py tests/test_shared_history.py tests/test_corpus_eval.py tests/test_chat_corpus_integration.py tests/test_corpus_ingest.py --no-cov -p no:cacheprovider -q
```

Other evidence tools:

```powershell
python scripts/ops/eval_corpus_retrieval.py
python scripts/ops/run_rag_v2_benchmark.py
python scripts/ops/calibrate_rag_v2_thresholds.py
```

- `eval_corpus_retrieval.py` compares v1 and corpus retrieval on the question set in the script.
- The benchmark is CPU/machine-dependent and covers synthetic labeled cases, not clinical accuracy.
- Threshold calibration outputs must not be changed without evaluation evidence and review.
- `tests/test_chat_eval_live.py` remains double-gated: explicit approval and a real API key are required.
- Routine tests must not require network or API keys.

Previously reported: 70 targeted RAG/safety/privacy tests passed with subset coverage 53.5% against the repository's 80% gate. A fresh full-suite run was not completed in this documentation pass.

## 6. Failure Modes

| Failure | Behavior | Operator action |
| --- | --- | --- |
| Missing/corrupt corpus index | v1 fallback | Verify index files and manifest; do not lower thresholds reflexively |
| Corpus verdict INSUFFICIENT | v1 fallback | Inspect diagnostics; consider corpus coverage |
| Corpus verdict AMBIGUOUS | v1 fallback; clarification if v1 also empty | Review topic/section metadata and query |
| MiniLM unavailable | Corpus retrieval error → v1 fallback; v1 may degrade to no evidence | Fix model cache/dependency; report degraded status |
| Missing Gemini key | Local templated fallback | Expected for offline development; not proof of live behavior |
| Gemini timeout/all models fail | Local fallback after attempts | Check network/key/quota; do not claim generated content |
| Redis unavailable | Memory and some caches degrade; refresh-token rotation may fail | Restore Redis for full auth/chat behavior |
| SMS credentials missing | Simulated in non-prod; fail-closed in production | Configure provider and workers; verify delivery separately |
| No doctor/CareCircle recipient | Case opens; `unassigned_doctor`/`skipped_no_phone` recorded | Review escalation coverage; do not silently ignore |

## 7. Known Limitations and Review Status

- Triage rules and safety templates: `pending-clinical-review`.
- Conversational responses: `pending-native-review`.
- Crisis templates: English-only; other language support is not claimed.
- Safety matching has no negation handling; a denial can still match.
- Corpus content is indexed, not clinically approved for chatbot use.
- PCOS coverage is thin; maternal sleep has a known evidence gap.
- Multilingual retrieval is uneven and evaluation labels are largely provisional.
- No true conversation threads; one stream per user.
- Backend voice is a placeholder; browser Web Speech is the usable voice path.
- Retrieval relevance, citation presence, and passing tests are not medical correctness or safety validation.
- No approval record was found in current documentation for the v2-as-served integration; treat it as implemented-but-pending-review, not clinically approved.

## 8. Incident/Review Checklist

1. Identify whether the failure is safety gate, triage, retrieval, generation, citation, persistence, or delivery.
2. Check logs for versions/status, counts, and thresholds; do not print user messages or personal data.
3. Verify corpus manifest and index consistency without re-ingesting on a live system.
4. Confirm whether v1 fallback or a local template answered.
5. For escalation failures, inspect case creation and notification status separately; the mother's reply is persisted before delivery.
6. For a suspected safety issue, preserve evidence under the project's privacy rules and escalate to a clinician/product owner. Do not attempt a clinical fix in code without review.
7. Do not change thresholds, safety phrases, or clinical content as an unreviewed hotfix.

## 9. Related Documents

- [`RAG_ARCHITECTURE.md`](./RAG_ARCHITECTURE.md)
- [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md)
- [`AUTH_AND_RBAC.md`](./AUTH_AND_RBAC.md)
- [`corpus_eval_report.md`](./corpus_eval_report.md)
- [`rag_v2_benchmark_report.md`](./rag_v2_benchmark_report.md)
- [`rag_v2_thresholds.md`](./rag_v2_thresholds.md)
- [`DEVELOPMENT_RUNBOOK.md`](./DEVELOPMENT_RUNBOOK.md)
