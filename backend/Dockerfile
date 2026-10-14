# syntax=docker/dockerfile:1

# Backend StudyOS: FastAPI + SQLAlchemy su SQLite, un solo processo uvicorn.
#
# Stage 1 installa le dipendenze in un virtualenv; lo stage finale copia solo
# il virtualenv e il codice: niente cache di pip, niente strumenti di build,
# niente test. Il database NON è nell'immagine: vive nel volume montato su /data.
#
# Immagini: tag minor fissato (3.14, Debian trixie slim) per ricevere le patch
# di sicurezza a ogni rebuild. Per build bit-a-bit riproducibili si può
# fissare anche il digest (python:3.14-slim-trixie@sha256:...).

FROM python:3.14-slim-trixie AS deps
ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
RUN python -m venv /opt/venv
COPY requirements.txt /tmp/requirements.txt
RUN /opt/venv/bin/pip install -r /tmp/requirements.txt \
 && /opt/venv/bin/pip uninstall -y pip


FROM python:3.14-slim-trixie

ENV PATH=/opt/venv/bin:$PATH \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Utente senza privilegi; /data è la cartella del database (volume persistente).
RUN groupadd --system --gid 10001 studyos \
 && useradd --system --uid 10001 --gid studyos --no-create-home \
      --home-dir /nonexistent --shell /usr/sbin/nologin studyos \
 && mkdir /data \
 && chown studyos:studyos /data

COPY --from=deps /opt/venv /opt/venv

WORKDIR /app
COPY . .
# Bytecode compilato in build: a runtime il filesystem è in sola lettura.
RUN python -m compileall -q /app

USER studyos
EXPOSE 8000

# Un solo worker: SQLite non beneficia di più processi che scrivono sullo
# stesso file. uvicorn gestisce SIGTERM e chiude le richieste in corso.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--no-server-header", "--timeout-graceful-shutdown", "10"]
