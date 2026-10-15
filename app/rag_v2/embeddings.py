"""RAG v2 embedding backends (P2).

Each backend wraps a pinned sentence-transformers model and reports its
own load latency, dimension, and availability. Unlike v1, a missing or
unloadable model RAISES ModelUnavailableError — it never silently falls
back to hash embeddings or claims successful retrieval.

Score semantics: all vectors are L2-normalized, so dot products are cosine
similarities in [-1, 1], identical to the v1 FAISS IndexFlatIP semantics.
"""

from __future__ import annotations

import logging
import time

import numpy as np

logger = logging.getLogger(__name__)


class ModelUnavailableError(RuntimeError):
    """Raised when embedding weights cannot be loaded.

    Callers must treat this as a hard failure (skip the backend with a
    clear message), never as a signal to substitute another model or hash
    embeddings.
    """


MINILM_MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
MINILM_DIMENSION = 384

MPNET_MODEL_ID = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
MPNET_DIMENSION = 768
# Exact commit hash resolved via HfApi.model_info and verified by downloading
# with revision= pinned. Recorded verbatim in every benchmark report.
MPNET_REVISION = "4328cf26390c98c5e3c738b4460a05b95f4911f5"


class EmbeddingBackend:
    """A named, revision-pinned sentence-transformers embedding backend."""

    def __init__(self, name: str, model_id: str, dimension: int, revision: str | None = None) -> None:
        self.name = name
        self.model_id = model_id
        self.dimension = dimension
        self.revision = revision
        self.load_ms: float | None = None
        self._model = self._load_model()

    def _load_model(self):
        try:
            from sentence_transformers import SentenceTransformer

            kwargs: dict[str, str] = {}
            if self.revision:
                kwargs["revision"] = self.revision
            started = time.perf_counter()
            model = SentenceTransformer(self.model_id, **kwargs)
            self.load_ms = round((time.perf_counter() - started) * 1000.0, 1)
            return model
        except Exception as exc:
            raise ModelUnavailableError(f"embedding model unavailable: id={self.model_id} revision={self.revision} error={exc}") from exc

    def embed(self, texts: list[str]) -> np.ndarray:
        vectors = self._model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        result = np.asarray(vectors, dtype="float32")
        if result.shape != (len(texts), self.dimension):
            raise ModelUnavailableError(
                f"embedding dimension mismatch: id={self.model_id} " f"expected=(*, {self.dimension}) got={result.shape}"
            )
        return result


def minilm_backend() -> EmbeddingBackend:
    return EmbeddingBackend(name="minilm", model_id=MINILM_MODEL_ID, dimension=MINILM_DIMENSION)


def mpnet_backend(model_path: str | None = None) -> EmbeddingBackend:
    """MPNet backend.

    `model_path` overrides the HF model id for hosts where the hub cache
    cannot materialize files (e.g. Windows without symlink privileges). The
    weights must still be the pinned `MPNET_REVISION`; callers record the
    actual load path in the benchmark report.
    """
    return EmbeddingBackend(
        name="mpnet",
        model_id=model_path or MPNET_MODEL_ID,
        dimension=MPNET_DIMENSION,
        revision=None if model_path else MPNET_REVISION,
    )
