"""Schema Pydantic usato per serializzare la risposta di un utente.

Questo file definisce il modello di output della API: i campi che il client può
leggere in risposta a una registrazione, una lettura di profilo o altre APIs
relative agli utenti.

`ConfigDict(from_attributes=True)` è fondamentale quando il modello deve
essere creato direttamente da un'istanza SQLAlchemy (`User`) invece che da un
dizionario semplice. Senza questa opzione, Pydantic non saprebbe mappare
automaticamente gli attributi dell'oggetto ORM agli attributi del modello.
"""

from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    """Risposta che espone i dati pubblici di un utente."""

    id: int
    username: str
    email: str
    full_name: str | None = None

    # Permette a Pydantic di costruire questo schema partendo da un'istanza di
    # SQLAlchemy, ad esempio `User(...)`.
    model_config = ConfigDict(from_attributes=True)