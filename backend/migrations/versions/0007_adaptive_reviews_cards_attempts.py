"""adaptive reviews, topic difficulty, flashcards, exam attempts

Revision ID: 0007
Revises: 0006
"""
from alembic import op
import sqlalchemy as sa


revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('review_interval', sa.Integer(), nullable=True))
    with op.batch_alter_table('topics', schema=None) as batch_op:
        batch_op.add_column(sa.Column('difficulty', sa.Integer(), nullable=False, server_default='2'))
    op.create_table(
        'cards',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('topic_id', sa.Integer(), sa.ForeignKey('topics.id'), nullable=False, index=True),
        sa.Column('front', sa.Text(), nullable=False),
        sa.Column('back', sa.Text(), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('interval', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        'exam_attempts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('exam_id', sa.Integer(), sa.ForeignKey('exams.id'), nullable=False, index=True),
        sa.Column('exam_date', sa.Date(), nullable=False),
        sa.Column('outcome', sa.String(length=20), nullable=False),
        sa.Column('grade', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('exam_attempts')
    op.drop_table('cards')
    with op.batch_alter_table('topics', schema=None) as batch_op:
        batch_op.drop_column('difficulty')
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.drop_column('review_interval')
