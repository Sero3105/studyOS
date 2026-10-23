"""initial schema (as created by create_all before Alembic)

Revision ID: 0001
Revises: 
"""
from alembic import op
import sqlalchemy as sa


revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('full_name', sa.String(), nullable=True),
    sa.Column('username', sa.String(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('password_hash', sa.String(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email'),
    sa.UniqueConstraint('username')
    )
    op.create_table('auth_sessions',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('refresh_token_hash', sa.String(length=64), nullable=False),
    sa.Column('csrf_token_hash', sa.String(length=64), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('replaced_by_session_id', sa.String(length=36), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('auth_sessions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_auth_sessions_expires_at'), ['expires_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_auth_sessions_refresh_token_hash'), ['refresh_token_hash'], unique=True)
        batch_op.create_index(batch_op.f('ix_auth_sessions_user_id'), ['user_id'], unique=False)

    op.create_table('exams',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=120), nullable=False),
    sa.Column('subject', sa.String(length=120), nullable=False),
    sa.Column('exam_date', sa.Date(), nullable=False),
    sa.Column('exam_time', sa.Time(), nullable=True),
    sa.Column('location', sa.String(length=120), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('exams', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_exams_exam_date'), ['exam_date'], unique=False)
        batch_op.create_index(batch_op.f('ix_exams_user_id'), ['user_id'], unique=False)

    op.create_table('goals',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('kind', sa.String(length=30), nullable=False),
    sa.Column('target', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('goals', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_goals_user_id'), ['user_id'], unique=False)

    op.create_table('subjects',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('subjects', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_subjects_user_id'), ['user_id'], unique=False)

    op.create_table('topics',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('subject_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('completed', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('topics', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_topics_subject_id'), ['subject_id'], unique=False)

    op.create_table('study_sessions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('subject_id', sa.Integer(), nullable=True),
    sa.Column('topic_id', sa.Integer(), nullable=True),
    sa.Column('duration_minutes', sa.Integer(), nullable=False),
    sa.Column('studied_on', sa.Date(), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ),
    sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('study_sessions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_study_sessions_studied_on'), ['studied_on'], unique=False)
        batch_op.create_index(batch_op.f('ix_study_sessions_user_id'), ['user_id'], unique=False)

    op.create_table('tasks',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('due_date', sa.Date(), nullable=True),
    sa.Column('priority', sa.String(length=10), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('subject_id', sa.Integer(), nullable=True),
    sa.Column('topic_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ),
    sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_tasks_due_date'), ['due_date'], unique=False)
        batch_op.create_index(batch_op.f('ix_tasks_user_id'), ['user_id'], unique=False)



def downgrade() -> None:
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_tasks_user_id'))
        batch_op.drop_index(batch_op.f('ix_tasks_due_date'))

    op.drop_table('tasks')
    with op.batch_alter_table('study_sessions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_study_sessions_user_id'))
        batch_op.drop_index(batch_op.f('ix_study_sessions_studied_on'))

    op.drop_table('study_sessions')
    with op.batch_alter_table('topics', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_topics_subject_id'))

    op.drop_table('topics')
    with op.batch_alter_table('subjects', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_subjects_user_id'))

    op.drop_table('subjects')
    with op.batch_alter_table('goals', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_goals_user_id'))

    op.drop_table('goals')
    with op.batch_alter_table('exams', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_exams_user_id'))
        batch_op.drop_index(batch_op.f('ix_exams_exam_date'))

    op.drop_table('exams')
    with op.batch_alter_table('auth_sessions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_auth_sessions_user_id'))
        batch_op.drop_index(batch_op.f('ix_auth_sessions_refresh_token_hash'))
        batch_op.drop_index(batch_op.f('ix_auth_sessions_expires_at'))

    op.drop_table('auth_sessions')
    op.drop_table('users')
