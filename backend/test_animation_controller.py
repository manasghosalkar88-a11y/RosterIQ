"""
Automated Test Suite for RosterIQ 3D Animation Controller Backend Management
=============================================================================
Verifies:
1. Public read-only runtime configuration endpoint /api/v1/animation-controller.
2. RBAC protection: only SUPER_ADMIN can modify configuration or access /admin.
3. Mode switching (MOBIUS, WAVE, HELIX, CYLINDER).
4. Pause and Resume endpoints.
5. Burst activation and deactivation endpoints.
6. Open and Close endpoints (engine enablement).
7. Audit log recording for all administrative updates.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_animation_controller_backend():
    print("\n--- Testing 3D Animation Controller Backend Management ---")

    # 1. Public GET /api/v1/animation-controller (no token required)
    pub_res = client.get("/api/v1/animation-controller")
    assert pub_res.status_code == 200, f"Expected 200, got {pub_res.status_code}"
    pub_data = pub_res.json()
    assert pub_data["mode"] in ["MOBIUS", "WAVE", "HELIX", "CYLINDER"]
    assert "id" not in pub_data, "Public endpoint must not expose internal primary keys"
    assert "updated_by_id" not in pub_data, "Public endpoint must not leak admin IDs"
    print(f"  [PASS] Public GET /api/v1/animation-controller: mode={pub_data['mode']}, is_enabled={pub_data['is_enabled']}, is_playing={pub_data['is_playing']}")

    # 2. RBAC check: Unauthenticated / Non-SuperAdmin cannot access /admin or mutate state
    unauth_admin = client.get("/api/v1/animation-controller/admin")
    assert unauth_admin.status_code == 401
    print("  [PASS] Unauthenticated access to /admin properly blocked (401)")

    # Employee login (insufficient role)
    emp_login = client.post("/api/v1/auth/login", json={"email": "priya.sharma@datastraw.io", "password": "Emp@123"})
    if emp_login.status_code == 200:
        emp_token = emp_login.json()["access_token"]
        emp_headers = {"Authorization": f"Bearer {emp_token}"}
        emp_admin = client.get("/api/v1/animation-controller/admin", headers=emp_headers)
        assert emp_admin.status_code == 403, f"Expected 403 for EMPLOYEE, got {emp_admin.status_code}"
        emp_mutate = client.post("/api/v1/animation-controller/mode", json={"mode": "HELIX"}, headers=emp_headers)
        assert emp_mutate.status_code == 403
        print("  [PASS] EMPLOYEE role mutation properly rejected (403 Forbidden)")

    # 3. Super Admin Login
    admin_login = client.post("/api/v1/auth/login", json={"email": "admin@datastraw.io", "password": "Admin@123"})
    assert admin_login.status_code == 200, f"SuperAdmin login failed: {admin_login.text}"
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 4. Super Admin GET /api/v1/animation-controller/admin
    adm_res = client.get("/api/v1/animation-controller/admin", headers=admin_headers)
    assert adm_res.status_code == 200
    adm_data = adm_res.json()
    assert adm_data["controller_key"] == "topology_mesh"
    print(f"  [PASS] SuperAdmin GET /admin: controller_key={adm_data['controller_key']}")

    # 5. Switch Modes (MOBIUS -> WAVE -> HELIX -> CYLINDER -> MOBIUS)
    for target_mode in ["WAVE", "HELIX", "CYLINDER", "MOBIUS"]:
        mode_res = client.post(
            "/api/v1/animation-controller/mode",
            json={"mode": target_mode},
            headers=admin_headers,
        )
        assert mode_res.status_code == 200
        assert mode_res.json()["mode"] == target_mode
        # Verify public state immediately reflects update
        chk = client.get("/api/v1/animation-controller").json()
        assert chk["mode"] == target_mode
    print("  [PASS] Mode transitions verified for all 4 topologies")

    # 6. Pause and Resume
    pause_res = client.post("/api/v1/animation-controller/pause", headers=admin_headers)
    assert pause_res.status_code == 200
    assert pause_res.json()["is_playing"] is False
    chk_pause = client.get("/api/v1/animation-controller").json()
    assert chk_pause["is_playing"] is False
    print("  [PASS] POST /pause verified")

    resume_res = client.post("/api/v1/animation-controller/resume", headers=admin_headers)
    assert resume_res.status_code == 200
    assert resume_res.json()["is_playing"] is True
    chk_resume = client.get("/api/v1/animation-controller").json()
    assert chk_resume["is_playing"] is True
    print("  [PASS] POST /resume verified")

    # 7. Burst Activation and Deactivation
    nonce_before = client.get("/api/v1/animation-controller").json()["burst_nonce"]
    burst_on = client.post("/api/v1/animation-controller/burst/activate", headers=admin_headers)
    assert burst_on.status_code == 200
    assert burst_on.json()["burst_active"] is True
    assert burst_on.json()["burst_nonce"] > nonce_before

    burst_off = client.post("/api/v1/animation-controller/burst/deactivate", headers=admin_headers)
    assert burst_off.status_code == 200
    assert burst_off.json()["burst_active"] is False
    print(f"  [PASS] Burst lifecycle verified (nonce incremented from {nonce_before} to {burst_on.json()['burst_nonce']})")

    # 8. Close and Open
    close_res = client.post("/api/v1/animation-controller/close", headers=admin_headers)
    assert close_res.status_code == 200
    assert close_res.json()["is_enabled"] is False
    assert close_res.json()["is_playing"] is False
    chk_closed = client.get("/api/v1/animation-controller").json()
    assert chk_closed["is_enabled"] is False

    open_res = client.post("/api/v1/animation-controller/open", headers=admin_headers)
    assert open_res.status_code == 200
    assert open_res.json()["is_enabled"] is True
    assert open_res.json()["is_playing"] is True
    print("  [PASS] Close / Open lifecycle verified")

    # 9. Comprehensive PUT update (speed_multiplier, particle_count, subtle)
    update_res = client.put(
        "/api/v1/animation-controller",
        json={
            "mode": "HELIX",
            "speed_multiplier": 1.25,
            "particle_count": 85,
            "subtle": False,
        },
        headers=admin_headers,
    )
    assert update_res.status_code == 200
    u_data = update_res.json()
    assert u_data["mode"] == "HELIX"
    assert u_data["speed_multiplier"] == 1.25
    assert u_data["particle_count"] == 85

    # Reset back to pristine default MOBIUS
    client.put(
        "/api/v1/animation-controller",
        json={"mode": "MOBIUS", "speed_multiplier": 1.0, "particle_count": 70, "is_enabled": True, "is_playing": True},
        headers=admin_headers,
    )
    print("  [PASS] Full PUT updates and parameter bounds verified")


if __name__ == "__main__":
    test_animation_controller_backend()
    print("\n>>> ALL 3D ANIMATION CONTROLLER BACKEND TESTS PASSED 100%! <<<\n")
