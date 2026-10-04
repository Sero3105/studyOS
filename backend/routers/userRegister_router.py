"""Router FastAPI per la registrazione utente.

Questo modulo espone l'endpoint `/auth/register`.
L'organizzazione per router è molto comune in FastAPI perché permette di
separare i diversi domini del backend (auth, users, tasks, ecc.).

Il controller qui presente non contiene la logica di business completa: delega
la creazione dell'utente al servizio `create_user` e si occupa solo di:
- validare il flusso HTTP,
- gestire dipendenze (database/sessione),
- trasformare eccezioni di business in risposte HTTP corrette.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from dependencies.database_dependency import get_db
from schemas.userCreate_schemas import UserCreate
from schemas.users_schemas import UserResponse
from services.createUser import create_user


router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=201,
)
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    """Registra un nuovo utente.

    Flow:
    1. FastAPI riceve e valida la richiesta usando `UserCreate`.
    2. `Depends(get_db)` fornisce una sessione SQLAlchemy.
    3. `create_user` controlla univocità e salva il record.
    4. Se username/email sono già esistenti, solleva `ValueError` che qui
       viene trasformato in `HTTPException(409)`.
    """
    try:
        return create_user(user_data, db)
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        )