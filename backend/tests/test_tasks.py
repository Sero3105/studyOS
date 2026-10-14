from conftest import register_and_login


def _headers(client, email):
    data = register_and_login(client, email)
    return {"Authorization": f"Bearer {data['access_token']}"}


def test_task_flow_with_subject_link(client):
    headers = _headers(client, "t1@example.com")
    subject = client.post("/subjects", json={"name": "Reti"}, headers=headers).json()
    topic = client.post(f"/subjects/{subject['id']}/topics", json={"title": "HTTP"}, headers=headers).json()

    task = client.post("/tasks", json={
        "title": "Ripasso HTTP", "due_date": "2026-09-05", "priority": "high",
        "subject_id": subject["id"], "topic_id": topic["id"],
    }, headers=headers)
    assert task.status_code == 201
    task = task.json()
    assert task["status"] == "todo"

    done = client.patch(f"/tasks/{task['id']}", json={"status": "done"}, headers=headers)
    assert done.status_code == 200 and done.json()["status"] == "done"

    assert client.delete(f"/tasks/{task['id']}", headers=headers).status_code == 204
    assert client.get("/tasks", headers=headers).json() == []


def test_task_isolation_and_link_validation(client):
    headers = _headers(client, "t2@example.com")
    other = _headers(client, "t3@example.com")
    foreign_subject = client.post("/subjects", json={"name": "Altrui"}, headers=other).json()

    bad = client.post("/tasks", json={"title": "X", "subject_id": foreign_subject["id"]}, headers=headers)
    assert bad.status_code == 422

    task = client.post("/tasks", json={"title": "Mio"}, headers=headers).json()
    assert client.get("/tasks", headers=other).json() == []
    assert client.patch(f"/tasks/{task['id']}", json={"status": "done"}, headers=other).status_code == 404
    assert client.get("/tasks").status_code == 401


def test_task_validation(client):
    headers = _headers(client, "t4@example.com")
    assert client.post("/tasks", json={"title": " ", }, headers=headers).status_code == 422
    assert client.post("/tasks", json={"title": "X", "priority": "urgent"}, headers=headers).status_code == 422
