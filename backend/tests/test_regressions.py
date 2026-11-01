"""Casi che una volta erano rotti (vedi AUDIT.md): se uno di questi fallisce, il bug è tornato."""
from datetime import timedelta

from sqlalchemy import update

from conftest import register_and_login
from dependencies.database_dependency import SessionLocal
from models.auth_session_models import AuthSession
from services.token_service import _utcnow


def _auth(client, email):
    return {"Authorization": f"Bearer {register_and_login(client, email)['access_token']}"}


def test_concurrent_refresh_keeps_the_new_session(client):
    register_and_login(client, "tabs@example.com")
    old_cookie, csrf = client.cookies.get("studyos_refresh"), client.cookies.get("studyos_csrf")
    tab_a = client.post("/auth/refresh", headers={"X-CSRF-Token": csrf})
    assert tab_a.status_code == 200

    # La scheda B parte nello stesso momento, con il cookie vecchio.
    client.cookies.set("studyos_refresh", old_cookie)
    tab_b = client.post("/auth/refresh", headers={"X-CSRF-Token": csrf})
    assert tab_b.status_code == 409
    assert "studyos_refresh" not in tab_b.headers.get("set-cookie", "")

    client.cookies.set("studyos_refresh", tab_a.cookies.get("studyos_refresh"))
    assert client.post("/auth/refresh", headers={"X-CSRF-Token": tab_a.json()["csrf_token"]}).status_code == 200


def test_refresh_reuse_after_grace_revokes_everything(client):
    register_and_login(client, "stolen@example.com")
    old_cookie, csrf = client.cookies.get("studyos_refresh"), client.cookies.get("studyos_csrf")
    fresh = client.post("/auth/refresh", headers={"X-CSRF-Token": csrf})
    with SessionLocal() as db:
        db.execute(update(AuthSession).where(AuthSession.revoked_at.is_not(None)).values(revoked_at=_utcnow() - timedelta(minutes=5)))
        db.commit()

    client.cookies.set("studyos_refresh", old_cookie)
    assert client.post("/auth/refresh", headers={"X-CSRF-Token": csrf}).status_code == 401
    client.cookies.set("studyos_refresh", fresh.cookies.get("studyos_refresh"))
    assert client.post("/auth/refresh", headers={"X-CSRF-Token": fresh.json()["csrf_token"]}).status_code == 401


def test_deleting_subject_or_topic_unlinks_tasks_and_sessions(client):
    h = _auth(client, "orphans@example.com")
    subject = client.post("/subjects", json={"name": "Analisi"}, headers=h).json()
    topic = client.post(f"/subjects/{subject['id']}/topics", json={"title": "Limiti"}, headers=h).json()
    other_topic = client.post(f"/subjects/{subject['id']}/topics", json={"title": "Derivate"}, headers=h).json()
    task = client.post("/tasks", json={"title": "t", "subject_id": subject["id"], "topic_id": topic["id"]}, headers=h).json()
    session = client.post("/sessions", json={"duration_minutes": 25, "studied_on": "2026-10-01", "topic_id": other_topic["id"]}, headers=h).json()

    assert client.delete(f"/topics/{topic['id']}", headers=h).status_code == 204
    task = client.patch(f"/tasks/{task['id']}", json={"status": "done"}, headers=h).json()
    assert (task["subject_id"], task["topic_id"]) == (subject["id"], None)

    assert client.delete(f"/subjects/{subject['id']}", headers=h).status_code == 204
    assert client.patch(f"/tasks/{task['id']}", json={"status": "todo"}, headers=h).json()["subject_id"] is None
    stored = next(s for s in client.get("/sessions", headers=h).json() if s["id"] == session["id"])
    assert stored["topic_id"] is None


def test_email_is_case_insensitive(client):
    register_and_login(client, "Mario.Case@Example.com")
    assert client.post("/auth/login", json={"email": "mario.case@example.com", "password": "password123"}).status_code == 200
    duplicate = {"username": "mario2", "email": "MARIO.CASE@example.com", "password": "password123"}
    assert client.post("/auth/register", json=duplicate).status_code == 409


def test_patch_with_null_is_422_not_500(client):
    h = _auth(client, "nulls@example.com")
    task = client.post("/tasks", json={"title": "x"}, headers=h).json()
    for body in ({"title": None}, {"title": "   "}, {"status": None}, {"priority": None}):
        assert client.patch(f"/tasks/{task['id']}", json=body, headers=h).status_code == 422
    assert client.patch(f"/tasks/{task['id']}", json={"due_date": None, "subject_id": None}, headers=h).status_code == 200

    exam = client.post("/exams", json={"title": "Analisi", "subject": "Analisi"}, headers=h).json()
    for body in ({"title": None}, {"subject": None}, {"status": None}, {"honors": None}):
        assert client.patch(f"/exams/{exam['id']}", json=body, headers=h).status_code == 422


def test_login_removes_expired_sessions(client):
    user_id = register_and_login(client, "cleanup@example.com")["user"]["id"]
    mine = AuthSession.user_id == user_id
    with SessionLocal() as db:
        db.execute(update(AuthSession).where(mine).values(expires_at=_utcnow() - timedelta(days=1)))
        db.commit()
    register_and_login(client, "cleanup@example.com")
    with SessionLocal() as db:
        assert db.query(AuthSession).filter(mine).count() == 1


def test_recompleting_topic_does_not_duplicate_reviews(client):
    h = _auth(client, "reviews@example.com")
    s = client.post("/subjects", json={"name": "Chimica"}, headers=h).json()
    t = client.post(f"/subjects/{s['id']}/topics", json={"title": "Legami"}, headers=h).json()
    done = {"completed": True, "schedule_reviews": True}
    client.patch(f"/topics/{t['id']}", json=done, headers=h)
    first = client.get("/tasks", headers=h).json()
    client.patch(f"/tasks/{first[0]['id']}", json={"status": "done"}, headers=h)  # un ripasso già fatto resta

    client.patch(f"/topics/{t['id']}", json={"completed": False}, headers=h)
    assert [x["id"] for x in client.get("/tasks", headers=h).json()] == [first[0]["id"]]

    client.patch(f"/topics/{t['id']}", json=done, headers=h)
    assert len(client.get("/tasks", headers=h).json()) == 2
