# StudyOS

> A personal study operating system designed to help students plan, manage, track, and improve their study.

## 📚 What is StudyOS?

**StudyOS** is a study management platform designed to bring the different aspects of studying into a single environment.

It is not simply a Pomodoro timer or a task manager.

The goal is to create a complete **"operating system for studying"**, where students can organize their academic activities, plan their time, track what they actually study, and analyze their progress over time.

StudyOS is built around a simple idea:

> **Plan your study. Track what you do. Understand your progress. Improve your habits.**

---

# 🎯 Objective

The main objective of StudyOS is to help students study in a more **organized, measurable, and conscious way**.

Students often use multiple tools to manage their studies:

- A calendar for deadlines
- A to-do list for assignments
- A timer for study sessions
- Notes for planning
- Spreadsheets for tracking progress
- Other applications for statistics and productivity

StudyOS aims to bring these different aspects together into one coherent system.

Instead of only tracking **how long** a student studies, StudyOS aims to provide a broader picture of their study process.

For example:

- What should I study?
- What do I need to complete?
- When should I study it?
- How much time am I actually spending on each subject?
- Am I following my plan?
- Which subjects require more attention?
- How consistent am I?
- How is my progress changing over time?

---

# 🧩 What StudyOS Does

StudyOS is designed around several interconnected areas.

## 📅 Planning

StudyOS allows students to organize their study activities and plan what they need to do.

Planning can include:

- Subjects
- Topics
- Tasks
- Assignments
- Deadlines
- Study sessions
- Goals

The purpose is to transform a student's academic workload into an organized and manageable plan.

---

## 📝 Tasks

Students can keep track of the things they need to complete.

Tasks can be associated with specific subjects or areas of study and can include information such as:

- Title
- Description
- Deadline
- Priority
- Status
- Subject
- Topic

This allows academic work to be managed in one centralized place.

---

## 📚 Subjects & Topics

StudyOS organizes studying around subjects and topics.

For example:

```text
Computer Networks
│
├── HTTP
├── TCP/IP
├── DNS
└── Routing
```

This structure allows study activity and progress to be connected to the actual content being studied.

---

## ⏱️ Study Sessions

StudyOS tracks actual study activity through study sessions.

A session can contain information such as:

```text
Subject: Computer Networks
Topic: HTTP
Duration: 1h 30m
Date: September 16
```

This makes it possible to distinguish between what a student **planned to study** and what they **actually studied**.

---

## 🎯 Goals

Students can define personal study goals.

For example:

```text
Complete the HTTP chapter
Study 15 hours this week
Finish the Database assignment
Prepare for the Mathematics exam
```

Goals provide a way to define objectives and measure progress toward them.

---

## 📊 Progress & Statistics

StudyOS collects information about study activity and turns it into useful statistics.

Examples include:

- Total study time
- Study time by subject
- Study time by topic
- Daily activity
- Weekly activity
- Monthly activity
- Completed tasks
- Goal progress
- Study consistency

The purpose is not simply to display numbers.

The objective is to help students **understand their study behavior**.

---

# 🔄 The StudyOS Cycle

The platform is built around a continuous cycle:

```text
       ┌──────────┐
       │   PLAN   │
       └────┬─────┘
            │
            ▼
       ┌──────────┐
       │  STUDY   │
       └────┬─────┘
            │
            ▼
       ┌──────────┐
       │  TRACK   │
       └────┬─────┘
            │
            ▼
       ┌──────────┐
       │ ANALYZE  │
       └────┬─────┘
            │
            ▼
       ┌──────────┐
       │ IMPROVE  │
       └────┬─────┘
            │
            └──────────► PLAN
```

This is the core philosophy behind StudyOS.

The system should not only help students **do more**.

It should help them understand **how they study** and make better decisions about their time.

---

# 📈 Long-Term Vision

The long-term vision of StudyOS is to become a complete personal **study operating system**.

The platform should eventually connect:

```text
                    STUDYOS
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
     PLANNING       TRACKING       ANALYTICS
        │              │              │
        ▼              ▼              ▼
      Tasks        Sessions       Statistics
      Goals        Time           Progress
      Calendar     Activity       Trends
        │              │              │
        └──────────────┼──────────────┘
                       │
                       ▼
                BETTER STUDYING
```

The idea is to create a system where every part of the study process is connected.

A task can lead to a study session.

A study session contributes to progress.

Progress generates statistics.

Statistics can then help improve future planning.

---

# 💡 Core Idea

StudyOS is based on a simple principle:

> **Studying should be something you can understand, not just something you can measure.**

A timer can tell you that you studied for two hours.

A task manager can tell you that you have three assignments left.

A calendar can tell you that an exam is next week.

StudyOS aims to connect all of this information and provide a complete picture of the student's study process.

---

# 🚀 Vision

StudyOS aims to become a centralized environment where a student can:

**Plan → Study → Track → Analyze → Improve**

all within the same system.

The ultimate goal is to make studying more **organized, measurable, and adaptive**, while keeping the experience simple enough to use every day.

---

# 🐳 Run with Docker

StudyOS runs entirely in Docker. You don't need Python or Node.js on your machine.

## What runs

