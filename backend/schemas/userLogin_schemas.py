"""Schemi per la validazione dei dati di login dell'utente."""

from pydantic import BaseModel, EmailStr, Field

class UserLogin(BaseModel):
    """Schema per la validazione dei dati di login dell'utente.

    Questo schema viene utilizzato per validare i dati inviati dal client
    durante il processo di login. Contiene i campi necessari per
    autenticare un utente.
    """

    email: EmailStr
    password: str = Field(max_length=128)