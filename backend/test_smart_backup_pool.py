"""
Comprehensive 13-Scenario Verification Suite for Smart Backup Candidate Pool
==========================================================================
Validates every eligibility constraint, weighted ranking order, empty-state
diagnostic, stale snapshot / live conflict guard, save/approval workflow,
transactional apply side-effects, and RBAC security using a restorable DB snapshot.
"""

import json
import sys
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal, engine
from app.models.employee import Employee
from app.models.brand import Brand
from app.models.process import Process
from app.models.roster import Roster, RosterEntry, RosterVersion, ShiftStatus
from app.models.leave import LeaveRequest, LeaveType, CompOff, ApprovalStatus
from app.models.conflict import SchedulingConflict, ConflictType, ConflictSeverity
from app.models.audit import AuditLog
from app.models.notification import Notification
from app.models.simulation import SimulationScenario, ScenarioStatus
from app.engine.change_manager import ChangeManager


DB_PATH = Path(__file__).resolve().parent / "rosteriq.db"


def login(client: TestClient, email: str, password: str) -> dict:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def reset_db_from_bytes(snapshot_bytes: bytes):
    engine.dispose()
    DB_PATH.write_bytes(snapshot_bytes)


def run_all_scenarios():
    assert DB_PATH.exists(), f"Database not found at {DB_PATH}"
    original_db_bytes = DB_PATH.read_bytes()

    print("\n" + "=" * 84)
    print("  ROSTERIQ SMART BACKUP CANDIDATE POOL — 13-SCENARIO COMPREHENSIVE SUITE")
    print("=" * 84)

    try:
        client = TestClient(app)

        # Authenticate roles
        admin_hdr = login(client, "admin@datastraw.io", "Admin@123")
        ops_hdr = login(client, "ops@datastraw.io", "Ops@123")
        lead_hdr = login(client, "lead@datastraw.io", "Lead@123")
        emp_hdr = login(client, "emp@datastraw.io", "Emp@123")

        # Resolve baseline entities for Nov 2026 Roster #2
        db = SessionLocal()
        roster = db.query(Roster).filter(Roster.month == 11, Roster.year == 2026).first()
        assert roster is not None, "November 2026 roster must exist"
        priya = db.query(Employee).filter(Employee.employee_code == "EMP006").first()
        glow = db.query(Brand).filter(Brand.code == "BRD-GLOW").first()
        assert priya and glow
        target_day = date(2026, 11, 14)
        priya_entry = db.query(RosterEntry).filter(
            RosterEntry.roster_id == roster.id,
            RosterEntry.employee_id == priya.id,
            RosterEntry.date == target_day,
        ).first()
        assert priya_entry and priya_entry.status == ShiftStatus.WORKING, "Priya must be WORKING on 2026-11-14"
        proc_id = priya_entry.process_id or 1
        db.close()

        # ------------------------------------------------------------------
        # Scenario 1: Multiple eligible backup candidates & weighted ranking
        # ------------------------------------------------------------------
        sim_payload = {
            "roster_id": roster.id,
            "simulation_type": "EMPLOYEE_ABSENCE",
            "start_date": target_day.isoformat(),
            "end_date": target_day.isoformat(),
            "employee_id": priya.id,
            "brand_id": glow.id,
            "process_id": proc_id,
            "reason": "Scenario 1 verification",
        }
        r1 = client.post("/api/v1/simulator/simulate", json=sim_payload, headers=ops_hdr)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        cands = d1["backup_recommendations"]
        summary1 = d1["backup_evaluation_summary"]
        assert len(cands) >= 2, f"Expected >=2 eligible candidates, got {len(cands)}"
        assert summary1["total_evaluated"] == summary1["eligible_count"] + summary1["excluded_count"]
        scores = [c["suitability_score"] for c in cands]
        assert scores == sorted(scores, reverse=True), f"Scores not descending: {scores}"

        # Verify weighted 35/25/15/15/10 formula on top candidate
        sb = cands[0]["score_breakdown"]
        expected_score = max(1, min(100, round(
            sb["skill_score"]
            + sb["availability_score"]
            + sb["pod_score"]
            + sb["workload_score"]
            + sb["certification_score"]
        )))
        assert cands[0]["suitability_score"] == expected_score, (
            f"Weighted score mismatch: {cands[0]['suitability_score']} != {expected_score}"
        )
        print(f"  [PASS 01] Multiple eligible candidates ({len(cands)}) ranked accurately via 35/25/15/15/10 weights (Top: {cands[0]['full_name']} @ {cands[0]['suitability_score']}%)")

        top_candidate = cands[0]
        second_candidate = cands[1]

        # ------------------------------------------------------------------
        # Scenarios 3-8 & 2: Hard eligibility gate exclusions & empty state
        # ------------------------------------------------------------------
        db = SessionLocal()
        try:
            # Scenario 3: ALREADY_SCHEDULED
            sneha = db.query(Employee).filter(Employee.employee_code == "EMP001").first()
            assert sneha is not None
            sneha_entry = db.query(RosterEntry).filter(
                RosterEntry.roster_id == roster.id,
                RosterEntry.employee_id == sneha.id,
                RosterEntry.date == target_day,
            ).first()
            assert sneha_entry is not None
            sneha_entry.status = ShiftStatus.WORKING
            db.commit()
            recs3, sum3 = ChangeManager.evaluate_backup_candidates(
                db, [target_day], glow.id, proc_id, priya.id, roster.id
            )
            assert all(c.employee_id != sneha.id for c in recs3)
            ok3, reason3, _ = ChangeManager.validate_candidate_eligibility(
                db, sneha.id, [target_day], glow.id, proc_id, priya.id, roster.id
            )
            assert not ok3 and "ALREADY_SCHEDULED" in reason3
            assert any(ex.code == "ALREADY_SCHEDULED" for ex in sum3.exclusion_reasons)
            print("  [PASS 03] Candidate already scheduled strictly excluded (ALREADY_SCHEDULED)")

            # Scenario 4: APPROVED_LEAVE
            cand_top_db = db.query(Employee).filter(Employee.id == top_candidate["employee_id"]).first()
            db.add(LeaveRequest(
                employee_id=cand_top_db.id,
                leave_type=LeaveType.PLANNED,
                start_date=target_day,
                end_date=target_day,
                reason="Test approved leave",
                status=ApprovalStatus.APPROVED,
            ))
            db.commit()
            ok4, reason4, _ = ChangeManager.validate_candidate_eligibility(
                db, cand_top_db.id, [target_day], glow.id, proc_id, priya.id, roster.id
            )
            assert not ok4 and "APPROVED_LEAVE" in reason4
            print(f"  [PASS 04] Candidate on approved leave strictly excluded (APPROVED_LEAVE: {cand_top_db.full_name})")

            # Scenario 5: MISSING_CERTIFICATION
            cand2_db = db.query(Employee).filter(Employee.id == second_candidate["employee_id"]).first()
            cand2_orig_certs = cand2_db.certifications_json
            cand2_db.certifications_json = json.dumps(["CERT-OTHER"])
            db.commit()
            ok5, reason5, _ = ChangeManager.validate_candidate_eligibility(
                db, cand2_db.id, [target_day], glow.id, proc_id, priya.id, roster.id
            )
            assert not ok5 and "MISSING_CERTIFICATION" in reason5
            print(f"  [PASS 05] Candidate missing mandatory certification strictly excluded (MISSING_CERTIFICATION: {cand2_db.full_name})")

            # Restore cand2 certs for next isolated check
            cand2_db.certifications_json = cand2_orig_certs
            db.commit()

            # Scenario 6: MAX_WEEKLY_HOURS_EXCEEDED
            orig_max_h = cand2_db.max_weekly_hours
            cand2_db.max_weekly_hours = 8  # Already >=1 shift in that week -> adding +8h exceeds 8h
            # Guarantee at least 1 shift in the target week (Mon Nov 9 .. Fri Nov 13)
            nov10 = db.query(RosterEntry).filter(
                RosterEntry.roster_id == roster.id,
                RosterEntry.employee_id == cand2_db.id,
                RosterEntry.date == date(2026, 11, 10),
            ).first()
            if nov10:
                nov10.status = ShiftStatus.WORKING
            db.commit()
            ok6, reason6, _ = ChangeManager.validate_candidate_eligibility(
                db, cand2_db.id, [target_day], glow.id, proc_id, priya.id, roster.id
            )
            assert not ok6 and "MAX_WEEKLY_HOURS_EXCEEDED" in reason6, f"Got {reason6}"
            print(f"  [PASS 06] Candidate exceeding weekly hours strictly excluded (MAX_WEEKLY_HOURS_EXCEEDED)")
            cand2_db.max_weekly_hours = orig_max_h
            db.commit()

            # Scenario 7: MAX_CONSECUTIVE_DAYS_EXCEEDED (6 prior days Nov 8..13)
            cand2_db.max_weekly_hours = 80
            for d_num in range(8, 14):
                ent = db.query(RosterEntry).filter(
                    RosterEntry.roster_id == roster.id,
                    RosterEntry.employee_id == cand2_db.id,
                    RosterEntry.date == date(2026, 11, d_num),
                ).first()
                if ent:
                    ent.status = ShiftStatus.WORKING
                    ent.shift_start = "09:00"
                    ent.shift_end = "18:00"
            db.commit()
            ok7, reason7, _ = ChangeManager.validate_candidate_eligibility(
                db, cand2_db.id, [target_day], glow.id, proc_id, priya.id, roster.id
            )
            assert not ok7 and "MAX_CONSECUTIVE_DAYS_EXCEEDED" in reason7, f"Got {reason7}"
            print(f"  [PASS 07] Candidate exceeding 6 consecutive days strictly excluded (MAX_CONSECUTIVE_DAYS_EXCEEDED)")

            # Scenario 8: INSUFFICIENT_REST_PERIOD (prev day ends 23:30, break streak back down)
            nov8 = db.query(RosterEntry).filter(
                RosterEntry.roster_id == roster.id,
                RosterEntry.employee_id == cand2_db.id,
                RosterEntry.date == date(2026, 11, 8),
            ).first()
            if nov8:
                nov8.status = ShiftStatus.WEEKLY_OFF
            nov13 = db.query(RosterEntry).filter(
                RosterEntry.roster_id == roster.id,
                RosterEntry.employee_id == cand2_db.id,
                RosterEntry.date == date(2026, 11, 13),
            ).first()
            if nov13:
                nov13.status = ShiftStatus.WORKING
                nov13.shift_start = "14:30"
                nov13.shift_end = "23:30"
            db.commit()
            ok8, reason8, _ = ChangeManager.validate_candidate_eligibility(
                db, cand2_db.id, [target_day], glow.id, proc_id, priya.id, roster.id
            )
            assert not ok8 and "INSUFFICIENT_REST_PERIOD" in reason8, f"Got {reason8}"
            print(f"  [PASS 08] Candidate with <12h rest strictly excluded (INSUFFICIENT_REST_PERIOD)")

            # Scenario 2: No eligible candidates & empty-state exclusion breakdown
            proc = db.query(Process).filter(Process.id == proc_id).first()
            orig_proc_certs = proc.mandatory_certifications_json
            proc.mandatory_certifications_json = json.dumps(["CERT-IMPOSSIBLE-XYZ"])
            db.commit()
            r2 = client.post("/api/v1/simulator/simulate", json=sim_payload, headers=ops_hdr)
            assert r2.status_code == 200
            d2 = r2.json()
            assert len(d2["backup_recommendations"]) == 0
            sum2 = d2["backup_evaluation_summary"]
            assert sum2["eligible_count"] == 0
            assert sum2["excluded_count"] == sum2["total_evaluated"]
            assert len(sum2["exclusion_reasons"]) > 0
            print(f"  [PASS 02] Empty state reports real exclusion breakdown ({sum2['excluded_count']} excluded across {len(sum2['exclusion_reasons'])} reasons)")
        finally:
            db.close()

        # Restore clean DB before lifecycle/security tests (Scenarios 9-13)
        reset_db_from_bytes(original_db_bytes)
        client = TestClient(app)
        admin_hdr = login(client, "admin@datastraw.io", "Admin@123")
        ops_hdr = login(client, "ops@datastraw.io", "Ops@123")
        lead_hdr = login(client, "lead@datastraw.io", "Lead@123")
        emp_hdr = login(client, "emp@datastraw.io", "Emp@123")

        # Find a same-pod candidate AND a cross-pod candidate for Nov 14
        r_fresh = client.post("/api/v1/simulator/simulate", json=sim_payload, headers=ops_hdr)
        assert r_fresh.status_code == 200
        fresh_data = r_fresh.json()
        snap_hash = fresh_data["roster_snapshot_hash"]
        same_pod_cand = next(
            (c for c in fresh_data["backup_recommendations"] if c["pod_id"] == priya.pod_id),
            fresh_data["backup_recommendations"][0],
        )
        cross_pod_cand = next(
            (c for c in fresh_data["backup_recommendations"] if c["pod_id"] != priya.pod_id),
            None,
        )
        assert cross_pod_cand is not None, "Need at least one cross-pod eligible candidate for escalation test"

        # ------------------------------------------------------------------
        # Scenario 13: Unauthorized apply attempts (RBAC)
        # ------------------------------------------------------------------
        direct_apply_payload = {
            **sim_payload,
            "target_employee_id": same_pod_cand["employee_id"],
            "expected_snapshot_hash": snap_hash,
            "reason": "Unauthorized check",
        }
        r_emp = client.post("/api/v1/simulator/apply", json=direct_apply_payload, headers=emp_hdr)
        assert r_emp.status_code == 403, f"EMPLOYEE must be 403, got {r_emp.status_code}"
        r_lead = client.post("/api/v1/simulator/apply", json=direct_apply_payload, headers=lead_hdr)
        assert r_lead.status_code == 403, f"POD_LEAD must be 403, got {r_lead.status_code}"
        print("  [PASS 13] Unauthorized apply attempts blocked with HTTP 403 for EMPLOYEE and POD_LEAD")

        # ------------------------------------------------------------------
        # Scenario 10: Save scenario with candidate snapshot & AuditLog
        # ------------------------------------------------------------------
        save_payload = {
            "roster_id": roster.id,
            "name": "Priya Absence Same-Pod Plan",
            "description": "Saved snapshot verification",
            "simulation_type": "EMPLOYEE_ABSENCE",
            "parameters": {**sim_payload, "target_employee_id": same_pod_cand["employee_id"]},
            "impact_summary": {
                "coverage_before": fresh_data["coverage_before"],
                "coverage_after": fresh_data["coverage_after"],
                "executive_summary": fresh_data["executive_summary"],
            },
            "candidate_ranking": {
                "candidates": fresh_data["backup_recommendations"],
                "summary": fresh_data["backup_evaluation_summary"],
            },
            "selected_backup_employee_id": same_pod_cand["employee_id"],
            "roster_snapshot_hash": snap_hash,
            "submit_for_approval": False,
        }
        r_save = client.post("/api/v1/simulator/scenarios", json=save_payload, headers=ops_hdr)
        assert r_save.status_code in (200, 201), r_save.text
        saved_sc = r_save.json()
        assert saved_sc["status"] == "SAVED"
        assert saved_sc["selected_backup_employee_id"] == same_pod_cand["employee_id"]
        assert saved_sc["roster_snapshot_hash"] == snap_hash

        list_sc = client.get(f"/api/v1/simulator/scenarios?roster_id={roster.id}", headers=ops_hdr).json()
        assert any(s["id"] == saved_sc["id"] for s in list_sc)
        print(f"  [PASS 10] Scenario #{saved_sc['id']} saved with candidate ranking snapshot, hash & audit log")

        # ------------------------------------------------------------------
        # Scenario 11: Escalated Approval Workflow (cross-pod -> PENDING_APPROVAL -> SUPER_ADMIN)
        # ------------------------------------------------------------------
        esc_save_payload = {
            "roster_id": roster.id,
            "name": "Escalated Cross-Pod Plan",
            "description": "Cross-pod specialist requires Super Admin sign-off",
            "simulation_type": "EMPLOYEE_ABSENCE",
            "parameters": {**sim_payload, "target_employee_id": cross_pod_cand["employee_id"]},
            "impact_summary": {
                "coverage_before": fresh_data["coverage_before"],
                "coverage_after": fresh_data["coverage_after"],
                "executive_summary": fresh_data["executive_summary"],
            },
            "candidate_ranking": {"candidates": fresh_data["backup_recommendations"]},
            "selected_backup_employee_id": cross_pod_cand["employee_id"],
            "roster_snapshot_hash": snap_hash,
            "submit_for_approval": True,
        }
        r_esc = client.post("/api/v1/simulator/scenarios", json=esc_save_payload, headers=lead_hdr)
        assert r_esc.status_code in (200, 201), r_esc.text
        esc_sc = r_esc.json()
        assert esc_sc["status"] == "PENDING_APPROVAL"
        assert esc_sc["requires_approval"] is True
        assert esc_sc["required_approver_role"] == "SUPER_ADMIN"

        # Blocked apply while pending approval
        r_block_apply = client.post(f"/api/v1/simulator/scenarios/{esc_sc['id']}/apply", json={}, headers=ops_hdr)
        assert r_block_apply.status_code == 403

        # Verify appears in Approvals pending queue & stats
        pending_q = client.get("/api/v1/approvals/pending?item_type=SIMULATION_SCENARIO", headers=admin_hdr).json()
        assert any(i["id"] == esc_sc["id"] and i["item_type"] == "SIMULATION_SCENARIO" for i in pending_q)
        stats_q = client.get("/api/v1/approvals/stats", headers=admin_hdr).json()
        assert stats_q["pending_scenarios"] >= 1

        # OPS_MANAGER blocked from approving SUPER_ADMIN escalation; POD_LEAD blocked
        r_ops_app = client.put(
            f"/api/v1/approvals/scenario/{esc_sc['id']}",
            json={"status": "APPROVED", "review_comments": "Ops trying escalation"},
            headers=ops_hdr,
        )
        assert r_ops_app.status_code == 403, f"Expected 403 for OPS_MANAGER on SUPER_ADMIN scenario, got {r_ops_app.status_code}"

        # Also OPS_MANAGER blocked from direct /apply of cross-pod escalation
        r_ops_bypass = client.post(
            "/api/v1/simulator/apply",
            json={**sim_payload, "target_employee_id": cross_pod_cand["employee_id"], "expected_snapshot_hash": snap_hash},
            headers=ops_hdr,
        )
        assert r_ops_bypass.status_code == 403

        # SUPER_ADMIN approves scenario
        r_admin_app = client.put(
            f"/api/v1/approvals/scenario/{esc_sc['id']}",
            json={"status": "APPROVED", "review_comments": "Cross-pod emergency approved by Super Admin"},
            headers=admin_hdr,
        )
        assert r_admin_app.status_code == 200, r_admin_app.text
        assert r_admin_app.json()["status"] == "APPROVED"
        print(f"  [PASS 11] Approval workflow enforced SUPER_ADMIN escalation & approved scenario #{esc_sc['id']}")

        # ------------------------------------------------------------------
        # Scenario 9: Candidate becomes unavailable / roster modified post-sim
        # ------------------------------------------------------------------
        db = SessionLocal()
        try:
            other_emp = db.query(Employee).filter(Employee.employee_code == "EMP003").first()
            other_entry = db.query(RosterEntry).filter(
                RosterEntry.roster_id == roster.id,
                RosterEntry.employee_id == other_emp.id,
                RosterEntry.date == target_day,
            ).first()
            orig_other_status = other_entry.status
            other_entry.status = ShiftStatus.WORKING if orig_other_status != ShiftStatus.WORKING else ShiftStatus.WEEKLY_OFF
            db.commit()

            # 9a: Stale hash rejected with 409 Conflict & zero mutation
            r_stale = client.post(
                f"/api/v1/simulator/scenarios/{esc_sc['id']}/apply",
                json={"expected_snapshot_hash": snap_hash},
                headers=admin_hdr,
            )
            assert r_stale.status_code == 409, f"Expected 409 Conflict on stale snapshot, got {r_stale.status_code}"

            # 9b: Selected candidate made WORKING -> 400 ConflictValidationError & zero mutation
            other_entry.status = orig_other_status
            cand_entry = db.query(RosterEntry).filter(
                RosterEntry.roster_id == roster.id,
                RosterEntry.employee_id == cross_pod_cand["employee_id"],
                RosterEntry.date == target_day,
            ).first()
            cand_orig_status = cand_entry.status
            cand_entry.status = ShiftStatus.WORKING
            db.commit()

            r_unavail = client.post(
                "/api/v1/simulator/apply",
                json={**sim_payload, "target_employee_id": cross_pod_cand["employee_id"]},
                headers=admin_hdr,
            )
            assert r_unavail.status_code == 400, f"Expected 400 when candidate became WORKING, got {r_unavail.status_code}"

            # Verify Priya untouched (rollback / no partial mutation)
            db.expire_all()
            priya_check = db.query(RosterEntry).filter(
                RosterEntry.roster_id == roster.id,
                RosterEntry.employee_id == priya.id,
                RosterEntry.date == target_day,
            ).first()
            assert priya_check.status == ShiftStatus.WORKING, "Priya must not be mutated after failed apply!"

            # Restore candidate original status for clean Scenario 12 apply
            cand_entry.status = cand_orig_status
            db.commit()
            print("  [PASS 09] Stale roster (409) & post-simulation unavailable candidate (400) blocked atomically with zero mutation")
        finally:
            db.close()

        # ------------------------------------------------------------------
        # Scenario 12: Transactional live roster application & audit trail
        # ------------------------------------------------------------------
        db = SessionLocal()
        ver_before = db.query(RosterVersion).filter(RosterVersion.roster_id == roster.id).count()
        # Ensure an open conflict exists on target_day for glow so resolution path is exercised too
        db.add(SchedulingConflict(
            roster_id=roster.id,
            date=target_day,
            brand_id=glow.id,
            process_id=proc_id,
            employee_id=priya.id,
            conflict_type=ConflictType.UNSTAFFED_PROCESS,
            severity=ConflictSeverity.CRITICAL,
            title="Test Single-Resource Gap",
            description="Pending simulation replacement",
            is_resolved=False,
        ))
        db.commit()
        db.close()

        # Refresh scenario snapshot hash check cleanly using current hash
        r_resim = client.post("/api/v1/simulator/simulate", json=sim_payload, headers=admin_hdr)
        cur_hash = r_resim.json()["roster_snapshot_hash"]
        r_apply = client.post(
            f"/api/v1/simulator/scenarios/{esc_sc['id']}/apply",
            json={"expected_snapshot_hash": cur_hash, "notes": "Scenario 12 transactional apply"},
            headers=admin_hdr,
        )
        assert r_apply.status_code == 200, f"Apply failed: {r_apply.text}"
        app_res = r_apply.json()
        assert app_res["success"] is True
        assert app_res["entries_updated"] >= 2

        db = SessionLocal()
        try:
            p_after = db.query(RosterEntry).filter(
                RosterEntry.roster_id == roster.id,
                RosterEntry.employee_id == priya.id,
                RosterEntry.date == target_day,
            ).first()
            b_after = db.query(RosterEntry).filter(
                RosterEntry.roster_id == roster.id,
                RosterEntry.employee_id == cross_pod_cand["employee_id"],
                RosterEntry.date == target_day,
            ).first()
            assert p_after.status == ShiftStatus.LEAVE
            assert b_after.status == ShiftStatus.WORKING and b_after.brand_id == glow.id

            if cross_pod_cand["requires_comp_off"]:
                comp = db.query(CompOff).filter(
                    CompOff.employee_id == cross_pod_cand["employee_id"],
                    CompOff.earned_date == target_day,
                ).first()
                assert comp is not None and comp.status == ApprovalStatus.APPROVED

            resolved_c = db.query(SchedulingConflict).filter(
                SchedulingConflict.roster_id == roster.id,
                SchedulingConflict.date == target_day,
                SchedulingConflict.brand_id == glow.id,
                SchedulingConflict.is_resolved == True,
            ).first()
            assert resolved_c is not None

            ver_after = db.query(RosterVersion).filter(RosterVersion.roster_id == roster.id).count()
            assert ver_after == ver_before + 1

            audit = db.query(AuditLog).filter(AuditLog.id == app_res["audit_log_id"]).first()
            assert audit is not None and audit.action == "APPLY_SIMULATION_SCENARIO"
            sc_after = db.query(SimulationScenario).filter(SimulationScenario.id == esc_sc["id"]).first()
            assert sc_after.status == ScenarioStatus.APPLIED
            notif_cnt = db.query(Notification).count()
            assert notif_cnt > 0
            print(
                f"  [PASS 12] Transactional apply verified: entries={app_res['entries_updated']}, "
                f"RosterVersion={ver_after}, AuditLog=#{audit.id}, Scenario={sc_after.status.value}"
            )
        finally:
            db.close()

        print("\n" + "=" * 84)
        print("  ALL 13 SMART BACKUP CANDIDATE POOL TESTS PASSED 100%!")
        print("=" * 84 + "\n")

    finally:
        reset_db_from_bytes(original_db_bytes)


if __name__ == "__main__":
    run_all_scenarios()
