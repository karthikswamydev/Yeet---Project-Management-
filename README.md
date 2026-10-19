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

## Multi-tenancy

Every tenant-owned table should use `TenantMixin` (in `models.py`), which adds an indexed `org_id` foreign key to `organizations`. Always filter by `user.org_id`.

## Database

Tables are created on backend startup with `Base.metadata.create_all` for now. Add Alembic before the schema starts changing on real data.

Postgres is exposed on `localhost:5432` (user/password/db `yeet` by default) if you want to connect with a GUI client.
