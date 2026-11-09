import json
import calendar
from datetime import date, datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.employee import Employee
from app.models.brand import Brand
from app.models.process import Process
from app.models.pod import Pod
from app.models.roster import Roster, RosterEntry, ShiftStatus
from app.models.conflict import SchedulingConflict, ConflictSeverity
from app.models.leave import LeaveRequest, CompOff, ApprovalStatus
from app.models.holiday import PublicHoliday
from app.models.audit import AuditLog
from app.models.allocation import EmployeeAssignment, AssignmentType
from app.models.operating_rule import BrandProcessRule
from app.schemas.overview import (
    OverviewDashboardResponse,
    OverviewKPIs,
    TodayWorkforceStatus,
    EmployeeWorkingItem,
    EmployeeLeaveItem,
    UpcomingHolidayItem,
    CriticalAlertItem,
    RecentChangeItem,
    NetworkGraphResponse,
    NetworkGraphNode,
    NetworkGraphLink,
)

router = APIRouter(prefix="/overview", tags=["Overview Dashboard"])


@router.get("/summary", response_model=OverviewDashboardResponse)
def get_overview_summary(
    target_date: Optional[date] = Query(None, description="Optional target date (defaults to today)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns live aggregated operations data for Module A Overview Dashboard.
    """
    today = target_date or date.today()
    month = today.month
    year = today.year

    # 1. Core Entity Counts
    total_employees = db.query(Employee).filter(Employee.is_active == True).count()
    active_brands = db.query(Brand).filter(Brand.is_active == True).count()
    active_processes = db.query(Process).filter(Process.is_active == True).count()
    total_pods = db.query(Pod).filter(Pod.is_active == True).count()

    # 2. Target Roster & Coverage
    roster = db.query(Roster).filter(Roster.month == month, Roster.year == year).first()
    coverage_pct = roster.coverage_percentage if roster else 0.0

    # 3. Today's Shifts
    entries_today = []
    if roster:
        entries_today = db.query(RosterEntry).filter(
            RosterEntry.roster_id == roster.id,
            RosterEntry.date == today,
        ).all()

    working_today = sum(1 for e in entries_today if e.status == ShiftStatus.WORKING)
    leave_today = sum(1 for e in entries_today if e.status in [ShiftStatus.LEAVE, ShiftStatus.COMP_OFF])
    off_today = sum(1 for e in entries_today if e.status == ShiftStatus.WEEKLY_OFF)

    working_samples: List[EmployeeWorkingItem] = []
    for e in entries_today:
        if e.status == ShiftStatus.WORKING and len(working_samples) < 6:
            working_samples.append(EmployeeWorkingItem(
                employee_id=e.employee_id,
                employee_name=e.employee.full_name if e.employee else "Employee",
                employee_code=e.employee.employee_code if e.employee else "EMP",
                pod_name=e.employee.pod.name if e.employee and e.employee.pod else "General",
                brand_name=e.brand.name if e.brand else "Multi-Process Floater",
                process_name=e.process.name if e.process else "Support",
                shift_hours=f"{e.shift_start} - {e.shift_end}",
            ))

    leave_samples: List[EmployeeLeaveItem] = []
    for e in entries_today:
        if e.status in [ShiftStatus.LEAVE, ShiftStatus.COMP_OFF] and len(leave_samples) < 5:
            leave_samples.append(EmployeeLeaveItem(
                employee_id=e.employee_id,
                employee_name=e.employee.full_name if e.employee else "Employee",
                employee_code=e.employee.employee_code if e.employee else "EMP",
                pod_name=e.employee.pod.name if e.employee and e.employee.pod else "General",
                leave_type=e.status.value,
                start_date=today.isoformat(),
                end_date=today.isoformat(),
                reason=e.override_reason or "Approved Leave",
            ))

    today_status = TodayWorkforceStatus(
        date=today.isoformat(),
        day_name=today.strftime("%A"),
        working_count=working_today,
        leave_count=leave_today,
        weekly_off_count=off_today,
        working_sample=working_samples,
        leave_sample=leave_samples,
    )

    # 4. Critical Coverage Alerts
    critical_conflicts = db.query(SchedulingConflict).filter(
        SchedulingConflict.is_resolved == False,
    ).order_by(
        desc(SchedulingConflict.severity == ConflictSeverity.CRITICAL),
        SchedulingConflict.date.asc(),
    ).limit(5).all()

    critical_alerts = [
        CriticalAlertItem(
            conflict_id=c.id,
            date=c.date.isoformat(),
            brand_name=c.brand.name if c.brand else "Pod Team",
            process_name=c.process.name if c.process else "Service",
            title=c.title,
            description=c.description,
            severity=c.severity.value if hasattr(c.severity, "value") else str(c.severity),
        )
        for c in critical_conflicts
    ]

    # 5. Upcoming Leaves (Approved leaves in the next 14 days)
    future_date = today + timedelta(days=14)
    upcoming_leaves_raw = db.query(LeaveRequest).filter(
        LeaveRequest.status == ApprovalStatus.APPROVED,
        LeaveRequest.end_date >= today,
        LeaveRequest.start_date <= future_date,
    ).order_by(LeaveRequest.start_date.asc()).limit(5).all()

    upcoming_leaves = [
        EmployeeLeaveItem(
            employee_id=l.employee_id,
            employee_name=l.employee.full_name if l.employee else "Employee",
            employee_code=l.employee.employee_code if l.employee else "EMP",
            pod_name=l.employee.pod.name if l.employee and l.employee.pod else "General",
            leave_type=l.leave_type.value if hasattr(l.leave_type, "value") else str(l.leave_type),
            start_date=l.start_date.isoformat(),
            end_date=l.end_date.isoformat(),
            reason=l.reason or "Planned absence",
        )
        for l in upcoming_leaves_raw
    ]

    # 6. Recent Changes Ledger
    recent_logs = db.query(AuditLog).order_by(desc(AuditLog.timestamp)).limit(5).all()
    recent_changes = [
        RecentChangeItem(
            id=log.id,
            action=log.action,
            user_name=log.user.full_name if log.user else "Operations Lead",
            change_details=log.change_details or log.action,
            timestamp=log.timestamp,
        )
        for log in recent_logs
    ]

    # 7. Upcoming Public Holidays
    holidays_raw = db.query(PublicHoliday).filter(
        PublicHoliday.date >= today,
    ).order_by(PublicHoliday.date.asc()).limit(4).all()

    upcoming_holidays = [
        UpcomingHolidayItem(
            date=h.date.isoformat(),
            name=h.name,
            day_name=h.date.strftime("%A"),
        )
        for h in holidays_raw
    ]

    # 8. Pending Approvals Count
    pending_approvals = db.query(LeaveRequest).filter(LeaveRequest.status == ApprovalStatus.PENDING).count() + \
                        db.query(CompOff).filter(CompOff.status == ApprovalStatus.PENDING).count()

    unresolved_conflicts_count = db.query(SchedulingConflict).filter(SchedulingConflict.is_resolved == False).count()

    kpis = OverviewKPIs(
        total_employees=total_employees,
        active_brands=active_brands,
        active_processes=active_processes,
        total_pods=total_pods,
        working_today=working_today,
        on_leave_today=leave_today,
        coverage_percentage=coverage_pct,
        unresolved_conflicts=unresolved_conflicts_count,
    )

    return OverviewDashboardResponse(
        kpis=kpis,
        today_status=today_status,
        upcoming_leaves=upcoming_leaves,
        critical_alerts=critical_alerts,
        recent_changes=recent_changes,
        upcoming_holidays=upcoming_holidays,
        pending_approvals_count=pending_approvals,
    )


@router.get("/network-graph", response_model=NetworkGraphResponse)
def get_workforce_network_graph(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns authentic workforce relationship graph connecting:
    - 5 Operational Pods
    - 32 Employees
    - 10 D2C Brands
    - 4 Core Processes
    Includes actual active conflicts, primary/backup allocations, and availability data.
    """
    pods = db.query(Pod).filter(Pod.is_active == True).all()
    employees = db.query(Employee).filter(Employee.is_active == True).all()
    brands = db.query(Brand).filter(Brand.is_active == True).all()
    processes = db.query(Process).filter(Process.is_active == True).all()
    assignments = db.query(EmployeeAssignment).filter(EmployeeAssignment.is_active == True).all()
    rules = db.query(BrandProcessRule).all()
    conflicts = db.query(SchedulingConflict).filter(SchedulingConflict.is_resolved == False).all()

    # Brand conflict counts & severities
    brand_conflicts: dict = {}
    brand_has_critical: dict = {}
    for c in conflicts:
        if c.brand_id:
            brand_conflicts[c.brand_id] = brand_conflicts.get(c.brand_id, 0) + 1
            if c.severity == ConflictSeverity.CRITICAL:
                brand_has_critical[c.brand_id] = True

    # Process conflict counts
    process_conflicts: dict = {}
    process_has_critical: dict = {}
    for c in conflicts:
        if c.process_id:
            process_conflicts[c.process_id] = process_conflicts.get(c.process_id, 0) + 1
            if c.severity == ConflictSeverity.CRITICAL:
                process_has_critical[c.process_id] = True

    # Employee assignments mapping
    emp_assignments_map: dict = {}
    for a in assignments:
        if a.employee_id not in emp_assignments_map:
            emp_assignments_map[a.employee_id] = []
        emp_assignments_map[a.employee_id].append(a)

    # Brand assignments mapping
    brand_assignments_map: dict = {}
    for a in assignments:
        if a.brand_id not in brand_assignments_map:
            brand_assignments_map[a.brand_id] = []
        brand_assignments_map[a.brand_id].append(a)

    nodes: List[NetworkGraphNode] = []

    # 1. Pod Nodes (Hubs)
    for p in pods:
        p_employees = [e for e in employees if e.pod_id == p.id]
        p_brands = [b for b in brands if b.pod_id == p.id]
        
        has_critical = any(brand_has_critical.get(b.id, False) for b in p_brands)
        has_any_conflict = any(brand_conflicts.get(b.id, 0) > 0 for b in p_brands)
        
        if has_critical:
            p_status = "CONFLICT"
        elif has_any_conflict:
            p_status = "WARNING"
        else:
            p_status = "NORMAL"

        nodes.append(NetworkGraphNode(
            id=f"pod-{p.id}",
            name=p.name,
            code=p.code,
            type="pod",
            status=p_status,
            employee_count=len(p_employees),
            brand_count=len(p_brands),
            conflict_count=sum(brand_conflicts.get(b.id, 0) for b in p_brands),
            designation=f"Operational Pod Hub ({p.code})",
        ))

    # 2. Brand Nodes
    for b in brands:
        b_conflicts = brand_conflicts.get(b.id, 0)
        is_crit = brand_has_critical.get(b.id, False)
        b_assignments = brand_assignments_map.get(b.id, [])
        primary_staff = [a for a in b_assignments if a.assignment_type == AssignmentType.PRIMARY]
        is_single = len(primary_staff) <= 1
        
        if is_crit:
            b_status = "CONFLICT"
        elif b_conflicts > 0 or (is_single and len(b_assignments) <= 1):
            b_status = "WARNING"
        else:
            b_status = "NORMAL"

        assigned_emps = []
        seen_emp = set()
        for a in b_assignments:
            if a.employee and a.employee.id not in seen_emp:
                seen_emp.add(a.employee.id)
                assigned_emps.append({
                    "id": a.employee.id,
                    "name": a.employee.full_name,
                    "type": a.assignment_type.value,
                })

        b_rules = [r for r in rules if r.brand_id == b.id]
        brand_procs = []
        seen_p = set()
        for r in b_rules:
            if r.process and r.process.id not in seen_p:
                seen_p.add(r.process.id)
                brand_procs.append({
                    "id": r.process.id,
                    "code": r.process.code,
                    "name": r.process.name,
                })

        nodes.append(NetworkGraphNode(
            id=f"brand-{b.id}",
            name=b.name,
            code=b.code,
            type="brand",
            status=b_status,
            pod_id=b.pod_id,
            pod_name=b.pod.name if b.pod else None,
            is_single_resource=is_single,
            conflict_count=b_conflicts,
            assigned_employees=assigned_emps,
            assigned_processes=brand_procs,
            designation=f"{'Single-Resource' if is_single else 'Multi-Resource'} Brand",
        ))

    # 3. Process Nodes
    for pr in processes:
        pr_conflicts = process_conflicts.get(pr.id, 0)
        is_crit = process_has_critical.get(pr.id, False)
        if is_crit:
            pr_status = "CONFLICT"
        elif pr_conflicts > 0:
            pr_status = "WARNING"
        else:
            pr_status = "NORMAL"

        pr_rules = [r for r in rules if r.process_id == pr.id]
        nodes.append(NetworkGraphNode(
            id=f"process-{pr.id}",
            name=pr.name,
            code=pr.code,
            type="process",
            status=pr_status,
            conflict_count=pr_conflicts,
            brand_count=len({r.brand_id for r in pr_rules}),
            designation=f"Core Operational Process ({pr.code})",
        ))

    # 4. Employee Nodes
    for e in employees:
        e_assignments = emp_assignments_map.get(e.id, [])
        assigned_brands_list = []
        assigned_procs_list = []
        seen_b = set()
        seen_p = set()
        
        has_conflict_brand = False
        has_warning_brand = False
        
        for a in e_assignments:
            if a.brand and a.brand.id not in seen_b:
                seen_b.add(a.brand.id)
                assigned_brands_list.append({
                    "id": a.brand.id,
                    "name": a.brand.name,
                    "type": a.assignment_type.value,
                })
                if brand_has_critical.get(a.brand.id, False):
                    has_conflict_brand = True
                elif brand_conflicts.get(a.brand.id, 0) > 0:
                    has_warning_brand = True
            
            if a.process and a.process.id not in seen_p:
                seen_p.add(a.process.id)
                assigned_procs_list.append({
                    "id": a.process.id,
                    "code": a.process.code,
                    "name": a.process.name,
                })

        if has_conflict_brand:
            e_status = "CONFLICT"
        elif has_warning_brand or len(assigned_brands_list) > 2:
            e_status = "WARNING"
        else:
            e_status = "NORMAL"

        off_day = e.default_off_pref or "Sunday"
        availability = f"Active · {off_day} Off · Max {e.max_consecutive_days}d Limit"

        nodes.append(NetworkGraphNode(
            id=f"emp-{e.id}",
            name=e.full_name,
            code=e.employee_code,
            type="employee",
            status=e_status,
            pod_id=e.pod_id,
            pod_name=e.pod.name if e.pod else "General",
            designation=e.designation or "Operations Specialist",
            assigned_brands=assigned_brands_list,
            assigned_processes=assigned_procs_list,
            availability=availability,
        ))

    # Relational Links
    links: List[NetworkGraphLink] = []

    # Pod -> Employee
    for e in employees:
        if e.pod_id:
            links.append(NetworkGraphLink(
                source=f"pod-{e.pod_id}",
                target=f"emp-{e.id}",
                relation="POD_EMPLOYEE",
            ))

    # Pod -> Brand
    for b in brands:
        if b.pod_id:
            links.append(NetworkGraphLink(
                source=f"pod-{b.pod_id}",
                target=f"brand-{b.id}",
                relation="POD_BRAND",
            ))

    # Employee -> Brand
    for a in assignments:
        rel = "EMPLOYEE_BRAND_PRIMARY" if a.assignment_type == AssignmentType.PRIMARY else "EMPLOYEE_BRAND_BACKUP"
        links.append(NetworkGraphLink(
            source=f"emp-{a.employee_id}",
            target=f"brand-{a.brand_id}",
            relation=rel,
        ))

    # Brand -> Process
    seen_bp = set()
    for r in rules:
        pair = (r.brand_id, r.process_id)
        if pair not in seen_bp:
            seen_bp.add(pair)
            links.append(NetworkGraphLink(
                source=f"brand-{r.brand_id}",
                target=f"process-{r.process_id}",
                relation="BRAND_PROCESS",
            ))

    return NetworkGraphResponse(
        nodes=nodes,
        links=links,
        pods_count=len(pods),
        employees_count=len(employees),
        brands_count=len(brands),
        processes_count=len(processes),
        conflicts_count=len(conflicts),
    )

