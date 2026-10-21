from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app import models
from app.auth import TEST_ORG_ID, TEST_USER_EMAIL, TEST_USER_ID, TEST_USER_NAME
from app.config import settings
from app.db import SessionLocal, get_db
from app.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.auth_mode == "dev" and settings.app_env != "local":
        raise RuntimeError(
            "AUTH_MODE=dev has no login (anyone can act as anyone). It only runs with APP_ENV=local. "
            "Set AUTH_MODE=stytch for any shared or deployed environment."
        )
    if settings.auth_mode != "dev":
        yield
        return
    # The schema is managed by Alembic (`alembic upgrade head`, run before the
    # server starts). Dev mode needs the test org and user to exist.
    with SessionLocal() as db:
        if db.scalar(select(models.Organization).where(models.Organization.id == TEST_ORG_ID)) is None:
            db.add(models.Organization(id=TEST_ORG_ID, name="Test Org"))
            db.commit()
        if db.get(models.User, TEST_USER_ID) is None:
            db.add(
                models.User(
                    id=TEST_USER_ID, org_id=TEST_ORG_ID, name=TEST_USER_NAME, email=TEST_USER_EMAIL, org_role="admin"
                )
            )
            db.commit()
    yield


app = FastAPI(title="Yeet API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(router)


@app.get("/api/health")
def health(db: Annotated[Session, Depends(get_db)]) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
        database = "ok"
    except Exception:
        database = "unavailable"
    return {"status": "ok", "database": database}

