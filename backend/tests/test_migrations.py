from sqlalchemy import create_engine, inspect, text

import database


def test_pre_alembic_database_is_stamped_and_upgraded(tmp_path, monkeypatch):
    # Un database creato con create_all prima di Alembic e prima di share_links.
    legacy = create_engine(f"sqlite:///{tmp_path / 'legacy.db'}")
    tables = [t for name, t in database.Base.metadata.tables.items() if name != "share_links"]
    database.Base.metadata.create_all(legacy, tables=tables)
    with legacy.begin() as conn:
        conn.execute(text("INSERT INTO users (username, email, password_hash) VALUES ('old', 'old@example.com', 'x')"))

    monkeypatch.setattr(database, "engine", legacy)
    database.run_migrations()

    assert "share_links" in inspect(legacy).get_table_names()
    with legacy.connect() as conn:
        assert conn.execute(text("SELECT version_num FROM alembic_version")).scalar() == "0002"
        assert conn.execute(text("SELECT count(*) FROM users")).scalar() == 1
