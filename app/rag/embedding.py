from __future__ import annotations

import hashlib
import logging
from functools import lru_cache

import numpy as np

logger = logging.getLogger(__name__)


class SentenceTransformerEmbeddingService:
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2", dimension: int = 384) -> None:
        self.model_name = model_name
        self.dimension = dimension
        self._model = self._load_model()

    def embed_documents(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.empty((0, self.dimension), dtype="float32")
        if self._model is not None:
            vectors = self._model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
            return np.asarray(vectors, dtype="float32")
        return np.vstack([self._hash_embedding(text) for text in texts]).astype("float32")

    def embed_query(self, text: str) -> np.ndarray:
        return self.embed_documents([text])[0]

    def _load_model(self):
        try:
            from sentence_transformers import SentenceTransformer

            return SentenceTransformer(self.model_name)
        except Exception as exc:  # pragma: no cover - depends on runtime model availability
            logger.warning("SentenceTransformer unavailable; using deterministic embedding fallback: %s", exc)
            return None

    def _hash_embedding(self, text: str) -> np.ndarray:
        vector = np.zeros(self.dimension, dtype="float32")
        for token in text.lower().split():
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % self.dimension
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign
        norm = np.linalg.norm(vector)
        return vector / norm if norm else vector


@lru_cache
def get_embedding_service() -> SentenceTransformerEmbeddingService:
    return SentenceTransformerEmbeddingService()
