"""study sittings: goal, checklist, distractions and resume note; partial blocks and interruptions

Revision ID: 0009
Revises: 0008
"""
from alembic import op
import sqlalchemy as sa


revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('study_sessions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('sitting_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('partial', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column('interruptions', sa.Integer(), nullable=True))
        batch_op.create_index('ix_study_sessions_sitting_id', ['sitting_id'])
    op.create_table(
        'study_sittings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('uid', sa.String(length=36), nullable=False),
        sa.Column('subject_id', sa.Integer(), sa.ForeignKey('subjects.id'), nullable=True),
        sa.Column('topic_id', sa.Integer(), sa.ForeignKey('topics.id'), nullable=True),
        sa.Column('started_on', sa.Date(), nullable=False),
        sa.Column('goal', sa.Text(), nullable=True),
        sa.Column('checklist', sa.JSON(), nullable=False),
        sa.Column('distractions', sa.JSON(), nullable=False),
        sa.Column('resume_note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('user_id', 'uid'),
    )


def downgrade() -> None:
    op.drop_table('study_sittings')
    with op.batch_alter_table('study_sessions', schema=None) as batch_op:
        batch_op.drop_index('ix_study_sessions_sitting_id')
        batch_op.drop_column('interruptions')
        batch_op.drop_column('partial')
        batch_op.drop_column('sitting_id')
