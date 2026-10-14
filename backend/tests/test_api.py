from conftest import register_and_login


def test_register_login_and_me(client, auth_headers):
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "a@example.com"
    assert "password" not in response.text


def test_login_wrong_password_is_401(client):
    register_and_login(client, "b@example.com")
    response = client.post("/auth/login", json={"email": "b@example.com", "password": "wrong-password"})
    assert response.status_code == 401


def test_register_duplicate_is_409(client):
    register_and_login(client, "c@example.com")
    response = client.post(
        "/auth/register",
        json={"username": "other", "email": "c@example.com", "full_name": "X", "password": "password123"},
    )
    assert response.status_code == 409


def test_exams_require_auth(client):
    assert client.get("/exams").status_code == 401
    assert client.post("/exams", json={}).status_code == 401


def test_exam_create_list_and_ordering(client, auth_headers):
    payload = {"title": "Esame B", "subject": "Reti", "exam_date": "2026-09-10", "status": "planned"}
    first = client.post("/exams", json=payload, headers=auth_headers)
    assert first.status_code == 201
    earlier = dict(payload, title="Esame A", exam_date="2026-09-01", exam_time="09:30:00")
    assert client.post("/exams", json=earlier, headers=auth_headers).status_code == 201

    exams = client.get("/exams", headers=auth_headers).json()
    assert [exam["title"] for exam in exams] == ["Esame A", "Esame B"]
    assert exams[0]["exam_time"] == "09:30:00"


def test_exams_isolated_between_users(client, auth_headers):
    payload = {"title": "Privato", "subject": "DB", "exam_date": "2026-10-01", "status": "planned"}
    assert client.post("/exams", json=payload, headers=auth_headers).status_code == 201

    other = register_and_login(client, "d@example.com")
    other_headers = {"Authorization": f"Bearer {other['access_token']}"}
    assert client.get("/exams", headers=other_headers).json() == []


def test_exam_validation_rejects_empty_title(client, auth_headers):
    payload = {"title": "   ", "subject": "DB", "exam_date": "2026-10-01", "status": "planned"}
    assert client.post("/exams", json=payload, headers=auth_headers).status_code == 422


def test_refresh_rotates_and_logout_revokes(client):
    data = register_and_login(client, "e@example.com")
    refreshed = client.post("/auth/refresh", headers={"X-CSRF-Token": data["csrf_token"]})
    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"] != data["access_token"] or refreshed.json()["csrf_token"] != data["csrf_token"]

    csrf = refreshed.json()["csrf_token"]
    assert client.post("/auth/logout", headers={"X-CSRF-Token": csrf}).status_code == 204
    assert client.post("/auth/refresh", headers={"X-CSRF-Token": csrf}).status_code == 401


def test_refresh_without_csrf_is_403(client):
    register_and_login(client, "f@example.com")
    assert client.post("/auth/refresh").status_code == 403
