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
        conn.execute(text("INSERT INTO users (username, email, password_hash) VALUES ('old', 'Old@Example.com', 'x')"))
        # Task collegato a una materia eliminata prima del fix (id orfano).
        conn.execute(text("INSERT INTO tasks (user_id, title, priority, status, subject_id, created_at, updated_at) "
                          "VALUES (1, 't', 'medium', 'todo', 999, '2026-01-01', '2026-01-01')"))
        # Esame collegato alla materia solo per nome: la 0006 lo collega per id.
        conn.execute(text("INSERT INTO subjects (user_id, name, created_at) VALUES (1, 'Fisica', '2026-01-01')"))
        conn.execute(text("INSERT INTO exams (user_id, title, subject, exam_date, status, created_at, updated_at) "
                          "VALUES (1, 'Scritto', ' fisica', '2026-06-01', 'planned', '2026-01-01', '2026-01-01')"))

    database.run_migrations()

    assert {"share_links", "calendar_feeds", "cards", "exam_attempts", "mistakes", "study_sittings"} <= set(inspect(legacy).get_table_names())
    assert "notes" in {c["name"] for c in inspect(legacy).get_columns("topics")}
    with legacy.connect() as conn:
        assert conn.execute(text("SELECT version_num FROM alembic_version")).scalar() == "0013"
        assert conn.execute(text("SELECT graded FROM exams")).scalar() == 1  # 0013: gli esami esistenti hanno un voto
        assert conn.execute(text("SELECT count(*) FROM users")).scalar() == 1
        assert conn.execute(text("SELECT email FROM users")).scalar() == "old@example.com"
        assert conn.execute(text("SELECT subject_id FROM tasks")).scalar() is None
        assert conn.execute(text("SELECT subject_id FROM exams")).scalar() == 1


def test_days_off_move_to_the_exams_they_concern(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{tmp_path / 'days.db'}")
    monkeypatch.setattr(database, "engine", engine)
    cfg = Config(str(Path(database.__file__).with_name("alembic.ini")))
    command.upgrade(cfg, "0011")
    with engine.begin() as conn:
        conn.execute(text("INSERT INTO users (username, email, password_hash, preferences) VALUES ('u', 'u@example.com', 'x', :p)"),
                     {"p": '{"planDaysOff": ["2026-12-24", "2027-01-02"]}'})
        for title, day in (("Prima", "2026-12-17"), ("Dopo", "2027-01-12")):
            conn.execute(text("INSERT INTO exams (user_id, title, subject, exam_date, status, created_at, updated_at) "
                              "VALUES (1, :t, :t, :d, 'planned', '2026-01-01', '2026-01-01')"), {"t": title, "d": day})
    command.upgrade(cfg, "0012")
    with engine.connect() as conn:
        days = dict(conn.execute(text("SELECT title, plan_days_off FROM exams")).all())
    # Le feste dopo il 17/12 non riguardano il primo esame: restano solo al secondo.
    assert days["Prima"] == "[]" and days["Dopo"] == '["2026-12-24", "2027-01-02"]'
