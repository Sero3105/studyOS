import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp.name}"
os.environ["SECRET_KEY"] = "test-secret-key-with-at-least-32-chars"
os.environ["ALGORITHM"] = "HS256"

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


def register_and_login(client: TestClient, email: str = "a@example.com") -> dict:
    client.post(
        "/auth/register",
        json={"username": email.split("@")[0], "email": email, "full_name": "Test", "password": "password123"},
    )
    response = client.post("/auth/login", json={"email": email, "password": "password123"})
    assert response.status_code == 200
    return response.json()


@pytest.fixture()
def auth_headers(client):
    data = register_and_login(client)
    return {"Authorization": f"Bearer {data['access_token']}"}
