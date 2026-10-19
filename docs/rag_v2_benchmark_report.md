# RAG v2 P2 embedding benchmark report

minilm: id=sentence-transformers/all-MiniLM-L6-v2 revision=1110a243fdf4706b3f48f1d95db1a4f5529b4d41 dim=384
mpnet: id=sentence-transformers/paraphrase-multilingual-mpnet-base-v2 revision=4328cf26390c98c5e3c738b4460a05b95f4911f5 dim=768
load_path_mpnet=C:\Users\Dell\.cache\huggingface\manual\mpnet-4328cf2
cases=44 (provisional non-English labels pending native-speaker review)

## minilm
- recall@1=0.182 recall@4=0.182 mrr=0.398
- latency median=25.5ms p95=33.0ms peak=64294KB load=2687.8ms
- per-language recall@1: en:native=1.000, hi:native=0.000, hi:romanized=0.000, kn:native=0.000, kn:romanized=1.000, ml:native=0.000, ta:native=0.000, ta:romanized=1.000, te:native=0.000, te:romanized=0.000
- established-only cases: 6, provisional-only cases: 38

## mpnet
- recall@1=0.636 recall@4=0.636 mrr=0.804
- latency median=101.3ms p95=112.2ms peak=168KB load=1031.9ms
- per-language recall@1: en:native=1.000, hi:native=0.833, hi:romanized=1.000, kn:native=0.667, kn:romanized=0.000, ml:native=0.500, ta:native=0.667, ta:romanized=1.000, te:native=0.667, te:romanized=0.000
- established-only cases: 6, provisional-only cases: 38

- minilm irrelevant controls: n=4, max top-1 score=0.073
- mpnet irrelevant controls: n=4, max top-1 score=0.149

## Limitations
- Small sample (~40 queries, 8 documents); provisional non-English labels unreviewed.
- Topical-relevance judgments only; not clinical validation.
- CPU timings on this machine; not comparable across hardware.