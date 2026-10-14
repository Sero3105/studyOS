# Guida di sviluppo di StudyOS

Questa è una mini guida pratica per orientarsi rapidamente nel progetto e continuare a lavorare senza perdere il contesto.

## 1. Obiettivo del progetto

StudyOS è una piattaforma per gestire lo studio in modo organizzato: pianificazione, timer, tracciazione del lavoro, progressi e analisi. Il progetto è diviso in:

- frontend: interfaccia web (React + Vite)
- backend: API (FastAPI + SQLAlchemy)
- database: file SQLite locale

## 2. Struttura del repository

```text
StudyOS/
├── .env                     # variabili di ambiente
├── README.md                # descrizione del progetto
├── DEVELOPMENT_GUIDE.md     # questa guida
├── backend/
│   ├── config.py
│   ├── database.py
│   ├── main.py
│   ├── dependencies/
│   ├── models/
│   ├── routers/
│   ├── schemas/
│   └── services/
├── database/
│   └── studyos.db           # database sqlite locale
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/
```

## 3. Stack tecnologico

### Frontend

- React
- TypeScript
- Vite
- React Router
- lucide-react
- CSS modularizzato per componenti e layout

### Backend setup

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- SQLite
- python-dotenv
- pwdlib

## 4. Regole di sviluppo da seguire

### Regola 1: separare responsabilità

Non mischiare tutto nello stesso file.

- `models/`: descrivono i dati/database
- `schemas/`: validano input/output HTTP
- `services/`: contengono la logica di business
- `routers/`: gestiscono gli endpoint API
- `dependencies/`: dipendenze condivise, ad esempio sessioni DB

Questa separazione rende più facile capire dove correggere un problema senza leggere tutto il progetto.

### Regola 2: i router non devono fare “logica sporca”

Il router deve solo:

- ricevere la richiesta,
- usare le dipendenze,
- chiamare il service giusto,
- trasformare eventuali errori in risposte HTTP.

La logica vera e propria va nel service o nel modello.

### Regola 3: non salvare password in chiaro

Nel backend, la password di un utente deve essere trasformata in hash prima di essere salvata nel database.

### Regola 4: validare dati in ingresso

Con Pydantic, le richieste vengono controllate prima di arrivare al servizio.
Questo aiuta a evitare dati malformati e a rendere API più pulite e sicure.

### Regola 5: mantenere CSS organizzato

Il frontend usa CSS separati per:

- base
- layout
- componenti
- pagine/screen

Questa struttura aiuta a mantenere lo stile ordinato.

## 5. Come avviare il progetto

### Backend

1. Posizionati nella cartella progetto.
2. Crea un ambiente virtuale Python (se non esiste):

```bash
python -m venv .venv
source .venv/bin/activate
```

1. Installa le dipendenze principali:

```bash
pip install fastapi sqlalchemy pydantic python-dotenv pwdlib uvicorn
```

1. Avvia il server:

```bash
cd backend
uvicorn main:app --reload
```

Il backend sarà raggiungibile di solito su:

```text
http://127.0.0.1:8000
```

### Frontend setup

1. Entra nella cartella frontend:

```bash
cd frontend
```

1. Installa le dipendenze:

```bash
npm install
```

1. Avvia il dev server:

```bash
npm run dev
```

Di solito il frontend sarà disponibile su:

```text
http://localhost:5173
```

## 6. Variabili d'ambiente

Il file `.env` contiene le impostazioni principali del backend, ad esempio:

