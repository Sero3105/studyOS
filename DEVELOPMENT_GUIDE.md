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
├── compose.yaml             # nginx + api + backup giornaliero
├── backend/
│   ├── config.py
│   ├── database.py          # engine SQLite e migrazioni all'avvio
│   ├── main.py
│   ├── dependencies/
│   ├── models/
│   ├── routers/
│   ├── schemas/
│   ├── services/
│   ├── migrations/          # Alembic, una revisione per modifica dello schema
│   └── tests/               # pytest su un database temporaneo
├── database/
│   └── studyos.db           # database sqlite locale
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tests/               # test della logica pura (node --test)
    └── src/
        ├── pages/           # una pagina per route
        ├── components/      # UI kit, timer, esami, flashcard, calendario, dashboard
        ├── context/         # auth, timer persistente, annulla dopo l'eliminazione
        ├── services/        # chiamate API, una per risorsa
        ├── utils/           # logica pura: date, voti, pomodoro, piano di oggi, prontezza, CSV, Anki, preferenze
        ├── components/ui/   # shadcn/ui + componenti di casa (PageHeader, Modal, DatePicker, Figures…)
        └── index.css        # Tailwind + token del tema
```

## 3. Stack tecnologico

### Frontend

- React
- TypeScript
- Vite
- React Router
- lucide-react
- Recharts (grafici, caricato solo quando serve)
- marked + KaTeX + DOMPurify (anteprima delle note, caricati solo all'apertura)
- CSS modularizzato per componenti e layout

### Backend setup

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- SQLite
- Alembic (migrazioni)
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
cd backend
pip install -r requirements-dev.txt
```

