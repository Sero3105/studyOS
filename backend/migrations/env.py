"""Alembic environment: usa lo stesso engine e gli stessi modelli dell'app."""
from alembic import context

from database import Base, engine

with engine.connect() as connection:
    # render_as_batch: SQLite non supporta quasi nessun ALTER TABLE, Alembic ricrea la tabella.
    context.configure(connection=connection, target_metadata=Base.metadata, render_as_batch=True)
    with context.begin_transaction():
        context.run_migrations()
    connection.commit()
