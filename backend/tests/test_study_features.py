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
    assert due == [_day(1)]
    client.patch(f"/topics/{t['id']}", json={"notes": "# Ionici\n- NaCl"}, headers=h)
    assert client.get("/subjects", headers=h).json()[0]["topics"][0]["notes"].startswith("# Ionici")


def test_adaptive_review_chain(client):
    h = _headers(client, "r2@example.com")
    s = client.post("/subjects", json={"name": "Storia"}, headers=h).json()
    t = client.post(f"/subjects/{s['id']}/topics", json={"title": "Roma"}, headers=h).json()
    client.patch(f"/topics/{t['id']}", json={"mastery": 1, "schedule_reviews": True}, headers=h)  # studiato una volta

    def complete_open(rating=None):
        task = next(x for x in client.get("/tasks", headers=h).json() if x["status"] != "done")
        body = {"status": "done"} | ({"review_rating": rating} if rating else {})
        assert client.patch(f"/tasks/{task['id']}", json=body, headers=h).status_code == 200
        return [(x["due_date"], x["review_interval"]) for x in client.get("/tasks", headers=h).json() if x["status"] != "done"]

    mastery = lambda: (lambda x: (x["mastery"], x["completed"]))(client.get("/subjects", headers=h).json()[0]["topics"][0])
    assert mastery() == (1, False)  # da ripassare: non ancora completato
    assert complete_open("easy") == [(_day(4), 4)]
    assert mastery() == (2, True)  # ripassato: ora è completato
    assert complete_open() == [(_day(10), 10)]  # senza valutazione vale "ok"
    assert complete_open("hard") == [(_day(1), 1)]
    assert mastery() == (1, False)  # difficile: torna "da ripassare"
    for _ in range(3): complete_open("easy")  # 4, 16, poi 64 > 60: argomento consolidato
    assert [x for x in client.get("/tasks", headers=h).json() if x["status"] != "done"] == []
    assert mastery() == (3, True)  # sicuro


def test_exam_plan_studies_reviews_and_replans(client):
    h = _headers(client, "p1@example.com")
    s = client.post("/subjects", json={"name": "Fisica"}, headers=h).json()
    ids = [client.post(f"/subjects/{s['id']}/topics", json={"title": x}, headers=h).json()["id"] for x in ["Cinematica", "Dinamica", "Energia"]]
    client.patch(f"/topics/{ids[1]}", json={"difficulty": 3}, headers=h)
    exam = client.post("/exams", json={"title": "Scritto", "subject": "fisica", "exam_date": _day(21)}, headers=h).json()
    tasks = client.post(f"/exams/{exam['id']}/plan", headers=h).json()
    studies = [t for t in tasks if t["review_interval"] is None]
    assert [t["title"] for t in studies] == ["Studia: Cinematica", "Studia: Dinamica (1/2)", "Studia: Dinamica (2/2)", "Studia: Energia"]
    assert all(_day(1) <= t["due_date"] < _day(21) for t in tasks)
    # Ripassano tutti (il difficile almeno quanto gli altri, più ravvicinato); ogni argomento ha anche il ripasso finale.
    reviews = lambda tid: [t for t in tasks if t["topic_id"] == tid and t["review_interval"] is not None]
    assert len(reviews(ids[1])) >= len(reviews(ids[0])) >= 2
    # Rigenerare sostituisce i task del piano ancora aperti, senza doppioni.
    again = client.post(f"/exams/{exam['id']}/plan", headers=h).json()
    assert len(again) == len(tasks) and len(client.get("/tasks", headers=h).json()) == len(tasks)
    # Fatto lo studio, l'argomento è "da ripassare"; i ripassi sono già in calendario, nessuno in più.
    first = next(t for t in again if t["title"] == "Studia: Cinematica")
    client.patch(f"/tasks/{first['id']}", json={"status": "done"}, headers=h)
    topic = next(x for x in client.get("/subjects", headers=h).json()[0]["topics"] if x["id"] == ids[0])
    assert (topic["mastery"], topic["completed"]) == (1, False)
    assert len(client.get("/tasks", headers=h).json()) == len(tasks)

    near = client.post("/exams", json={"title": "X", "subject": "Fisica", "exam_date": _day(1)}, headers=h).json()
    assert client.post(f"/exams/{near['id']}/plan", headers=h).json()["detail"] == "too_close"
    other = client.post("/exams", json={"title": "Y", "subject": "Storia", "exam_date": _day(9)}, headers=h).json()
    assert client.post(f"/exams/{other['id']}/plan", headers=h).json()["detail"] == "no_subject"


def test_exam_plan_skips_rest_days(client):
    h = _headers(client, "p2@example.com")
    s = client.post("/subjects", json={"name": "Chimica"}, headers=h).json()
    for x in "ABC": client.post(f"/subjects/{s['id']}/topics", json={"title": x}, headers=h)
    exam = client.post("/exams", json={"title": "Orale", "subject": "Chimica", "exam_date": _day(11)}, headers=h).json()
    rest = (date.today() + timedelta(days=1)).isoweekday()  # liberi i giorni 1 e 8
    tasks = client.post(f"/exams/{exam['id']}/plan", json={"rest_days": [rest]}, headers=h).json()
    assert tasks and not {t["due_date"] for t in tasks} & {_day(1), _day(8)}
    assert client.post(f"/exams/{exam['id']}/plan", json={"rest_days": [8]}, headers=h).status_code == 422


