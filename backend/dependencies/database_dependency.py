"""Provider di sessioni database per FastAPI.

Questo modulo è la parte di infrastruttura che permette a ciascuna route di
ottenere una sessione SQLAlchemy da usare per leggere o scrivere dati.

Il pattern `yield` in `get_db()` è tipico di FastAPI: la sessione viene creata
prima della richiesta, usata durante l'esecuzione della route, e chiusa
alla fine in modo sicuro anche in caso di errore.

Questa parte separa la logica di business dalle operazioni di accesso al DB,
semplificando test e manutenzione.
"""

from sqlalchemy.orm import Session, sessionmaker

from database import engine


# Factory della sessione SQLAlchemy. `SessionLocal` è il punto di accesso
# standard per ottenere nuove connessioni/transaction al database.
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


def get_db():
    """Restituisce una sessione SQLAlchemy pronta per essere usata da una route.

    `yield` consente a FastAPI di gestire automaticamente il ciclo di vita della
    sessione:
    1. crea la sessione,
    2. la usa durante la richiesta,
    3. la chiude in `finally` anche se la route solleva eccezioni.
    """
    db: Session = SessionLocal()

    try:
        yield db
    finally:
        db.close()