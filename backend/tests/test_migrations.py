from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

import database


def test_pre_alembic_database_is_stamped_and_upgraded(tmp_path, monkeypatch):
    # Database con lo schema iniziale ma senza alembic_version, come quelli creati da create_all.
    legacy = create_engine(f"sqlite:///{tmp_path / 'legacy.db'}")
    monkeypatch.setattr(database, "engine", legacy)
    command.upgrade(Config(str(Path(database.__file__).with_name("alembic.ini"))), "0001")
    with legacy.begin() as conn:
        conn.execute(text("DROP TABLE alembic_version"))
        conn.execute(text("INSERT INTO users (username, email, password_hash) VALUES ('old', 'old@example.com', 'x')"))

    database.run_migrations()

    assert {"share_links", "calendar_feeds"} <= set(inspect(legacy).get_table_names())
    assert "notes" in {c["name"] for c in inspect(legacy).get_columns("topics")}
    with legacy.connect() as conn:
        assert conn.execute(text("SELECT version_num FROM alembic_version")).scalar() == "0004"
        assert conn.execute(text("SELECT count(*) FROM users")).scalar() == 1
