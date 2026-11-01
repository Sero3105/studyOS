<!-- markdownlint-disable MD033 MD041 MD060 -->

<div align="center">

# 📚 StudyOS

## Il tuo sistema operativo per lo studio

**Pianifica. Studia. Traccia. Analizza. Migliora.** — tutto in un unico posto.

[![Docker](https://img.shields.io/badge/docker-ready-2496ED?logo=docker&logoColor=white)](./compose.yaml)
[![FastAPI](https://img.shields.io/badge/backend-FastAPI-009688?logo=fastapi&logoColor=white)](./backend)
[![React](https://img.shields.io/badge/frontend-React_19-61DAFB?logo=react&logoColor=black)](./frontend)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](./frontend)
[![SQLite](https://img.shields.io/badge/database-SQLite-003B57?logo=sqlite&logoColor=white)](./database)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

[English](./README.md) · **Italiano**

[🚀 Avvio rapido](#-avvio-rapido-3-minuti) · [✨ Funzionalità](#-funzionalità) · [🖼️ Screenshot](#️-screenshot) · [🛠️ Tecnologie](#️-tecnologie) · [📦 Struttura](#-struttura-del-progetto)

</div>

---

## 🎬 StudyOS in azione

<div align="center">

![Demo di StudyOS](./docs/media/demo.gif)

*Timer Pomodoro → sessione registrata → dashboard e statistiche aggiornate.*

</div>

> Non l'ennesimo timer. Non l'ennesima to-do list.  
> **StudyOS collega i piani alla realtà**: cosa avevi pianificato di studiare e cosa hai studiato davvero.

---

## ✨ Funzionalità

| | Area | Cosa fa |
|---|---|---|
| 🧭 | **Cosa studio oggi?** | In dashboard: blocchi orari, ripassi, flashcard, task in scadenza e l'argomento più indietro dell'esame vicino, ognuno avviabile con un clic |
| 📅 | **Planner** | Task con materia, argomento, priorità, scadenza, stato e ricorrenza; ▶ avvia il timer sul task |
| ⏱️ | **Timer Pomodoro** | Continua tra le pagine, pausa lunga ogni N blocchi, suono e notifica a fine blocco, tipo di attività e focus di ogni blocco |
| 📚 | **Materie e argomenti** | Gerarchia `Materia → Argomento`, note Markdown con anteprima e formule (KaTeX), difficoltà per argomento e ripasso adattivo: Difficile / Ok / Facile decide quando torna |
| 🃏 | **Flashcard** | Ripasso dilazionato con scorciatoie da tastiera, carte dalle note (`domanda :: risposta`), import ed export per Anki o CSV, quaderno degli errori |
| 📝 | **Esami** | Conto alla rovescia, prontezza per l'esame, piano di studio pesato per difficoltà e ore già studiate (con giorni liberi), esito e tentativi (bocciato o rifiutato) |
| 🎓 | **Libretto** | Media aritmetica e ponderata, base di laurea, CFU del corso configurabili, andamento dei voti e simulatore del voto di laurea |
| 🎯 | **Obiettivi** | Minuti settimanali/totali, task, argomenti, sessioni — progresso calcolato dai dati reali |
| 📊 | **Statistiche** | Totali, tempo per materia, argomento e tipo di attività, focus medio, giorni di fila, heatmap annuale, ore migliori, pianificato vs studiato, export CSV |
| 🕘 | **Storico** | Sessioni raggruppate per giorno con i totali; sessioni aggiunte o corrette a mano |
| 🗓️ | **Calendario** | Settimana e mese con esami, scadenze e minuti studiati; time blocking (trascina i task sui giorni, ora e durata per blocco); feed iCal per Apple/Google Calendar e Outlook |
| 💾 | **Backup** | Export JSON con un clic, import che aggiunge o ripristina, copia automatica giornaliera del database (ultimi 7 file) |
| 🔔 | **Promemoria** | Notifica giornaliera del browser per task in ritardo/in scadenza ed esami a 7/3/1/0 giorni |
| 🔗 | **Condivisione** | Link in sola lettura e revocabile al tuo piano di studio (niente note, luoghi o email) |
| ⌨️ | **Palette dei comandi** | `⌘K` / `Ctrl+K` per cercare task, esami e argomenti; `g` + lettera per cambiare pagina, `n` per un nuovo task |
| 🧠 | **Note in Synapse** | Esporta le note degli argomenti come vault Markdown collegato per [Synapse](https://github.com/Sero3105/Synapse) |
| ⚙️ | **Preferenze** | Tema, CFU del corso, giorni liberi e avvisi salvati sul server: valgono su ogni browser; "Annulla" dopo ogni eliminazione |
| 🔐 | **Account** | Registrazione/login, refresh via cookie, cambio password, cancellazione dell'account |

### 🔄 Il ciclo di StudyOS

```text
PIANIFICA → STUDIA → TRACCIA → ANALIZZA → MIGLIORA → PIANIFICA (di nuovo, meglio)
```

Ogni parte alimenta la successiva: un task porta a una sessione, la sessione alimenta le statistiche, le statistiche aiutano a migliorare il piano.

<div align="center">

![Dashboard](./docs/media/dashboard.jpg)

*La dashboard: focus di oggi, "Cosa studio oggi?", scadenze e ultimi 7 giorni.*

</div>

---

## 🖼️ Screenshot

| Timer Pomodoro | Calendario | Materie e note |
|---|---|---|
| ![Timer](./docs/media/timer.jpg) | ![Calendario](./docs/media/calendar.jpg) | ![Materie](./docs/media/subjects.jpg) |

| Esami e libretto | Statistiche | Heatmap annuale |
|---|---|---|
| ![Esami](./docs/media/exams.jpg) | ![Statistiche](./docs/media/statistics.jpg) | ![Heatmap](./docs/media/heatmap.jpg) |

| Planner | Palette dei comandi | Obiettivi |
|---|---|---|
| ![Planner](./docs/media/planner.jpg) | ![Palette](./docs/media/palette.jpg) | ![Obiettivi](./docs/media/goals.jpg) |

| Flashcard | Storico | Impostazioni |
|---|---|---|
| ![Flashcard](./docs/media/cards.jpg) | ![Storico](./docs/media/history.jpg) | ![Impostazioni](./docs/media/settings.jpg) |

| Login | Dashboard mobile | Timer mobile |
|---|---|---|
| ![Login](./docs/media/login.jpg) | ![Dashboard mobile](./docs/media/mobile-dashboard.jpg) | ![Timer mobile](./docs/media/mobile-timer.jpg) |

> 📁 Tutte le immagini sono in [`docs/media/`](./docs/media). Video demo: [`demo.mp4`](./docs/media/demo.mp4).

---

## 🚀 Avvio rapido (3 minuti)

Serve solo **Docker**. Non serve installare Python né Node.

```bash
cp .env.example .env
python3 -c "import secrets; print(secrets.token_urlsafe(48))"  # → incollalo come SECRET_KEY in .env
docker compose up --build -d
```

Apri **<http://localhost:8080>** e crea un account. Fatto. 🎉

```bash
docker compose up -d        # avvia
docker compose down         # ferma (i dati restano al sicuro nel volume)
docker compose logs -f api  # log del backend (web per nginx)
```

> ⚠️ Non usare `docker compose down -v` nella routine: cancella il volume con tutti gli utenti e le sessioni.

<details>
<summary><strong>🐳 Dettagli su Docker, backup e configurazione</strong></summary>

### Cosa gira

| Servizio | Immagine | Ruolo | Porta |
|---|---|---|---|
| `web` | nginx unprivileged (Alpine) | Serve il frontend e inoltra `/api/*` al backend | `127.0.0.1:8080` (unica porta pubblicata) |
| `api` | Python 3.14 slim | FastAPI + SQLAlchemy, un solo processo uvicorn, SQLite incluso | Solo rete interna |
| `backup` | stessa immagine di `api` | Copia il database ogni giorno in `./backups` e tiene gli ultimi 7 file | Nessuna |

Non c'è un container database: SQLite è un file nel volume `studyos-data` (`/data` in `api`). Il browser parla solo con `http://localhost:8080`, quindi non serve CORS e i cookie di autenticazione funzionano.

### Dati e backup

- **Docker:** volume `studyos_studyos-data`, montato su `/data/studyos.db` in `api`. Sopravvive a `down`, riavvii e rebuild.
- **Sviluppo locale:** `database/studyos.db` nel repository. Docker non lo tocca mai.

Il servizio `backup` copia il database una volta al giorno in `./backups` (sul disco, fuori dal volume) e tiene gli ultimi 7 file; la cartella si cambia con `STUDYOS_BACKUP_DIR`. Su Linux va resa scrivibile dal container: `mkdir backups && sudo chown 10001 backups`. Per ripristinarne uno (sostituisce i dati attuali):

```bash
docker compose stop api
docker compose run --rm --no-deps -T api sh -c 'cat > /data/studyos.db' < backups/studyos-AAAA-MM-GG.db
docker compose up -d
```

Il modo più semplice per un backup è **Impostazioni → Scarica backup** nell'app. Per copiare l'intero file del database:

```bash
# Backup del database Docker
docker compose exec -T api python -c "import sqlite3; sqlite3.connect('/data/studyos.db').backup(sqlite3.connect('/tmp/backup.db'))"
docker compose exec -T api cat /tmp/backup.db > studyos-backup.db

# Import una tantum del database locale (prima del primo avvio, con volume vuoto)
docker compose build
docker compose run --rm --no-deps -T api sh -c 'test ! -e /data/studyos.db && cat > /data/studyos.db' < database/studyos.db
docker compose up -d

# Reset voluto (cancella tutto — fai prima un backup!)
docker compose down
docker volume rm studyos_studyos-data
docker compose up -d
```

### Configurazione (`.env`)

| Variabile | Default | Note |
|---|---|---|
| `SECRET_KEY` | — (obbligatoria) | Almeno 32 caratteri casuali, diversa per ogni installazione |
| `APP_ENV` | `development` | `production` = cookie `Secure`, solo HTTPS, niente `/docs` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` / `REFRESH_TOKEN_EXPIRE_DAYS` | `30` / `7` | |
| `STUDYOS_PORT` | `8080` | Legata a 127.0.0.1 |
| `STUDYOS_ORIGIN` | `http://localhost:<porta>` | Origine pubblica, se diversa |
| `API_MEMORY_LIMIT` / `API_CPUS` | `256M` / `1.0` | Limiti del container |
| `WEB_MEMORY_LIMIT` / `WEB_CPUS` | `64M` / `0.5` | Limiti del container |

**Sicurezza:** nginx limita `/api/auth/login` e `/api/auth/register` (10 al minuto per IP). I link di condivisione sono token casuali a 256 bit salvati solo come hash; rigenerare o disattivare un link invalida quello vecchio.

**HTTPS:** la configurazione di default usa HTTP su localhost. In produzione metti davanti un proxy TLS, imposta `APP_ENV=production` e configura `STUDYOS_ORIGIN=https://…`.

</details>

---

## 🛠️ Tecnologie

| Livello | Tecnologie |
|---|---|
| **Frontend** | React 19 · TypeScript · Vite · React Router · lucide-react · Recharts · marked + KaTeX + DOMPurify (note) · CSS puro con design token |
| **Backend** | FastAPI · SQLAlchemy · Alembic · Pydantic · PyJWT · pwdlib (argon2) · uvicorn |
| **Database** | SQLite (file nel volume Docker, `database/studyos.db` in locale) |
| **Deploy** | Docker Compose · nginx (file statici + proxy `/api`) · immagini multi-stage |

**Design:** dark-first, superfici quasi nere, un solo accento lime, piatto (niente gradienti), transizioni da 160 ms, `prefers-reduced-motion` rispettato, target touch da 44 px, breakpoint a 700/900 px. I token sono in `frontend/src/styles/base/tokens.css`.

---

## 📦 Struttura del progetto

```text
StudyOS/
├── compose.yaml          # setup di produzione (nginx + api + backup giornaliero)
├── .env.example          # modello delle variabili d'ambiente
├── backend/
│   ├── main.py           # entry point FastAPI + registrazione dei router
│   ├── config.py / database.py
│   ├── models/           # tabelle SQLAlchemy
│   ├── schemas/          # validazione Pydantic
│   ├── services/         # logica di business
│   ├── routers/          # endpoint HTTP (solo orchestrazione)
│   ├── migrations/       # migrazioni dello schema con Alembic
│   └── tests/            # pytest con database SQLite temporaneo
├── frontend/
│   └── src/
│       ├── pages/        # dashboard, timer, planner, calendario, materie, esami, flashcard, obiettivi, storico, statistiche, impostazioni, piano condiviso
│       ├── components/   # sidebar, Pomodoro, form, UI kit
│       ├── context/      # auth, timer persistente, annulla dopo l'eliminazione
│       ├── utils/        # logica pura testata: date, voti, piano di oggi, prontezza, CSV, Anki
│       └── styles/       # base / layout / componenti / schermate
├── database/             # studyos.db locale (mai toccato da Docker)
└── docs/                 # screenshot, demo, note di design
```

**Regola d'oro:** i router orchestrano, i service contengono la logica, gli schema validano. Vedi [`DEVELOPMENT_GUIDE.md`](./DEVELOPMENT_GUIDE.md) per i dettagli.

### Sviluppo locale (hot reload)

Lancia questi comandi in terminali separati dalla root del repository:

```bash
cd backend
pip install -r requirements-dev.txt
uvicorn main:app --reload
```

```bash
cd frontend
npm install
npm run dev
```

Test del backend: `python -m pytest backend/tests/ -q` · test del frontend: `cd frontend && npm test`

**Migrazioni del database (Alembic).** L'API applica le migrazioni mancanti all'avvio, anche sui database creati prima dell'introduzione di Alembic. Dopo aver modificato un modello in `backend/models/`:

```bash
cd backend
alembic revision --autogenerate -m "descrivi la modifica"   # controlla il file generato in migrations/versions/
```

---

## 🗺️ Roadmap

- [x] Autenticazione, materie/argomenti, task, esami, sessioni, obiettivi, statistiche
- [x] Calendario integrato e pianificazione settimanale
- [x] Import/export dei dati e backup con un clic
- [x] Notifiche delle scadenze e promemoria intelligenti
- [x] Condivisione del piano di studio
- [x] Feed iCal, ripassi a intervalli, piani di studio per gli esami
- [x] Palette dei comandi e scorciatoie da tastiera
- [x] Voti, CFU e base di laurea
- [x] Note per argomento con export per Synapse
- [x] Heatmap annuale e pianificato vs studiato
- [x] Cambio password e cancellazione dell'account
- [x] Pausa lunga, avvisi a fine blocco, tipo di attività e focus delle sessioni
- [x] Ripasso adattivo, flashcard con import/export Anki e quaderno degli errori
- [x] Tentativi d'esame, prontezza, piano d'esame pesato e simulatore del voto di laurea
- [x] Time blocking nel calendario e "Cosa studio oggi?"
- [x] Note con anteprima Markdown e formule
- [x] Preferenze sul server, annulla dopo l'eliminazione, export CSV e backup automatico

---

## 🔒 Sicurezza e licenza

Hai trovato una vulnerabilità? Segnalala in privato — vedi [`SECURITY.md`](./SECURITY.md).

StudyOS è distribuito con [licenza MIT](./LICENSE).

---

<div align="center">

**StudyOS — studia per capire, non solo per misurare.**

*Se ti aiuta a studiare meglio, lascia una ⭐ — fa crescere il progetto.*

</div>
