"""Sezione 2.2: rinomina, colori, ricorrenze, obiettivi per materia, ripristino backup."""
from datetime import date, timedelta

from conftest import register_and_login


def _h(client, email):
    return {"Authorization": f"Bearer {register_and_login(client, email)['access_token']}"}


def test_rename_subject_keeps_exam_link(client):
    h = _h(client, "rename@example.com")
    exam = client.post("/exams", json={"title": "Scritto", "subject": "Analisi I"}, headers=h).json()
    assert exam["subject_id"] is None
    s = client.post("/subjects", json={"name": "analisi i"}, headers=h).json()  # adotta l'esame con lo stesso nome
    assert client.get("/exams", headers=h).json()[0]["subject_id"] == s["id"]

    r = client.patch(f"/subjects/{s['id']}", json={"name": "Analisi 1"}, headers=h)
    assert r.status_code == 200 and r.json()["name"] == "Analisi 1"
    assert client.get("/exams", headers=h).json()[0]["subject"] == "Analisi 1"
    assert client.patch(f"/subjects/{s['id']}", json={"name": None}, headers=h).status_code == 422

    client.delete(f"/subjects/{s['id']}", headers=h)
    assert client.get("/exams", headers=h).json()[0]["subject_id"] is None
