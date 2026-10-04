"""Schema Pydantic usato per la creazione di un nuovo utente.

Questo modello valida la richiesta HTTP in ingresso prima che il servizio di
business la elabori. Pydantic fa due cose fondamentali:
- controlla che i dati richiesti siano presenti,
- converte e valida i tipi in modo coerente.

Per un endpoint di registrazione, questo schema fa in modo che un client non
possa inviare valori malformati o campi mancanti.
"""

from pydantic import BaseModel


class UserCreate(BaseModel):
    """Payload di input per la registrazione di un nuovo utente.

    `password` non viene mai serializzato in risposta e viene usato solo per
    creare l'hash da salvare nel database.
    """

    username: str
    email: str
    full_name: str | None = None
    password: str