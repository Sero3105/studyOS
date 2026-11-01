<!-- markdownlint-disable MD033 MD041 MD060 -->

<div align="center">

# 📚 StudyOS

## Your operating system for studying

**Plan. Study. Track. Analyze. Improve.** — all in one place.

[![Docker](https://img.shields.io/badge/docker-ready-2496ED?logo=docker&logoColor=white)](./compose.yaml)
[![FastAPI](https://img.shields.io/badge/backend-FastAPI-009688?logo=fastapi&logoColor=white)](./backend)
[![React](https://img.shields.io/badge/frontend-React_19-61DAFB?logo=react&logoColor=black)](./frontend)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](./frontend)
[![SQLite](https://img.shields.io/badge/database-SQLite-003B57?logo=sqlite&logoColor=white)](./database)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

**English** · [Italiano](./README.it.md)

[🚀 Quickstart](#-quickstart-3-minutes) · [✨ Features](#-features) · [🖼️ Screenshots](#️-screenshots) · [🛠️ Tech Stack](#️-tech-stack) · [📦 Project Structure](#-project-structure)

</div>

---

## 🎬 See StudyOS in action

<div align="center">

![StudyOS demo](./docs/media/demo.gif)

*Pomodoro timer → session recorded → dashboard and statistics updated.*

</div>

> Not just another timer. Not just another to-do list.  
> **StudyOS connects plans with reality**: what you planned to study versus what you actually studied.

---

## ✨ Features

| | Area | What it does |
|---|---|---|
| 🧭 | **What do I study today?** | On the dashboard: time blocks, reviews, flashcards, due tasks and the least-studied topic of the next exam, each one a click away |
| 📅 | **Planner** | Tasks with subject, topic, priority, deadline, status and recurrence; ▶ starts the timer on a task |
| ⏱️ | **Pomodoro Timer** | Keeps running across pages, long break every N blocks, sound and notification when a block ends, activity type and focus for each block |
| 📚 | **Subjects & Topics** | `Subject → Topic` hierarchy, Markdown notes with preview and formulas (KaTeX), difficulty per topic and adaptive reviews: Hard / Ok / Easy decides when the next one comes |
| 🃏 | **Flashcards** | Spaced repetition with keyboard shortcuts, cards from notes (`question :: answer`), Anki or CSV import and export, mistakes notebook |
| 📝 | **Exams** | Countdowns, exam readiness, study plan weighted by difficulty and hours already studied (with rest days), outcome and attempts (failed or rejected) |
| 🎓 | **Record book** | Simple and weighted average, graduation base, configurable degree CFU, grade trend and graduation grade simulator |
| 🎯 | **Goals** | Weekly/total minutes, tasks, topics, sessions — progress calculated from real data |
| 📊 | **Statistics** | Totals, time by subject, topic and activity type, average focus, streaks, one-year heatmap, best hours, planned vs studied, CSV export |
| 🕘 | **History** | Sessions grouped by day with totals; sessions added or fixed by hand |
| 🗓️ | **Calendar** | Week and month views of exams, deadlines and minutes studied; time blocking (drag tasks onto days, time and duration per block); iCal feed for Apple/Google Calendar and Outlook |
| 💾 | **Backups** | One-click JSON export, import that adds or restores, automatic daily copy of the database (last 7 files) |
| 🔔 | **Reminders** | Daily browser notification for overdue/upcoming tasks and exams at 7/3/1/0 days |
| 🔗 | **Sharing** | Revocable read-only link to your study plan (no notes, locations or email) |
| ⌨️ | **Command palette** | `⌘K` / `Ctrl+K` to search tasks, exams and topics; `g` + letter to jump between pages, `n` for a new task |
| 🧠 | **Synapse notes** | Export topic notes as a linked Markdown vault for [Synapse](https://github.com/Sero3105/Synapse) |
| ⚙️ | **Preferences** | Theme, degree CFU, rest days and alerts stored on the server: they follow you to every browser; "Undo" after every delete |
| 🔐 | **Account** | Registration/login, cookie-based refresh, password change, account deletion |

### 🔄 The StudyOS cycle

```text
PLAN → STUDY → TRACK → ANALYZE → IMPROVE → PLAN (again, better)
```

Each part feeds the next: a task leads to a session, the session powers the statistics, and the statistics help improve the plan.

<div align="center">

![Dashboard](./docs/media/dashboard.jpg)

*The dashboard: today's focus, "What do I study today?", deadlines and the last 7 days.*

</div>

---

## 🖼️ Screenshots

| Pomodoro Timer | Calendar | Subjects & notes |
|---|---|---|
| ![Timer](./docs/media/timer.jpg) | ![Calendar](./docs/media/calendar.jpg) | ![Subjects](./docs/media/subjects.jpg) |

| Exams & record book | Statistics | One-year heatmap |
|---|---|---|
| ![Exams](./docs/media/exams.jpg) | ![Statistics](./docs/media/statistics.jpg) | ![Heatmap](./docs/media/heatmap.jpg) |

| Planner | Command palette | Goals |
|---|---|---|
| ![Planner](./docs/media/planner.jpg) | ![Command palette](./docs/media/palette.jpg) | ![Goals](./docs/media/goals.jpg) |

| Flashcards | History | Settings |
|---|---|---|
| ![Flashcards](./docs/media/cards.jpg) | ![History](./docs/media/history.jpg) | ![Settings](./docs/media/settings.jpg) |

| Login | Mobile dashboard | Mobile timer |
|---|---|---|
| ![Login](./docs/media/login.jpg) | ![Mobile dashboard](./docs/media/mobile-dashboard.jpg) | ![Mobile timer](./docs/media/mobile-timer.jpg) |

> 📁 All images are in [`docs/media/`](./docs/media). Demo video: [`demo.mp4`](./docs/media/demo.mp4).

---

## 🚀 Quickstart (3 minutes)

All you need is **Docker**. No Python or Node installation required.

```bash
cp .env.example .env
python3 -c "import secrets; print(secrets.token_urlsafe(48))"  # → paste as SECRET_KEY in .env
docker compose up --build -d
```

Open **<http://localhost:8080>** and create an account. That’s it. 🎉

```bash
docker compose up -d        # start
docker compose down         # stop (data remains safe in the volume)
docker compose logs -f api  # backend logs (web for nginx)
```

> ⚠️ Don’t use `docker compose down -v` as part of your regular workflow: it deletes the volume containing all users and sessions.

<details>
<summary><strong>🐳 Docker, backups, and configuration details</strong></summary>

### What runs

| Service | Image | Role | Port |
|---|---|---|---|
| `web` | nginx unprivileged (Alpine) | Serves the frontend and forwards `/api/*` to the backend | `127.0.0.1:8080` (only published port) |
| `api` | Python 3.14 slim | FastAPI + SQLAlchemy, one uvicorn process, SQLite included | Internal network only |
| `backup` | same image as `api` | Copies the database every day to `./backups` and keeps the last 7 files | None |

There is no database container: SQLite is a file in the `studyos-data` volume (`/data` in `api`). The browser communicates only with `http://localhost:8080`, so no CORS is needed and auth cookies work.

### Data and backups

- **Docker:** volume `studyos_studyos-data`, mounted at `/data/studyos.db` in `api`. It survives `down`, restarts, and rebuilds.
- **Local development:** `database/studyos.db` in the repository. Docker never touches it.

The `backup` service copies the database once a day to `./backups` (on disk, outside the volume) and keeps the last 7 files; change the folder with `STUDYOS_BACKUP_DIR`. On Linux, make it writable by the container: `mkdir backups && sudo chown 10001 backups`. To restore one (replaces the current data):

```bash
docker compose stop api
docker compose run --rm --no-deps -T api sh -c 'cat > /data/studyos.db' < backups/studyos-YYYY-MM-DD.db
docker compose up -d
```

The easiest backup is **Settings → Download backup** in the app. To copy the whole database file:

```bash
# Back up the Docker database
docker compose exec -T api python -c "import sqlite3; sqlite3.connect('/data/studyos.db').backup(sqlite3.connect('/tmp/backup.db'))"
docker compose exec -T api cat /tmp/backup.db > studyos-backup.db

# One-time import of the local database (before first startup, with an empty volume)
docker compose build
docker compose run --rm --no-deps -T api sh -c 'test ! -e /data/studyos.db && cat > /data/studyos.db' < database/studyos.db
docker compose up -d

# Intentional reset (deletes everything — back up first!)
docker compose down
docker volume rm studyos_studyos-data
docker compose up -d
```

### Configuration (`.env`)

| Variable | Default | Notes |
|---|---|---|
| `SECRET_KEY` | — (required) | At least 32 random characters, unique to each installation |
| `APP_ENV` | `development` | `production` = `Secure` cookies, HTTPS only, no `/docs` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` / `REFRESH_TOKEN_EXPIRE_DAYS` | `30` / `7` | |
| `STUDYOS_PORT` | `8080` | Bound to 127.0.0.1 |
| `STUDYOS_ORIGIN` | `http://localhost:<port>` | Public origin if different |
| `API_MEMORY_LIMIT` / `API_CPUS` | `256M` / `1.0` | Container limits |
| `WEB_MEMORY_LIMIT` / `WEB_CPUS` | `64M` / `0.5` | Container limits |

**Security:** nginx rate-limits `/api/auth/login` and `/api/auth/register` (10/min per IP). Share links are random 256-bit tokens stored only as hashes; regenerating or disabling a link invalidates the old one.

**HTTPS:** The default setup uses HTTP on localhost. In production, put a TLS proxy in front, set `APP_ENV=production`, and configure `STUDYOS_ORIGIN=https://…`.

</details>

---

## 🛠️ Tech stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19 · TypeScript · Vite · React Router · lucide-react · Recharts · marked + KaTeX + DOMPurify (notes) · vanilla CSS with design tokens |
| **Backend** | FastAPI · SQLAlchemy · Alembic · Pydantic · PyJWT · pwdlib (argon2) · uvicorn |
| **Database** | SQLite (file in the Docker volume, `database/studyos.db` locally) |
| **Deployment** | Docker Compose · nginx (static files + `/api` proxy) · multi-stage images |

**Design:** dark-first, near-black surfaces, a single lime accent, flat (no gradients), 160 ms transitions, `prefers-reduced-motion` respected, 44 px touch targets, 700/900 px breakpoints. Tokens are in `frontend/src/styles/base/tokens.css`.

---

## 📦 Project structure

```text
StudyOS/
├── compose.yaml          # production setup (nginx + api + daily backup)
├── .env.example          # environment variable template
├── backend/
│   ├── main.py           # FastAPI entry point + router mounting
│   ├── config.py / database.py
│   ├── models/           # SQLAlchemy tables
│   ├── schemas/          # Pydantic validation
│   ├── services/         # business logic
│   ├── routers/          # HTTP endpoints (orchestration only)
│   ├── migrations/       # Alembic schema migrations
│   └── tests/            # pytest with temporary SQLite database
├── frontend/
│   └── src/
│       ├── pages/        # dashboard, timer, planner, calendar, subjects, exams, flashcards, goals, history, statistics, settings, shared plan
│       ├── components/   # sidebar, Pomodoro, forms, UI kit
│       ├── context/      # auth, persistent timer, undo after delete
│       ├── utils/        # tested pure logic: dates, grades, today plan, readiness, CSV, Anki
│       └── styles/       # base / layout / components / screens
├── database/             # local studyos.db (never touched by Docker)
└── docs/                 # screenshots, demo, design notes
```

**Golden rule:** routers orchestrate, services handle logic, schemas validate. See [`DEVELOPMENT_GUIDE.md`](./DEVELOPMENT_GUIDE.md) for details.

### Local development (hot reload)

Run these commands in separate terminals from the repository root:

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

Backend tests: `python -m pytest backend/tests/ -q` · frontend tests: `cd frontend && npm test`

**Database migrations (Alembic).** The API applies pending migrations on startup, including on databases created before Alembic was added. After changing a model in `backend/models/`:

```bash
cd backend
alembic revision --autogenerate -m "describe the change"   # review the generated file in migrations/versions/
```

---

## 🗺️ Roadmap

- [x] Auth, subjects/topics, tasks, exams, sessions, goals, statistics
- [x] Integrated calendar and weekly planning
- [x] Data import/export and one-click backups
- [x] Deadline notifications and smart reminders
- [x] Study plan sharing
- [x] iCal feed, spaced reviews, exam study plans
- [x] Command palette and keyboard shortcuts
- [x] Grades, CFU and graduation base
- [x] Topic notes with Synapse export
- [x] Yearly heatmap and planned vs studied
- [x] Password change and account deletion
- [x] Long breaks, end-of-block alerts, session activity type and focus
- [x] Adaptive reviews, flashcards with Anki import/export and a mistakes notebook
- [x] Exam attempts, readiness, weighted exam plan and graduation grade simulator
- [x] Calendar time blocking and "What do I study today?"
- [x] Notes with Markdown preview and formulas
- [x] Server-side preferences, undo after delete, CSV export and automatic backups

---

## 🔒 Security & license

Found a vulnerability? Please report it privately — see [`SECURITY.md`](./SECURITY.md).

StudyOS is released under the [MIT License](./LICENSE).

---

<div align="center">

**StudyOS — study so you can understand, not just measure.**

*If it helps you study better, leave a ⭐ — it keeps the project going.*

</div>
