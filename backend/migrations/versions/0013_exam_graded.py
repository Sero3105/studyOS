"""exams can be without a grade (language test, internship, final exam)

Revision ID: 0013
Revises: 0012
"""
from alembic import op
import sqlalchemy as sa


revision = '0013'
down_revision = '0012'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('exams', schema=None) as batch_op:
        batch_op.add_column(sa.Column('graded', sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    with op.batch_alter_table('exams', schema=None) as batch_op:
        batch_op.drop_column('graded')
