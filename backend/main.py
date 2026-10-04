"""Entry point dell'applicazione FastAPI.

Questo file è il punto di ingresso principale del backend. Qui viene creata
l'istanza di FastAPI e vengono registrati tutti i router delle API.

Per convenzione, in un progetto FastAPI il file `main.py` contiene la
configurazione base dell'applicazione e l'unione dei vari endpoints. In questo
caso il progetto è piccolo, quindi è sufficiente includere il router di
registrazione utente.

N.B.: le API vengono caricate nel server tramite `app.include_router(...)`.
Questo permette di mantenere il codice organizzato per area funzionale
(ad esempio autenticazione, utenti, ecc.).
"""

from fastapi import FastAPI

# Import del router dedicato alla registrazione utente.
from routers.userRegister_router import router as user_register_router


# Istanza principale dell'applicazione. Tutte le route del backend saranno
# associate a questa variabile.
app = FastAPI()

# Registrazione del router. In questo modo tutte le route definite in
# `userRegister_router` diventano disponibili sotto l'URL del server.
app.include_router(user_register_router)