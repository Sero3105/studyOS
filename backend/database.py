"""Configurazione del database e inizializzazione SQLAlchemy.

Questo modulo è il punto centrale per la connessione al database.
Qui:
- viene costruito il motore SQLAlchemy (`engine`),
- viene dichiarata la classe base per tutti i modelli,
- vengono create le tabelle definite nel progetto.

La variabile `Base` serve come base condivisa per tutti i modelli ORM.
Ogni modello che eredita da `Base` può essere trasformato automaticamente in
una tabella tramite SQLAlchemy.

Il `create_all(engine)` genera le tabelle, ma solo per i modelli caricati
nel contesto dell'applicazione. Per far sì che SQLAlchemy trovi anche il
modello `User`, qui è fatto l'import esplicito.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase

import config


# Base comune per tutti i modelli ORM del progetto.
class Base(DeclarativeBase):
    pass


# Il motore SQLAlchemy è l'oggetto che stabilisce la connessione al database
# e gestisce il pool di connessioni.
engine = create_engine(
    config.DATABASE_URL,
    # `check_same_thread` è spesso richiesto solo in ambienti SQLite per evitare
    # errori con thread multipli. È un dettaglio di compatibilità del backend.
    connect_args={"check_same_thread": False},
)

# IMPORT NECESSARIO: senza questo import, SQLAlchemy non rileverebbe il modello
# `User` e quindi non sarebbe in grado di creare la tabella corrispondente.
from models.user_models import User
from models.auth_session_models import AuthSession


# Crea tutte le tabelle definite dai modelli che ereditano da `Base`.
Base.metadata.create_all(engine)
