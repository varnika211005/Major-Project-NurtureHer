from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import numpy as np

try:
    import faiss
except ImportError:  # pragma: no cover
    faiss = None

from app.rag.document_loader import KnowledgeBaseDocumentLoader
from app.rag.documents import Document
from app.rag.embedding import get_embedding_service


@dataclass(frozen=True)
class RetrievedDocument:
    document: Document
    score: float


class FAISSVectorStore:
    def __init__(self, documents: list[Document]) -> None:
        self.documents = documents
        self.embedding_service = get_embedding_service()
        self.vectors = self.embedding_service.embed_documents([doc.page_content for doc in documents])
        self.index = self._build_index(self.vectors)

    @property
    def backend(self) -> str:
        """Exact score semantics: FAISS IndexFlatIP over L2-normalized
        vectors, i.e. cosine similarity in [-1, 1]. The numpy fallback
        computes the same cosine quantity on the same vectors."""
        return "faiss-ip" if self.index is not None else "numpy-fallback"

    def search(self, query: str, k: int = 4) -> tuple[list[RetrievedDocument], str]:
        """Returns (ranked documents, backend name used for this search)."""
        if not self.documents:
            return [], self.backend
        query_vector = self.embedding_service.embed_query(query).reshape(1, -1).astype("float32")
        if self.index is not None:
            scores, positions = self.index.search(query_vector, min(k, len(self.documents)))
            return (
                [
                    RetrievedDocument(document=self.documents[position], score=float(score))
                    for score, position in zip(scores[0], positions[0])
                    if position >= 0
                ],
                self.backend,
            )
        scores = self.vectors @ query_vector.reshape(-1)
        ranked = np.argsort(scores)[::-1][:k]
        return [RetrievedDocument(document=self.documents[position], score=float(scores[position])) for position in ranked], self.backend

    def _build_index(self, vectors: np.ndarray):
        if faiss is None or vectors.size == 0:
            return None
        index = faiss.IndexFlatIP(vectors.shape[1])
        index.add(vectors.astype("float32"))
        return index


@lru_cache
def get_vector_store() -> FAISSVectorStore:
    return FAISSVectorStore(KnowledgeBaseDocumentLoader().load())
