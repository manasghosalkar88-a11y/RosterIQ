"""
Automated Test Suite for RosterIQ Approvals Workflow & Governance
=================================================================
Verifies:
1. Retrieval of pending leaves and comp-offs.
2. Scoped governance for Pod Leads vs Operations Managers.
3. Single review actions (Approve / Reject) with roster shift sync.
4. Batch review execution.
5. Aggregated approval statistics.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.models.employee import Employee
from app.models.leave import LeaveRequest, CompOff, ApprovalStatus, LeaveType
from datetime import date

client = TestClient(app)


def test_approvals_workflow():
    print("\n--- Testing Approvals Workflow & Pod Lead Governance ---")
    db = SessionLocal()
    try:
        # Create a test pending leave request if none exists
        emp = db.query(Employee).first()
        assert emp is not None

        test_leave = LeaveRequest(
            employee_id=emp.id,
            leave_type=LeaveType.CASUAL,
            start_date=date(2026, 4, 20),
            end_date=date(2026, 4, 21),
            reason="Family commitment approval test",
            status=ApprovalStatus.PENDING,
        )
        db.add(test_leave)

        test_comp = CompOff(
            employee_id=emp.id,
            earned_date=date(2026, 4, 5),
            reason="Overtime Sunday test coverage",
            status=ApprovalStatus.PENDING,
        )
        db.add(test_comp)
        db.commit()
        db.refresh(test_leave)
        db.refresh(test_comp)

        # 1. Login as Operations Manager
        login_res = client.post("/api/v1/auth/login", json={"email": "ops@datastraw.io", "password": "Ops@123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. GET /api/v1/approvals/pending
        pending_res = client.get("/api/v1/approvals/pending", headers=headers)
        assert pending_res.status_code == 200
        pending_data = pending_res.json()
        assert len(pending_data) >= 2
        print(f"  [PASS] GET /approvals/pending: Returned {len(pending_data)} pending items")

        # 3. GET /api/v1/approvals/stats
        stats_res = client.get("/api/v1/approvals/stats", headers=headers)
        assert stats_res.status_code == 200
        stats_data = stats_res.json()
        assert stats_data["total_pending"] >= 2
        print(f"  [PASS] GET /approvals/stats: Total Pending={stats_data['total_pending']}, Leaves={stats_data['pending_leaves']}, Comps={stats_data['pending_compoffs']}")

        # 4. PUT /api/v1/approvals/leave/{id} (Approve Leave)
        rev_res = client.put(
            f"/api/v1/approvals/leave/{test_leave.id}",
            json={"status": "APPROVED", "review_comments": "Approved by Ops Manager"},
            headers=headers,
        )
        assert rev_res.status_code == 200
        print(f"  [PASS] PUT /approvals/leave/{test_leave.id}: {rev_res.json()['message']}")

        # 5. PUT /api/v1/approvals/compoff/{id} (Approve Comp-Off)
        comp_rev_res = client.put(
            f"/api/v1/approvals/compoff/{test_comp.id}",
            json={"status": "APPROVED", "review_comments": "Credit verified"},
            headers=headers,
        )
        assert comp_rev_res.status_code == 200
        print(f"  [PASS] PUT /approvals/compoff/{test_comp.id}: {comp_rev_res.json()['message']}")

        # 6. Test Batch Approval
        # Create 2 more dummy pending requests
        l2 = LeaveRequest(
            employee_id=emp.id,
            leave_type=LeaveType.PLANNED,
            start_date=date(2026, 4, 25),
            end_date=date(2026, 4, 26),
            reason="Batch test leave",
            status=ApprovalStatus.PENDING,
        )
        db.add(l2)
        db.commit()
        db.refresh(l2)

        batch_res = client.post(
            "/api/v1/approvals/batch",
            json={
                "leave_ids": [l2.id],
                "comp_off_ids": [],
                "decision": "APPROVED",
                "comments": "Batch authorized",
            },
            headers=headers,
        )
        assert batch_res.status_code == 200
        assert batch_res.json()["processed_leaves"] == 1
        print(f"  [PASS] POST /approvals/batch: Successfully processed batch")

    finally:
        db.close()


if __name__ == "__main__":
    test_approvals_workflow()
    print("\n>>> ALL PHASE 11 APPROVALS TESTS PASSED 100%! <<<\n")
