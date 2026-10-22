import re
import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import false, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import CurrentUser, get_current_user
from app.config import settings
from app.db import get_db

router = APIRouter(prefix="/api")

DB = Annotated[Session, Depends(get_db)]
User = Annotated[CurrentUser, Depends(get_current_user)]


# -- helpers -----------------------------------------------------------------


# What each project role can do builds on the one below it. "reader" isn't stored:
# it's what an org member gets on an open project they haven't joined.
ProjectAccess = Literal["reader", "viewer", "contributor", "scrum_master"]
RANK: dict[str, int] = {"reader": 0, "viewer": 1, "contributor": 2, "scrum_master": 3}
NEEDS = {
    "viewer": "You need to be a member of this project to do that",
    "contributor": "Viewers can't change work in this project",
    "scrum_master": "Only the project's scrum master can do that",
}


def _project_access(db: Session, user: CurrentUser, project: models.Project) -> ProjectAccess | None:
    """The caller's effective role in a project, or None if they can't see it at all."""
    if user.is_admin:
        return "scrum_master"
    role = db.scalar(
        select(models.ProjectMember.role).where(
            models.ProjectMember.project_id == project.id, models.ProjectMember.user_id == user.id
        )
    )
    if role is not None:
        return role
    if project.visibility == "open" and user.role != "guest":
        return "reader"
    return None


def _get_project(
    db: Session,
    user: CurrentUser,
    project_id: uuid.UUID,
    need: ProjectAccess = "reader",
    allow_archived: bool = False,
) -> models.Project:
    project = db.scalar(
        select(models.Project).where(models.Project.id == project_id, models.Project.org_id == user.org_id)
    )
    access = None if project is None else _project_access(db, user, project)
    # 404, not 403, so private projects don't reveal that they exist.
    if access is None:
        raise HTTPException(404, "Project not found")
    if RANK[access] < RANK[need]:
        raise HTTPException(403, NEEDS[need])
    if project.archived_at is not None and need != "reader" and not allow_archived:
        raise HTTPException(409, "This project is archived; unarchive it to make changes")
    return project


def _visible_project_ids(user: CurrentUser):
    """Subquery of the project ids the caller can see."""
    query = select(models.Project.id).where(models.Project.org_id == user.org_id)
    if user.is_admin:
        return query
    joined = select(models.ProjectMember.project_id).where(models.ProjectMember.user_id == user.id)
    is_open = models.Project.visibility == "open" if user.role != "guest" else false()
    return query.where(or_(is_open, models.Project.id.in_(joined)))


def _require_admin(user: CurrentUser) -> None:
    if not user.is_admin:
        raise HTTPException(403, "Only org admins can do that")


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


def _project_out(db: Session, project: models.Project, access: ProjectAccess | None) -> schemas.ProjectOut:
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
        visibility=project.visibility,
        archived_at=project.archived_at,
        my_role=None if access in (None, "reader") else access,
        story_count=story_count,
        done_count=done_count,
        sprint_count=sprint_count or 0,
    )


# -- users -------------------------------------------------------------------


@router.get("/auth/config")
def auth_config() -> dict[str, str]:
    """Public: tells the frontend whether to show the dev user switcher or a sign-in screen."""
    return {"mode": settings.auth_mode}


def _me_out(db: Session, user: CurrentUser) -> schemas.MeOut:
    rows = db.execute(
        select(models.ProjectMember.project_id, models.ProjectMember.role).where(
            models.ProjectMember.user_id == user.id
        )
    ).all()
    org_name = db.scalar(select(models.Organization.name).where(models.Organization.id == user.org_id)) or "Workspace"
    created_at = db.scalar(select(models.User.created_at).where(models.User.id == user.id))
    return schemas.MeOut(
        **user.model_dump(),
        org_name=org_name,
        created_at=created_at,
        project_roles={pid: role for pid, role in rows},
    )


@router.get("/me")
def me(db: DB, user: User) -> schemas.MeOut:
    return _me_out(db, user)


