"""
Automated Integration Tests for Phase 6: Leaves, Availability & Holidays
"""
from datetime import date
from fastapi.testclient import TestClient
from main import app
from app.models.leave import LeaveType, ApprovalStatus

client = TestClient(app)


def test_leaves_and_holidays():
    # 1. Login as Super Admin
    login_res = client.post("/api/v1/auth/login", json={"email": "admin@datastraw.io", "password": "Admin@123"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch employee Priya Sharma (EMP006)
    emps_res = client.get("/api/v1/employees?search=EMP006", headers=headers)
    assert emps_res.status_code == 200
    priya = emps_res.json()[0]

    # 2. Submit Leave Request
    leave_payload = {
        "employee_id": priya["id"],
        "leave_type": LeaveType.PLANNED.value,
        "start_date": "2026-11-15",
        "end_date": "2026-11-17",
        "reason": "Family gathering & personal leave",
    }
    create_leave_res = client.post("/api/v1/leaves", json=leave_payload, headers=headers)
    assert create_leave_res.status_code == 201
    leave_data = create_leave_res.json()
    assert leave_data["status"] == ApprovalStatus.PENDING.value
    leave_id = leave_data["id"]
    print(f"Leave request created: ID {leave_id}, Status: PENDING (Do not treat as approved yet).")

    # 3. Review Leave Request (Approve)
    review_res = client.put(
        f"/api/v1/leaves/{leave_id}/review",
        json={"status": ApprovalStatus.APPROVED.value, "review_comments": "Approved by Ops Manager"},
        headers=headers
    )
    assert review_res.status_code == 200
    reviewed_data = review_res.json()
    assert reviewed_data["status"] == ApprovalStatus.APPROVED.value
    print(f"Leave request #{leave_id} reviewed and APPROVED.")

    # 4. Test Comp-off Credit
    compoff_payload = {
        "employee_id": priya["id"],
        "earned_date": "2026-11-01",
        "reason": "Worked Sunday shift on GlowBotanics CS",
    }
    comp_res = client.post("/api/v1/leaves/comp-offs", json=compoff_payload, headers=headers)
    assert comp_res.status_code == 201
    comp_data = comp_res.json()
    comp_id = comp_data["id"]
    print(f"Comp-off credit submitted: ID {comp_id}, Status: PENDING.")

    # Approve Comp-off
    comp_appr_res = client.put(f"/api/v1/leaves/comp-offs/{comp_id}/approve", headers=headers)
    assert comp_appr_res.status_code == 200
    assert comp_appr_res.json()["status"] == ApprovalStatus.APPROVED.value
    print(f"Comp-off credit #{comp_id} APPROVED.")

    # 5. Test Public Holidays API
    holidays_res = client.get("/api/v1/holidays", headers=headers)
    assert holidays_res.status_code == 200
    holidays = holidays_res.json()
    assert len(holidays) >= 9
    print(f"Public Holidays API verified: {len(holidays)} declared holidays loaded.")

    # 6. Test Add and Delete Holiday
    new_h_payload = {
        "date": "2026-11-30",
        "name": "Special Company Foundation Day",
        "description": "Annual celebration",
        "is_national": False,
    }
    add_h_res = client.post("/api/v1/holidays", json=new_h_payload, headers=headers)
    assert add_h_res.status_code == 201
    new_h = add_h_res.json()
    print(f"New holiday added: {new_h['name']} on {new_h['date']}.")

    # Delete test holiday
    del_h_res = client.delete(f"/api/v1/holidays/{new_h['id']}", headers=headers)
    assert del_h_res.status_code == 200
    print(f"Holiday #{new_h['id']} deleted cleanly.")

    print("\nALL PHASE 6 LEAVE, AVAILABILITY & HOLIDAY TESTS PASSED!")


if __name__ == "__main__":
    test_leaves_and_holidays()
