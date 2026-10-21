# Yeet

Project management app. React (TypeScript, Vite) frontend, FastAPI backend, Postgres, all run with Docker Compose.

```
yeet/
├── backend/            FastAPI app (Python 3.12, uvicorn)
│   └── app/
│       ├── main.py     routes: /api/health, /api/me
│       ├── auth.py     get_current_user() placeholder (hard-coded test user)
│       ├── models.py   SQLAlchemy models; TenantMixin adds org_id
│       ├── db.py       engine, session, Base
│       └── config.py   settings from env vars
├── frontend/           React + TypeScript + Vite
├── docker-compose.yml  frontend + backend + Postgres
└── .env.example
```

## Run it

You need Docker Desktop running.

```bash
cp .env.example .env
docker compose up --build
```

Then open:

- App: http://localhost:5173
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

Both apps hot-reload: edit files in `backend/` or `frontend/` and the containers pick up the change. Stop with `Ctrl+C`, or `docker compose down` (add `-v` to also wipe the database).

If you add an npm package, rebuild the frontend so the container installs it: `docker compose up --build frontend`. Same for `backend/requirements.txt`.

## Database migrations

The schema is managed by Alembic. The backend container runs `alembic upgrade head` before starting, so new migrations apply on `docker compose up`.

After changing `backend/app/models.py`:

```bash
docker compose exec backend alembic revision --autogenerate -m "describe the change"
```

Review the generated file in `backend/migrations/versions/`, then restart the backend to apply it.

If your database was created before migrations existed (by the old `create_all`) and already matches the current models, mark it as up to date instead of re-creating the tables: `docker compose exec backend alembic stamp head`.

## Auth (deferred)

There's no login yet. Every request runs as a test user from `get_current_user()` in `backend/app/auth.py` (org "Test Org", role admin). Write routes against that dependency:

```python
@app.get("/api/projects")
def list_projects(user: Annotated[CurrentUser, Depends(get_current_user)], db: Annotated[Session, Depends(get_db)]):
    return db.scalars(select(Project).where(Project.org_id == user.org_id)).all()
```

When an auth provider is picked (see `research/auth-options.md` in the project), only `get_current_user()` changes: it will verify the bearer JWT against the provider's JWKS and read the user, org and role from the claims.

To try the app as someone else, send their user id in an `X-Dev-User` header (for example from the API docs or curl). You get their org role and project roles.

## Sign-in

Sign-in uses Stytch B2B (email magic links). Settings live in `.env` (copy `.env.example`):

- `AUTH_MODE=stytch`: the frontend shows Stytch's sign-in form; after the emailed link, people pick or create their workspace. Every API call carries the Stytch session (the `stytch_session_jwt` cookie, or `Authorization: Bearer …`), verified against Stytch's JWKS. People and workspaces are created on first sign-in, and someone an admin pre-added by email is linked to that record. Org roles come from Stytch roles (`stytch_admin`/`admin` = admin, `guest` = guest, otherwise member), so change org roles in Stytch.
  - Needs `STYTCH_PROJECT_ID` and `STYTCH_PUBLIC_TOKEN` (neither is secret). Never put the Stytch secret in this repo.
  - In the Stytch dashboard: authorize `http://localhost:5173` for the frontend SDK, and add `http://localhost:5173/authenticate` as a redirect URL.
- `AUTH_MODE=dev`: no login; you're the seeded admin and can **View as** anyone from the user menu. Anyone who can reach the API can act as anyone, so the backend refuses to start in this mode unless `APP_ENV=local`.

Docker only listens on `127.0.0.1`. After changing `.env`, run `docker compose up -d`. After adding npm packages, rebuild with `docker compose up -d --build -V` (the `-V` refreshes the container's `node_modules`).

## Roles

Each person has an org role in `users.org_role` and a role in each project they belong to, stored in `project_members`. The full plan is in `research/roles-and-permissions.md` in the project.

- **Org roles:** `admin` can do everything, including in private projects. `member` can read open projects and create projects. `guest` only sees projects they've been added to.
- **Project roles:** `scrum_master` runs sprints, members, resources and project settings. `contributor` creates and edits stories. `viewer` reads and comments.

In a route, check access with `_get_project(db, user, project_id, need)`. Here `need` is `"reader"` (the default), `"viewer"`, `"contributor"` or `"scrum_master"`. It returns 404 for projects the caller can't see and 403 when their role is too low. Use `_visible_project_ids(user)` to filter cross-project lists.

## Multi-tenancy

Every tenant-owned table should use `TenantMixin` (in `models.py`), which adds an indexed `org_id` foreign key to `organizations`. Always filter by `user.org_id`.

## Database

Tables are created on backend startup with `Base.metadata.create_all` for now. Add Alembic before the schema starts changing on real data.

Postgres is exposed on `localhost:5432` (user/password/db `yeet` by default) if you want to connect with a GUI client.
