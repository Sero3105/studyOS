"""Schemi Pydantic per le risposte di autenticazione."""

from typing import Literal

from pydantic import BaseModel

from schemas.users_schemas import UserResponse


class TokenResponse(BaseModel):
    """Risposta restituita dopo un login riuscito."""

    access_token: str
    token_type: Literal["bearer"] = "bearer"
    csrf_token: str
    user: UserResponse
