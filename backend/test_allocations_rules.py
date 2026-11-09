"""
Automated Tests for Phase 5: Resource Allocation Matrix & Working Rules
"""
from fastapi.testclient import TestClient
from main import app
from app.models.operating_rule import OperatingRuleType
from app.models.allocation import AssignmentType

client = TestClient(app)


def test_allocations_and_rules():
    # 1. Login
    login_res = client.post("/api/v1/auth/login", json={"email": "admin@datastraw.io", "password": "Admin@123"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test Allocations List
    alloc_res = client.get("/api/v1/allocations", headers=headers)
    assert alloc_res.status_code == 200
    allocations = alloc_res.json()
    assert len(allocations) >= 45
    print(f"Allocations API verified: {len(allocations)} active assignments.")

    # 3. Test Visual Matrix
    matrix_res = client.get("/api/v1/allocations/matrix", headers=headers)
    assert matrix_res.status_code == 200
    matrix = matrix_res.json()
    assert len(matrix) >= 30
    single_res_emps = [m for m in matrix if m["primary_brand_count"] == 1 and len(m["assignments"]) >= 3]
    assert len(single_res_emps) >= 7
    print(f"Matrix API verified: {len(matrix)} staff mapped ({len(single_res_emps)} single-resource dedicated specialists).")

    # 4. Test Working Rules List
    rules_res = client.get("/api/v1/rules", headers=headers)
    assert rules_res.status_code == 200
    rules = rules_res.json()
    assert len(rules) >= 35
    rules_365 = [r for r in rules if r["rule_type"] == "EVERY_DAY_365"]
    assert len(rules_365) >= 3
    print(f"Working Rules API verified: {len(rules)} process rules ({len(rules_365)} 365-day operations).")

    # 5. Test Rule Update
    target_rule = rules[0]
    update_res = client.put(
        f"/api/v1/rules/{target_rule['id']}",
        json={"rule_type": OperatingRuleType.EVERY_DAY_365.value, "min_headcount": 2},
        headers=headers
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["rule_type"] == "EVERY_DAY_365"
    assert updated["operates_sunday"] is True
    assert updated["min_headcount"] == 2
    print(f"Rule update verified: Rule #{target_rule['id']} updated to 365-day with min headcount 2.")

    # 6. Test Create Allocation
    # Find an employee and brand not yet linked
    emp_id = matrix[-1]["employee_id"]
    brand_id = rules[-1]["brand_id"]
    proc_id = rules[-1]["process_id"]
    
    # Try adding as backup
    new_alloc_res = client.post(
        "/api/v1/allocations",
        json={
            "employee_id": emp_id,
            "brand_id": brand_id,
            "process_id": proc_id,
            "assignment_type": AssignmentType.BACKUP.value
        },
        headers=headers
    )
    assert new_alloc_res.status_code in [200, 201]
    new_alloc = new_alloc_res.json()
    print(f"New allocation created successfully: ID {new_alloc['id']}.")

    # Clean up test allocation
    del_res = client.delete(f"/api/v1/allocations/{new_alloc['id']}", headers=headers)
    assert del_res.status_code == 200
    print(f"Test allocation #{new_alloc['id']} deleted cleanly.")

    print("\nALL PHASE 5 RESOURCE ALLOCATION & WORKING RULES TESTS PASSED!")


if __name__ == "__main__":
    test_allocations_and_rules()
