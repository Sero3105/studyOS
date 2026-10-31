"""subject colors, exam->subject link by id, recurring tasks, goals per subject with deadline

Revision ID: 0006
Revises: 0005
"""
from alembic import op
import sqlalchemy as sa


revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('subjects', schema=None) as batch_op:
        batch_op.add_column(sa.Column('color', sa.String(length=16), nullable=True))
    with op.batch_alter_table('exams', schema=None) as batch_op:
        batch_op.add_column(sa.Column('subject_id', sa.Integer(), nullable=True))
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('recurrence', sa.String(length=40), nullable=True))
    with op.batch_alter_table('goals', schema=None) as batch_op:
        batch_op.add_column(sa.Column('subject_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('deadline', sa.Date(), nullable=True))
    # Esami esistenti: collegati alla materia dello stesso utente con lo stesso nome (prima il link era solo per nome).
    op.execute(
        'UPDATE exams SET subject_id = (SELECT MIN(s.id) FROM subjects s '
        'WHERE s.user_id = exams.user_id AND lower(trim(s.name)) = lower(trim(exams.subject)))'
    )


def downgrade() -> None:
    with op.batch_alter_table('goals', schema=None) as batch_op:
        batch_op.drop_column('deadline')
        batch_op.drop_column('subject_id')
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.drop_column('recurrence')
    with op.batch_alter_table('exams', schema=None) as batch_op:
        batch_op.drop_column('subject_id')
    with op.batch_alter_table('subjects', schema=None) as batch_op:
        batch_op.drop_column('color')
