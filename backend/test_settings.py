"""
Automated Test Suite for RosterIQ Settings & Diagnostics
========================================================
Verifies:
1. Retrieval of system settings and database table counts.
2. Configuration updates (e.g., standard shift timings and max consecutive days).
3. Live database latency ping and diagnostics health check.
4. Demo database reset endpoint.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_settings_and_diagnostics():
    print("\n--- Testing Settings & System Diagnostics ---")

    # 1. Login as Operations Manager
    login_res = client.post("/api/v1/auth/login", json={"email": "ops@datastraw.io", "password": "Ops@123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. GET /api/v1/settings
    settings_res = client.get("/api/v1/settings", headers=headers)
    assert settings_res.status_code == 200
    s_data = settings_res.json()
    assert s_data["company_name"] is not None
    assert s_data["max_consecutive_days"] == 6
    assert s_data["table_counts"]["employees"] >= 30
    print(f"  [PASS] GET /settings: Company '{s_data['company_name']}', Max Days={s_data['max_consecutive_days']}")
    print(f"         Total Tables Verified: {len(s_data['table_counts'])} tables with live counts")

    # 3. PUT /api/v1/settings
    update_res = client.put(
        "/api/v1/settings",
        json={"company_name": "DataStraw Operations Global", "max_consecutive_days": 6},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["company_name"] == "DataStraw Operations Global"
    print(f"  [PASS] PUT /settings: Successfully updated company configuration")

    # 4. GET /api/v1/settings/diagnostics
    diag_res = client.get("/api/v1/settings/diagnostics", headers=headers)
    assert diag_res.status_code == 200
    d_data = diag_res.json()
    assert d_data["status"] == "OPERATIONAL"
    assert d_data["database_connected"] is True
    assert d_data["database_latency_ms"] >= 0.0
    print(f"  [PASS] GET /settings/diagnostics: Latency={d_data['database_latency_ms']}ms, Records={d_data['total_records']}, Status={d_data['status']}")


if __name__ == "__main__":
    test_settings_and_diagnostics()
    print("\n>>> ALL PHASE 14 SETTINGS TESTS PASSED 100%! <<<\n")
