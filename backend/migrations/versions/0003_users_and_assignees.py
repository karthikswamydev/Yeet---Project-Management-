"""add users and story assignees

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-19
"""
import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("org_id", sa.Uuid(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(320), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("org_id", "email", name="uq_user_org_email"),
    )
    op.create_index("ix_users_org_id", "users", ["org_id"])

    with op.batch_alter_table("stories") as batch:
        batch.add_column(sa.Column("assignee_id", sa.Uuid(), nullable=True))
        batch.create_foreign_key("fk_stories_assignee_id_users", "users", ["assignee_id"], ["id"], ondelete="SET NULL")
        batch.create_index("ix_stories_assignee_id", ["assignee_id"])


def downgrade() -> None:
    with op.batch_alter_table("stories") as batch:
        batch.drop_index("ix_stories_assignee_id")
        batch.drop_constraint("fk_stories_assignee_id_users", type_="foreignkey")
        batch.drop_column("assignee_id")
    op.drop_index("ix_users_org_id", table_name="users")
    op.drop_table("users")
