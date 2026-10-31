"""fix orphan subject/topic links and lowercase emails

Revision ID: 0005
Revises: 0004
"""
from alembic import op


revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Materie/argomenti eliminati prima del fix lasciavano id orfani su task e sessioni.
    for table in ('tasks', 'study_sessions'):
        op.execute(f'UPDATE {table} SET subject_id = NULL WHERE subject_id IS NOT NULL AND subject_id NOT IN (SELECT id FROM subjects)')
        op.execute(f'UPDATE {table} SET topic_id = NULL WHERE topic_id IS NOT NULL AND topic_id NOT IN (SELECT id FROM topics)')
    # Login e registrazione ora usano email minuscole. Se due account differiscono solo
    # per le maiuscole si lasciano com'erano: abbassarli violerebbe il vincolo unique.
    op.execute(
        'UPDATE users SET email = lower(email) WHERE email != lower(email) '
        'AND NOT EXISTS (SELECT 1 FROM users other WHERE other.id != users.id AND lower(other.email) = lower(users.email))'
    )


def downgrade() -> None:
    # Solo pulizia dati: niente da ripristinare.
    pass
