import uuid
from datetime import date, datetime

from sqlalchemy import JSON, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, declared_attr, mapped_column

from app.db import Base


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TenantMixin:
    """Every tenant-owned table gets an indexed org_id.

    Always filter queries by current_user.org_id so one organization never
    sees another's data.
    """

    @declared_attr
    def org_id(cls) -> Mapped[uuid.UUID]:
        return mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)


class User(TenantMixin, Base):
    """An org member who can be assigned work.

    Until real auth lands, members are added by name from the UI; the test
    user from app.auth is seeded on startup with the same id.
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("org_id", "email", name="uq_user_org_email"),)


class Project(TenantMixin, Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    key: Mapped[str] = mapped_column(String(10))
    description: Mapped[str] = mapped_column(Text, default="")
    color: Mapped[str] = mapped_column(String(9), default="#0047ab")

    __table_args__ = (UniqueConstraint("org_id", "key", name="uq_project_org_key"),)


class Sprint(TenantMixin, Base):
    __tablename__ = "sprints"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    goal: Mapped[str] = mapped_column(Text, default="")
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date] = mapped_column(Date)
    # planned | active | completed
    status: Mapped[str] = mapped_column(String(20), default="planned")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Story(TenantMixin, Base):
    """A work item. sprint_id NULL means it sits in the project's backlog."""

    __tablename__ = "stories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    sprint_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("sprints.id", ondelete="SET NULL"), index=True, nullable=True
    )
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True
    )
    reporter_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # Set for subtasks (one level deep). Subtasks always share their parent's sprint.
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("stories.id", ondelete="CASCADE"), index=True, nullable=True
    )
    number: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text, default="")
    # todo | in_progress | in_review | done
    status: Mapped[str] = mapped_column(String(20), default="todo")
    # urgent | high | medium | low
    priority: Mapped[str] = mapped_column(String(10), default="medium")
    points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Free-form tags like "Backend" or "Frontend", shared across a project by name.
    labels: Mapped[list[str]] = mapped_column(JSON, default=list, server_default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (UniqueConstraint("project_id", "number", name="uq_story_project_number"),)


class StoryComment(TenantMixin, Base):
    __tablename__ = "story_comments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    story_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProjectResource(TenantMixin, Base):
    """A cloud/infra resource a project uses (EC2 instance, S3 bucket, ...), tracked by hand.

    Never store credentials here: identifiers and console links only.
    """

    __tablename__ = "project_resources"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    # aws | gcp | azure | cloudflare | vercel | digitalocean | other
    provider: Mapped[str] = mapped_column(String(30))
    service: Mapped[str] = mapped_column(String(60))
    # production | staging | development | shared
    environment: Mapped[str] = mapped_column(String(20), default="production")
    region: Mapped[str] = mapped_column(String(50), default="")
    identifier: Mapped[str] = mapped_column(String(300), default="")
    url: Mapped[str] = mapped_column(String(500), default="")
    monthly_cost: Mapped[float | None] = mapped_column(Numeric(10, 2, asdecimal=False), nullable=True)
    owner_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    # active | planned | retired
    status: Mapped[str] = mapped_column(String(20), default="active")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
