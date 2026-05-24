import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, User, Incident
from main import app, get_db
from fastapi.testclient import TestClient
import os

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_rootrecall.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        if os.path.exists("./test_rootrecall.db"):
            try:
                os.remove("./test_rootrecall.db")
            except Exception:
                pass

@pytest.fixture(scope="module")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def test_signup(client):
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "test_operator@rootrecall.ai",
            "password": "securepassword123",
            "name": "Test Operator",
            "company": "TestCorp",
            "role": "admin"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test_operator@rootrecall.ai"

def test_login(client):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "test_operator@rootrecall.ai",
            "password": "securepassword123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"

def test_protected_incidents_without_token(client):
    response = client.get("/api/v1/incidents")
    assert response.status_code == 401

def test_get_incidents(client, db_session):
    # Create a mock incident
    inc = Incident(
        id=9999,
        title="Mock Anomaly Trigger",
        service="checkout-api",
        severity="SEV-1",
        status="active",
        impact="None"
    )
    db_session.add(inc)
    db_session.commit()

    # Get login token
    login_resp = client.post(
        "/api/v1/auth/login",
        json={
            "email": "test_operator@rootrecall.ai",
            "password": "securepassword123"
        }
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/v1/incidents", headers=headers)
    assert response.status_code == 200
    incidents = response.json()
    assert len(incidents) >= 1
    assert incidents[0]["id"] == "INC-9999"

def test_copilot_chat_flow(client):
    login_resp = client.post(
        "/api/v1/auth/login",
        json={
            "email": "test_operator@rootrecall.ai",
            "password": "securepassword123"
        }
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/v1/copilot/chat",
        headers=headers,
        json={
            "message": "check system latency status",
            "incidentId": "INC-9999"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "content" in data
    assert "confidence" in data
    assert "recurrence_probability" in data

def test_generate_postmortem_flow(client):
    login_resp = client.post(
        "/api/v1/auth/login",
        json={
            "email": "test_operator@rootrecall.ai",
            "password": "securepassword123"
        }
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/v1/postmortems/generate/INC-9999",
        headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "created" or data["status"] == "updated"
