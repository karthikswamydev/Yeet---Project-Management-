"""add parent_id to stories for subtasks

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-20
"""
import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("stories") as batch:
        batch.add_column(sa.Column("parent_id", sa.Uuid(), nullable=True))
        batch.create_foreign_key("fk_stories_parent_id_stories", "stories", ["parent_id"], ["id"], ondelete="CASCADE")
        batch.create_index("ix_stories_parent_id", ["parent_id"])


def downgrade() -> None:
    with op.batch_alter_table("stories") as batch:
        batch.drop_index("ix_stories_parent_id")
        batch.drop_constraint("fk_stories_parent_id_stories", type_="foreignkey")
        batch.drop_column("parent_id")
