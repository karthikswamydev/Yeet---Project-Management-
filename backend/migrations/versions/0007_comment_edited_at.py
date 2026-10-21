"""add edited_at to story_comments

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-21
"""
import sqlalchemy as sa
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("story_comments", sa.Column("edited_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("story_comments", "edited_at")
