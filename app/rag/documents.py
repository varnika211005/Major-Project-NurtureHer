from dataclasses import dataclass, field


try:
    from langchain.schema import Document
except ImportError:  # pragma: no cover - local fallback for environments before requirements install
    try:
        from langchain_core.documents import Document
    except ImportError:

        @dataclass
        class Document:  # type: ignore[no-redef]
            page_content: str
            metadata: dict = field(default_factory=dict)
