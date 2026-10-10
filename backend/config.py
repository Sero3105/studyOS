"""Configurazione centrale del backend.

Questo modulo legge le variabili di ambiente del progetto tramite `python-dotenv`.
Il principio è semplice: nessun valore sensibile va scritto direttamente nel
codice sorgente, ma viene esportato da un file `.env` o dall'ambiente di
esecuzione.

Vengono qui caricate tutte le impostazioni globali che altri moduli useranno,
come:
- URL del database,
- chiave segreta per JWT,
- algoritmo di firma,
- durata dei token.

Questa struttura semplifica la manutenzione e rende più facile passare da uno
ambiente all'altro (sviluppo, test, produzione).
"""

import os
from dotenv import load_dotenv

# Carica le variabili da `.env` nel processo corrente. Senza questa chiamata,
# `os.getenv(...)` non troverebbe i valori definiti nel file di ambiente.
load_dotenv()

# URL di connessione al database. Esempio: SQLite, PostgreSQL, MySQL, ecc.
DATABASE_URL = os.getenv("DATABASE_URL")

# Valori usati per la sicurezza e per la generazione dei token JWT.
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

# Durata standard dei token in minuti; se non specificato, usa 30 minuti.
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))
APP_ENV = os.getenv("APP_ENV", "development").lower()
FRONTEND_ORIGINS = tuple(
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
)


def validate_security_settings() -> None:
    """Fail fast for unsafe authentication configuration without logging secrets."""
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL must be configured")
    if not SECRET_KEY or len(SECRET_KEY) < 32:
        raise RuntimeError("SECRET_KEY must be configured and contain at least 32 characters")
    if SECRET_KEY.lower() in {"secret", "changeme", "change-me", "your-secret-key", "example"}:
        raise RuntimeError("SECRET_KEY must not use a predictable example value")
    if ALGORITHM != "HS256":
        raise RuntimeError("ALGORITHM must be HS256")
    if ACCESS_TOKEN_EXPIRE_MINUTES <= 0 or REFRESH_TOKEN_EXPIRE_DAYS <= 0:
        raise RuntimeError("Token expiry settings must be positive")
    if not FRONTEND_ORIGINS or "*" in FRONTEND_ORIGINS:
        raise RuntimeError("FRONTEND_ORIGINS must contain explicit allowed origins")
