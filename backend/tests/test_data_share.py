from conftest import register_and_login


def _headers(client, email):
    return {"Authorization": f"Bearer {register_and_login(client, email)['access_token']}"}


def test_export_import_roundtrip_relinks_ids(client):
    a = _headers(client, "d1@example.com")
    subject = client.post("/subjects", json={"name": "Fisica"}, headers=a).json()
    topic = client.post(f"/subjects/{subject['id']}/topics", json={"title": "Ottica"}, headers=a).json()
    client.post("/tasks", json={"title": "Esercizi", "subject_id": subject["id"], "topic_id": topic["id"]}, headers=a)
    client.post("/sessions", json={"duration_minutes": 25, "studied_on": "2026-10-01", "topic_id": topic["id"], "kind": "lesson", "focus": 3}, headers=a)
    client.post("/mistakes", json={"topic_id": topic["id"], "mistake": "Segno invertito", "correction": "n1 > n2"}, headers=a)
    client.patch("/settings", json={"degreeCfu": 120, "restDays": [7]}, headers=a)
    exam = client.post("/exams", json={"title": "Scritto", "subject": "Fisica", "exam_date": "2026-01-10"}, headers=a).json()
    client.post(f"/exams/{exam['id']}/attempts", json={"outcome": "rejected", "grade": 19}, headers=a)
    client.post("/goals", json={"title": "Ore", "kind": "total_minutes", "target": 600}, headers=a)
    client.patch(f"/topics/{topic['id']}", json={"difficulty": 3}, headers=a)
    client.post("/cards", json={"topic_id": topic["id"], "front": "Snell?", "back": "n1 sin = n2 sin"}, headers=a)

    dump = client.get("/data/export", headers=a).json()
    assert len(dump["tasks"]) == 1 and dump["subjects"][0]["topics"][0]["title"] == "Ottica"

    b = _headers(client, "d2@example.com")
    result = client.post("/data/import", json=dump, headers=b).json()
    assert result == {"subjects": 1, "topics": 1, "tasks": 1, "exams": 1, "sessions": 1, "goals": 1, "cards": 1, "mistakes": 1}
    assert client.get("/settings", headers=b).json() == {"degreeCfu": 120, "restDays": [7]}
    assert client.get("/mistakes", headers=b).json()[0]["mistake"] == "Segno invertito"
    assert (client.get("/sessions", headers=b).json()[0]["kind"], client.get("/sessions", headers=b).json()[0]["focus"]) == ("lesson", 3)
    new_subject = client.get("/subjects", headers=b).json()[0]
    assert new_subject["topics"][0]["difficulty"] == 3
    assert client.get("/cards", headers=b).json()[0]["topic_id"] == new_subject["topics"][0]["id"]
    attempts = client.get("/exams", headers=b).json()[0]["attempts"]
    assert [(x["exam_date"], x["outcome"], x["grade"]) for x in attempts] == [("2026-01-10", "rejected", 19)]
    task = client.get("/tasks", headers=b).json()[0]
    assert task["subject_id"] == new_subject["id"] and task["topic_id"] == new_subject["topics"][0]["id"]
    assert client.get("/sessions", headers=b).json()[0]["subject_id"] == new_subject["id"]
    # A non deve vedere nulla di B e viceversa.
    assert len(client.get("/subjects", headers=a).json()) == 1


def test_import_drops_foreign_links_and_validates(client):
    a = _headers(client, "d3@example.com")
    other = _headers(client, "d4@example.com")
    foreign = client.post("/subjects", json={"name": "Altrui"}, headers=other).json()
    client.post("/data/import", json={"tasks": [{"title": "X", "subject_id": foreign["id"]}]}, headers=a)
    assert client.get("/tasks", headers=a).json()[0]["subject_id"] is None
    assert client.post("/data/import", json={"tasks": [{"title": ""}]}, headers=a).status_code == 422
    assert client.post("/data/import", json={}).status_code == 401


def test_share_link_lifecycle(client):
    a = _headers(client, "s1@example.com")
    assert client.get("/share", headers=a).json()["active"] is False
    client.post("/exams", json={"title": "Orale", "subject": "Storia", "exam_date": "2099-01-01", "notes": "segreto", "location": "Aula"}, headers=a)
    client.post("/tasks", json={"title": "Ripasso", "description": "privato"}, headers=a)

    token = client.post("/share", headers=a).json()["token"]
    plan = client.get(f"/share/public/{token}")
    assert plan.status_code == 200
    body = plan.json()
    assert body["exams"][0]["title"] == "Orale" and body["tasks"][0]["title"] == "Ripasso"
    assert "segreto" not in plan.text and "privato" not in plan.text and "s1@example.com" not in plan.text

    rotated = client.post("/share", headers=a).json()["token"]
    assert client.get(f"/share/public/{token}").status_code == 404
    client.delete("/share", headers=a)
    assert client.get(f"/share/public/{rotated}").status_code == 404
    assert client.get("/share/public/nope").status_code == 404