@router.patch("/me")
def update_me(body: schemas.MeUpdate, db: DB, user: User) -> schemas.MeOut:
    """Your own display name. Email and org role come from sign-in, so they aren't editable here."""
    record = db.get(models.User, user.id)
    record.name = body.name
    db.commit()
    return _me_out(db, user.model_copy(update={"name": body.name}))


@router.get("/users")
def list_users(db: DB, user: User) -> list[schemas.UserOut]:
    query = select(models.User).where(models.User.org_id == user.org_id)
    if user.role == "guest":
        # Guests only see the people they share a project with.
        mine = select(models.ProjectMember.project_id).where(models.ProjectMember.user_id == user.id)
        shared = select(models.ProjectMember.user_id).where(models.ProjectMember.project_id.in_(mine))
        query = query.where(models.User.id.in_(shared))
    return list(db.scalars(query.order_by(func.lower(models.User.name))).all())


@router.post("/users", status_code=201)
def create_user(body: schemas.UserCreate, db: DB, user: User) -> schemas.UserOut:
    _require_admin(user)
    member = models.User(org_id=user.org_id, name=body.name, email=body.email, org_role=body.org_role)
    db.add(member)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, f"Someone with email {body.email} is already a member") from None
    return member


@router.patch("/users/{user_id}/role")
def update_user_role(user_id: uuid.UUID, body: schemas.UserRoleUpdate, db: DB, user: User) -> schemas.UserOut:
    _require_admin(user)
    member = db.scalar(select(models.User).where(models.User.id == user_id, models.User.org_id == user.org_id))
    if member is None:
        raise HTTPException(404, "User not found")
    if member.org_role == "admin" and body.org_role != "admin":
        admins = db.scalar(
            select(func.count(models.User.id)).where(
                models.User.org_id == user.org_id, models.User.org_role == "admin"
            )
        )
        if admins <= 1:
            raise HTTPException(422, "The org needs at least one admin")
    member.org_role = body.org_role
    db.commit()
    return member


# -- projects ----------------------------------------------------------------


@router.get("/projects")
def list_projects(db: DB, user: User) -> list[schemas.ProjectOut]:
    projects = db.scalars(
        select(models.Project)
        .where(models.Project.id.in_(_visible_project_ids(user)))
        .order_by(models.Project.created_at)
    ).all()
    return [_project_out(db, p, _project_access(db, user, p)) for p in projects]


@router.post("/projects", status_code=201)
def create_project(body: schemas.ProjectCreate, db: DB, user: User) -> schemas.ProjectOut:
    if user.role == "guest":
        raise HTTPException(403, "Guests can't create projects")
    key = body.key or _derive_key(body.name)
    project = models.Project(
        org_id=user.org_id,
        name=body.name.strip(),
        key=key,
        description=body.description,
        color=body.color,
        visibility=body.visibility,
    )
    db.add(project)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, f"A project with key {key} already exists") from None
    # Whoever creates a project runs it.
    db.add(models.ProjectMember(org_id=user.org_id, project_id=project.id, user_id=user.id, role="scrum_master"))
    db.commit()
    return _project_out(db, project, "scrum_master")


@router.get("/projects/{project_id}")
def get_project(project_id: uuid.UUID, db: DB, user: User) -> schemas.ProjectOut:
    project = _get_project(db, user, project_id)
    return _project_out(db, project, _project_access(db, user, project))


@router.patch("/projects/{project_id}")
def update_project(project_id: uuid.UUID, body: schemas.ProjectUpdate, db: DB, user: User) -> schemas.ProjectOut:
    project = _get_project(db, user, project_id, "scrum_master", allow_archived=True)
    changes = body.model_dump(exclude_unset=True)
    if "archived" in changes:
        archived = changes.pop("archived")
        if archived is not None:
            project.archived_at = (project.archived_at or func.now()) if archived else None
    for field, value in changes.items():
        if value is not None:
            setattr(project, field, value.strip() if field == "name" else value)
    db.commit()
    db.refresh(project)
    return _project_out(db, project, _project_access(db, user, project))


# -- project members ---------------------------------------------------------


