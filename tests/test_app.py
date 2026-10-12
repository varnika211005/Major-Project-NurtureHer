from fastapi.testclient import TestClient

from app.main import app


def test_root_health():
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_openapi_contains_required_routes():
    client = TestClient(app)
    paths = client.get("/openapi.json").json()["paths"]
    for path in [
        "/api/v1/auth/register",
        "/api/v1/auth/logout",
        "/api/v1/auth/change-password",
        "/api/v1/auth/me",
        "/api/v1/cycle",
        "/api/v1/cycle/prediction",
        "/api/v1/admin/dashboard",
    ]:
        assert path in paths
    assert "/api/v1/asha/high-risk" not in paths


def test_health_and_metrics_endpoints():
    client = TestClient(app)
    assert client.get("/health").status_code == 200
    metrics = client.get("/metrics")
    assert metrics.status_code == 200
    assert "nurtureher_http_requests_total" in metrics.text


def test_protected_route_without_credentials_returns_401():
    client = TestClient(app)
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
