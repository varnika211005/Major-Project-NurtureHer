from app.rag.knowledge_base import KnowledgeEntry, all_entries
from app.rag.documents import Document


class KnowledgeBaseDocumentLoader:
    def load(self) -> list[Document]:
        return [self._to_document(entry) for entry in all_entries()]

    def _to_document(self, entry: KnowledgeEntry) -> Document:
        return Document(
            page_content=entry.content,
            metadata={
                "id": entry.id,
                "category": entry.category,
                "title": entry.title,
                "language": entry.language,
            },
        )
