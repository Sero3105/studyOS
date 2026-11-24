"""topic completed means reviewed at least once (mastery >= 2)

Revision ID: 0011
Revises: 0010
"""
from alembic import op


revision = '0011'
down_revision = '0010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Studiato una volta sola = "da ripassare", non più completato. Lo stato (mastery) non cambia.
    op.execute('UPDATE topics SET completed = (mastery >= 2)')


def downgrade() -> None:
    op.execute('UPDATE topics SET completed = (mastery >= 1)')
