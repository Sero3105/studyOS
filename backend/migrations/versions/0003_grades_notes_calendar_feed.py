"""grades notes calendar feed

Revision ID: 0003
Revises: 0002
"""
from alembic import op
import sqlalchemy as sa


revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('calendar_feeds',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('token_hash', sa.String(length=64), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('calendar_feeds', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_calendar_feeds_token_hash'), ['token_hash'], unique=True)
        batch_op.create_index(batch_op.f('ix_calendar_feeds_user_id'), ['user_id'], unique=True)

    with op.batch_alter_table('exams', schema=None) as batch_op:
        batch_op.add_column(sa.Column('cfu', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('grade', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('honors', sa.Boolean(), server_default=sa.text('0'), nullable=False))

    with op.batch_alter_table('topics', schema=None) as batch_op:
        batch_op.add_column(sa.Column('notes', sa.Text(), nullable=True))



def downgrade() -> None:
    with op.batch_alter_table('topics', schema=None) as batch_op:
        batch_op.drop_column('notes')

    with op.batch_alter_table('exams', schema=None) as batch_op:
        batch_op.drop_column('honors')
        batch_op.drop_column('grade')
        batch_op.drop_column('cfu')

    with op.batch_alter_table('calendar_feeds', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_calendar_feeds_user_id'))
        batch_op.drop_index(batch_op.f('ix_calendar_feeds_token_hash'))

    op.drop_table('calendar_feeds')
