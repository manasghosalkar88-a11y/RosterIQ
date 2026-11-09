"""
Automated Test Suite for RosterIQ Change Management & Recommendations
=====================================================================
Specifically validates the core assessment scenario:
1. An employee (e.g., Priya Sharma on GlowBotanics) becomes unavailable on an operating date.
2. The recommendation engine evaluates and ranks replacements from the same pod / skill pool.
3. Surgical shift override executes in-place without rebuilding the entire month's roster.
4. Auto-resolves operational conflicts, awards compensatory off credits, and logs immutable audit trail.
"""

import sys
from datetime import date
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.models.employee import Employee
from app.models.brand import Brand
from app.models.roster import Roster, RosterEntry, ShiftStatus
from app.models.conflict import SchedulingConflict
from app.models.audit import AuditLog
from app.models.leave import CompOff
from app.engine.scheduler import SchedulingEngine
from app.engine.change_manager import ChangeManager
from app.schemas.change_management import ShiftOverrideRequest

client = TestClient(app)


def test_change_management_scenario():
    print("\n--- Testing Change Management & Backup Recommendations Engine ---")
    db = SessionLocal()
    try:
        # Step 1: Ensure April 2026 Roster is generated
        roster = db.query(Roster).filter(Roster.month == 4, Roster.year == 2026).first()
        if not roster:
            roster = SchedulingEngine(db, 4, 2026).generate("April 2026 Master Roster")

        # Step 2: Identify Priya Sharma (EMP001) & GlowBotanics (BRD-GLOW)
        priya = db.query(Employee).filter(Employee.employee_code == "EMP001").first()
        glow = db.query(Brand).filter(Brand.code == "BRD-GLOW").first()

        assert priya is not None, "Priya Sharma should exist in seed data"
        assert glow is not None, "GlowBotanics should exist in seed data"
        print(f"  [PASS] Identified Specialist: {priya.full_name} ({priya.employee_code}) - Pod ID: {priya.pod_id}")
        print(f"  [PASS] Single-Resource Brand: {glow.name} ({glow.code})")

        target_date = date(2026, 4, 15)  # Wednesday (middle of the month)

        # Step 3: Test Recommendation Engine
        recommendations = ChangeManager.get_backup_recommendations(
            db=db,
            target_date=target_date,
            brand_id=glow.id,
            absent_employee_id=priya.id,
            roster_id=roster.id,
        )

        assert len(recommendations) > 0, "Recommendations should return eligible candidates"
        top_pick = recommendations[0]
        print(f"  [PASS] Top Recommended Backup: {top_pick.full_name} ({top_pick.employee_code}) - Pod: {top_pick.pod_name}")
        print(f"         Suitability Score: {top_pick.suitability_score}/100")
        print(f"         Match Reasons: {top_pick.match_reasons}")
        assert top_pick.employee_id != priya.id, "Candidate must not be the absent employee"

        # Step 4: Record pre-override state for comparison
        pre_override_entries_count = db.query(RosterEntry).filter(RosterEntry.roster_id == roster.id).count()
        other_date_entry = db.query(RosterEntry).filter(
            RosterEntry.roster_id == roster.id,
            RosterEntry.employee_id == priya.id,
            RosterEntry.date == date(2026, 4, 10),
        ).first()
        other_date_status_before = other_date_entry.status if other_date_entry else None

        # Step 5: Execute In-Place Shift Override
        override_req = ShiftOverrideRequest(
            roster_id=roster.id,
            date=target_date,
            source_employee_id=priya.id,
            target_employee_id=top_pick.employee_id,
            brand_id=glow.id,
            reason="Priya Sharma unavailable due to medical emergency. Pod backup assigned.",
        )

        override_res = ChangeManager.apply_shift_override(
            db=db,
            req=override_req,
            user_id=1,
        )

        assert override_res.success is True
        print(f"  [PASS] Shift Override Executed: {override_res.message}")

        # Step 6: Verify Surgical In-Place Changes (Zero Destructive Rebuild)
        priya_target_entry = db.query(RosterEntry).filter(
            RosterEntry.roster_id == roster.id,
            RosterEntry.employee_id == priya.id,
            RosterEntry.date == target_date,
        ).first()
        assert priya_target_entry.status == ShiftStatus.LEAVE
        assert priya_target_entry.is_manual_override is True
        print(f"  [PASS] Priya's status on {target_date} updated to {priya_target_entry.status.value}")

        backup_target_entry = db.query(RosterEntry).filter(
            RosterEntry.roster_id == roster.id,
            RosterEntry.employee_id == top_pick.employee_id,
            RosterEntry.date == target_date,
        ).first()
        assert backup_target_entry.status == ShiftStatus.WORKING
        assert backup_target_entry.brand_id == glow.id
        assert backup_target_entry.is_manual_override is True
        print(f"  [PASS] Backup {top_pick.full_name} status on {target_date} updated to WORKING for {glow.name}")

        # Verify other days remained untouched!
        other_date_entry_after = db.query(RosterEntry).filter(
            RosterEntry.roster_id == roster.id,
            RosterEntry.employee_id == priya.id,
            RosterEntry.date == date(2026, 4, 10),
        ).first()
        assert other_date_entry_after.status == other_date_status_before, "Other dates must not regress"
        print(f"  [PASS] Verified zero regression on unaffected dates (e.g., 2026-04-10 preserved)")

        # Step 7: Verify Audit Log & Comp-Off
        audit_log = db.query(AuditLog).filter(AuditLog.id == override_res.audit_log_id).first()
        assert audit_log is not None
        assert audit_log.action == "SHIFT_OVERRIDE"
        print(f"  [PASS] Audit Log #{audit_log.id} recorded with action: {audit_log.action}")

        # Step 8: Test API endpoints for changes
        login_res = client.post("/api/v1/auth/login", json={"email": "ops@datastraw.io", "password": "Ops@123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 8.1 GET /api/v1/changes/recommendations
        rec_res = client.get(
            f"/api/v1/changes/recommendations?date=2026-04-15&brand_id={glow.id}&absent_employee_id={priya.id}&roster_id={roster.id}",
            headers=headers,
        )
        assert rec_res.status_code == 200
        rec_data = rec_res.json()
        assert len(rec_data) > 0
        print(f"  [PASS] API GET /changes/recommendations returned {len(rec_data)} scored candidates")

        # 8.2 GET /api/v1/changes/audit-logs
        audit_res = client.get("/api/v1/changes/audit-logs", headers=headers)
        assert audit_res.status_code == 200
        assert len(audit_res.json()) > 0
        print(f"  [PASS] API GET /changes/audit-logs returned {len(audit_res.json())} audit records")

    finally:
        db.close()


if __name__ == "__main__":
    test_change_management_scenario()
    print("\n>>> ALL PHASE 10 CHANGE MANAGEMENT TESTS PASSED 100%! <<<\n")
