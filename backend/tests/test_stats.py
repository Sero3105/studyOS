from datetime import date, timedelta

from conftest import register_and_login


def _headers(client, email):
    data = register_and_login(client, email)
    return {"Authorization": f"Bearer {data['access_token']}"}


def test_summary_aggregates_real_data(client):
    headers = _headers(client, "st1@example.com")
    today = date.today().isoformat()
    subject = client.post("/subjects", json={"name": "Reti"}, headers=headers).json()
    client.post("/sessions", json={"subject_id": subject["id"], "duration_minutes": 30, "studied_on": today}, headers=headers)
    client.post("/sessions", json={"duration_minutes": 20, "studied_on": (date.today() - timedelta(days=1)).isoformat()}, headers=headers)
    client.post("/tasks", json={"title": "T1"}, headers=headers)

    data = client.get("/stats/summary", headers=headers).json()
    assert data["total_minutes"] == 50
    assert data["today_minutes"] == 30
    assert data["sessions_count"] == 2
    assert data["tasks_total"] == 1 and data["tasks_done"] == 0
    assert data["streak_days"] == 2
    assert data["by_subject"] == [{"name": "Reti", "minutes": 30}]
    assert data["last_session"]["subject"] == "Reti"
    assert len(data["daily"]) == 7 and data["daily"][-1]["minutes"] == 30


def test_summary_empty_and_isolated(client):
    headers = _headers(client, "st2@example.com")
    data = client.get("/stats/summary", headers=headers).json()
    assert data["total_minutes"] == 0 and data["last_session"] is None
    assert client.get("/stats/summary").status_code == 401