def test_exam_plan_start_date_and_advice(client):
    h = _headers(client, "p3@example.com")
    s = client.post("/subjects", json={"name": "Reti"}, headers=h).json()
    for x in "ABCD": client.post(f"/subjects/{s['id']}/topics", json={"title": x}, headers=h)
    exam = client.post("/exams", json={"title": "Reti", "subject": "Reti", "exam_date": _day(30)}, headers=h).json()
    advice = client.post(f"/exams/{exam['id']}/plan/advice", json={"rest_days": [7]}, headers=h).json()
    assert advice["ideal_start"] < advice["latest_start"] < _day(30)
    # Il piano parte dal giorno scelto, non prima.
    tasks = client.post(f"/exams/{exam['id']}/plan", json={"start_date": _day(10)}, headers=h).json()
    assert min(t["due_date"] for t in tasks) == _day(10) and max(t["due_date"] for t in tasks) < _day(30)
    # Una data passata vale come oggi; una dopo l'esame non lascia giorni.
    assert min(t["due_date"] for t in client.post(f"/exams/{exam['id']}/plan", json={"start_date": _day(-5)}, headers=h).json()) == _day(0)
    assert client.post(f"/exams/{exam['id']}/plan", json={"start_date": _day(31)}, headers=h).json()["detail"] == "too_close"


def test_exam_plan_follows_preferences(client):
    h = _headers(client, "p4@example.com")
    s = client.post("/subjects", json={"name": "Ottica"}, headers=h).json()
    for x in "ABCDEF": client.post(f"/subjects/{s['id']}/topics", json={"title": x}, headers=h)
    exam = client.post("/exams", json={"title": "Ottica", "subject": "Ottica", "exam_date": _day(25)}, headers=h).json()
    prefs = {"days_off": [_day(5), _day(6)], "rest_before_exam": True, "limit_unit": "hours", "limit_value": 1.5, "study_minutes": 25}
    tasks = client.post(f"/exams/{exam['id']}/plan", json=prefs, headers=h).json()
    days = {t["due_date"] for t in tasks}
    assert not days & {_day(5), _day(6), _day(24)}  # giorni liberi e giorno prima dell'esame
    assert {t["planned_minutes"] for t in tasks if t["review_interval"] is None} == {25}
    per_day = {}
    for t in tasks: per_day[t["due_date"]] = per_day.get(t["due_date"], 0) + t["planned_minutes"]
    assert max(per_day.values()) <= 90  # un'ora e mezza al giorno
    # Le preferenze cambiano anche la data ideale: più ripassi, più giorni.
    light = client.post(f"/exams/{exam['id']}/plan/advice", json={"reviews": "light"}, headers=h).json()
    intense = client.post(f"/exams/{exam['id']}/plan/advice", json={"reviews": "intense"}, headers=h).json()
    assert light["full_items"] < intense["full_items"]
    assert client.post(f"/exams/{exam['id']}/plan", json={"limit_value": 0}, headers=h).status_code == 422


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
    subject = client.post("/subjects", json={"name": "Da cancellare"}, headers=h).json()
    topic = client.post(f"/subjects/{subject['id']}/topics", json={"title": "T"}, headers=h).json()
    client.post("/cards", json={"topic_id": topic["id"], "front": "cancellami", "back": "x"}, headers=h)
    exam = client.post("/exams", json={"title": "E", "subject": "E", "exam_date": "2026-01-01"}, headers=h).json()
    client.post(f"/exams/{exam['id']}/attempts", json={"outcome": "failed", "grade": None}, headers=h)
    client.post("/share", headers=h)
    assert client.request("DELETE", "/auth/account", json={"password": "password123"}, headers=h).status_code == 400
    assert client.request("DELETE", "/auth/account", json={"password": "newpassword1"}, headers=h).status_code == 204
    assert client.get("/subjects", headers=h).status_code == 401
    assert client.post("/auth/login", json={"email": "acc@example.com", "password": "newpassword1"}).status_code == 401
    from dependencies.database_dependency import SessionLocal
    from models.card_models import Card
    from models.exam_models import ExamAttempt
    with SessionLocal() as db:
        assert db.query(Card).filter(Card.front == "cancellami").count() == 0
        assert db.query(ExamAttempt).filter(ExamAttempt.exam_id == exam["id"]).count() == 0


def test_topic_mastery_stays_in_sync_with_completed(client):
    h = _headers(client, "m1@example.com")
    s = client.post("/subjects", json={"name": "Chimica"}, headers=h).json()
    t = client.post(f"/subjects/{s['id']}/topics", json={"title": "Legami"}, headers=h).json()
    url = f"/topics/{t['id']}"
    assert (t["mastery"], t["completed"]) == (0, False)
    patch = lambda body: (lambda r: (r["mastery"], r["completed"]))(client.patch(url, json=body, headers=h).json())
    assert patch({"mastery": 1}) == (1, False)  # studiato una volta: da ripassare
    assert patch({"mastery": 2}) == (2, True)  # ripassato: completato
    assert patch({"mastery": 3}) == (3, True)
    assert patch({"completed": True}) == (3, True)  # già fatto: lo stato non scende
    assert patch({"completed": False}) == (0, False)
    assert patch({"completed": True}) == (2, True)
    assert patch({"mastery": 0}) == (0, False)
    assert client.patch(url, json={"mastery": 4}, headers=h).status_code == 422
    # Il primo "studiato" da qualunque strada programma il ripasso.
    client.patch(url, json={"mastery": 2, "schedule_reviews": True}, headers=h)
    assert len(client.get("/tasks", headers=h).json()) == 1
