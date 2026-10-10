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

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.userRegister_router import router as user_register_router
from routers.auth_router import router as auth_router
from routers.exam_router import router as exam_router
import config


@asynccontextmanager
async def lifespan(_: FastAPI):
    config.validate_security_settings()
    yield


# Istanza principale dell'applicazione.
app = FastAPI(lifespan=lifespan)

# Configurazione CORS per consentire le richieste dal frontend React.
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(config.FRONTEND_ORIGINS),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrazione del router di registrazione utente.
app.include_router(user_register_router)

# Registrazione del router di autenticazione.
app.include_router(auth_router)
app.include_router(exam_router)
