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


def test_session_update(client):
    headers = _headers(client, "ss4@example.com")
    subject = client.post("/subjects", json={"name": "Analisi"}, headers=headers).json()
    session = client.post("/sessions", json={"duration_minutes": 25, "studied_on": "2026-09-01"}, headers=headers).json()
    url = f"/sessions/{session['id']}"

    updated = client.patch(url, json={"duration_minutes": 90, "subject_id": subject["id"], "notes": " Biblioteca "}, headers=headers)
    assert updated.status_code == 200
    assert (updated.json()["duration_minutes"], updated.json()["subject_id"], updated.json()["notes"]) == (90, subject["id"], "Biblioteca")
    assert updated.json()["studied_on"] == "2026-09-01"

    assert client.patch(url, json={"subject_id": None}, headers=headers).json()["subject_id"] is None
    assert client.patch(url, json={"duration_minutes": None}, headers=headers).status_code == 422
    assert client.patch(url, json={"subject_id": 9999}, headers=headers).status_code == 422
    assert client.patch(url, json={"duration_minutes": 10}, headers=_headers(client, "ss5@example.com")).status_code == 404


def test_sitting_upsert_links_blocks_and_isolation(client):
    headers = _headers(client, "sit1@example.com")
    subject = client.post("/subjects", json={"name": "Fisica"}, headers=headers).json()
    topic = client.post(f"/subjects/{subject['id']}/topics", json={"title": "Onde"}, headers=headers).json()
    uid = "0b7c6c1e-8a8e-4c55-9d1e-3f2a1b0c9d8e"
    body = {"subject_id": subject["id"], "topic_id": topic["id"], "started_on": "2026-11-16", "goal": "  Cap. 3  ",
            "checklist": [{"text": " es. 1-10 ", "done": True}, {"text": "teoria"}], "distractions": [{"text": "mail prof", "block": 1}]}

    first = client.put(f"/sittings/{uid}", json=body, headers=headers)
    assert first.status_code == 200
    assert (first.json()["goal"], first.json()["checklist"][0]["text"]) == ("Cap. 3", "es. 1-10")
    # Rimandare lo stesso uid sostituisce, non duplica.
    again = client.put(f"/sittings/{uid}", json=body | {"resume_note": "teorema 4.2"}, headers=headers).json()
    assert again["id"] == first.json()["id"] and again["resume_note"] == "teorema 4.2"
    assert len(client.get("/sittings", headers=headers).json()) == 1

    block = client.post("/sessions", json={"duration_minutes": 18, "studied_on": "2026-11-16", "sitting_id": uid,
                                           "partial": True, "interruptions": 2}, headers=headers).json()
    assert (block["sitting_id"], block["partial"], block["interruptions"]) == (uid, True, 2)

    other = _headers(client, "sit2@example.com")
    assert client.get("/sittings", headers=other).json() == []
    # Stesso uid da un altro utente: seduta sua, la prima resta intatta.
    assert client.put(f"/sittings/{uid}", json={"started_on": "2026-11-16"}, headers=other).status_code == 200
    assert client.get("/sittings", headers=headers).json()[0]["goal"] == "Cap. 3"
    assert client.put(f"/sittings/{uid}", json=body, headers=other).status_code == 422  # materia non sua

    # Eliminare la materia scollega la seduta.
    client.delete(f"/subjects/{subject['id']}", headers=headers)
    sitting = client.get("/sittings", headers=headers).json()[0]
    assert (sitting["subject_id"], sitting["topic_id"]) == (None, None)


def test_sitting_validation(client):
    headers = _headers(client, "sit3@example.com")
    assert client.put("/sittings/bad uid!", json={"started_on": "2026-11-16"}, headers=headers).status_code == 422
    assert client.put("/sittings/abc", json={"started_on": "2026-11-16", "checklist": [{"text": "  "}]}, headers=headers).status_code == 422
    assert client.post("/sessions", json={"duration_minutes": 5, "studied_on": "2026-11-16", "sitting_id": "x" * 37}, headers=headers).status_code == 422
    assert client.get("/sittings").status_code == 401
