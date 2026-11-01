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

