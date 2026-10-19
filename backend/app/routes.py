import re
import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import CurrentUser, get_current_user
from app.db import get_db

router = APIRouter(prefix="/api")

DB = Annotated[Session, Depends(get_db)]
User = Annotated[CurrentUser, Depends(get_current_user)]


# -- helpers -----------------------------------------------------------------


def _get_project(db: Session, user: CurrentUser, project_id: uuid.UUID) -> models.Project:
    project = db.scalar(
        select(models.Project).where(models.Project.id == project_id, models.Project.org_id == user.org_id)
    )
    if project is None:
        raise HTTPException(404, "Project not found")
    return project


def _get_sprint(db: Session, user: CurrentUser, sprint_id: uuid.UUID, project_id: uuid.UUID | None = None):
    query = select(models.Sprint).where(models.Sprint.id == sprint_id, models.Sprint.org_id == user.org_id)
    if project_id is not None:
        query = query.where(models.Sprint.project_id == project_id)
    sprint = db.scalar(query)
    if sprint is None:
        raise HTTPException(404, "Sprint not found")
    return sprint


def _check_assignee(db: Session, user: CurrentUser, assignee_id: uuid.UUID) -> None:
    exists = db.scalar(
        select(models.User.id).where(models.User.id == assignee_id, models.User.org_id == user.org_id)
    )
    if exists is None:
        raise HTTPException(404, "Assignee not found")


def _story_out(story: models.Story, project_key: str) -> schemas.StoryOut:
    return schemas.StoryOut(
        id=story.id,
        project_id=story.project_id,
        sprint_id=story.sprint_id,
        assignee_id=story.assignee_id,
        reporter_id=story.reporter_id,
        parent_id=story.parent_id,
        key=f"{project_key}-{story.number}",
        number=story.number,
        title=story.title,
        description=story.description,
        status=story.status,
        priority=story.priority,
        points=story.points,
        labels=story.labels or [],
        created_at=story.created_at,
        updated_at=story.updated_at,
    )


def _get_story(db: Session, user: CurrentUser, story_id: uuid.UUID) -> models.Story:
    story = db.scalar(select(models.Story).where(models.Story.id == story_id, models.Story.org_id == user.org_id))
    if story is None:
        raise HTTPException(404, "Story not found")
    return story


def _derive_key(name: str) -> str:
    words = re.findall(r"[A-Za-z0-9]+", name)
    letters = "".join(w[0] for w in words)[:4] if len(words) > 1 else (words[0][:4] if words else "")
    key = letters.upper()
    if not key or not key[0].isalpha():
        key = "P" + key
    return key.ljust(2, "X")[:10]


def _project_out(db: Session, project: models.Project) -> schemas.ProjectOut:
    story_count, done_count = db.execute(
        select(
            func.count(models.Story.id),
            func.count(models.Story.id).filter(models.Story.status == "done"),
        ).where(models.Story.project_id == project.id)
    ).one()
    sprint_count = db.scalar(select(func.count(models.Sprint.id)).where(models.Sprint.project_id == project.id))
    return schemas.ProjectOut(
        id=project.id,
        name=project.name,
        key=project.key,
        description=project.description,
        color=project.color,
        story_count=story_count,
        done_count=done_count,
        sprint_count=sprint_count or 0,
    )


# -- users -------------------------------------------------------------------


@router.get("/users")
def list_users(db: DB, user: User) -> list[schemas.UserOut]:
    return list(
        db.scalars(
            select(models.User).where(models.User.org_id == user.org_id).order_by(func.lower(models.User.name))
        ).all()
    )


@router.post("/users", status_code=201)
def create_user(body: schemas.UserCreate, db: DB, user: User) -> schemas.UserOut:
    member = models.User(org_id=user.org_id, name=body.name, email=body.email)
    db.add(member)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, f"Someone with email {body.email} is already a member") from None
    return member


# -- projects ----------------------------------------------------------------


@router.get("/projects")
def list_projects(db: DB, user: User) -> list[schemas.ProjectOut]:
    projects = db.scalars(
        select(models.Project).where(models.Project.org_id == user.org_id).order_by(models.Project.created_at)
    ).all()
    return [_project_out(db, p) for p in projects]


@router.post("/projects", status_code=201)
def create_project(body: schemas.ProjectCreate, db: DB, user: User) -> schemas.ProjectOut:
    key = body.key or _derive_key(body.name)
    project = models.Project(
        org_id=user.org_id, name=body.name.strip(), key=key, description=body.description, color=body.color
    )
    db.add(project)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, f"A project with key {key} already exists") from None
    return _project_out(db, project)


@router.get("/projects/{project_id}")
def get_project(project_id: uuid.UUID, db: DB, user: User) -> schemas.ProjectOut:
    return _project_out(db, _get_project(db, user, project_id))


