import re
import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

Status = Literal["todo", "in_progress", "in_review", "done"]
Priority = Literal["urgent", "high", "medium", "low"]
SprintStatus = Literal["planned", "active", "completed"]


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: str | None = Field(default=None, max_length=320)

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = " ".join(v.split())
        if not v:
            raise ValueError("Name is required")
        return v

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        v = v.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", v):
            raise ValueError("Enter a valid email")
        return v


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str | None


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    key: str | None = Field(default=None, max_length=10)
    description: str = ""
    color: str = Field(default="#0047ab", pattern=r"^#[0-9a-fA-F]{6}$")

    @field_validator("key")
    @classmethod
    def clean_key(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        v = v.strip().upper()
        if not re.fullmatch(r"[A-Z][A-Z0-9]{1,9}", v):
            raise ValueError("Key must be 2-10 letters/digits and start with a letter")
        return v


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    key: str
    description: str
    color: str
    story_count: int = 0
    done_count: int = 0
    sprint_count: int = 0


class SprintCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    goal: str = ""
    start_date: date | None = None
    due_date: date


class SprintUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    goal: str | None = None
    start_date: date | None = None
    due_date: date | None = None
    status: SprintStatus | None = None


class SprintOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    goal: str
    start_date: date | None
    due_date: date
    status: SprintStatus


def _clean_labels(labels: list[str] | None) -> list[str] | None:
    if labels is None:
        return None
    cleaned: list[str] = []
    seen: set[str] = set()
    for raw in labels:
        label = " ".join(raw.split())
        if not label:
            continue
        if len(label) > 30:
            raise ValueError("Labels can be at most 30 characters")
        if label.lower() not in seen:
            seen.add(label.lower())
            cleaned.append(label)
    if len(cleaned) > 10:
        raise ValueError("A story can have at most 10 labels")
    return cleaned


class StoryCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    description: str = ""
    priority: Priority = "medium"
    points: int | None = Field(default=None, ge=0, le=100)
    labels: list[str] = []
    assignee_id: uuid.UUID | None = None
    # Omit or null to put the story in the backlog.
    sprint_id: uuid.UUID | None = None

    @field_validator("labels")
    @classmethod
    def clean_labels(cls, v):
        return _clean_labels(v)


class StoryUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = None
    priority: Priority | None = None
    points: int | None = Field(default=None, ge=0, le=100)
    status: Status | None = None
    labels: list[str] | None = None
    # null unassigns; omit to leave unchanged.
    assignee_id: uuid.UUID | None = None
    reporter_id: uuid.UUID | None = None
    # Distinguish "not sent" from "null = move to backlog" via model_fields_set.
    sprint_id: uuid.UUID | None = None

    @field_validator("labels")
    @classmethod
    def clean_labels(cls, v):
        return _clean_labels(v)


class StoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    sprint_id: uuid.UUID | None
    assignee_id: uuid.UUID | None
    reporter_id: uuid.UUID | None
    key: str
    number: int
    title: str
    description: str
    status: Status
    priority: Priority
    points: int | None
    labels: list[str]
    created_at: datetime
    updated_at: datetime


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=10_000)

    @field_validator("body")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Comment can't be empty")
        return v.strip()


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    story_id: uuid.UUID
    author_id: uuid.UUID | None
    body: str
    created_at: datetime