def _get_member(db: Session, project_id: uuid.UUID, user_id: uuid.UUID) -> models.ProjectMember:
    member = db.scalar(
        select(models.ProjectMember).where(
            models.ProjectMember.project_id == project_id, models.ProjectMember.user_id == user_id
        )
    )
    if member is None:
        raise HTTPException(404, "That person isn't a member of this project")
    return member


def _keep_a_scrum_master(db: Session, member: models.ProjectMember) -> None:
    """Refuse to demote or remove a project's only scrum master."""
    if member.role != "scrum_master":
        return
    count = db.scalar(
        select(func.count(models.ProjectMember.id)).where(
            models.ProjectMember.project_id == member.project_id, models.ProjectMember.role == "scrum_master"
        )
    )
    if count <= 1:
        raise HTTPException(422, "A project needs at least one scrum master; make someone else one first")


@router.get("/projects/{project_id}/members")
def list_members(project_id: uuid.UUID, db: DB, user: User) -> list[schemas.MemberOut]:
    _get_project(db, user, project_id)
    return list(
        db.scalars(
            select(models.ProjectMember)
            .where(models.ProjectMember.project_id == project_id)
            .order_by(models.ProjectMember.created_at)
        ).all()
    )


@router.post("/projects/{project_id}/members", status_code=201)
def add_member(project_id: uuid.UUID, body: schemas.MemberCreate, db: DB, user: User) -> schemas.MemberOut:
    _get_project(db, user, project_id, "scrum_master", allow_archived=True)
    _check_assignee(db, user, body.user_id)
    member = models.ProjectMember(org_id=user.org_id, project_id=project_id, user_id=body.user_id, role=body.role)
    db.add(member)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "That person is already a member of this project") from None
    return member


@router.patch("/projects/{project_id}/members/{user_id}")
def update_member(
    project_id: uuid.UUID, user_id: uuid.UUID, body: schemas.MemberUpdate, db: DB, user: User
) -> schemas.MemberOut:
    _get_project(db, user, project_id, "scrum_master", allow_archived=True)
    member = _get_member(db, project_id, user_id)
    if body.role != "scrum_master":
        _keep_a_scrum_master(db, member)
    member.role = body.role
    db.commit()
    return member


@router.delete("/projects/{project_id}/members/{user_id}", status_code=204)
def remove_member(project_id: uuid.UUID, user_id: uuid.UUID, db: DB, user: User) -> Response:
    _get_project(db, user, project_id, "scrum_master", allow_archived=True)
    member = _get_member(db, project_id, user_id)
    _keep_a_scrum_master(db, member)
    db.delete(member)
    db.commit()
    return Response(status_code=204)


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
    _get_project(db, user, project_id, "scrum_master")
    if body.start_date and body.due_date < body.start_date:
        raise HTTPException(422, "Due date can't be before the start date")
    sprint = models.Sprint(org_id=user.org_id, project_id=project_id, **body.model_dump())
    db.add(sprint)
    db.commit()
    return sprint


@router.patch("/sprints/{sprint_id}")
def update_sprint(sprint_id: uuid.UUID, body: schemas.SprintUpdate, db: DB, user: User) -> schemas.SprintOut:
    sprint = _get_sprint(db, user, sprint_id)
    _get_project(db, user, sprint.project_id, "scrum_master")
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
    project = _get_project(db, user, project_id, "contributor")
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
    project = _get_project(db, user, story.project_id, "contributor")
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
    return _story_out(story, project.key)


@router.get("/stories/{story_id}")
def get_story(story_id: uuid.UUID, db: DB, user: User) -> schemas.StoryOut:
    story = _get_story(db, user, story_id)
    return _story_out(story, _get_project(db, user, story.project_id).key)


@router.delete("/stories/{story_id}", status_code=204)
def delete_story(story_id: uuid.UUID, db: DB, user: User) -> Response:
    story = _get_story(db, user, story_id)
    # Contributors can delete stories they reported; anything else needs the scrum master.
    need = "contributor" if story.reporter_id == user.id else "scrum_master"
    _get_project(db, user, story.project_id, need)
    db.delete(story)
    db.commit()
    return Response(status_code=204)


