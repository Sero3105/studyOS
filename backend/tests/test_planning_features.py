"""Sezione 2.2: rinomina, colori, ricorrenze, obiettivi per materia, ripristino backup."""
from datetime import date, timedelta

from conftest import register_and_login
from services.task_service import next_due


def _h(client, email):
    return {"Authorization": f"Bearer {register_and_login(client, email)['access_token']}"}


def test_rename_subject_keeps_exam_link(client):
    h = _h(client, "rename@example.com")
    exam = client.post("/exams", json={"title": "Scritto", "subject": "Analisi I"}, headers=h).json()
    assert exam["subject_id"] is None
    s = client.post("/subjects", json={"name": "analisi i"}, headers=h).json()  # adotta l'esame con lo stesso nome
    assert client.get("/exams", headers=h).json()[0]["subject_id"] == s["id"]

    r = client.patch(f"/subjects/{s['id']}", json={"name": "Analisi 1", "color": "blue"}, headers=h)
    assert r.status_code == 200 and r.json()["name"] == "Analisi 1" and r.json()["color"] == "blue"
    assert client.get("/exams", headers=h).json()[0]["subject"] == "Analisi 1"
    assert client.patch(f"/subjects/{s['id']}", json={"color": "magenta"}, headers=h).status_code == 422
    assert client.patch(f"/subjects/{s['id']}", json={"name": None}, headers=h).status_code == 422

    client.delete(f"/subjects/{s['id']}", headers=h)
    assert client.get("/exams", headers=h).json()[0]["subject_id"] is None


def test_recurring_task_creates_next_once(client):
    h = _h(client, "recur@example.com")
    today = date.today()
    t = client.post("/tasks", json={"title": "Esercizi", "due_date": today.isoformat(), "recurrence": "daily"}, headers=h).json()
    client.patch(f"/tasks/{t['id']}", json={"status": "done"}, headers=h)
    client.patch(f"/tasks/{t['id']}", json={"status": "todo"}, headers=h)
    client.patch(f"/tasks/{t['id']}", json={"status": "done"}, headers=h)
    open_tasks = [x for x in client.get("/tasks", headers=h).json() if x["status"] != "done"]
    assert [(x["due_date"], x["recurrence"]) for x in open_tasks] == [((today + timedelta(days=1)).isoformat(), "daily")]
    assert client.post("/tasks", json={"title": "x", "recurrence": "weekly:8"}, headers=h).status_code == 422


def test_next_due():
    wed = date(2026, 10, 28)
    assert next_due("daily", wed, wed) == date(2026, 10, 29)
    assert next_due("daily", date(2026, 10, 20), wed) == wed  # in ritardo: oggi, non nel passato
    assert next_due("weekly:1,3", wed, wed) == date(2026, 11, 2)  # mercoledì → lunedì dopo
    assert next_due("weekly:5", None, wed) == date(2026, 10, 30)


def test_goal_per_subject_with_deadline(client):
    h = _h(client, "goalsub@example.com")
    fis = client.post("/subjects", json={"name": "Fisica"}, headers=h).json()
    other = client.post("/subjects", json={"name": "Storia"}, headers=h).json()
    today = date.today()
    for sid, day, minutes in [(fis["id"], today, 60), (other["id"], today, 30), (fis["id"], today + timedelta(days=5), 45)]:
        client.post("/sessions", json={"subject_id": sid, "duration_minutes": minutes, "studied_on": day.isoformat()}, headers=h)
    g = client.post("/goals", json={"title": "Fisica", "kind": "total_minutes", "target": 120,
                                    "subject_id": fis["id"], "deadline": (today + timedelta(days=1)).isoformat()}, headers=h).json()
    assert (g["current"], g["percent"], g["subject_id"]) == (60, 50, fis["id"])
    assert client.post("/goals", json={"title": "x", "kind": "total_minutes", "target": 1, "subject_id": 9999}, headers=h).status_code == 422


def test_import_replace_restores_without_duplicates(client):
    h = _h(client, "restore@example.com")
    s = client.post("/subjects", json={"name": "Chimica", "color": "green"}, headers=h).json()
    client.post("/goals", json={"title": "g", "kind": "topics_done", "target": 3, "subject_id": s["id"]}, headers=h)
    client.post("/tasks", json={"title": "t", "subject_id": s["id"], "recurrence": "weekly:2"}, headers=h)
    backup = client.get("/data/export", headers=h).json()
    client.post("/subjects", json={"name": "Da buttare"}, headers=h)

    assert client.post("/data/import?replace=true", json=backup, headers=h).status_code == 200
    assert client.post("/data/import?replace=true", json=backup, headers=h).status_code == 200
    subjects = client.get("/subjects", headers=h).json()
    assert [(x["name"], x["color"]) for x in subjects] == [("Chimica", "green")]
    assert len(client.get("/tasks", headers=h).json()) == 1
    assert client.get("/tasks", headers=h).json()[0]["recurrence"] == "weekly:2"
    assert client.get("/goals", headers=h).json()[0]["subject_id"] == subjects[0]["id"]
