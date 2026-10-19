<!-- RAW-BEGIN -->
# Corpus eval (raw — reviewer judges relevance)

| qid | v1_evidence | v1_docs | corpus_verdict | top_score | corpus_cites |
|---|---|---|---|---|---|
| ppd-signs | True | ppd_guidance_001,exercise_001,cycle_tracking_001,pregnancy_support_001 | ambiguous | 0.562 |  |
| ppd-blues | True | ppd_guidance_001,pregnancy_support_001 | ambiguous | 0.602 |  |
| ppd-epds | True | ppd_guidance_001,cycle_tracking_001,exercise_001,mental_wellness_001 | sufficient | 0.721 | who-pnc-2022#p101c0,who-pnc-2022#p101c2,who-pnc-2022#p100c0,who-pnc-2022#p104c1 |
| ppd-support | True | ppd_guidance_001,pregnancy_support_001 | sufficient | 0.517 | who-pmh-2022#p46c0,who-pmh-2022#p23c2,who-pmh-2022#p47c0,who-pnc-2022#p108c0 |
| ppd-sleep | False |  | sufficient | 0.468 | who-pnc-2022#p141c0,who-pnc-2022#p141c1,who-pnc-2022#p142c0,who-pnc-2022#p143c0 |
| ppd-bf-mood | True | ppd_guidance_001 | ambiguous | 0.559 |  |
| pcos-signs | True | pcos_guidance_001,cycle_tracking_001 | ambiguous | 0.430 |  |
| pcos-lifestyle | True | pcos_guidance_001,mental_wellness_001 | ambiguous | 0.362 |  |
| pcos-doctor | True | cycle_tracking_001,safety_urgent_001,pcos_guidance_001 | ambiguous | 0.364 |  |
| warn-bleed | True | safety_urgent_001,pregnancy_support_001,exercise_001 | ambiguous | 0.527 |  |
| warn-headache | True | pregnancy_support_001,safety_urgent_001 | ambiguous | 0.558 |  |
| warn-fever | True | safety_urgent_001 | sufficient | 0.572 | mohfw-hrp#p2c3,mohfw-hrp#p2c1,who-pnc-2022#p116c0,mohfw-stg-og#p21c0 |
| warn-movement | True | exercise_001 | ambiguous | 0.421 |  |
| pnc-recovery | True | pregnancy_support_001,ppd_guidance_001,exercise_001 | ambiguous | 0.622 |  |
| pnc-nutrition | True | nutrition_001,pregnancy_support_001,exercise_001 | ambiguous | 0.638 |  |
| pnc-exercise | True | exercise_001,pregnancy_support_001 | sufficient | 0.633 | who-pnc-2022#p111c2,who-pnc-2022#p111c1,who-pnc-2022#p111c0,who-pnc-2022#p61c0 |
| irrelevant-capital | False |  | insufficient | 0.000 |  |
| irrelevant-tax | False |  | insufficient | 0.000 |  |
<!-- RAW-END -->

## Reviewer judgments, retrieval-quality round (section-aware index, 98 bibliography chunks excluded)

Before (document-level topics, bibliography servable): SUFFICIENT 9, AMBIGUOUS 7, INSUFFICIENT 2.
After (section topics, bibliography excluded): SUFFICIENT 4, AMBIGUOUS 12, INSUFFICIENT 2.
Threshold unchanged (minilm 0.254). Chunk ids stable across re-ingests.

- ppd-epds: SUFFICIENT, top who-pnc-2022#p101c0 (WHO Recommendation 18, screening). GOOD.
- ppd-support: SUFFICIENT, top who-pmh-2022#p46c0 (infant-loss grief content) with stress-management passages. MIXED: adjacent, not support guidance; mechanism (shared junk sections) is luck, watch item.
- ppd-sleep: SUFFICIENT with infant-sleep content (who-pnc-2022#p141c0). BAD: corpus contains zero maternal-insomnia passages (verified: no "insomnia" chunk). Correct behavior would be refusal; pinned as strict-xfail, not asserted passing.
- ppd-bf-mood, warn-bleed, pnc-recovery, pnc-nutrition, ppd-signs, ppd-blues: AMBIGUOUS on genuinely divergent sections → v1 KB fallback (ppd_guidance_001 / safety_urgent_001 / nutrition_001 — curated and appropriate). Correct refusals.
- pcos-signs, pcos-lifestyle: AMBIGUOUS at low scores (0.466/0.362) → must never be served; v1 pcos_guidance_001 serves. Correct refusals.
- warn-headache, warn-movement: AMBIGUOUS → fallback. Production safety gate answers headache/bleeding/fever before retrieval; reduced fetal movement has no safety rule (needs clinical review to add) and falls back to weak v1 content — documented gap.
- pnc-exercise, warn-fever: SUFFICIENT with relevant WHO/risk content. GOOD with noted top-1 weakness on fever.
- Irrelevant controls: INSUFFICIENT on both paths, preserved.

## Integration decision (unchanged): corpus-first with v1 fallback

Justified conditionally: the corpus serves WHO-depth evidence where coherent (EPDS, exercise), refuses incoherent sets to the curated v1 fallback or uncertainty, and never serves bibliography. Residual risk: ppd-sleep-style weak-band serves (top scores 0.43-0.52 with same-section coherence). No threshold or gate tuning was applied to chase verdict counts; the floor, margin, and calibrated values are untouched. Real fixes remaining: maternal-sleep corpus content, clinician review of all rules, PCOS guideline source.
