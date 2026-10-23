"""share links

Revision ID: 0002
Revises: 0001
"""
from alembic import op
import sqlalchemy as sa


revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Può già esistere se il database è stato avviato con create_all dopo l'aggiunta del modello.
    if sa.inspect(op.get_bind()).has_table('share_links'):
        return
    op.create_table('share_links',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('token_hash', sa.String(length=64), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('share_links', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_share_links_token_hash'), ['token_hash'], unique=True)
        batch_op.create_index(batch_op.f('ix_share_links_user_id'), ['user_id'], unique=True)


def downgrade() -> None:
    with op.batch_alter_table('share_links', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_share_links_user_id'))
        batch_op.drop_index(batch_op.f('ix_share_links_token_hash'))

    op.drop_table('share_links')