# -- sprints -----------------------------------------------------------------


@router.get("/projects/{project_id}/sprints")
def list_sprints(project_id: uuid.UUID, db: DB, user: User) -> list[schemas.SprintOut]:
    _get_project(db, user, project_id)
    return list(
        db.scalars(
            select(models.Sprint)
            .where(models.Sprint.project_id == project_id, models.Sprint.org_id == user.org_id)
            .order_by(models.Sprint.due_date, models.Sprint.created_at)
        ).all()
    )


@router.post("/projects/{project_id}/sprints", status_code=201)
def create_sprint(project_id: uuid.UUID, body: schemas.SprintCreate, db: DB, user: User) -> schemas.SprintOut:
    _get_project(db, user, project_id)
    if body.start_date and body.due_date < body.start_date:
        raise HTTPException(422, "Due date can't be before the start date")
    sprint = models.Sprint(org_id=user.org_id, project_id=project_id, **body.model_dump())
    db.add(sprint)
    db.commit()
    return sprint


@router.patch("/sprints/{sprint_id}")
def update_sprint(sprint_id: uuid.UUID, body: schemas.SprintUpdate, db: DB, user: User) -> schemas.SprintOut:
    sprint = _get_sprint(db, user, sprint_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        if value is None and field in ("name", "due_date", "status"):
            continue
        setattr(sprint, field, value)
    if sprint.start_date and sprint.due_date < sprint.start_date:
        db.rollback()
        raise HTTPException(422, "Due date can't be before the start date")
    db.commit()
    return sprint


# -- stories -----------------------------------------------------------------


@router.get("/projects/{project_id}/stories")
def list_stories(project_id: uuid.UUID, db: DB, user: User) -> list[schemas.StoryOut]:
    project = _get_project(db, user, project_id)
    stories = db.scalars(
        select(models.Story)
        .where(models.Story.project_id == project_id, models.Story.org_id == user.org_id)
        .order_by(models.Story.number)
    ).all()
    return [_story_out(s, project.key) for s in stories]


@router.post("/projects/{project_id}/stories", status_code=201)
def create_story(project_id: uuid.UUID, body: schemas.StoryCreate, db: DB, user: User) -> schemas.StoryOut:
    project = _get_project(db, user, project_id)
    data = body.model_dump()
    if body.parent_id is not None:
        parent = _get_story(db, user, body.parent_id)
        if parent.project_id != project_id:
            raise HTTPException(422, "A subtask must be in the same project as its parent")
        if parent.parent_id is not None:
            raise HTTPException(422, "Subtasks can't have their own subtasks")
        data["sprint_id"] = parent.sprint_id
    elif body.sprint_id is not None:
        _get_sprint(db, user, body.sprint_id, project_id)
    if body.assignee_id is not None:
        _check_assignee(db, user, body.assignee_id)
    # Lock the project row so concurrent creates can't pick the same number.
    db.execute(select(models.Project.id).where(models.Project.id == project_id).with_for_update())
    number = (db.scalar(select(func.max(models.Story.number)).where(models.Story.project_id == project_id)) or 0) + 1
    story = models.Story(
        org_id=user.org_id, project_id=project_id, number=number, reporter_id=user.id, **data
    )
    db.add(story)
    db.commit()
    return _story_out(story, project.key)


@router.patch("/stories/{story_id}")
def update_story(story_id: uuid.UUID, body: schemas.StoryUpdate, db: DB, user: User) -> schemas.StoryOut:
    story = _get_story(db, user, story_id)
    changes = body.model_dump(exclude_unset=True)
    if "sprint_id" in changes and story.parent_id is not None:
        raise HTTPException(422, "A subtask moves with its parent; move the parent instead")
    if changes.get("sprint_id") is not None:
        _get_sprint(db, user, changes["sprint_id"], story.project_id)
    for person in ("assignee_id", "reporter_id"):
        if changes.get(person) is not None:
            _check_assignee(db, user, changes[person])
    for field, value in changes.items():
        if value is None and field in ("title", "priority", "status", "description", "labels"):
            continue
        setattr(story, field, value)
    if "sprint_id" in changes:
        # Subtasks follow their parent between sprints and the backlog.
        db.execute(
            update(models.Story).where(models.Story.parent_id == story.id).values(sprint_id=story.sprint_id)
        )
    db.commit()
    project = _get_project(db, user, story.project_id)
    return _story_out(story, project.key)


@router.get("/stories/{story_id}")
def get_story(story_id: uuid.UUID, db: DB, user: User) -> schemas.StoryOut:
    story = _get_story(db, user, story_id)
    return _story_out(story, _get_project(db, user, story.project_id).key)


@router.delete("/stories/{story_id}", status_code=204)
def delete_story(story_id: uuid.UUID, db: DB, user: User) -> Response:
    db.delete(_get_story(db, user, story_id))
    db.commit()
    return Response(status_code=204)


# -- comments ----------------------------------------------------------------


@router.get("/stories/{story_id}/comments")
def list_comments(story_id: uuid.UUID, db: DB, user: User) -> list[schemas.CommentOut]:
    _get_story(db, user, story_id)
    return list(
        db.scalars(
            select(models.StoryComment)
            .where(models.StoryComment.story_id == story_id, models.StoryComment.org_id == user.org_id)
            .order_by(models.StoryComment.created_at)
        ).all()
    )


@router.post("/stories/{story_id}/comments", status_code=201)
def create_comment(story_id: uuid.UUID, body: schemas.CommentCreate, db: DB, user: User) -> schemas.CommentOut:
    _get_story(db, user, story_id)
    comment = models.StoryComment(org_id=user.org_id, story_id=story_id, author_id=user.id, body=body.body)
    db.add(comment)
    db.commit()
    return comment


# -- cross-project views (dashboard, My work) -------------------------------------


@router.get("/stories")
def list_org_stories(
    db: DB,
    user: User,
    assignee: str | None = None,
    order: Literal["updated", "created"] = "updated",
    limit: int = Query(default=50, ge=1, le=200),
) -> list[schemas.StoryOut]:
    """Stories across all projects. `assignee` is a user id or "me"."""
    query = (
        select(models.Story, models.Project.key)
        .join(models.Project, models.Project.id == models.Story.project_id)
        .where(models.Story.org_id == user.org_id)
    )
    if assignee == "me":
        query = query.where(models.Story.assignee_id == user.id)
    elif assignee:
        try:
            query = query.where(models.Story.assignee_id == uuid.UUID(assignee))
        except ValueError:
            raise HTTPException(422, "assignee must be a user id or 'me'") from None
    column = models.Story.updated_at if order == "updated" else models.Story.created_at
    rows = db.execute(query.order_by(column.desc()).limit(limit)).all()
    return [_story_out(story, key) for story, key in rows]


@router.get("/sprints")
def list_org_sprints(db: DB, user: User, status: schemas.SprintStatus | None = None) -> list[schemas.SprintOut]:
    query = select(models.Sprint).where(models.Sprint.org_id == user.org_id)
    if status:
        query = query.where(models.Sprint.status == status)
    return list(db.scalars(query.order_by(models.Sprint.due_date)).all())



# -- project resources (cloud inventory) ----------------------------------------


def _get_resource(db: Session, user: CurrentUser, resource_id: uuid.UUID) -> models.ProjectResource:
    resource = db.scalar(
        select(models.ProjectResource).where(
            models.ProjectResource.id == resource_id, models.ProjectResource.org_id == user.org_id
        )
    )
    if resource is None:
        raise HTTPException(404, "Resource not found")
    return resource


@router.get("/projects/{project_id}/resources")
def list_resources(project_id: uuid.UUID, db: DB, user: User) -> list[schemas.ResourceOut]:
    _get_project(db, user, project_id)
    return list(
        db.scalars(
            select(models.ProjectResource)
            .where(models.ProjectResource.project_id == project_id, models.ProjectResource.org_id == user.org_id)
            .order_by(models.ProjectResource.provider, func.lower(models.ProjectResource.name))
        ).all()
    )


@router.post("/projects/{project_id}/resources", status_code=201)
def create_resource(project_id: uuid.UUID, body: schemas.ResourceCreate, db: DB, user: User) -> schemas.ResourceOut:
    _get_project(db, user, project_id)
    if body.owner_id is not None:
        _check_assignee(db, user, body.owner_id)
    resource = models.ProjectResource(org_id=user.org_id, project_id=project_id, **body.model_dump())
    db.add(resource)
    db.commit()
    return resource


@router.patch("/resources/{resource_id}")
def update_resource(resource_id: uuid.UUID, body: schemas.ResourceUpdate, db: DB, user: User) -> schemas.ResourceOut:
    resource = _get_resource(db, user, resource_id)
    changes = body.model_dump(exclude_unset=True)
    if changes.get("owner_id") is not None:
        _check_assignee(db, user, changes["owner_id"])
    nullable = {"monthly_cost", "owner_id"}
    for field, value in changes.items():
        if value is None and field not in nullable:
            continue
        setattr(resource, field, value)
    db.commit()
    return resource


@router.delete("/resources/{resource_id}", status_code=204)
def delete_resource(resource_id: uuid.UUID, db: DB, user: User) -> Response:
    db.delete(_get_resource(db, user, resource_id))
    db.commit()
    return Response(status_code=204)
