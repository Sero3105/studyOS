"""optional exam date

Revision ID: 0004
Revises: 0003
"""
from alembic import op
import sqlalchemy as sa


revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('exams', schema=None) as batch_op:
        batch_op.alter_column('exam_date',
               existing_type=sa.DATE(),
               nullable=True)



def downgrade() -> None:
    with op.batch_alter_table('exams', schema=None) as batch_op:
        batch_op.alter_column('exam_date',
               existing_type=sa.DATE(),
               nullable=False)

