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
