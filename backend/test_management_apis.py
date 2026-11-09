"""
Automated Integration Tests for Phase 4:
Employees, Brands, Processes, and Pods Management APIs
"""
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_management_apis():
    # 1. Login as Super Admin
    login_res = client.post("/api/v1/auth/login", json={"email": "admin@datastraw.io", "password": "Admin@123"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test Pods API
    pods_res = client.get("/api/v1/pods", headers=headers)
    assert pods_res.status_code == 200
    pods = pods_res.json()
    assert len(pods) == 5
    pod_codes = {p["code"] for p in pods}
    assert "POD-LIFESTYLE" in pod_codes
    assert "POD-BEAUTY" in pod_codes
    print(f"Pods API verified: {len(pods)} pods with leads assigned.")

    # 3. Test Processes API
    proc_res = client.get("/api/v1/processes", headers=headers)
    assert proc_res.status_code == 200
    procs = proc_res.json()
    assert len(procs) >= 4
    proc_codes = {p["code"] for p in procs}
    assert {"CS", "ACC", "RET", "NDR"}.issubset(proc_codes)
    print(f"Processes API verified: {proc_codes}")

    # 4. Test Brands API & 80/20 Single/Multi Resource rule
    brands_res = client.get("/api/v1/brands", headers=headers)
    assert brands_res.status_code == 200
    brands = brands_res.json()
    assert len(brands) == 10
    single_res = [b for b in brands if b["is_single_resource"]]
    multi_res = [b for b in brands if not b["is_single_resource"]]
    assert len(single_res) >= 7
    assert len(multi_res) >= 2
    print(f"Brands API verified: 10 brands ({len(single_res)} Single-Resource, {len(multi_res)} Multi-Resource).")

    # 5. Test Employees API (32 seeded employees)
    emp_res = client.get("/api/v1/employees", headers=headers)
    assert emp_res.status_code == 200
    employees = emp_res.json()
    assert len(employees) >= 30
    print(f"Employees API verified: {len(employees)} employees loaded.")

    # 6. Test Employee Search
    search_res = client.get("/api/v1/employees?search=Priya", headers=headers)
    assert search_res.status_code == 200
    assert len(search_res.json()) >= 1
    assert "Priya Sharma" in search_res.json()[0]["full_name"]
    print(f"Employee search verified: Found {search_res.json()[0]['full_name']}.")

    # 7. Test Employee Filter by Pod
    lifestyle_pod_id = next(p["id"] for p in pods if p["code"] == "POD-LIFESTYLE")
    pod_emp_res = client.get(f"/api/v1/employees?pod_id={lifestyle_pod_id}", headers=headers)
    assert pod_emp_res.status_code == 200
    assert len(pod_emp_res.json()) > 0
    print(f"Pod filter verified: {len(pod_emp_res.json())} employees in Pod Lifestyle.")

    print("\nALL PHASE 4 MANAGEMENT API TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_management_apis()
