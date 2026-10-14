<div align="center">

# 📚 StudyOS

### Il tuo sistema operativo per lo studio

**Pianifica. Studia. Traccia. Analizza. Migliora.** — tutto in un unico posto.

[![Docker](https://img.shields.io/badge/docker-ready-2496ED?logo=docker&logoColor=white)](./compose.yaml)
[![FastAPI](https://img.shields.io/badge/backend-FastAPI-009688?logo=fastapi&logoColor=white)](./backend)
[![React](https://img.shields.io/badge/frontend-React_19-61DAFB?logo=react&logoColor=black)](./frontend)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](./frontend)
[![SQLite](https://img.shields.io/badge/database-SQLite-003B57?logo=sqlite&logoColor=white)](./database)

[🚀 Quickstart](#-quickstart-3-minuti) · [✨ Funzionalità](#-funzionalità) · [🖼️ Screenshot](#️-screenshot) · [🛠️ Stack](#️-stack-tecnologico) · [📦 Struttura](#-struttura-del-progetto)

</div>

---

## 🎬 Vedi StudyOS in azione

<div align="center">

![Demo di StudyOS](./docs/media/demo.gif)

*Timer Pomodoro → sessione registrata → dashboard e statistiche aggiornate.*

</div>

> Non un altro timer. Non un'altra to-do list.
> **StudyOS collega piano e realtà**: cosa dovevi studiare vs. cosa hai studiato davvero.

---

## ✨ Funzionalità

| | Area | Cosa fa |
|---|---|---|
| 📅 | **Planner** | Task con materia, topic, priorità, scadenze e stato |
| ⏱️ | **Timer Pomodoro** | Focus persistente tra le pagine, salva la sessione a fine blocco |
| 📚 | **Materie & Topic** | Gerarchia `Materia → Topic` collegata a sessioni e progressi |
| 📝 | **Esami** | CRUD completo con scadenze e countdown |
| 🎯 | **Obiettivi** | Minuti settimanali/totali, task, topic, sessioni — progresso calcolato dai dati reali |
| 📊 | **Statistiche** | Tempo totale, per materia/topic, attività giornaliera/settimanale/mensile, streak |
| 🕘 | **Storico** | Sessioni raggruppate per giorno con totali |
| 🔐 | **Auth** | Register/login, refresh cookie-based, sessione ripristinata al reload |

### 🔄 Il ciclo StudyOS

```text
PLAN → STUDY → TRACK → ANALYZE → IMPROVE → PLAN (di nuovo, meglio)
```

Ogni parte alimenta la successiva: un task genera una sessione, la sessione alimenta le statistiche, le statistiche migliorano il piano.

<div align="center">

![Dashboard](./docs/media/dashboard.jpg)

*La dashboard: focus di oggi, scadenze, statistiche compatte, attività recente.*

</div>

---

## 🖼️ Screenshot

| Timer Pomodoro | Statistiche | Materie |
|---|---|---|
| ![Timer](./docs/media/timer.jpg) | ![Statistiche](./docs/media/statistics.jpg) | ![Materie](./docs/media/subjects.jpg) |

| Planner | Esami | Obiettivi |
|---|---|---|
| ![Planner](./docs/media/planner.jpg) | ![Esami](./docs/media/exams.jpg) | ![Obiettivi](./docs/media/goals.jpg) |

| Storico | Login | Mobile |
|---|---|---|
| ![Storico](./docs/media/history.jpg) | ![Login](./docs/media/login.jpg) | ![Mobile](./docs/media/mobile-dashboard.jpg) |

> 📁 Tutte le immagini stanno in [`docs/media/`](./docs/media). Video demo: [`demo.mp4`](./docs/media/demo.mp4).

---

## 🚀 Quickstart (3 minuti)

Serve solo **Docker**. Niente Python o Node installati.

```bash
cp .env.example .env
python3 -c "import secrets; print(secrets.token_urlsafe(48))"  # → incolla come SECRET_KEY in .env
docker compose up --build -d
```

Apri **http://localhost:8080** e registrati. Fatto. 🎉

```bash
docker compose up -d        # avvia
docker compose down         # ferma (dati al sicuro nel volume)
docker compose logs -f api  # log backend (web per nginx)
```

> ⚠️ Mai `docker compose down -v` per routine: cancella il volume con tutti gli utenti e le sessioni.

<details>
<summary><strong>🐳 Dettagli Docker, backup e configurazione</strong></summary>

### Cosa gira

| Servizio | Immagine | Ruolo | Porta |
|---|---|---|---|
| `web` | nginx unprivileged (Alpine) | Serve il frontend, inoltra `/api/*` al backend | `127.0.0.1:8080` (unica pubblicata) |
| `api` | Python 3.14 slim | FastAPI + SQLAlchemy, un processo uvicorn, SQLite dentro | solo rete interna |

Nessun container database: SQLite è un file nel volume `studyos-data` (`/data` in `api`). Il browser parla solo con `http://localhost:8080`, quindi niente CORS e i cookie auth funzionano.

### Dati e backup

- **Docker:** volume `studyos_studyos-data`, `/data/studyos.db` in `api`. Sopravvive a `down`, restart e rebuild.
- **Sviluppo locale:** `database/studyos.db` nel repo. Docker non lo tocca mai.

```bash
# Backup del database Docker
docker compose exec -T api python -c "import sqlite3; sqlite3.connect('/data/studyos.db').backup(sqlite3.connect('/tmp/backup.db'))"
docker compose exec -T api cat /tmp/backup.db > studyos-backup.db

# Import una tantum del DB locale (prima del primo avvio, volume vuoto)
docker compose build
docker compose run --rm --no-deps -T api sh -c 'test ! -e /data/studyos.db && cat > /data/studyos.db' < database/studyos.db
docker compose up -d

# Reset volontario (cancella tutto — backup prima!)
docker compose down
docker volume rm studyos_studyos-data
docker compose up -d
```

### Configurazione (`.env`)

| Variabile | Default | Note |
|---|---|---|
| `SECRET_KEY` | — (obbligatoria) | ≥32 caratteri casuali, unica per installazione |
| `APP_ENV` | `development` | `production` = cookie `Secure`, solo dietro HTTPS |
| `ACCESS_TOKEN_EXPIRE_MINUTES` / `REFRESH_TOKEN_EXPIRE_DAYS` | `30` / `7` | |
| `STUDYOS_PORT` | `8080` | Bind su 127.0.0.1 |
| `STUDYOS_ORIGIN` | `http://localhost:<port>` | Origine pubblica se diversa |
| `API_MEMORY_LIMIT` / `API_CPUS` | `256M` / `1.0` | Limiti container |
| `WEB_MEMORY_LIMIT` / `WEB_CPUS` | `64M` / `0.5` | Limiti container |

**HTTPS:** setup di default = HTTP su localhost. In produzione: proxy TLS davanti, `APP_ENV=production`, `STUDYOS_ORIGIN=https://…`.

</details>

---

## 🛠️ Stack tecnologico

| Layer | Tecnologie |
|---|---|
| **Frontend** | React 19 · TypeScript · Vite · React Router · lucide-react · CSS vanilla con design token |
| **Backend** | FastAPI · SQLAlchemy · Pydantic · PyJWT · pwdlib (argon2) · uvicorn |
| **Database** | SQLite (file nel volume Docker, `database/studyos.db` in locale) |
| **Deploy** | Docker Compose · nginx (statici + proxy `/api`) · immagini multi-stage |

**Design:** dark-first, superfici quasi-nere, accento viola, flat (no gradienti), transizioni 160 ms, `prefers-reduced-motion` rispettato, target touch 44 px, breakpoint 700/900 px. Token in `frontend/src/styles/base/tokens.css`.

---

## 📦 Struttura del progetto

```text
StudyOS/
├── compose.yaml          # setup produzione (nginx + api)
├── .env.example          # template variabili
├── backend/
│   ├── main.py           # entry FastAPI + mount router
│   ├── config.py / database.py
│   ├── models/           # tabelle SQLAlchemy
│   ├── schemas/          # validazione Pydantic
│   ├── services/         # logica di business
│   ├── routers/          # endpoint HTTP (solo orchestrazione)
│   └── tests/            # pytest su SQLite temporaneo
├── frontend/
│   └── src/
│       ├── pages/        # dashboard, timer, planner, subjects, exams, goals, history, statistics
│       ├── components/   # sidebar, pomodoro, form, UI kit
│       ├── context/      # auth + timer persistente
│       └── styles/       # base / layout / componenti / schermate
├── database/             # studyos.db locale (mai toccato da Docker)
└── docs/media/           # screenshot + demo
```

**Regola d'oro:** router orchestra, service ragiona, schema valida. Dettagli in [`DEVELOPMENT_GUIDE.md`](./DEVELOPMENT_GUIDE.md).

### Sviluppo locale (hot reload)

```bash
cd backend && pip install -r requirements-dev.txt && uvicorn main:app --reload  # :8000
cd frontend && npm install && npm run dev                                        # :5173
```

Test backend: `python -m pytest backend/tests/ -q`

---

## 🗺️ Roadmap

- [x] Auth, materie/topic, task, esami, sessioni, obiettivi, statistiche
- [ ] Calendario integrato e pianificazione settimanale
- [ ] Import/export dati e backup one-click
- [ ] Notifiche scadenze e reminder intelligenti
- [ ] Condivisione piani di studio

---

<div align="center">

**StudyOS — studia in modo che puoi capire, non solo misurare.**

*Se ti aiuta a studiare meglio, lascia una ⭐ — è carburante per il progetto.*

</div>
