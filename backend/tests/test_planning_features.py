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