# -- comments ----------------------------------------------------------------


@router.get("/stories/{story_id}/comments")
def list_comments(story_id: uuid.UUID, db: DB, user: User) -> list[schemas.CommentOut]:
    _get_project(db, user, _get_story(db, user, story_id).project_id)
    return list(
        db.scalars(
            select(models.StoryComment)
            .where(models.StoryComment.story_id == story_id, models.StoryComment.org_id == user.org_id)
            .order_by(models.StoryComment.created_at)
        ).all()
    )


@router.post("/stories/{story_id}/comments", status_code=201)
def create_comment(story_id: uuid.UUID, body: schemas.CommentCreate, db: DB, user: User) -> schemas.CommentOut:
    _get_project(db, user, _get_story(db, user, story_id).project_id, "viewer")
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
        .where(models.Story.org_id == user.org_id, models.Story.project_id.in_(_visible_project_ids(user)))
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
    query = select(models.Sprint).where(
        models.Sprint.org_id == user.org_id, models.Sprint.project_id.in_(_visible_project_ids(user))
    )
    if status:
        query = query.where(models.Sprint.status == status)
    return list(db.scalars(query.order_by(models.Sprint.due_date)).all())




def _get_comment(
    db: Session, user: CurrentUser, comment_id: uuid.UUID
) -> tuple[models.StoryComment, ProjectAccess]:
    """The comment and the caller's role in its project."""
    row = db.execute(
        select(models.StoryComment, models.Story.project_id)
        .join(models.Story, models.Story.id == models.StoryComment.story_id)
        .where(models.StoryComment.id == comment_id, models.StoryComment.org_id == user.org_id)
    ).first()
    project = None if row is None else db.get(models.Project, row[1])
    access = None if project is None else _project_access(db, user, project)
    if access is None:
        raise HTTPException(404, "Comment not found")
    return row[0], access


@router.patch("/comments/{comment_id}")
def update_comment(comment_id: uuid.UUID, body: schemas.CommentCreate, db: DB, user: User) -> schemas.CommentOut:
    comment, _ = _get_comment(db, user, comment_id)
    if comment.author_id != user.id:
        raise HTTPException(403, "You can only edit your own comments")
    if body.body != comment.body:
        comment.body = body.body
        comment.edited_at = func.now()
    db.commit()
    return comment


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(comment_id: uuid.UUID, db: DB, user: User) -> Response:
    comment, access = _get_comment(db, user, comment_id)
    if comment.author_id != user.id and access != "scrum_master":
        raise HTTPException(403, "You can only delete your own comments")
    db.delete(comment)
    db.commit()
    return Response(status_code=204)

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
    # Costs and infrastructure details: contributors and up, not viewers.
    _get_project(db, user, project_id, "contributor")
    return list(
        db.scalars(
            select(models.ProjectResource)
            .where(models.ProjectResource.project_id == project_id, models.ProjectResource.org_id == user.org_id)
            .order_by(models.ProjectResource.provider, func.lower(models.ProjectResource.name))
        ).all()
    )


@router.post("/projects/{project_id}/resources", status_code=201)
def create_resource(project_id: uuid.UUID, body: schemas.ResourceCreate, db: DB, user: User) -> schemas.ResourceOut:
    _get_project(db, user, project_id, "scrum_master")
    if body.owner_id is not None:
        _check_assignee(db, user, body.owner_id)
    resource = models.ProjectResource(org_id=user.org_id, project_id=project_id, **body.model_dump())
    db.add(resource)
    db.commit()
    return resource


@router.patch("/resources/{resource_id}")
def update_resource(resource_id: uuid.UUID, body: schemas.ResourceUpdate, db: DB, user: User) -> schemas.ResourceOut:
    resource = _get_resource(db, user, resource_id)
    _get_project(db, user, resource.project_id, "scrum_master")
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
    resource = _get_resource(db, user, resource_id)
    _get_project(db, user, resource.project_id, "scrum_master")
    db.delete(resource)
    db.commit()
    return Response(status_code=204)
