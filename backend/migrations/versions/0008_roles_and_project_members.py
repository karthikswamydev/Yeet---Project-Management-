"""add org roles, project visibility and project_members

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-21
"""
import sqlalchemy as sa
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None

TEST_USER_ID = "00000000-0000-0000-0000-000000000002"


def upgrade() -> None:
    op.add_column("users", sa.Column("org_role", sa.String(20), server_default="member", nullable=False))
    op.add_column("users", sa.Column("auth_id", sa.String(200), nullable=True))
    op.create_unique_constraint("uq_users_auth_id", "users", ["auth_id"])
    op.add_column("projects", sa.Column("visibility", sa.String(10), server_default="open", nullable=False))
    op.add_column("projects", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        "project_members",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("org_id", sa.Uuid(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("project_id", "user_id", name="uq_project_member"),
    )
    op.create_index("ix_project_members_org_id", "project_members", ["org_id"])
    op.create_index("ix_project_members_project_id", "project_members", ["project_id"])
    op.create_index("ix_project_members_user_id", "project_members", ["user_id"])

    # Existing data: the test user (who created everything so far) is the org admin and
    # scrum master of every project; anyone assigned or reporting work joins as a contributor.
    op.execute(f"UPDATE users SET org_role = 'admin' WHERE id = '{TEST_USER_ID}'")
    op.execute(
        f"""
        INSERT INTO project_members (id, org_id, project_id, user_id, role)
        SELECT gen_random_uuid(), p.org_id, p.id, u.id, 'scrum_master'
        FROM projects p JOIN users u ON u.id = '{TEST_USER_ID}' AND u.org_id = p.org_id
        """
    )
    op.execute(
        """
        INSERT INTO project_members (id, org_id, project_id, user_id, role)
        SELECT gen_random_uuid(), s.org_id, s.project_id, s.user_id, 'contributor'
        FROM (
            SELECT org_id, project_id, assignee_id AS user_id FROM stories WHERE assignee_id IS NOT NULL
            UNION
            SELECT org_id, project_id, reporter_id FROM stories WHERE reporter_id IS NOT NULL
        ) s
        ON CONFLICT (project_id, user_id) DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_table("project_members")
    op.drop_column("projects", "archived_at")
    op.drop_column("projects", "visibility")
    op.drop_constraint("uq_users_auth_id", "users", type_="unique")
    op.drop_column("users", "auth_id")
    op.drop_column("users", "org_role")
