from conftest import register_and_login


def _headers(client, email):
    data = register_and_login(client, email)
    return {"Authorization": f"Bearer {data['access_token']}"}


def test_subject_and_topic_flow(client):
    headers = _headers(client, "s1@example.com")
    assert client.get("/subjects").status_code == 401

    subject = client.post("/subjects", json={"name": " Reti "}, headers=headers)
    assert subject.status_code == 201
    subject = subject.json()
    assert subject["name"] == "Reti"

    topic = client.post(f"/subjects/{subject['id']}/topics", json={"title": "HTTP"}, headers=headers)
    assert topic.status_code == 201
    topic = topic.json()

    done = client.patch(f"/topics/{topic['id']}", json={"completed": True}, headers=headers)
    assert done.status_code == 200 and done.json()["completed"] is True

    listed = client.get("/subjects", headers=headers).json()
    assert listed[0]["topics"][0]["title"] == "HTTP"

    assert client.delete(f"/topics/{topic['id']}", headers=headers).status_code == 204
    assert client.delete(f"/subjects/{subject['id']}", headers=headers).status_code == 204
    assert client.get("/subjects", headers=headers).json() == []


def test_subjects_isolated_between_users(client):
    headers = _headers(client, "s2@example.com")
    subject = client.post("/subjects", json={"name": "Privata"}, headers=headers).json()

    other = _headers(client, "s3@example.com")
    assert client.get("/subjects", headers=other).json() == []
    assert client.post(f"/subjects/{subject['id']}/topics", json={"title": "X"}, headers=other).status_code == 404
    assert client.delete(f"/subjects/{subject['id']}", headers=other).status_code == 404


def test_subject_validation(client):
    headers = _headers(client, "s4@example.com")
    assert client.post("/subjects", json={"name": "  "}, headers=headers).status_code == 422
