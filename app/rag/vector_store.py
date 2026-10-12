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

    def search(self, query: str, k: int = 4) -> list[RetrievedDocument]:
        if not self.documents:
            return []
        query_vector = self.embedding_service.embed_query(query).reshape(1, -1).astype("float32")
        if self.index is not None:
            scores, positions = self.index.search(query_vector, min(k, len(self.documents)))
            return [
                RetrievedDocument(document=self.documents[position], score=float(score))
                for score, position in zip(scores[0], positions[0])
                if position >= 0
            ]
        scores = self.vectors @ query_vector.reshape(-1)
        ranked = np.argsort(scores)[::-1][:k]
        return [RetrievedDocument(document=self.documents[position], score=float(scores[position])) for position in ranked]

    def _build_index(self, vectors: np.ndarray):
        if faiss is None or vectors.size == 0:
            return None
        index = faiss.IndexFlatIP(vectors.shape[1])
        index.add(vectors.astype("float32"))
        return index


@lru_cache
def get_vector_store() -> FAISSVectorStore:
    return FAISSVectorStore(KnowledgeBaseDocumentLoader().load())
