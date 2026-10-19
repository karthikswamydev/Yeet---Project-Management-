"""add story reporter, updated_at and comments

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-19
"""
import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("stories") as batch:
        batch.add_column(sa.Column("reporter_id", sa.Uuid(), nullable=True))
        batch.add_column(
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
        )
        batch.create_foreign_key("fk_stories_reporter_id_users", "users", ["reporter_id"], ["id"], ondelete="SET NULL")

    op.create_table(
        "story_comments",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("org_id", sa.Uuid(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("story_id", sa.Uuid(), sa.ForeignKey("stories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_story_comments_org_id", "story_comments", ["org_id"])
    op.create_index("ix_story_comments_story_id", "story_comments", ["story_id"])


def downgrade() -> None:
    op.drop_table("story_comments")
    with op.batch_alter_table("stories") as batch:
        batch.drop_constraint("fk_stories_reporter_id_users", type_="foreignkey")
        batch.drop_column("updated_at")
        batch.drop_column("reporter_id")
