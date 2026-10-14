from conftest import register_and_login


def _headers(client, email):
    data = register_and_login(client, email)
    return {"Authorization": f"Bearer {data['access_token']}"}


def test_goal_progress_from_sessions_and_tasks(client):
    headers = _headers(client, "g1@example.com")
    goal = client.post("/goals", json={"title": "Ore totali", "kind": "total_minutes", "target": 100}, headers=headers)
    assert goal.status_code == 201
    assert goal.json()["current"] == 0

    client.post("/sessions", json={"duration_minutes": 40, "studied_on": "2026-09-01"}, headers=headers)
    client.post("/tasks", json={"title": "T"}, headers=headers)
    task = client.get("/tasks", headers=headers).json()[0]
    client.patch(f"/tasks/{task['id']}", json={"status": "done"}, headers=headers)
    client.post("/goals", json={"title": "Task fatti", "kind": "tasks_done", "target": 2}, headers=headers)

    goals = {g["kind"]: g for g in client.get("/goals", headers=headers).json()}
    assert goals["total_minutes"]["current"] == 40
    assert goals["total_minutes"]["percent"] == 40
    assert goals["tasks_done"]["current"] == 1

    assert client.delete(f"/goals/{goal.json()['id']}", headers=headers).status_code == 204


def test_goal_isolation_and_validation(client):
    headers = _headers(client, "g2@example.com")
    other = _headers(client, "g3@example.com")
    goal = client.post("/goals", json={"title": "X", "kind": "sessions_count", "target": 5}, headers=headers).json()
    assert client.get("/goals", headers=other).json() == []
    assert client.delete(f"/goals/{goal['id']}", headers=other).status_code == 404
    assert client.post("/goals", json={"title": "X", "kind": "nope", "target": 5}, headers=headers).status_code == 422
    assert client.post("/goals", json={"title": "X", "kind": "sessions_count", "target": 0}, headers=headers).status_code == 422
