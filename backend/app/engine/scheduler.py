"""
RosterIQ Scheduling Engine
==========================
Deterministic constraint-based scheduling engine for operations management.
Designed for DataStraw AI Tech Internship Assessment.

Key Rules:
1. Operational coverage over visual appearance.
2. Separate Brand & Process operating rules from Employee availability.
3. Support Single-Resource Brands (~80%) and Multi-Resource Brands (~20%).
4. Zero silent failures: any unstaffed slot or policy breach logs a structured SchedulingConflict.
5. Labor law compliance: enforce max 6 consecutive working days.
6. Incremental audit and versioning.
"""

import calendar
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.roster import Roster, RosterEntry, RosterVersion, RosterStatus, ShiftStatus
from app.models.conflict import SchedulingConflict, ConflictType, ConflictSeverity
from app.models.brand import Brand
from app.models.process import Process
from app.models.employee import Employee, EmploymentStatus
from app.models.operating_rule import BrandProcessRule, OperatingRuleType
from app.models.allocation import EmployeeAssignment, AssignmentType
from app.models.leave import LeaveRequest, ApprovalStatus, LeaveType
from app.models.holiday import PublicHoliday
from app.models.pod import Pod


WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


class SchedulingEngine:
    def __init__(self, db: Session, month: int, year: int, created_by_id: Optional[int] = None):
        self.db = db
        self.month = month
        self.year = year
        self.created_by_id = created_by_id
        
        # Calculate days in month
        _, self.num_days = calendar.monthrange(year, month)
        self.month_dates = [date(year, month, day) for day in range(1, self.num_days + 1)]
        
        # Output containers
        self.entries: List[RosterEntry] = []
        self.conflicts: List[SchedulingConflict] = []
        
        # Statistics
        self.total_demand_slots = 0
        self.covered_demand_slots = 0

    def generate(self, roster_name: Optional[str] = None) -> Roster:
        """
        Main entry point for generating the monthly roster.
        """
        # Step 1: Preload all reference data into fast lookup structures
        holidays_map = self._load_public_holidays()
        employees = self._load_active_employees()
        brands = self._load_active_brands()
        rules = self._load_operating_rules()
        assignments = self._load_assignments()
        approved_leaves = self._load_approved_leaves()

        # Step 2: Compute daily operational demand for every Brand x Process
        # Demand: (date, brand_id, process_id) -> min_headcount
        demand_matrix = self._calculate_demand_matrix(rules, holidays_map)

        # Step 3: Compute daily employee availability
        # Availability: (emp_id, date) -> ShiftStatus (AVAILABLE, WEEKLY_OFF, LEAVE, etc.)
        avail_matrix = self._calculate_employee_availability(employees, approved_leaves)

        # Step 4: Execute allocation logic day-by-day
        self._allocate_roster(
            employees=employees,
            brands=brands,
            rules=rules,
            assignments=assignments,
            demand_matrix=demand_matrix,
            avail_matrix=avail_matrix,
            holidays_map=holidays_map,
        )

        # Step 5: Audit compliance (Max 6 consecutive working days)
        self._audit_consecutive_days(employees)

        # Step 6: Calculate KPI metrics
        coverage_pct = 100.0
        if self.total_demand_slots > 0:
            coverage_pct = round((self.covered_demand_slots / self.total_demand_slots) * 100.0, 2)
            # Ensure not exceeding 100%
            coverage_pct = min(100.0, coverage_pct)

        fairness_score = self._calculate_fairness_score(employees)

        # Step 7: Persist atomically to database
        roster = self._persist_roster(
            roster_name=roster_name or f"Roster {calendar.month_name[self.month]} {self.year}",
            coverage_pct=coverage_pct,
            fairness_score=fairness_score,
        )

        return roster

    # -------------------------------------------------------------------------
    # DATA LOADING HELPERS
    # -------------------------------------------------------------------------
    def _load_public_holidays(self) -> Dict[date, PublicHoliday]:
        holidays = self.db.query(PublicHoliday).filter(
            PublicHoliday.date >= self.month_dates[0],
            PublicHoliday.date <= self.month_dates[-1],
        ).all()
        return {h.date: h for h in holidays}

    def _load_active_employees(self) -> List[Employee]:
        return self.db.query(Employee).filter(
            Employee.is_active == True,
            Employee.employment_status == EmploymentStatus.ACTIVE,
        ).order_by(Employee.pod_id, Employee.full_name).all()

    def _load_active_brands(self) -> List[Brand]:
        return self.db.query(Brand).filter(Brand.is_active == True).all()

    def _load_operating_rules(self) -> List[BrandProcessRule]:
        return self.db.query(BrandProcessRule).join(Brand).filter(Brand.is_active == True).all()

    def _load_assignments(self) -> List[EmployeeAssignment]:
        return self.db.query(EmployeeAssignment).filter(
            EmployeeAssignment.is_active == True
        ).all()

    def _load_approved_leaves(self) -> List[LeaveRequest]:
        return self.db.query(LeaveRequest).filter(
            LeaveRequest.status == ApprovalStatus.APPROVED,
            LeaveRequest.start_date <= self.month_dates[-1],
            LeaveRequest.end_date >= self.month_dates[0],
        ).all()

    # -------------------------------------------------------------------------
    # STEP 2: DEMAND MATRIX
    # -------------------------------------------------------------------------
    def _calculate_demand_matrix(
        self,
        rules: List[BrandProcessRule],
        holidays_map: Dict[date, PublicHoliday],
    ) -> Dict[Tuple[date, int, int], int]:
        """
        Determines the headcount required for each (date, brand_id, process_id)
        strictly respecting the Brand/Process operating schedule.
        """
        demand: Dict[Tuple[date, int, int], int] = {}

        for d in self.month_dates:
            weekday = d.weekday()  # 0=Monday ... 6=Sunday
            is_sunday = (weekday == 6)
            is_holiday = d in holidays_map

            for rule in rules:
                operates = False

                if rule.rule_type == OperatingRuleType.EVERY_DAY_365:
                    operates = True
                elif rule.rule_type == OperatingRuleType.EXCEPT_PUBLIC_HOLIDAYS:
                    operates = not is_holiday
                elif rule.rule_type == OperatingRuleType.EXCEPT_SUNDAYS_AND_HOLIDAYS:
                    operates = (not is_sunday) and (not is_holiday)
                elif rule.rule_type == OperatingRuleType.CUSTOM:
                    # Day of week mapping
                    day_flags = [
                        rule.operates_monday,
                        rule.operates_tuesday,
                        rule.operates_wednesday,
                        rule.operates_thursday,
                        rule.operates_friday,
                        rule.operates_saturday,
                        rule.operates_sunday,
                    ]
                    if day_flags[weekday]:
                        operates = not is_holiday or rule.operates_holidays

                if operates:
                    demand[(d, rule.brand_id, rule.process_id)] = max(1, rule.min_headcount)
                    self.total_demand_slots += max(1, rule.min_headcount)

        return demand

    # -------------------------------------------------------------------------
    # STEP 3: EMPLOYEE AVAILABILITY
    # -------------------------------------------------------------------------
    def _calculate_employee_availability(
        self,
        employees: List[Employee],
        approved_leaves: List[LeaveRequest],
    ) -> Dict[Tuple[int, date], Tuple[ShiftStatus, Optional[str]]]:
        """
        Evaluates employee availability independently from brand demand.
        Returns: (emp_id, date) -> (ShiftStatus, reason_str)
        """
        avail: Dict[Tuple[int, date], Tuple[ShiftStatus, Optional[str]]] = {}

        # Index leaves by employee
        leaves_by_emp: Dict[int, List[LeaveRequest]] = {}
        for l in approved_leaves:
            leaves_by_emp.setdefault(l.employee_id, []).append(l)

        for emp in employees:
            emp_leaves = leaves_by_emp.get(emp.id, [])
            default_off_lower = (emp.default_off_pref or "Sunday").strip().lower()

            for d in self.month_dates:
                weekday = d.weekday()
                day_name = WEEKDAY_NAMES[weekday].lower()

                # Check approved leave first
                on_leave = None
                for l in emp_leaves:
                    if l.start_date <= d <= l.end_date:
                        on_leave = l
                        break

                if on_leave:
                    if on_leave.leave_type == LeaveType.COMP_OFF:
                        avail[(emp.id, d)] = (ShiftStatus.COMP_OFF, f"Comp-Off: {on_leave.reason or 'Personal'}")
                    else:
                        avail[(emp.id, d)] = (ShiftStatus.LEAVE, f"Approved {on_leave.leave_type}: {on_leave.reason or 'Personal'}")
                    continue

                # Check default weekly off preference
                is_weekly_off = False
                if default_off_lower in day_name:
                    is_weekly_off = True
                elif default_off_lower == "rotational" and weekday == 6:
                    # Rotational fallback to Sunday if unspecified
                    is_weekly_off = True

                if is_weekly_off:
                    avail[(emp.id, d)] = (ShiftStatus.WEEKLY_OFF, f"Scheduled Weekly Off ({WEEKDAY_NAMES[weekday]})")
                else:
                    avail[(emp.id, d)] = (ShiftStatus.WORKING, None)  # Available to work

        return avail

    # -------------------------------------------------------------------------
    # STEP 4: ALLOCATION ENGINE
    # -------------------------------------------------------------------------
    def _allocate_roster(
        self,
        employees: List[Employee],
        brands: List[Brand],
        rules: List[BrandProcessRule],
        assignments: List[EmployeeAssignment],
        demand_matrix: Dict[Tuple[date, int, int], int],
        avail_matrix: Dict[Tuple[int, date], Tuple[ShiftStatus, Optional[str]]],
        holidays_map: Dict[date, PublicHoliday],
    ):
        """
        Allocates shifts day by day with prioritization:
        1. Single-resource brand primary dedicated specialists.
        2. Cross-brand pod backup fallback when dedicated specialist is on leave/off.
        3. Multi-resource brand process distribution.
        4. Zero silent failures: unstaffed slots logged as CRITICAL conflicts.
        """
        emp_map = {e.id: e for e in employees}
        brand_map = {b.id: b for b in brands}
        rule_dict = {(r.brand_id, r.process_id): r for r in rules}

        # Index assignments
        # brand_id -> {"primary": [emp_ids], "secondary": [emp_ids], "backup": [emp_ids]}
        brand_assigns: Dict[int, Dict[str, List[int]]] = {}
        # (brand_id, process_id) -> primary emp_ids
        bp_primary: Dict[Tuple[int, int], List[int]] = {}

        for a in assignments:
            brand_assigns.setdefault(a.brand_id, {"PRIMARY": [], "SECONDARY": [], "BACKUP": []})
            assign_key = a.assignment_type.value if hasattr(a.assignment_type, 'value') else str(a.assignment_type)
            if a.employee_id not in brand_assigns[a.brand_id][assign_key]:
                brand_assigns[a.brand_id][assign_key].append(a.employee_id)

            if assign_key == "PRIMARY":
                bp_primary.setdefault((a.brand_id, a.process_id), []).append(a.employee_id)

        # Index employees by pod for backup discovery
        pod_employees: Dict[int, List[int]] = {}
        for emp in employees:
            if emp.pod_id:
                pod_employees.setdefault(emp.pod_id, []).append(emp.id)

        # Iterate day by day
        for d in self.month_dates:
            allocated_today: Set[int] = set()
            demand_coverage_today: Dict[Tuple[int, int], int] = {}

            # Find all brand-processes demanding coverage today
            open_rules_today = [
                (b_id, p_id, req)
                for (cur_d, b_id, p_id), req in demand_matrix.items()
                if cur_d == d
            ]

            # -------------------------------------------------------------
            # 4.1: Handle Single-Resource Brands (~80% of brands)
            # -------------------------------------------------------------
            for brand in brands:
                brand_open_today = [
                    (b_id, p_id, req)
                    for (b_id, p_id, req) in open_rules_today
                    if b_id == brand.id
                ]
                if not brand_open_today:
                    continue  # Brand is closed today

                primary_emps = brand_assigns.get(brand.id, {}).get("PRIMARY", [])
                is_single = len(primary_emps) == 1

                if is_single:
                    lead_emp_id = primary_emps[0]
                    lead_emp = emp_map.get(lead_emp_id)
                    avail_status, off_reason = avail_matrix.get((lead_emp_id, d), (ShiftStatus.WORKING, None))

                    # If primary dedicated employee is available today:
                    if avail_status == ShiftStatus.WORKING and lead_emp_id not in allocated_today:
                        allocated_today.add(lead_emp_id)
                        # Representative process for shift entry
                        first_proc_id = brand_open_today[0][1]
                        self._create_entry(
                            emp_id=lead_emp_id,
                            d=d,
                            status=ShiftStatus.WORKING,
                            brand_id=brand.id,
                            process_id=first_proc_id,
                            shift_start=rule_dict.get((brand.id, first_proc_id), BrandProcessRule()).shift_start_time or "09:00",
                            shift_end=rule_dict.get((brand.id, first_proc_id), BrandProcessRule()).shift_end_time or "18:00",
                        )
                        # Staff all open processes for this single-resource brand
                        for b_id, p_id, req in brand_open_today:
                            demand_coverage_today[(b_id, p_id)] = demand_coverage_today.get((b_id, p_id), 0) + 1
                            self.covered_demand_slots += 1

                    else:
                        # Primary employee is on leave or weekly off!
                        # We must find an interim backup within their assigned pod
                        backup_found = False
                        candidate_pool = []

                        # Candidate Priority 1: Explicitly assigned BACKUP / SECONDARY for this brand
                        for b_emp_id in brand_assigns.get(brand.id, {}).get("BACKUP", []) + brand_assigns.get(brand.id, {}).get("SECONDARY", []):
                            if b_emp_id not in allocated_today:
                                b_status, _ = avail_matrix.get((b_emp_id, d), (ShiftStatus.WORKING, None))
                                if b_status == ShiftStatus.WORKING:
                                    candidate_pool.append(b_emp_id)

                        # Candidate Priority 2: Same Pod floater
                        if not candidate_pool and lead_emp and lead_emp.pod_id:
                            for pod_emp_id in pod_employees.get(lead_emp.pod_id, []):
                                if pod_emp_id not in allocated_today and pod_emp_id != lead_emp_id:
                                    b_status, _ = avail_matrix.get((pod_emp_id, d), (ShiftStatus.WORKING, None))
                                    if b_status == ShiftStatus.WORKING:
                                        candidate_pool.append(pod_emp_id)

                        if candidate_pool:
                            backup_emp_id = candidate_pool[0]
                            allocated_today.add(backup_emp_id)
                            first_proc_id = brand_open_today[0][1]
                            self._create_entry(
                                emp_id=backup_emp_id,
                                d=d,
                                status=ShiftStatus.WORKING,
                                brand_id=brand.id,
                                process_id=first_proc_id,
                                is_manual_override=True,
                                override_reason=f"Auto-backup replacement for {lead_emp.full_name if lead_emp else 'Primary'}",
                            )
                            for b_id, p_id, req in brand_open_today:
                                demand_coverage_today[(b_id, p_id)] = demand_coverage_today.get((b_id, p_id), 0) + 1
                                self.covered_demand_slots += 1
                            backup_found = True

                        if not backup_found:
                            # CRITICAL CONFLICT: Unstaffed Single-Resource Brand
                            for b_id, p_id, req in brand_open_today:
                                proc = self.db.query(Process).get(p_id)
                                proc_name = proc.name if proc else "Process"
                                lead_name = lead_emp.full_name if lead_emp else f"EMP-{lead_emp_id}"
                                self._create_conflict(
                                    d=d,
                                    brand_id=brand.id,
                                    process_id=p_id,
                                    employee_id=lead_emp_id,
                                    conflict_type=ConflictType.UNSTAFFED_PROCESS,
                                    severity=ConflictSeverity.CRITICAL,
                                    title=f"Unstaffed Process: {brand.name} ({proc_name})",
                                    description=(
                                        f"Brand '{brand.name}' is operational on {d.isoformat()} for process '{proc_name}', "
                                        f"but primary dedicated specialist {lead_name} is unavailable ({off_reason or 'Off/Leave'}). "
                                        f"No eligible pod backup was available."
                                    ),
                                    recommended_action=(
                                        f"Assign a backup employee from {lead_emp.pod.name if lead_emp and lead_emp.pod else 'the Pod'} "
                                        f"or rotate {lead_name}'s weekly off."
                                    ),
                                )

            # -------------------------------------------------------------
            # 4.2: Handle Multi-Resource Brands (~20% of brands)
            # -------------------------------------------------------------
            for (b_id, p_id, req) in open_rules_today:
                brand = brand_map.get(b_id)
                if not brand:
                    continue
                primary_emps = brand_assigns.get(b_id, {}).get("PRIMARY", [])
                if len(primary_emps) <= 1:
                    continue  # Already handled by single-resource logic

                # Process-specific primary assignees
                process_primaries = bp_primary.get((b_id, p_id), primary_emps)
                staffed = demand_coverage_today.get((b_id, p_id), 0)

                for p_emp_id in process_primaries:
                    if staffed >= req:
                        break
                    if p_emp_id not in allocated_today:
                        p_status, _ = avail_matrix.get((p_emp_id, d), (ShiftStatus.WORKING, None))
                        if p_status == ShiftStatus.WORKING:
                            allocated_today.add(p_emp_id)
                            staffed += 1
                            self.covered_demand_slots += 1
                            self._create_entry(
                                emp_id=p_emp_id,
                                d=d,
                                status=ShiftStatus.WORKING,
                                brand_id=b_id,
                                process_id=p_id,
                            )

                demand_coverage_today[(b_id, p_id)] = staffed

                if staffed < req:
                    proc = self.db.query(Process).get(p_id)
                    proc_name = proc.name if proc else "Process"
                    self._create_conflict(
                        d=d,
                        brand_id=b_id,
                        process_id=p_id,
                        conflict_type=ConflictType.INSUFFICIENT_STAFFING,
                        severity=ConflictSeverity.HIGH if staffed > 0 else ConflictSeverity.CRITICAL,
                        title=f"Understaffed: {brand.name} ({proc_name})",
                        description=(
                            f"Process '{proc_name}' for brand '{brand.name}' requires {req} agent(s) on {d.isoformat()}, "
                            f"but only {staffed} could be scheduled from primary staffing."
                        ),
                        recommended_action="Allocate secondary agents or adjust pod roster to fill the gap.",
                    )

            # -------------------------------------------------------------
            # 4.3: Populate Default Entries for Remaining Unallocated Employees
            # -------------------------------------------------------------
            for emp in employees:
                if emp.id not in allocated_today:
                    avail_status, reason = avail_matrix.get((emp.id, d), (ShiftStatus.WEEKLY_OFF, None))
                    if avail_status == ShiftStatus.LEAVE:
                        self._create_entry(emp_id=emp.id, d=d, status=ShiftStatus.LEAVE, override_reason=reason)
                    elif avail_status == ShiftStatus.COMP_OFF:
                        self._create_entry(emp_id=emp.id, d=d, status=ShiftStatus.COMP_OFF, override_reason=reason)
                    elif d in holidays_map and avail_status != ShiftStatus.WEEKLY_OFF:
                        self._create_entry(emp_id=emp.id, d=d, status=ShiftStatus.HOLIDAY, override_reason=f"Public Holiday: {holidays_map[d].name}")
                    else:
                        self._create_entry(emp_id=emp.id, d=d, status=ShiftStatus.WEEKLY_OFF, override_reason=reason)

    # -------------------------------------------------------------------------
    # STEP 5: LABOR LAW AUDITING (CONSECUTIVE WORKING DAYS)
    # -------------------------------------------------------------------------
    def _audit_consecutive_days(self, employees: List[Employee]):
        """
        Enforces maximum consecutive working days (statutory labor law compliance: max 6 days).
        Flags HIGH severity conflict if any employee works > max_consecutive_days without a rest day.
        """
        entries_by_emp: Dict[int, List[RosterEntry]] = {}
        for entry in self.entries:
            entries_by_emp.setdefault(entry.employee_id, []).append(entry)

        for emp in employees:
            emp_entries = entries_by_emp.get(emp.id, [])
            emp_entries.sort(key=lambda x: x.date)

            streak = 0
            for entry in emp_entries:
                if entry.status == ShiftStatus.WORKING:
                    streak += 1
                    if streak > emp.max_consecutive_days:
                        self._create_conflict(
                            d=entry.date,
                            employee_id=emp.id,
                            conflict_type=ConflictType.EXCESSIVE_CONSECUTIVE_DAYS,
                            severity=ConflictSeverity.HIGH,
                            title=f"Labor Rule Violation: {emp.full_name}",
                            description=(
                                f"Employee {emp.full_name} is scheduled to work {streak} consecutive days "
                                f"ending on {entry.date.isoformat()} without a rest day. Statutory policy limit is {emp.max_consecutive_days} days."
                            ),
                            recommended_action=f"Schedule a rest day for {emp.full_name} on or before {entry.date.isoformat()}.",
                        )
                else:
                    streak = 0  # Reset streak on rest day / leave / holiday

    # -------------------------------------------------------------------------
    # STEP 6: FAIRNESS SCORE CALCULATION
    # -------------------------------------------------------------------------
    def _calculate_fairness_score(self, employees: List[Employee]) -> float:
        """
        Evaluates weekend workload distribution across the workforce.
        Score ranges from 0 to 100.
        """
        weekend_shifts: Dict[int, int] = {e.id: 0 for e in employees}
        for entry in self.entries:
            if entry.status == ShiftStatus.WORKING and entry.date.weekday() in [5, 6]:  # Sat or Sun
                weekend_shifts[entry.employee_id] = weekend_shifts.get(entry.employee_id, 0) + 1

        counts = list(weekend_shifts.values())
        if not counts:
            return 100.0

        mean = sum(counts) / len(counts)
        variance = sum((c - mean) ** 2 for c in counts) / len(counts)
        std_dev = variance ** 0.5

        # Deduct up to 30 points based on weekend dispersion
        penalty = min(30.0, std_dev * 10.0)
        return round(max(50.0, 100.0 - penalty), 1)

    # -------------------------------------------------------------------------
    # RECORD CREATION HELPERS
    # -------------------------------------------------------------------------
    def _create_entry(
        self,
        emp_id: int,
        d: date,
        status: ShiftStatus,
        brand_id: Optional[int] = None,
        process_id: Optional[int] = None,
        shift_start: str = "09:00",
        shift_end: str = "18:00",
        is_manual_override: bool = False,
        override_reason: Optional[str] = None,
    ):
        entry = RosterEntry(
            employee_id=emp_id,
            date=d,
            status=status,
            brand_id=brand_id,
            process_id=process_id,
            shift_start=shift_start,
            shift_end=shift_end,
            is_manual_override=is_manual_override,
            override_reason=override_reason,
        )
        self.entries.append(entry)

    def _create_conflict(
        self,
        d: date,
        conflict_type: ConflictType,
        severity: ConflictSeverity,
        title: str,
        description: str,
        recommended_action: Optional[str] = None,
        brand_id: Optional[int] = None,
        process_id: Optional[int] = None,
        employee_id: Optional[int] = None,
    ):
        conflict = SchedulingConflict(
            date=d,
            brand_id=brand_id,
            process_id=process_id,
            employee_id=employee_id,
            conflict_type=conflict_type,
            severity=severity,
            title=title,
            description=description,
            recommended_action=recommended_action,
            is_resolved=False,
        )
        self.conflicts.append(conflict)

    # -------------------------------------------------------------------------
    # STEP 7: ATOMIC DATABASE PERSISTENCE
    # -------------------------------------------------------------------------
    def _persist_roster(
        self,
        roster_name: str,
        coverage_pct: float,
        fairness_score: float,
    ) -> Roster:
        """
        Saves the generated roster atomically with version archival.
        """
        # Look for existing roster for this month and year
        existing_roster = self.db.query(Roster).filter(
            Roster.month == self.month,
            Roster.year == self.year,
        ).first()

        if existing_roster:
            roster = existing_roster
            roster.name = roster_name
            roster.coverage_percentage = coverage_pct
            roster.fairness_score = fairness_score
            roster.total_conflicts = len(self.conflicts)
            roster.status = RosterStatus.VALIDATED

            # Archive version snapshot if existing entries existed
            prev_entries_count = len(roster.entries)
            if prev_entries_count > 0:
                version_num = len(roster.versions) + 1
                version_snapshot = RosterVersion(
                    roster_id=roster.id,
                    version_number=version_num,
                    change_summary=f"Automated rebuild. {prev_entries_count} previous entries overwritten.",
                    created_by_id=self.created_by_id,
                )
                self.db.add(version_snapshot)

            # Clear old entries and conflicts
            self.db.query(RosterEntry).filter(RosterEntry.roster_id == roster.id).delete()
            self.db.query(SchedulingConflict).filter(SchedulingConflict.roster_id == roster.id).delete()
            self.db.flush()

        else:
            roster = Roster(
                name=roster_name,
                month=self.month,
                year=self.year,
                status=RosterStatus.VALIDATED,
                coverage_percentage=coverage_pct,
                fairness_score=fairness_score,
                total_conflicts=len(self.conflicts),
                created_by_id=self.created_by_id,
            )
            self.db.add(roster)
            self.db.flush()

        # Link roster_id to entries and conflicts
        for entry in self.entries:
            entry.roster_id = roster.id
            self.db.add(entry)

        for conflict in self.conflicts:
            conflict.roster_id = roster.id
            self.db.add(conflict)

        self.db.commit()
        self.db.refresh(roster)
        return roster
