from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class EducationalResourceRead(ORMModel):
    id: UUID
    title: str
    description: str
    content_type: str  # "video" | "article"
    language: str = "en"
    series_name: str | None = None
    is_verified: bool = False
    category: str
    video_url: str | None = None
    thumbnail_url: str | None = None
    duration_seconds: int | None = None
    file_size_bytes: int | None = None
    article_content: str | None = None
    author_publisher: str | None = None
    review_date: str | None = None
    sources_json: str | None = None
    is_downloadable: bool = True
    is_published: bool = True
    created_at: datetime


class EducationalResourceCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)
    content_type: Literal["video", "article"]
    language: str = Field(default="en", min_length=2, max_length=10)
    series_name: str | None = Field(default=None, max_length=100)
    is_verified: bool = False
    category: str = Field(min_length=1, max_length=100)
    video_url: str | None = Field(default=None, max_length=500)
    thumbnail_url: str | None = Field(default=None, max_length=500)
    duration_seconds: int | None = Field(default=None, ge=0)
    file_size_bytes: int | None = Field(default=None, ge=0)
    article_content: str | None = None
    author_publisher: str | None = Field(default=None, max_length=255)
    review_date: str | None = Field(default=None, max_length=32)
    sources_json: str | None = None
    is_downloadable: bool = True
    is_published: bool = True


class EducationalResourceUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1)
    content_type: Literal["video", "article"] | None = None
    language: str | None = Field(default=None, min_length=2, max_length=10)
    series_name: str | None = Field(default=None, max_length=100)
    is_verified: bool | None = None
    category: str | None = Field(default=None, min_length=1, max_length=100)
    video_url: str | None = Field(default=None, max_length=500)
    thumbnail_url: str | None = Field(default=None, max_length=500)
    duration_seconds: int | None = Field(default=None, ge=0)
    file_size_bytes: int | None = Field(default=None, ge=0)
    article_content: str | None = None
    author_publisher: str | None = Field(default=None, max_length=255)
    review_date: str | None = Field(default=None, max_length=32)
    sources_json: str | None = None
    is_downloadable: bool | None = None
    is_published: bool | None = None


class EducationCategoriesRead(BaseModel):
    video_categories: list[str]
    article_categories: list[str]
