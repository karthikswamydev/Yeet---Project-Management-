"""add auth_org_id to organizations (Stytch organization id)

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-21
"""
import sqlalchemy as sa
from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("auth_org_id", sa.String(200), nullable=True))
    op.create_unique_constraint("uq_organizations_auth_org_id", "organizations", ["auth_org_id"])


def downgrade() -> None:
    op.drop_constraint("uq_organizations_auth_org_id", "organizations", type_="unique")
    op.drop_column("organizations", "auth_org_id")
