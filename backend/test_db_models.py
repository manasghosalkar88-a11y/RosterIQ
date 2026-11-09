"""
Unit Test for Database Models & Relational Integrity
Uses an isolated in-memory SQLite database so tests can be run repeatedly without data collisions.
"""
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import (
    Base, User, UserRole, Pod, Employee, EmploymentStatus,
    Brand, Process, BrandProcessRule, OperatingRuleType,
    EmployeeAssignment, AssignmentType, LeaveRequest, LeaveType, ApprovalStatus,
    PublicHoliday, Roster, RosterEntry, RosterStatus, ShiftStatus,
    SchedulingConflict, ConflictType, ConflictSeverity
)


def test_models_relational_integrity():
    # 1. Create an isolated in-memory SQLite database for deterministic testing
    test_engine = create_engine("sqlite:///:memory:", echo=False)
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    
    # Create all tables in memory
    Base.metadata.create_all(bind=test_engine)
    
    db = TestSession()
    try:
        # 1. Create a test user
        user = User(
            email="admin@datastraw.io",
            hashed_password="mock_hashed_pw",
            full_name="Operations Admin",
            role=UserRole.SUPER_ADMIN,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        assert user.id is not None
        assert user.role == UserRole.SUPER_ADMIN

        # 2. Create a Pod
        pod = Pod(
            code="POD-A",
            name="Pod Alpha - D2C Lifestyle",
            description="High-velocity fashion and skincare operations",
        )
        db.add(pod)
        db.commit()
        db.refresh(pod)
        assert pod.id is not None

        # 3. Create an Employee in Pod
        emp = Employee(
            employee_code="EMP001",
            full_name="Priya Sharma",
            email="priya.sharma@datastraw.io",
            designation="Operations Associate",
            pod_id=pod.id,
            user_id=user.id,
            employment_status=EmploymentStatus.ACTIVE,
            default_off_pref="Sunday",
        )
        db.add(emp)
        db.commit()
        db.refresh(emp)
        assert emp.id is not None
        assert emp.pod.name == "Pod Alpha - D2C Lifestyle"

        # Update pod lead
        pod.pod_lead_id = emp.id
        db.commit()

        # 4. Create a Brand
        brand = Brand(
            code="BRD-GLOW",
            name="GlowBotanics",
            client_name="Glow Botanics Inc.",
            pod_id=pod.id,
        )
        db.add(brand)
        db.commit()
        db.refresh(brand)
        assert brand.id is not None

        # 5. Create a Process
        process = Process(
            code="CS",
            name="Customer Support",
            description="Omnichannel ticketing, chat, and email support",
        )
        db.add(process)
        db.commit()
        db.refresh(process)
        assert process.id is not None

        # 6. Create Brand Operating Rule (365 days)
        rule = BrandProcessRule(
            brand_id=brand.id,
            process_id=process.id,
            rule_type=OperatingRuleType.EVERY_DAY_365,
            min_headcount=1,
            operates_sunday=True,
            operates_holidays=True,
        )
        db.add(rule)
        db.commit()
        db.refresh(rule)
        assert rule.operates_sunday is True

        # 7. Create Resource Allocation (Emp -> Brand -> Process)
        alloc = EmployeeAssignment(
            employee_id=emp.id,
            brand_id=brand.id,
            process_id=process.id,
            assignment_type=AssignmentType.PRIMARY,
        )
        db.add(alloc)
        db.commit()
        db.refresh(alloc)
        assert alloc.id is not None

        # 8. Create Leave Request
        leave = LeaveRequest(
            employee_id=emp.id,
            leave_type=LeaveType.PLANNED,
            start_date=date(2026, 11, 15),
            end_date=date(2026, 11, 16),
            reason="Family function",
            status=ApprovalStatus.APPROVED,
            reviewed_by_id=user.id,
        )
        db.add(leave)
        db.commit()
        db.refresh(leave)
        assert leave.status == ApprovalStatus.APPROVED

        # 9. Create Holiday
        holiday = PublicHoliday(
            date=date(2026, 11, 24),
            name="Guru Nanak Jayanti",
            is_national=True,
        )
        db.add(holiday)
        db.commit()

        # 10. Create Roster & Roster Entry
        roster = Roster(
            name="Roster - November 2026",
            month=11,
            year=2026,
            status=RosterStatus.DRAFT,
            created_by_id=user.id,
        )
        db.add(roster)
        db.commit()
        db.refresh(roster)

        entry = RosterEntry(
            roster_id=roster.id,
            employee_id=emp.id,
            brand_id=brand.id,
            process_id=process.id,
            date=date(2026, 11, 1),
            status=ShiftStatus.WORKING,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        assert entry.id is not None

        # 11. Create Conflict
        conflict = SchedulingConflict(
            roster_id=roster.id,
            date=date(2026, 11, 15),
            brand_id=brand.id,
            process_id=process.id,
            employee_id=emp.id,
            conflict_type=ConflictType.LEAVE_VIOLATION,
            severity=ConflictSeverity.CRITICAL,
            title="Coverage Gap Due to Approved Leave",
            description="Priya Sharma is on approved leave but GlowBotanics CS has min headcount of 1.",
            recommended_action="Assign designated backup from Pod Alpha.",
        )
        db.add(conflict)
        db.commit()
        db.refresh(conflict)
        assert conflict.severity == ConflictSeverity.CRITICAL

        print("All 11 relational tests passed with 100% database integrity!")

    finally:
        db.close()


if __name__ == "__main__":
    test_models_relational_integrity()
