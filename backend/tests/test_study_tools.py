from conftest import register_and_login


def _headers(client, email):
    return {"Authorization": f"Bearer {register_and_login(client, email)['access_token']}"}


def _topic(client, h):
    s = client.post("/subjects", json={"name": "Fisica"}, headers=h).json()
    return client.post(f"/subjects/{s['id']}/topics", json={"title": "Ottica"}, headers=h).json()


def test_bulk_cards_skip_duplicates(client):
    h = _headers(client, "bulk1@example.com")
    t = _topic(client, h)
    client.post("/cards", json={"topic_id": t["id"], "front": "Snell", "back": "x"}, headers=h)
    body = {"topic_id": t["id"], "cards": [{"front": "snell ", "back": "y"}, {"front": "Fresnel", "back": "z"}, {"front": "Fresnel", "back": "w"}]}
    assert client.post("/cards/bulk", json=body, headers=h).json() == {"created": 1, "skipped": 2}
    assert len(client.get("/cards", headers=h).json()) == 2
    other = _headers(client, "bulk2@example.com")
    assert client.post("/cards/bulk", json=body, headers=other).status_code == 422


def test_mistakes_crud_and_card_link(client):
    h = _headers(client, "mis1@example.com")
    t = _topic(client, h)
    m = client.post("/mistakes", json={"topic_id": t["id"], "mistake": " Indice ", "correction": "n = c/v", "source": "Es. 3"}, headers=h).json()
    assert (m["mistake"], m["card_id"]) == ("Indice", None)
    card = client.post("/cards", json={"topic_id": t["id"], "front": m["mistake"], "back": m["correction"]}, headers=h).json()
    assert client.patch(f"/mistakes/{m['id']}", json={"card_id": card["id"]}, headers=h).json()["card_id"] == card["id"]
    other = _headers(client, "mis2@example.com")
    assert client.patch(f"/mistakes/{m['id']}", json={"card_id": None}, headers=other).status_code == 404
    other_card = client.post("/cards", json={"topic_id": _topic(client, other)["id"], "front": "a", "back": "b"}, headers=other).json()
    assert client.patch(f"/mistakes/{m['id']}", json={"card_id": other_card["id"]}, headers=h).status_code == 422
    # Eliminare l'argomento elimina anche gli errori.
    client.delete(f"/topics/{t['id']}", headers=h)
    assert client.get("/mistakes", headers=h).json() == []


def test_settings_merge_and_validation(client):
    h = _headers(client, "set1@example.com")
    assert client.get("/settings", headers=h).json() == {}
    client.patch("/settings", json={"theme": "light", "degreeCfu": 300}, headers=h)
    assert client.patch("/settings", json={"theme": None, "reviews": False}, headers=h).json() == {"degreeCfu": 300, "reviews": False}
    assert client.patch("/settings", json={"x": "y" * 201}, headers=h).status_code == 422
    assert client.patch("/settings", json={"nested": {"a": 1}}, headers=h).status_code == 422
    assert client.get("/settings").status_code == 401


def test_session_kind_focus_and_task_time_block(client):
    h = _headers(client, "kf1@example.com")
    s = client.post("/sessions", json={"duration_minutes": 90, "studied_on": "2026-10-01", "kind": "lesson"}, headers=h).json()
    assert (s["kind"], s["focus"]) == ("lesson", None)
    assert client.patch(f"/sessions/{s['id']}", json={"focus": 2}, headers=h).json()["focus"] == 2
    assert client.patch(f"/sessions/{s['id']}", json={"focus": 4}, headers=h).status_code == 422
    assert client.patch(f"/sessions/{s['id']}", json={"kind": None}, headers=h).status_code == 422
    assert client.post("/sessions", json={"duration_minutes": 5, "studied_on": "2026-10-01", "kind": "nap"}, headers=h).status_code == 422
    task = client.post("/tasks", json={"title": "Esercizi", "due_date": "2026-11-02", "scheduled_time": "09:30", "planned_minutes": 90}, headers=h).json()
    assert (task["scheduled_time"], task["planned_minutes"]) == ("09:30:00", 90)
    assert client.patch(f"/tasks/{task['id']}", json={"scheduled_time": None}, headers=h).json()["scheduled_time"] is None
