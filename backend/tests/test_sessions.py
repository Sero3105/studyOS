from conftest import register_and_login


def _headers(client, email):
    data = register_and_login(client, email)
    return {"Authorization": f"Bearer {data['access_token']}"}


def test_session_flow_and_isolation(client):
    headers = _headers(client, "ss1@example.com")
    subject = client.post("/subjects", json={"name": "Reti"}, headers=headers).json()
    topic = client.post(f"/subjects/{subject['id']}/topics", json={"title": "TCP"}, headers=headers).json()

    created = client.post("/sessions", json={
        "subject_id": subject["id"], "topic_id": topic["id"],
        "duration_minutes": 50, "studied_on": "2026-09-01", "notes": "Ripasso",
    }, headers=headers)
    assert created.status_code == 201

    other = _headers(client, "ss2@example.com")
    assert client.get("/sessions", headers=other).json() == []
    session_id = created.json()["id"]
    assert client.delete(f"/sessions/{session_id}", headers=other).status_code == 404
    assert client.delete(f"/sessions/{session_id}", headers=headers).status_code == 204


def test_session_validation(client):
    headers = _headers(client, "ss3@example.com")
    assert client.post("/sessions", json={"duration_minutes": 0, "studied_on": "2026-09-01"}, headers=headers).status_code == 422
    assert client.post("/sessions", json={"duration_minutes": 25, "studied_on": "2026-09-01", "subject_id": 9999}, headers=headers).status_code == 422
    assert client.get("/sessions").status_code == 401
