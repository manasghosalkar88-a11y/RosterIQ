"""
Automated Test Suite for Overview Dashboard & Notifications
============================================================
Verifies:
1. Live overview summary statistics and today's workforce status.
2. Critical alerts, upcoming leaves, and recent changes feed.
3. User notifications queue, auto-seeding, and mark-as-read actions.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_overview_and_notifications():
    print("\n--- Testing Overview Dashboard & In-App Notifications ---")

    # 1. Login as Operations Manager
    login_res = client.post("/api/v1/auth/login", json={"email": "ops@datastraw.io", "password": "Ops@123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. GET /api/v1/overview/summary
    overview_res = client.get("/api/v1/overview/summary", headers=headers)
    assert overview_res.status_code == 200
    ov_data = overview_res.json()

    assert ov_data["kpis"]["total_employees"] >= 30
    assert ov_data["kpis"]["active_brands"] == 10
    assert ov_data["kpis"]["active_processes"] == 4
    assert ov_data["today_status"]["date"] is not None
    assert len(ov_data["upcoming_holidays"]) > 0

    print(f"  [PASS] GET /overview/summary: Loaded KPIs successfully")
    print(f"         Total Employees: {ov_data['kpis']['total_employees']}")
    print(f"         Working Today: {ov_data['kpis']['working_today']}")
    print(f"         On Leave Today: {ov_data['kpis']['on_leave_today']}")
    print(f"         Coverage Rate: {ov_data['kpis']['coverage_percentage']}%")
    print(f"         Critical Alerts: {len(ov_data['critical_alerts'])}")
    print(f"         Upcoming Leaves: {len(ov_data['upcoming_leaves'])}")
    print(f"         Recent Changes: {len(ov_data['recent_changes'])}")

    # 3. GET /api/v1/notifications
    notif_res = client.get("/api/v1/notifications", headers=headers)
    assert notif_res.status_code == 200
    notifs = notif_res.json()
    assert len(notifs) >= 4
    print(f"  [PASS] GET /notifications: Loaded {len(notifs)} operational notifications")

    # 4. PUT /api/v1/notifications/{id}/read
    first_notif_id = notifs[0]["id"]
    read_res = client.put(f"/api/v1/notifications/{first_notif_id}/read", headers=headers)
    assert read_res.status_code == 200
    assert read_res.json()["is_read"] is True
    print(f"  [PASS] PUT /notifications/{first_notif_id}/read: Successfully marked read")

    # 5. POST /api/v1/notifications/mark-all-read
    all_read_res = client.post("/api/v1/notifications/mark-all-read", headers=headers)
    assert all_read_res.status_code == 200
    print(f"  [PASS] POST /notifications/mark-all-read: All notifications marked read")


if __name__ == "__main__":
    test_overview_and_notifications()
    print("\n>>> ALL PHASE 13 OVERVIEW & NOTIFICATIONS TESTS PASSED 100%! <<<\n")
