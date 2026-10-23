import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class EducationalResource(Base):
    __tablename__ = "educational_resources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str] = mapped_column(String(32), index=True, nullable=False)  # "video" or "article"
    language: Mapped[str] = mapped_column(String(10), default="en", server_default="en", index=True, nullable=False)
    series_name: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    article_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    author_publisher: Mapped[str | None] = mapped_column(String(255), nullable=True)
    review_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    sources_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_downloadable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
