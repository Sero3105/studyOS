"""days off of the study plan belong to each exam

Revision ID: 0012
Revises: 0011
"""
import json
from alembic import op
import sqlalchemy as sa


revision = '0012'
down_revision = '0011'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('exams', schema=None) as batch_op:
        batch_op.add_column(sa.Column('plan_days_off', sa.JSON(), nullable=False, server_default='[]'))
    # Prima i giorni liberi erano una preferenza unica per tutti gli esami: ogni esame riceve quelli che cadono
    # prima del suo appello (gli altri non lo riguardavano comunque).
    conn = op.get_bind()
    for user_id, preferences in conn.execute(sa.text('SELECT id, preferences FROM users WHERE preferences IS NOT NULL')).fetchall():
        prefs = preferences if isinstance(preferences, dict) else json.loads(preferences or '{}')
        days = sorted({d for d in prefs.get('planDaysOff') or [] if isinstance(d, str)})
        if not days: continue
        exams = conn.execute(sa.text("SELECT id, exam_date FROM exams WHERE user_id = :u AND exam_date IS NOT NULL AND status IN ('planned', 'in_progress')"), {'u': user_id}).fetchall()
        for exam_id, exam_date in exams:
            mine = [d for d in days if d < str(exam_date)]
            if mine: conn.execute(sa.text('UPDATE exams SET plan_days_off = :d WHERE id = :e'), {'d': json.dumps(mine), 'e': exam_id})


def downgrade() -> None:
    with op.batch_alter_table('exams', schema=None) as batch_op:
        batch_op.drop_column('plan_days_off')
