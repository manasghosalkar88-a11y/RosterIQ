from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    print("Health Check Response:", data)


def test_api_root():
    response = client.get("/api/v1")
    assert response.status_code == 200
    data = response.json()
    assert "docs" in data
    print("API Root Response:", data)


if __name__ == "__main__":
    test_health()
    test_api_root()
    print("ALL INITIAL BACKEND TESTS PASSED SUCCESSFULLY!")
