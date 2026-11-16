"""topic mastery: to do, studied, reviewed, confident

Revision ID: 0010
Revises: 0009
"""
from alembic import op
import sqlalchemy as sa


revision = '0010'
down_revision = '0009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('topics', schema=None) as batch_op:
        batch_op.add_column(sa.Column('mastery', sa.Integer(), nullable=False, server_default='0'))
    # Un argomento già completato è almeno "studiato".
    op.execute('UPDATE topics SET mastery = 1 WHERE completed = 1')


def downgrade() -> None:
    with op.batch_alter_table('topics', schema=None) as batch_op:
        batch_op.drop_column('mastery')
