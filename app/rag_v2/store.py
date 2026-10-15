"""RAG v2 in-memory cosine store (P2).

Holds one fixed document corpus embedded once per backend and ranks by
cosine similarity over L2-normalized vectors — the same score semantics as
the v1 FAISS IndexFlatIP path, without importing v1 internals. Small-corpus
brute force is deliberate: 8 documents need no index structure.
"""

from __future__ import annotations

import numpy as np


class CosineStore:
    def __init__(self, docs: dict[str, str], vectors: np.ndarray) -> None:
        ids = list(docs.keys())
        if vectors.shape != (len(ids), vectors.shape[1]):
            raise ValueError(f"vectors shape {vectors.shape} does not match {len(ids)} docs")
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        if not bool(np.all(norms > 0)):
            raise ValueError("embedding vectors must be non-zero (L2-normalized expected)")
        self._ids = ids
        self._texts = docs
        self._vectors = (vectors / norms).astype("float32")
        self.dimension = int(vectors.shape[1])

    def rank(self, query_vector: np.ndarray, k: int) -> list[tuple[str, float]]:
        """Return up to k (doc_id, cosine score) pairs, best first."""
        query = np.asarray(query_vector, dtype="float32").reshape(-1)
        if query.shape[0] != self.dimension:
            raise ValueError(f"query dim {query.shape[0]} != store dim {self.dimension}")
        norm = float(np.linalg.norm(query))
        if norm == 0.0:
            raise ValueError("query vector must be non-zero")
        scores = self._vectors @ (query / norm)
        order = np.argsort(scores)[::-1][: max(k, 0)]
        return [(self._ids[i], float(scores[i])) for i in order]

    def text(self, doc_id: str) -> str:
        return self._texts[doc_id]
