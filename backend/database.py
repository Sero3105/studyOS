"""Configurazione del database e inizializzazione SQLAlchemy.

Questo modulo è il punto centrale per la connessione al database.
Qui:
- viene costruito il motore SQLAlchemy (`engine`),
- viene dichiarata la classe base per tutti i modelli,
- `run_migrations()` porta lo schema all'ultima migrazione Alembic
  (`migrations/versions/`), chiamata all'avvio dell'app.

La variabile `Base` serve come base condivisa per tutti i modelli ORM.
I modelli vanno importati qui sotto: Alembic li legge da `Base.metadata`
per generare le migrazioni (`alembic revision --autogenerate`).
"""

from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import DeclarativeBase

import config


# Base comune per tutti i modelli ORM del progetto.
class Base(DeclarativeBase):
    pass


# Il motore SQLAlchemy è l'oggetto che stabilisce la connessione al database
# e gestisce il pool di connessioni.
engine = create_engine(
    config.DATABASE_URL,
    # SQLite: `check_same_thread` per i thread di FastAPI, e niente connessioni tenute aperte: se iCloud
    # sostituisce il file (STUDYOS_DATA_DIR), la richiesta successiva apre quello nuovo invece di scrivere
    # su quello vecchio, già cancellato.
    # PostgreSQL (Neon): pool normale; pre_ping perché Neon chiude le connessioni quando va in pausa.
    **({"connect_args": {"check_same_thread": False}, "poolclass": NullPool}
       if config.DATABASE_URL.startswith("sqlite") else {"pool_pre_ping": True, "pool_recycle": 300}),
)

# IMPORT NECESSARIO: senza questi import i modelli non sarebbero in
# `Base.metadata` e Alembic non vedrebbe le loro tabelle.
from models.user_models import User
from models.auth_session_models import AuthSession
from models.exam_models import Exam
from models.subject_models import Subject, Topic
from models.task_models import Task
from models.session_models import StudySession, StudySitting
from models.goal_models import Goal
from models.share_models import CalendarFeed, ShareLink
from models.card_models import Card, Mistake


def run_migrations() -> None:
    """Porta lo schema all'ultima migrazione Alembic (chiamata all'avvio dell'app)."""
    from pathlib import Path
    from alembic import command
    from alembic.config import Config
    from sqlalchemy import inspect

    cfg = Config(str(Path(__file__).with_name("alembic.ini")))
    tables = inspect(engine).get_table_names()
    # Database creati prima di Alembic (con create_all): hanno già lo schema iniziale.
    if "users" in tables and "alembic_version" not in tables:
        command.stamp(cfg, "0001")
    command.upgrade(cfg, "head")
