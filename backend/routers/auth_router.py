"""Router FastAPI per l'autenticazione degli utenti."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from dependencies.database_dependency import get_db
from schemas.userLogin_schemas import UserLogin
from schemas.users_schemas import UserResponse
from services.authenticateUser import authenticate_user


router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


@router.post(
    "/login",
    response_model=UserResponse,
)
def login_user(
    user_data: UserLogin,
    db: Session = Depends(get_db),
):
    """Verifica le credenziali dell'utente."""

    try:
        return authenticate_user(user_data, db)

    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Email o password non corretti",
        )