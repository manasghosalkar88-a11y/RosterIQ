"""
Automated Test Suite for RosterIQ Analytics & Export
====================================================
Verifies:
1. Operational KPI calculations.
2. Pod workforce and Brand coverage metrics series.
3. Process staffing and weekly-off distribution calculations.
4. Roster CSV streaming export endpoint.
5. Operational Summary CSV streaming export endpoint.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_analytics_and_export():
    print("\n--- Testing Analytics & Operational Reports ---")

    # 1. Login as Operations Manager
    login_res = client.post("/api/v1/auth/login", json={"email": "ops@datastraw.io", "password": "Ops@123"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. GET /api/v1/analytics/dashboard
    dash_res = client.get("/api/v1/analytics/dashboard?month=11&year=2026", headers=headers)
    assert dash_res.status_code == 200
    data = dash_res.json()

    assert data["kpis"]["total_employees"] >= 30
    assert data["kpis"]["active_brands"] == 10
    assert data["kpis"]["single_resource_brands"] >= 7
    assert len(data["pod_metrics"]) == 5
    assert len(data["brand_metrics"]) == 10
    assert len(data["weekly_off_metrics"]) == 7

    print(f"  [PASS] Dashboard loaded for {data['month_name']} {data['year']}")
    print(f"         Total Employees: {data['kpis']['total_employees']}")
    print(f"         Single-Resource Brands: {data['kpis']['single_resource_brands']}")
    print(f"         Multi-Resource Brands: {data['kpis']['multi_resource_brands']}")
    print(f"         Coverage: {data['kpis']['monthly_coverage_percentage']}%")

    # 3. GET /api/v1/analytics/export/roster/csv
    csv_res = client.get("/api/v1/analytics/export/roster/csv?month=11&year=2026", headers=headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "attachment; filename=" in csv_res.headers["content-disposition"]
    csv_content = csv_res.text
    assert "Roster_Month,Roster_Year,Date,Day_Of_Week" in csv_content
    lines = csv_content.strip().split("\n")
    print(f"  [PASS] CSV Roster Export: Generated {len(lines)} CSV rows with valid header")

    # 4. GET /api/v1/analytics/export/summary/csv
    sum_res = client.get("/api/v1/analytics/export/summary/csv?month=11&year=2026", headers=headers)
    assert sum_res.status_code == 200
    assert "text/csv" in sum_res.headers["content-type"]
    sum_content = sum_res.text
    assert "RosterIQ Operational Summary Report" in sum_content
    print(f"  [PASS] CSV Summary Export: Generated {len(sum_content.splitlines())} lines")


if __name__ == "__main__":
    test_analytics_and_export()
    print("\n>>> ALL PHASE 12 ANALYTICS & EXPORT TESTS PASSED 100%! <<<\n")
