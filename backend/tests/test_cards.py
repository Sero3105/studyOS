from datetime import date, timedelta

from conftest import register_and_login


def _headers(client, email):
    return {"Authorization": f"Bearer {register_and_login(client, email)['access_token']}"}


def test_card_flow_review_and_isolation(client):
    h = _headers(client, "c1@example.com")
    s = client.post("/subjects", json={"name": "Biologia"}, headers=h).json()
    t = client.post(f"/subjects/{s['id']}/topics", json={"title": "Cellula"}, headers=h).json()
    card = client.post("/cards", json={"topic_id": t["id"], "front": " Mitocondrio? ", "back": "Centrale energetica"}, headers=h).json()
    assert (card["front"], card["interval"], card["due_date"]) == ("Mitocondrio?", 0, date.today().isoformat())

    reviewed = client.post(f"/cards/{card['id']}/review", json={"rating": "ok"}, headers=h).json()
    assert (reviewed["interval"], reviewed["due_date"]) == (2, (date.today() + timedelta(days=2)).isoformat())
    assert client.post(f"/cards/{card['id']}/review", json={"rating": "meh"}, headers=h).status_code == 422

    other = _headers(client, "c2@example.com")
    assert client.get("/cards", headers=other).json() == []
    assert client.post("/cards", json={"topic_id": t["id"], "front": "x", "back": "y"}, headers=other).status_code == 422
    assert client.delete(f"/cards/{card['id']}", headers=other).status_code == 404

    # Eliminare l'argomento elimina le sue carte.
    assert client.delete(f"/topics/{t['id']}", headers=h).status_code == 204
    assert client.get("/cards", headers=h).json() == []
