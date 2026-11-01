"""session kind and focus, task time blocks, user preferences, mistakes notebook

Revision ID: 0008
Revises: 0007
"""
from alembic import op
import sqlalchemy as sa


revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('study_sessions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('kind', sa.String(length=20), nullable=False, server_default='study'))
        batch_op.add_column(sa.Column('focus', sa.Integer(), nullable=True))
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('scheduled_time', sa.Time(), nullable=True))
        batch_op.add_column(sa.Column('planned_minutes', sa.Integer(), nullable=True))
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('preferences', sa.JSON(), nullable=True))
    op.create_table(
        'mistakes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('topic_id', sa.Integer(), sa.ForeignKey('topics.id'), nullable=False, index=True),
        sa.Column('mistake', sa.Text(), nullable=False),
        sa.Column('correction', sa.Text(), nullable=False),
        sa.Column('source', sa.String(length=200), nullable=True),
        sa.Column('card_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('mistakes')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('preferences')
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.drop_column('planned_minutes')
        batch_op.drop_column('scheduled_time')
    with op.batch_alter_table('study_sessions', schema=None) as batch_op:
        batch_op.drop_column('focus')
        batch_op.drop_column('kind')
