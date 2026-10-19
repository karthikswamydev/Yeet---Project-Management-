"""Authentication placeholder.

Real auth is deferred. Until a provider is chosen, every request is treated
as this hard-coded test user. When auth lands, replace get_current_user()
with JWT verification (fetch the provider's JWKS, verify the bearer token,
read user id, org id and role from its claims). Routes that already depend
on get_current_user won't need to change.
"""

import uuid

from pydantic import BaseModel

TEST_ORG_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
TEST_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")


class CurrentUser(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    org_id: uuid.UUID
    role: str


def get_current_user() -> CurrentUser:
    return CurrentUser(
        id=TEST_USER_ID,
        email="test.user@yeet.local",
        name="Test User",
        org_id=TEST_ORG_ID,
        role="admin",
    )
