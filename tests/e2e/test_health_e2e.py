from fastapi.testclient import TestClient

from app.main import app


def test_health_metrics_and_docs_e2e():
    client = TestClient(app)
    assert client.get("/health").json()["status"] == "healthy"
    assert client.get("/metrics").status_code == 200
    assert client.get("/docs").status_code == 200

