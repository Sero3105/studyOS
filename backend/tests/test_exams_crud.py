from conftest import register_and_login


def _headers(client, email):
    data = register_and_login(client, email)
    return {"Authorization": f"Bearer {data['access_token']}"}


def test_exam_update_and_delete(client):
    headers = _headers(client, "x1@example.com")
    exam = client.post("/exams", json={"title": "Analisi", "subject": "Matematica", "exam_date": "2026-09-01", "status": "planned"}, headers=headers).json()

    updated = client.patch(f"/exams/{exam['id']}", json={"status": "passed", "location": "Aula 1"}, headers=headers)
    assert updated.status_code == 200
    assert updated.json()["status"] == "passed" and updated.json()["location"] == "Aula 1"

    assert client.delete(f"/exams/{exam['id']}", headers=headers).status_code == 204
    assert client.get("/exams", headers=headers).json() == []


def test_exam_update_isolation(client):
    headers = _headers(client, "x2@example.com")
    other = _headers(client, "x3@example.com")
    exam = client.post("/exams", json={"title": "Fisica", "subject": "Fisica", "exam_date": "2026-09-02", "status": "planned"}, headers=headers).json()
    assert client.patch(f"/exams/{exam['id']}", json={"status": "passed"}, headers=other).status_code == 404
    assert client.delete(f"/exams/{exam['id']}", headers=other).status_code == 404


def test_exam_without_date(client):
    headers = _headers(client, "x4@example.com")
    dated = client.post("/exams", json={"title": "A", "subject": "A", "exam_date": "2099-01-01"}, headers=headers).json()
    undated = client.post("/exams", json={"title": "Tecnologie web", "subject": "Tecnologie web", "cfu": 6}, headers=headers)
    assert undated.status_code == 201 and undated.json()["exam_date"] is None
    assert [e["title"] for e in client.get("/exams", headers=headers).json()] == ["A", "Tecnologie web"]
    assert client.post(f"/exams/{undated.json()['id']}/plan", headers=headers).json()["detail"] == "no_date"
    assert client.get("/stats/summary", headers=headers).status_code == 200
    token = client.post("/calendar-feed", headers=headers).json()["token"]
    assert "Tecnologie web" not in client.get(f"/calendar/{token}.ics").text
    # Fissata la data più tardi: torna un esame normale.
    assert client.patch(f"/exams/{undated.json()['id']}", json={"exam_date": "2099-02-01"}, headers=headers).json()["exam_date"] == "2099-02-01"
    assert dated["exam_date"] == "2099-01-01"
