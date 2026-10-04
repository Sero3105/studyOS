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
ALGORITHM = os.getenv("ALGORITHM")

# Durata standard dei token in minuti; se non specificato, usa 30 minuti.
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))