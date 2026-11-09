"""
Master Test Suite Runner for RosterIQ
Runs all 12 Phase test scripts and outputs an executive verification summary.
"""
import sys
import subprocess
import time

TEST_SCRIPTS = [
    ("Phase 1: System Health & Base Engine", "test_health.py"),
    ("Phase 2: Database Schema (16 Models)", "test_db_models.py"),
    ("Phase 3: Authentication & RBAC", "test_auth.py"),
    ("Phase 4: Organization Management APIs", "test_management_apis.py"),
    ("Phase 5: Allocations & Operating Rules", "test_allocations_rules.py"),
    ("Phase 6: Leaves, Comp-Offs & Holidays", "test_leaves_holidays.py"),
    ("Phase 7: Constraint Scheduler & Conflicts", "test_scheduler.py"),
    ("Phase 10: Change Management & Reassignment", "test_change_management.py"),
    ("Phase 11: Scoped Approvals & Governance", "test_approvals.py"),
    ("Phase 12: Analytics & Streaming CSV Exports", "test_analytics.py"),
    ("Phase 13: 3D Overview & Notifications", "test_overview_notifications.py"),
    ("Phase 14: Settings & Live Diagnostics", "test_settings.py"),
]

def run_suite():
    print("=" * 80)
    print("  ROSTERIQ ENTERPRISE SUITE — AUTOMATED VERIFICATION RUNNER")
    print("  DataStraw AI Tech Internship Assessment")
    print("=" * 80)
    
    passed_count = 0
    start_total = time.time()
    
    for phase_name, script_file in TEST_SCRIPTS:
        t0 = time.time()
        print(f"\n[RUNNING] {phase_name} ({script_file})...")
        res = subprocess.run(
            [sys.executable, script_file],
            capture_output=True,
            text=True
        )
        duration = round(time.time() - t0, 2)
        if res.returncode == 0:
            passed_count += 1
            print(f"  [PASS] {phase_name} in {duration}s")
        else:
            print(f"  [FAIL] {phase_name} in {duration}s")
            print("--- STDOUT ---")
            print(res.stdout)
            print("--- STDERR ---")
            print(res.stderr)
            
    total_duration = round(time.time() - start_total, 2)
    print("\n" + "=" * 80)
    print(f"  SUMMARY: {passed_count}/{len(TEST_SCRIPTS)} TEST MODULES PASSED ({total_duration}s total)")
    if passed_count == len(TEST_SCRIPTS):
        print("  VERIFICATION RESULT: ALL 12 PHASES PASSED WITH ZERO ERRORS (100% OPERATIONAL)")
    else:
        print("  VERIFICATION RESULT: SOME TESTS FAILED. PLEASE INSPECT LOGS.")
    print("=" * 80)

if __name__ == "__main__":
    run_suite()
