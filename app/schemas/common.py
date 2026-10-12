from datetime import datetime
from uuid import UUID

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

DataT = TypeVar("DataT")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    message: str


class TimestampedModel(ORMModel):
    id: UUID
    created_at: datetime


class PaginationQuery(BaseModel):
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class PageMeta(BaseModel):
    limit: int
    offset: int
    count: int


class PaginatedResponse(BaseModel, Generic[DataT]):
    data: list[DataT]
    meta: PageMeta


class AuditLogRead(ORMModel):
    id: UUID
    user_id: UUID | None
    action: str
    resource: str
    ip_address: str | None
    user_agent: str | None
    metadata_json: str | None
    created_at: datetime
