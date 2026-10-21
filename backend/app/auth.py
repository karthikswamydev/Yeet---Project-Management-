"""Authentication.

Two modes, picked by the AUTH_MODE setting:

- "dev" (default): no login. Every request is the seeded test user (an org
  admin). To try the app as someone else, send their user id in the
  `X-Dev-User` header; you then get that person's org role and project roles.
- "stytch": every request must carry a Stytch B2B session JWT, either as
  `Authorization: Bearer <jwt>` or in the `stytch_session_jwt` cookie the
  Stytch frontend SDK sets. The token is verified against Stytch's JWKS. The
  Stytch organization maps to `organizations.auth_org_id` and the member to
  `users.auth_id`; both are created on first sign-in. The org role comes from
  the token's Stytch RBAC roles, so Stytch stays the source of truth.

Routes only depend on get_current_user(), so they don't care which mode is on.
"""

import uuid
from functools import lru_cache
from typing import Annotated, Any, Literal

from fastapi import Cookie, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.db import get_db

TEST_ORG_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
TEST_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")
TEST_USER_NAME = "Test User"
TEST_USER_EMAIL = "test.user@yeet.local"

OrgRole = Literal["admin", "member", "guest"]

ORG_CLAIM = "https://stytch.com/organization"
SESSION_CLAIM = "https://stytch.com/session"


class CurrentUser(BaseModel):
    id: uuid.UUID
    email: str | None
    name: str
    org_id: uuid.UUID
    role: OrgRole

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
    stytch_session_jwt: Annotated[str | None, Cookie()] = None,
    x_dev_user: Annotated[str | None, Header()] = None,
) -> CurrentUser:
    if settings.auth_mode == "stytch":
        token = authorization[7:].strip() if authorization and authorization.lower().startswith("bearer ") else None
        token = token or stytch_session_jwt
        if not token:
            raise HTTPException(401, "Sign in required")
        user = _user_from_claims(db, verify_stytch_jwt(token))
    else:
        user = _dev_user(db, x_dev_user)
    return CurrentUser(id=user.id, email=user.email, name=user.name, org_id=user.org_id, role=user.org_role)


def _dev_user(db: Session, x_dev_user: str | None) -> models.User:
    user_id = TEST_USER_ID
    if x_dev_user:
        try:
            user_id = uuid.UUID(x_dev_user)
        except ValueError:
            raise HTTPException(401, "X-Dev-User must be a user id") from None
    user = db.scalar(select(models.User).where(models.User.id == user_id, models.User.org_id == TEST_ORG_ID))
    if user is None:
        raise HTTPException(401, "Unknown user")
    return user


# -- Stytch ------------------------------------------------------------------


@lru_cache(maxsize=1)
def _jwks_client():
    # Imported lazily so dev mode doesn't need the crypto dependencies.
    import jwt

    host = "api.stytch.com" if settings.stytch_env == "live" else "test.stytch.com"
    url = f"https://{host}/v1/b2b/sessions/jwks/{settings.stytch_project_id}"
    # PyJWKClient caches keys and refetches when it sees an unknown key id (rotation).
    return jwt.PyJWKClient(url, cache_keys=True, lifespan=3600)


def verify_stytch_jwt(token: str) -> dict[str, Any]:
    import jwt

    if not settings.stytch_project_id:
        raise HTTPException(500, "Stytch isn't configured: set STYTCH_PROJECT_ID")
    try:
        key = _jwks_client().get_signing_key_from_jwt(token).key
        return jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=settings.stytch_project_id,
            issuer=f"stytch.com/{settings.stytch_project_id}",
            options={"require": ["exp", "sub", "iss", "aud"]},
            leeway=30,
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Your session expired; sign in again") from None
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(401, "Invalid session") from None


def org_role_from_claims(claims: dict[str, Any]) -> OrgRole:
    """Map Stytch RBAC roles to Yeet's org role. Define `admin` and `guest` roles in Stytch;
    Stytch's built-in `stytch_admin` also counts as admin. Everyone else is a member."""
    roles = set((claims.get(SESSION_CLAIM) or {}).get("roles") or [])
    if roles & {"admin", "stytch_admin"}:
        return "admin"
    if "guest" in roles:
        return "guest"
    return "member"


def _email_from_claims(claims: dict[str, Any]) -> str | None:
    for factor in (claims.get(SESSION_CLAIM) or {}).get("authentication_factors") or []:
        for key in ("email_factor", "google_oauth_factor", "microsoft_oauth_factor"):
            email = (factor.get(key) or {}).get("email_address")
            if email:
                return email.lower()
    return None


def _user_from_claims(db: Session, claims: dict[str, Any]) -> models.User:
    auth_org_id = (claims.get(ORG_CLAIM) or {}).get("organization_id")
    member_id = claims.get("sub")
    if not auth_org_id or not member_id:
        raise HTTPException(401, "Invalid session")
    role = org_role_from_claims(claims)

    org = db.scalar(select(models.Organization).where(models.Organization.auth_org_id == auth_org_id))
    if org is None:
        org_info = claims.get(ORG_CLAIM) or {}
        org = models.Organization(name=org_info.get("slug") or "Workspace", auth_org_id=auth_org_id)
        db.add(org)
        db.flush()

    user = db.scalar(select(models.User).where(models.User.auth_id == member_id))
    if user is not None and user.org_id != org.id:
        raise HTTPException(401, "Invalid session")
    if user is None:
        email = _email_from_claims(claims)
        # Link a person an admin already added by email, otherwise create them.
        user = email and db.scalar(
            select(models.User).where(
                models.User.org_id == org.id, models.User.email == email, models.User.auth_id.is_(None)
            )
        )
        if user:
            user.auth_id = member_id
        else:
            name = (email or "New user").split("@")[0].replace(".", " ").title()
            user = models.User(org_id=org.id, name=name, email=email, auth_id=member_id, org_role=role)
            db.add(user)
    if user.org_role != role:
        user.org_role = role
    if db.dirty or db.new:
        db.commit()
    return user
