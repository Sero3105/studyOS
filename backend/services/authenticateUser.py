"""Logica applicativa per l'autenticazione di un utente."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from models.user_models import User
from schemas.userLogin_schemas import UserLogin
from services.createUser import password_hasher


def authenticate_user(user_data: UserLogin, db: Session) -> User:
    """Verifica le credenziali e restituisce l'utente autenticato."""

    # Cerca l'utente tramite email.
    user = db.scalar(
        select(User).where(User.email == user_data.email)
    )

    # Se l'utente non esiste, le credenziali non sono valide.
    if user is None:
        raise ValueError("Email o password non corretti")

    # Verifica la password inserita rispetto all'hash salvato.
    if not password_hasher.verify(
        user_data.password,
        user.password_hash,
    ):
        raise ValueError("Email o password non corretti")

    return user