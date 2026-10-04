"""Logica applicativa per la creazione di un nuovo utente.

Questo servizio incapsula la regola di business: prima di salvare un utente,
verifica che non esista già un account con lo stesso username o email, poi
hasha la password e la salva nel database.

È un esempio semplice di servizio di dominio applicativo: riceve un payload
validato da Pydantic, interagisce con la sessione SQLAlchemy e restituisce
l'entità creata.
"""

from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from pwdlib import PasswordHash

from models.user_models import User
from schemas.userCreate_schemas import UserCreate


# Istanza consigliata del hasher. `pwdlib` è una libreria dedicata alla
# gestione sicura delle password, con supporto a algoritmi moderni.
password_hasher = PasswordHash.recommended()


def create_user(user_data: UserCreate, db: Session) -> User:
    """Crea un nuovo utente se i dati sono validi e univoci.

    Args:
        user_data: Payload validato tramite Pydantic.
        db: Sessione SQLAlchemy aperta per la richiesta.

    Returns:
        L'istanza `User` salvata nel database.

    Raises:
        ValueError: Se username o email sono già in uso.
    """
    # Controlla se esiste già un utente con username o email identici.
    existing_user = db.scalar(
        select(User).where(
            or_(
                User.username == user_data.username,
                User.email == user_data.email,
            )
        )
    )

    # Se l'utente esiste, interrompi la procedura e fai risalire l'errore alla
    # route HTTP, che lo convertirà in una risposta 409 Conflict.
    if existing_user:
        raise ValueError("Username o email già utilizzati")

    # Crea una nuova entità SQLAlchemy con i dati ricevuti. La password viene
    # trasformata in hash per non memorizzarne mai il valore originale.
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        password_hash=password_hasher.hash(user_data.password),
    )

    # Salvataggio transactionale nel database.
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user