```env
DATABASE_URL="sqlite:///../database/studyos.db"
SECRET_KEY="..."
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Non modificare i valori sensibili in modo casuale: sono usati per la connessione al database e per la sicurezza dei token.

## 7. Flusso di lavoro standard

Quando lavori sul progetto, segui questo schema:

1. capisci lo scopo della feature o della correzione;
2. individua il file giusto (`router`, `service`, `model`, `component`);
3. modifica solo il codice necessario;
4. verifica che non rompa il flusso esistente;
5. testa o esegui il server/l'applicazione;
6. lascia il codice leggibile e ben commentato se serve.

## 8. Convenzioni pratiche del codice

### Python / backend

- usa nomi descrittivi (`create_user`, `get_db`, `UserResponse`)
- usa moduli separati per logica e API
- i file di routing devono essere leggibili e semplici
- i service devono contenere regole di business
- usa `ValueError` per eccezioni di business e trasformale in `HTTPException` nei router

### TypeScript / frontend

- usa componenti separati per ogni area funzionale
- preferisci props per passare dati tra componenti
- usa `useState` per stato locale
- usa `NavLink` per navigazione interna
- tieni CSS e logica separati

## 9. Esempio di flusso per una feature

Se vuoi aggiungere una nuova pagina o un endpoint:

- backend:
  1. creare schema in `schemas/`
  2. creare logica in `services/`
  3. creare route in `routers/`
  4. collegare il router in `main.py`

- frontend:
  1. creare componente in `src/components/` o `src/pages/`
  2. configurare la route in `src/main.tsx`
  3. aggiungere eventuali stili in `src/styles/`

## 10. Consigli utili

- Prima di fare modifiche importanti, guarda bene il nome del file e la sua responsabilità.
- Se un problema riguarda il database, controlla prima `models/` e `database.py`.
- Se un problema riguarda l'API, controlla `router` + `service` + `schema`.
- Se un problema riguarda l'interfaccia, controlla `components/`, `pages/` e `styles/`.
- Non fare patch “a caso”: cerca sempre la causa logica e la zona corretta.

## 11. Checklist veloce prima di fare commit

- backend avviato correttamente?
- frontend avviato correttamente?
- .env presente e corretto?
- logica separata bene tra router/service/model?
- file commentati o almeno leggibili?
- non hai introdotto bug visibili o inconsistenze nel routing?

## 12. Conclusione

StudyOS è un progetto semplice ma ben strutturato: l'idea è mantenere codice ordinato, logico e facilmente estendibile. Se continui a rispettare la separazione tra frontend/backend, modelli/schemi/service e routing, il progetto rimarrà più semplice da capire e da sviluppare nel tempo.

Se vuoi, in un secondo momento posso anche preparare una versione ancora più dettagliata con:

- una mappa completa delle route del backend,
- una mappa dei componenti React,
- una checklist per nuove feature,
- o una mini guida “come aggiungere un modulo nuovo” (es. task, subjects, planner, statistics).

## 13. Moduli completati (aggiornamento)

Aree implementate end-to-end (frontend, API, persistenza, isolamento per utente):

| Area | Backend | Frontend |
|---|---|---|
| Auth | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me` | Login/Register, sessione ripristinata al reload |
| Materie e topic | `/subjects`, `/subjects/{id}/topics`, `/topics/{id}` | `/subjects` |
| Task | `/tasks` (CRUD, link materia/topic validati) | `/planner` con prossimi esami |
| Esami | `/exams` (CRUD completo) | `/exams` con modifica ed eliminazione |
| Sessioni | `/sessions` | Timer salva la sessione a fine focus; `/history` |
| Obiettivi | `/goals` (progresso calcolato dai dati) | `/goals` |
| Statistiche | `/stats/summary` | Dashboard e `/statistics` su dati reali |

Assunzioni adottate: una sessione viene registrata quando il blocco Work del
timer termina, con la durata pianificata; gli obiettivi misurano minuti
(settimanali/totali), task completati, topic completati o numero di sessioni;
la costanza (streak) conta i giorni consecutivi con almeno una sessione,
incluso oggi o ieri.

Database: le nuove tabelle (`subjects`, `topics`, `tasks`, `study_sessions`,
`goals`) vengono create da `Base.metadata.create_all` all'avvio; nessuna
colonna esistente è stata modificata, quindi il database di sviluppo è
preservato senza migrazioni distruttive.

Test: `backend/tests/` usa un database SQLite temporaneo isolato.
Esecuzione: `source backend/.venv/bin/activate && python -m pytest backend/tests/ -q`.

## 14. Design system (redesign UI/UX)

Direzione: dark-first, superfici quasi-nere, accento viola unico, stile piatto
(niente gradienti/glow), transizioni 150-200ms, `prefers-reduced-motion`
rispettato. Tutti i valori vivono in `frontend/src/styles/base/tokens.css`:
superfici, testo, accento, colori semantici, tipografia, spaziature, raggi,
ombre, focus ring, z-index. I componenti usano solo token semantici.

Convenzioni: target touch minimi 44px, focus visibile su ogni controllo
interattivo, contrasto testo almeno 4.5:1, stati loading/vuoto/errore per
ogni pagina dati. Breakpoint principale 700px: sotto, la sidebar parte
compressa a icone.
