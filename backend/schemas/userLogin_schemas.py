"""Schemi per la validazione dei dati di login dell'utente."""

from pydantic import BaseModel, EmailStr, Field, field_validator

class UserLogin(BaseModel):
    """Schema per la validazione dei dati di login dell'utente.

    Questo schema viene utilizzato per validare i dati inviati dal client
    durante il processo di login. Contiene i campi necessari per
    autenticare un utente.
    """

    email: EmailStr
    password: str = Field(max_length=128)

    # Email salvate e cercate sempre in minuscolo: Mario@x.it e mario@x.it sono lo stesso account.
    @field_validator("email")
    @classmethod
    def lowercase_email(cls, value: str) -> str:
        return value.lower()
