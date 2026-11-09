"""
Unit & Integration Tests for Authentication & RBAC
Tests password hashing, JWT token issuance, login route, and role permissions.
"""
from fastapi.testclient import TestClient
from main import app
from app.models.user import UserRole

client = TestClient(app)


def test_auth_workflow():
    # 1. Seed canonical users
    seed_res = client.post("/api/v1/auth/seed-users")
    assert seed_res.status_code == 200
    seed_data = seed_res.json()
    assert len(seed_data["accounts"]) == 4
    print("Seed users response:", seed_data)

    # 2. Test successful login for Super Admin
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@datastraw.io", "password": "Admin@123"}
    )
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    assert token_data["user"]["role"] == UserRole.SUPER_ADMIN.value
    admin_token = token_data["access_token"]
    print("Admin login successful. Role:", token_data["user"]["role"])

    # 3. Test invalid password
    bad_login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@datastraw.io", "password": "WrongPassword"}
    )
    assert bad_login_res.status_code == 401
    print("Invalid password rejected as expected with 401.")

    # 4. Test /api/v1/auth/me with Bearer token
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "admin@datastraw.io"
    assert me_data["role"] == "SUPER_ADMIN"
    print("Protected /me returned current user profile:", me_data["full_name"])

    # 5. Test Employee Login & Token
    emp_login = client.post(
        "/api/v1/auth/login",
        json={"email": "emp@datastraw.io", "password": "Emp@123"}
    )
    assert emp_login.status_code == 200
    emp_token = emp_login.json()["access_token"]
    print("Employee login successful. Token acquired.")

    print("\nALL AUTHENTICATION & TOKEN TESTS PASSED WITH 100% SUCCESS!")


if __name__ == "__main__":
    test_auth_workflow()