| Service | Image | Role | Port |
| --- | --- | --- | --- |
| `web` | nginx (unprivileged, Alpine) | Serves the built frontend and forwards `/api/*` to the backend | `127.0.0.1:8080` (the only published port) |
| `api` | Python 3.14 slim | FastAPI + SQLAlchemy, one uvicorn process; SQLite runs inside it | internal only |

There is no database container. SQLite is a file inside the named volume `studyos-data`, mounted at `/data` in `api`.

The browser only talks to `http://localhost:8080`. API calls go to `/api/...` on the same origin, so no CORS is involved and the auth cookies work unchanged. nginx rewrites the refresh cookie path from `/auth` to `/api/auth`.

## First run

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine with the Compose plugin.
2. Create the environment file and set a real secret:

   ```bash
   cp .env.example .env
   python3 -c "import secrets; print(secrets.token_urlsafe(48))"   # paste the output as SECRET_KEY in .env
   ```

   `SECRET_KEY` is required: Compose refuses to start without it, and the backend refuses the placeholder value. `.env` is git-ignored and never copied into an image.
3. Start:

   ```bash
   docker compose up --build -d
   ```

4. Open **<http://localhost:8080>** and register an account.

## Everyday commands

```bash
docker compose up -d              # start (after the first build)
docker compose down               # stop and remove containers; data stays in the volume
docker compose up --build -d      # rebuild images after code changes; data stays
docker compose ps                 # status and health
docker compose logs -f api        # follow backend logs (web for nginx)
docker stats                      # live RAM/CPU per container
docker image ls studyos-*         # image sizes
```

> ⚠️ Never use `docker compose down -v` for routine work: `-v` deletes the `studyos-data` volume, and with it every user and every study session.

## Where the data lives

- **Docker:** in the named volume `studyos_studyos-data`, at `/data/studyos.db` inside `api`. The volume survives `down`, restarts, container recreation and image rebuilds.
- **Local development:** `database/studyos.db` in the repository, as before. Docker never reads or writes this file.

### Back up the Docker database

```bash
docker compose exec -T api python -c "import sqlite3; sqlite3.connect('/data/studyos.db').backup(sqlite3.connect('/tmp/backup.db'))"
docker compose exec -T api cat /tmp/backup.db > studyos-backup.db
```

### Import an existing local database (explicit, one time)

Docker never copies your personal database automatically. To move `database/studyos.db` into Docker, do it **before the first start**, so the volume is still empty:

```bash
docker compose build
docker compose run --rm --no-deps -T api sh -c 'test ! -e /data/studyos.db && cat > /data/studyos.db' < database/studyos.db
docker compose up -d
```

The `test ! -e` guard refuses to overwrite a database that already exists in the volume. If Docker has already created one, back it up first (see above), then remove the volume as described in the next section.

### Reset a disposable database

This deletes all Docker data on purpose. Back up first if anything matters.

```bash
docker compose down
docker volume rm studyos_studyos-data
docker compose up -d
```

## Configuration

All values come from `.env` (see `.env.example`):

| Variable | Default | Notes |
| --- | --- | --- |
| `SECRET_KEY` | — (required) | At least 32 random characters, unique per installation |
| `APP_ENV` | `development` | `production` marks cookies `Secure`: use it only behind HTTPS |
| `ACCESS_TOKEN_EXPIRE_MINUTES` / `REFRESH_TOKEN_EXPIRE_DAYS` | `30` / `7` | |
| `STUDYOS_PORT` | `8080` | Host port, bound to 127.0.0.1 only |
| `STUDYOS_ORIGIN` | `http://localhost:<port>` | Public origin, if StudyOS is served elsewhere |
| `API_MEMORY_LIMIT` / `API_CPUS` | `256M` / `1.0` | Container limits |
| `WEB_MEMORY_LIMIT` / `WEB_CPUS` | `64M` / `0.5` | Container limits |

In Docker, `DATABASE_URL` and `FRONTEND_ORIGINS` are set by `compose.yaml`. The `DATABASE_URL` in your `.env`, used for local development, does not apply inside the containers.

**HTTPS:** the default setup is plain HTTP on localhost, intended for local use. For a real deployment, put StudyOS behind a TLS-terminating proxy, set `APP_ENV=production` and set `STUDYOS_ORIGIN` to the `https://` address.

## Resources

- Builds are multi-stage. Node, `node_modules`, TypeScript, pip caches and tests stay in the build stages; the runtime images contain only nginx with the static files, and Python with the app's dependencies.
- One uvicorn process. SQLite does not benefit from several writers on the same file.
- Memory and CPU limits are conservative defaults, adjustable in `.env`. Lower them only after checking `docker stats` on your machine.
- Container logs are capped at 3 × 10 MB per service.
- Hardening: non-root users, read-only root filesystems (only `/data` and a small `/tmp` are writable), all Linux capabilities dropped, `no-new-privileges`, no Docker socket, no host networking.

## Development vs production

- **Docker (`compose.yaml`)** is the production-style setup: one build, static files served by nginx, no dev servers, no hot reload, no source mounts.
- **Development** still uses the local workflow described in `DEVELOPMENT_GUIDE.md`: `uvicorn main:app --reload` plus `npm run dev`, with hot reload, on `http://localhost:5173`.
