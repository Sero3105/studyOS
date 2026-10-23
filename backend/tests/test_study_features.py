import io
import zipfile
from datetime import date, timedelta

from conftest import register_and_login


def _headers(client, email):
    return {"Authorization": f"Bearer {register_and_login(client, email)['access_token']}"}


def _day(n):
    return (date.today() + timedelta(days=n)).isoformat()


def test_completing_topic_schedules_reviews_once(client):
    h = _headers(client, "r1@example.com")
    s = client.post("/subjects", json={"name": "Chimica"}, headers=h).json()
    t = client.post(f"/subjects/{s['id']}/topics", json={"title": "Legami"}, headers=h).json()
    client.patch(f"/topics/{t['id']}", json={"completed": True, "schedule_reviews": True}, headers=h)
    client.patch(f"/topics/{t['id']}", json={"completed": True, "schedule_reviews": True}, headers=h)  # già completato
    due = sorted(x["due_date"] for x in client.get("/tasks", headers=h).json())
    assert due == [_day(1), _day(3), _day(7), _day(21)]
    client.patch(f"/topics/{t['id']}", json={"notes": "# Ionici\n- NaCl"}, headers=h)
    assert client.get("/subjects", headers=h).json()[0]["topics"][0]["notes"].startswith("# Ionici")


def test_exam_plan_spreads_open_topics(client):
    h = _headers(client, "p1@example.com")
    s = client.post("/subjects", json={"name": "Fisica"}, headers=h).json()
    for title in ["Cinematica", "Dinamica", "Energia"]:
        client.post(f"/subjects/{s['id']}/topics", json={"title": title}, headers=h)
    exam = client.post("/exams", json={"title": "Scritto", "subject": "fisica", "exam_date": _day(7)}, headers=h).json()
    tasks = client.post(f"/exams/{exam['id']}/plan", headers=h).json()
    assert [t["due_date"] for t in tasks] == [_day(1), _day(3), _day(5)]
    assert client.post(f"/exams/{exam['id']}/plan", headers=h).json() == []  # niente doppioni
    near = client.post("/exams", json={"title": "X", "subject": "Fisica", "exam_date": _day(1)}, headers=h).json()
    assert client.post(f"/exams/{near['id']}/plan", headers=h).json()["detail"] == "too_close"
    other = client.post("/exams", json={"title": "Y", "subject": "Storia", "exam_date": _day(9)}, headers=h).json()
    assert client.post(f"/exams/{other['id']}/plan", headers=h).json()["detail"] == "no_subject"


def test_exam_grades_validation(client):
    h = _headers(client, "g1@example.com")
    base = {"title": "Algebra", "subject": "Algebra", "exam_date": "2026-01-10", "status": "passed", "cfu": 9}
    assert client.post("/exams", json=base | {"grade": 28}, headers=h).status_code == 201
    assert client.post("/exams", json=base | {"grade": 28, "honors": True}, headers=h).status_code == 422
    assert client.post("/exams", json=base | {"grade": 17}, headers=h).status_code == 422
    exam = client.post("/exams", json=base | {"grade": 30, "honors": True}, headers=h).json()
    assert client.patch(f"/exams/{exam['id']}", json={"grade": 29}, headers=h).status_code == 422


def test_calendar_feed(client):
    h = _headers(client, "c1@example.com")
    client.post("/exams", json={"title": "Analisi, scritto", "subject": "Analisi", "exam_date": _day(5), "exam_time": "09:30", "notes": "segreto"}, headers=h)
    client.post("/tasks", json={"title": "Esercizi", "due_date": _day(2)}, headers=h)
    token = client.post("/calendar-feed", headers=h).json()["token"]
    ics = client.get(f"/calendar/{token}.ics")
    assert ics.status_code == 200 and ics.headers["content-type"].startswith("text/calendar")
    body = ics.text
    assert "SUMMARY:Analisi\\, scritto" in body and "T093000" in body and "SUMMARY:Esercizi" in body
    assert "segreto" not in body and all(len(l.encode()) <= 75 for l in body.split("\r\n"))
    client.delete("/calendar-feed", headers=h)
    assert client.get(f"/calendar/{token}.ics").status_code == 404


def test_notes_vault_zip(client):
    h = _headers(client, "v1@example.com")
    s = client.post("/subjects", json={"name": "Reti"}, headers=h).json()
    t = client.post(f"/subjects/{s['id']}/topics", json={"title": "TCP/IP"}, headers=h).json()
    client.patch(f"/topics/{t['id']}", json={"notes": "Three-way handshake"}, headers=h)
    res = client.get("/data/notes-vault?lang=it", headers=h)
    files = zipfile.ZipFile(io.BytesIO(res.content))
    names = files.namelist()
    assert "StudyOS/Reti/TCP-IP.md" in names and "StudyOS/Reti/Reti.md" in names
    note = files.read("StudyOS/Reti/TCP-IP.md").decode()
    assert "Materia: [[Reti]]" in note and "Three-way handshake" in note and "tags: [studyos, reti, todo]" in note


def test_change_password_and_delete_account(client):
    register_and_login(client, "acc@example.com")
    login = client.post("/auth/login", json={"email": "acc@example.com", "password": "password123"}).json()
    h = {"Authorization": f"Bearer {login['access_token']}"}
    assert client.post("/auth/password", json={"current_password": "nope", "new_password": "newpassword1"}, headers=h).status_code == 400
    assert client.post("/auth/password", json={"current_password": "password123", "new_password": "newpassword1"}, headers=h).status_code == 204
    assert client.post("/auth/login", json={"email": "acc@example.com", "password": "newpassword1"}).status_code == 200
    client.post("/subjects", json={"name": "Da cancellare"}, headers=h)
    client.post("/share", headers=h)
    assert client.request("DELETE", "/auth/account", json={"password": "password123"}, headers=h).status_code == 400
    assert client.request("DELETE", "/auth/account", json={"password": "newpassword1"}, headers=h).status_code == 204
    assert client.get("/subjects", headers=h).status_code == 401
    assert client.post("/auth/login", json={"email": "acc@example.com", "password": "newpassword1"}).status_code == 401
