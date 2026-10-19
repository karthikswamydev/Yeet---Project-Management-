"""add project_resources (cloud inventory)

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-20
"""
import sqlalchemy as sa
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "project_resources",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("org_id", sa.Uuid(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("provider", sa.String(30), nullable=False),
        sa.Column("service", sa.String(60), nullable=False),
        sa.Column("environment", sa.String(20), nullable=False),
        sa.Column("region", sa.String(50), nullable=False),
        sa.Column("identifier", sa.String(300), nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("monthly_cost", sa.Numeric(10, 2), nullable=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_project_resources_org_id", "project_resources", ["org_id"])
    op.create_index("ix_project_resources_project_id", "project_resources", ["project_id"])


def downgrade() -> None:
    op.drop_table("project_resources")
