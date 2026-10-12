from app.rag.vector_store import RetrievedDocument, get_vector_store


class HealthKnowledgeRetriever:
    def __init__(self, top_k: int = 4, min_score: float = 0.05) -> None:
        self.top_k = top_k
        self.min_score = min_score

    def retrieve(self, query: str, categories: set[str] | None = None) -> list[RetrievedDocument]:
        results = get_vector_store().search(query, self.top_k)
        if categories:
            results = [item for item in results if item.document.metadata.get("category") in categories]
        filtered = [item for item in results if item.score >= self.min_score]
        return filtered or results[:2]
