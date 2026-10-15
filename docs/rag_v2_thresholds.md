# RAG v2 P3 threshold calibration

## minilm (`sentence-transformers/all-MiniLM-L6-v2`, revision=None, dim=384, load_ms=4608.3, load_path=sentence-transformers/all-MiniLM-L6-v2)
- established relevant range: min=0.4352554678916931 max=0.8010389804840088 (n=6)
- provisional relevant min: -0.10585535317659378 (n=34) — NOT used to set cutoffs
- irrelevant max top-1: 0.07303040474653244 (n=4)
- chosen default cutoff: **0.254** — clean gap [0.073, 0.435]
- recall trade-off: cutoff set conservatively; recall cost must be read from the benchmark report, not assumed here

## mpnet (`sentence-transformers/paraphrase-multilingual-mpnet-base-v2`, revision=4328cf26390c98c5e3c738b4460a05b95f4911f5, dim=768, load_ms=3688.2, load_path=C:\Users\Dell\.cache\huggingface\manual\mpnet-4328cf2)
- established relevant range: min=0.5510881543159485 max=0.7845767736434937 (n=6)
- provisional relevant min: 0.07526655495166779 (n=34) — NOT used to set cutoffs
- irrelevant max top-1: 0.14945679903030396 (n=4)
- chosen default cutoff: **0.35** — clean gap [0.149, 0.551]
- recall trade-off: cutoff set conservatively; recall cost must be read from the benchmark report, not assumed here

## Limitations
- Small labeled set; provisional non-English labels unreviewed by native speakers.
- Cutoffs separate measured relevant/irrelevant score masses; they do not prove medical correctness.
- Machine timings/hardware-specific; rerun on target hardware before production use.