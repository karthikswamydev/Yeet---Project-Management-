from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app import models
from app.auth import TEST_ORG_ID, CurrentUser, get_current_user
from app.config import settings
from app.db import SessionLocal, get_db
from app.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # The schema is managed by Alembic (`alembic upgrade head`, run before the
    # server starts). Here we only make sure the test org and user exist.
    with SessionLocal() as db:
        if db.scalar(select(models.Organization).where(models.Organization.id == TEST_ORG_ID)) is None:
            db.add(models.Organization(id=TEST_ORG_ID, name="Test Org"))
            db.commit()
        test_user = get_current_user()
        if db.get(models.User, test_user.id) is None:
            db.add(models.User(id=test_user.id, org_id=test_user.org_id, name=test_user.name, email=test_user.email))
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


@app.get("/api/me")
def me(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
    return user