`requirements.txt` contiene solo le dipendenze di runtime (con versioni fissate,
le stesse usate dall'immagine Docker); `requirements-dev.txt` aggiunge pytest e
httpx per i test.

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

Per avviare tutto con Docker, senza installare Python o Node, vedi la sezione
"Run with Docker" nel README.

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
  3. stilare con classi Tailwind e componenti shadcn (`npx shadcn@latest add <nome>`), niente file CSS nuovi

## 10. Consigli utili

- Prima di fare modifiche importanti, guarda bene il nome del file e la sua responsabilità.
- Se un problema riguarda il database, controlla prima `models/` e `database.py`.
- Se un problema riguarda l'API, controlla `router` + `service` + `schema`.
- Se un problema riguarda l'interfaccia, controlla `components/`, `pages/` e i token in `index.css`.
- Non fare patch “a caso”: cerca sempre la causa logica e la zona corretta.

## 11. Checklist veloce prima di fare commit

- test backend e frontend verdi (`pytest`, `tsc -b`, `npm run lint`, `npm test`)?
- se hai cambiato un modello: nuova migrazione Alembic e export/import aggiornati?
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
| --- | --- | --- |
| Auth e account | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, `/auth/password`, `DELETE /auth/account` | Login/Register, Impostazioni → Account |
| Preferenze | `GET/PATCH /settings` (JSON sull'utente) | `utils/preferences.ts`: server come fonte, localStorage come cache |
| Materie e topic | `/subjects`, `/subjects/{id}/topics`, `/topics/{id}` (note, difficoltà, stato `mastery` 0-3, ripassi adattivi) | `/subjects` con note Markdown e anteprima |
| Task | `/tasks` (ricorrenza, ripasso adattivo con `review_rating`, blocco orario `scheduled_time` + `planned_minutes`) | `/planner`, `/calendar` (time blocking) |
| Esami | `/exams` (CRUD), `POST /exams/{id}/plan` e `/plan/advice` (piano con preferenze e storico), `POST /exams/{id}/attempts` | `/exams`: esito, tentativi, prontezza, libretto e simulatore |
| Sessioni e sedute | `/sessions` (CRUD, `kind`, `focus`, `sitting_id`, `partial`, `interruptions`), `GET /sittings`, `PUT /sittings/{uid}` (obiettivo, checklist, distrazioni, "riparto da qui"; idempotente) | Timer (`utils/sitting.ts`), `/history` |
| Flashcard ed errori | `/cards`, `/cards/bulk`, `/cards/{id}/review`, `/mistakes` | `/cards`: ripasso, import/export, quaderno degli errori |
| Obiettivi | `/goals` (progresso calcolato dai dati) | `/goals` |
| Statistiche | `/stats/summary` | Dashboard ("Cosa studio oggi?") e `/statistics` con export CSV |
| Dati | `/data/export`, `/data/import` (aggiungi o sostituisci), `/data/notes-vault` | Impostazioni → Dati e backup, Synapse |
| Condivisione e calendario | `/share`, `/share/public/{token}`, feed iCal | Impostazioni, `/shared/:token` |

Ripetizione dilazionata: `services/spaced_repetition.py` (`next_interval`) è
condivisa da ripassi e flashcard. Difficile riparte da 1 giorno, Ok moltiplica
per 2,5, Facile per 4; oltre 60 giorni un argomento è consolidato.

Assunzioni adottate: una sessione viene registrata quando il blocco Work del
timer termina, con la durata pianificata; gli obiettivi misurano minuti
(settimanali/totali), task completati, topic completati o numero di sessioni;
la costanza (streak) conta i giorni consecutivi con almeno una sessione,
incluso oggi o ieri.

Database: lo schema è gestito da Alembic (`backend/migrations/versions/`,
0001 → 0010). L'API applica le migrazioni mancanti all'avvio; ogni modifica a
un modello va accompagnata da una nuova revisione (`alembic revision
--autogenerate -m "..."`) e dall'aggiornamento di `tests/test_migrations.py`.
Nuove tabelle con dati dell'utente vanno aggiunte anche a export/import e alla
cancellazione in `services/data_service.py`.

Test:
- backend: `source backend/.venv/bin/activate && python -m pytest backend/tests/ -q` (database SQLite temporaneo isolato);
- frontend: `cd frontend && npx tsc -b && npm run lint && npm test` (logica pura in `src/utils`, con `node --test`).

## 14. Design system

Stack: **Tailwind CSS v4** (utility, plugin `@tailwindcss/typography` per le note) e
**shadcn/ui** su Radix (`frontend/components.json`, componenti in `src/components/ui/`).
Niente CSS scritto a mano: l'unico file è `src/index.css`, con i token del tema
(`:root` chiaro, `[data-theme="dark"]` scuro, impostato da `utils/theme.ts`).

Direzione: scuro futuristico e minimale. Nero neutro senza tinta blu, un solo accento
**lime elettrico** (`--primary`), segnali accesi: `--info` ciano, `--warning` ambra,
`--destructive` rosso, `--success` verde. Niente blu scuro né viola. Font Geist Sans,
numeri in Geist Mono con `tabular-nums`. Colori materia in `--subject-*`
(classi in `src/lib/subjectColors.ts`).

Regole: token semantici (`bg-primary`, `text-muted-foreground`), mai colori grezzi;
`gap-*` invece di `space-*`; icone nei Button con `data-icon`; form con
`Field`/`FieldLabel`; un solo pulsante pieno per vista, il resto `outline`/`ghost`;
toast con Sonner (`toast.success`), conferme con `AlertDialog`, date con
`components/ui/DatePicker` (Popover + Calendar). Il grafico voti/media
(`components/exams/GradeTrendChart.tsx`) resta com'era: solo colori del tema.

## 15. Layout e navigazione

Shell: sidebar shadcn riducibile a icone (⌘B), barra in alto con timer in corso
(play/pausa da ogni pagina) e ricerca ⌘K; su mobile tab bar in basso
(Oggi, Timer, Planner, Statistiche, Altro → sidebar). Impostazioni ed esci nel menu
account in fondo alla sidebar. Contenitore max 72rem. Dashboard "Oggi": minuti di oggi,
obiettivo e CTA in alto, piano di oggi e settimana a sinistra, esami e task a destra.
Materie ed esami sono una pagina sola (`/exams` porta lì): ogni materia ha il suo
esame (creare un esame crea o riusa la materia con lo stesso nome; gli esami vecchi
senza materia la ricevono alla prima lettura), argomenti, prontezza, copertura e
tempo studiato. Esame superato → materia in "Archiviate", con libretto e grafico
dei voti; nessun dato cancellato. Eliminare una materia elimina anche i suoi esami.
Il timer mostra i giorni all'esame accanto a ogni materia; le materie archiviate
non compaiono nei selettori (timer, planner, obiettivi).
Piano d'esame: `backend/services/study_plan.py` (algoritmo deterministico: studio in ordine di
corso; ripassi messi da un modello della memoria in stile FSRS, cioè quando il ricordo previsto scende
alla soglia scelta, con una coda per data; ripasso finale ai più deboli prima; interleaving; capienza
giornaliera che tiene conto degli altri esami) adattato alle preferenze dello studente (`PlanPrefs`:
inizio, giorni senza studio, giorni liberi, limite in attività o ore anche per giorno della settimana,
soglia dei ripassi, durata dello studio, ordine, giorni di ripasso finale, giorno prima dell'esame libero);
con più esami: giorno d'esame libero, `focus_days` giorni prima di ogni esame solo per quella materia
(`exam_service._other_exams`), fetta giornaliera all'esame più vicino (`study_plan.exam_share`), indipendente dall'ordine
dei piani; e al suo storico (`exam_service.plan_history`: task del piano fatti in tempo e ritmo reale al timer;
`_plan_topics`: ultimo passaggio, ripassi riusciti ed errori annotati per argomento); `plan_advice` dà
inizio ideale e data limite. Stato argomento: da fare → da ripassare →
ripassato → sicuro; "completato" solo da ripassato in su (migrazione 0011).
Timer: quadrante a sinistra, checklist e distrazioni a destra. Statistiche e
Impostazioni divise in schede. Moduli lunghi (nuovo obiettivo, sessione manuale)
in dialog; durate del timer e dettagli del task a scomparsa.
