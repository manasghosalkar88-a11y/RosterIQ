import csv
import io
import calendar
from datetime import date
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.employee import Employee, EmploymentStatus
from app.models.brand import Brand
from app.models.process import Process
from app.models.pod import Pod
from app.models.allocation import EmployeeAssignment, AssignmentType
from app.models.operating_rule import BrandProcessRule
from app.models.leave import LeaveRequest, CompOff, ApprovalStatus
from app.models.roster import Roster, RosterEntry, ShiftStatus
from app.models.conflict import SchedulingConflict, ConflictSeverity
from app.schemas.analytics import (
    AnalyticsDashboardResponse,
    AnalyticsKPIs,
    PodWorkforceMetric,
    BrandCoverageMetric,
    ProcessStaffingMetric,
    WeeklyOffMetric,
    ConflictSeverityMetric,
)

router = APIRouter(prefix="/analytics", tags=["Analytics & Operational Reports"])


@router.get("/dashboard", response_model=AnalyticsDashboardResponse)
def get_analytics_dashboard(
    month: int = Query(11, ge=1, le=12),
    year: int = Query(2026, ge=2024, le=2030),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns aggregated metrics and chart series for the operational analytics dashboard.
    """
    # 1. Fetch active entities
    employees = db.query(Employee).filter(Employee.is_active == True).all()
    brands = db.query(Brand).filter(Brand.is_active == True).all()
    processes = db.query(Process).filter(Process.is_active == True).all()
    pods = db.query(Pod).filter(Pod.is_active == True).all()

    # 2. Fetch target roster
    roster = db.query(Roster).filter(Roster.month == month, Roster.year == year).first()
    entries = roster.entries if roster else []
    conflicts = roster.conflicts if roster else []

    # Count single-resource vs multi-resource brands
    single_res_count = 0
    multi_res_count = 0
    for b in brands:
        primaries = db.query(EmployeeAssignment.employee_id).filter(
            EmployeeAssignment.brand_id == b.id,
            EmployeeAssignment.assignment_type == AssignmentType.PRIMARY,
            EmployeeAssignment.is_active == True,
        ).distinct().count()
        if primaries <= 1:
            single_res_count += 1
        else:
            multi_res_count += 1

    # Leave & comp-off counts
    approved_leaves = db.query(LeaveRequest).filter(
        LeaveRequest.status == ApprovalStatus.APPROVED,
        func.extract("month", LeaveRequest.start_date) <= month,
        func.extract("month", LeaveRequest.end_date) >= month,
    ).count()

    compoffs_count = db.query(CompOff).count()

    unresolved_conflicts_count = sum(1 for c in conflicts if not c.is_resolved)

    kpis = AnalyticsKPIs(
        total_employees=len(employees),
        active_brands=len(brands),
        single_resource_brands=single_res_count,
        multi_resource_brands=multi_res_count,
        active_processes=len(processes),
        total_pods=len(pods),
        monthly_coverage_percentage=roster.coverage_percentage if roster else 0.0,
        total_unresolved_conflicts=unresolved_conflicts_count,
        approved_leaves_count=approved_leaves,
        earned_compoffs_count=compoffs_count,
    )

    # 3. Pod workforce metrics
    emp_by_pod: Dict[int, int] = {}
    for e in employees:
        if e.pod_id:
            emp_by_pod[e.pod_id] = emp_by_pod.get(e.pod_id, 0) + 1

    working_by_pod: Dict[int, int] = {}
    for entry in entries:
        if entry.status == ShiftStatus.WORKING and entry.employee and entry.employee.pod_id:
            working_by_pod[entry.employee.pod_id] = working_by_pod.get(entry.employee.pod_id, 0) + 1

    pod_metrics = [
        PodWorkforceMetric(
            pod_id=p.id,
            pod_name=p.name,
            pod_code=p.code,
            lead_name=p.lead.full_name if p.lead else "Unassigned",
            employee_count=emp_by_pod.get(p.id, 0),
            total_working_shifts=working_by_pod.get(p.id, 0),
        )
        for p in pods
    ]

    # 4. Brand coverage metrics
    brand_metrics = []
    for b in brands:
        primaries = db.query(EmployeeAssignment.employee_id).filter(
            EmployeeAssignment.brand_id == b.id,
            EmployeeAssignment.assignment_type == AssignmentType.PRIMARY,
        ).distinct().count()

        staffed = sum(1 for e in entries if e.brand_id == b.id and e.status == ShiftStatus.WORKING)
        # Approximate demand for month
        rules = db.query(BrandProcessRule).filter(BrandProcessRule.brand_id == b.id).all()
        demanded = sum(r.min_headcount * 26 for r in rules) if rules else 26
        coverage = round((staffed / demanded * 100.0), 1) if demanded > 0 else 100.0
        coverage = min(100.0, coverage)

        brand_metrics.append(BrandCoverageMetric(
            brand_id=b.id,
            brand_name=b.name,
            brand_code=b.code,
            is_single_resource=(primaries <= 1),
            primary_specialists_count=primaries,
            demanded_shifts=demanded,
            staffed_shifts=staffed,
            coverage_percentage=coverage,
        ))

    # 5. Process staffing metrics
    process_metrics = []
    for proc in processes:
        assign_count = db.query(EmployeeAssignment).filter(
            EmployeeAssignment.process_id == proc.id,
            EmployeeAssignment.is_active == True,
        ).count()
        shifts_count = sum(1 for e in entries if e.process_id == proc.id and e.status == ShiftStatus.WORKING)

        process_metrics.append(ProcessStaffingMetric(
            process_id=proc.id,
            process_name=proc.name,
            process_code=proc.code,
            total_assignments=assign_count,
            scheduled_shifts=shifts_count,
        ))

    # 6. Weekly-off distribution
    day_counts: Dict[str, int] = {
        "Sunday": 0,
        "Monday": 0,
        "Tuesday": 0,
        "Wednesday": 0,
        "Thursday": 0,
        "Friday": 0,
        "Saturday": 0,
    }
    for e in employees:
        pref = (e.default_off_pref or "Sunday").strip().title()
        if pref in day_counts:
            day_counts[pref] += 1
        else:
            day_counts["Sunday"] += 1

    weekly_off_metrics = [
        WeeklyOffMetric(day_name=d, employee_count=cnt)
        for d, cnt in day_counts.items()
    ]

    # 7. Conflict breakdown
    conflict_counts: Dict[str, int] = {
        "CRITICAL": 0,
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0,
    }
    for c in conflicts:
        sev_key = c.severity.value if hasattr(c.severity, "value") else str(c.severity)
        if sev_key in conflict_counts:
            conflict_counts[sev_key] += 1

    conflict_metrics = [
        ConflictSeverityMetric(severity=sev, count=cnt)
        for sev, cnt in conflict_counts.items()
    ]

    return AnalyticsDashboardResponse(
        month=month,
        year=year,
        month_name=calendar.month_name[month],
        kpis=kpis,
        pod_metrics=pod_metrics,
        brand_metrics=brand_metrics,
        process_metrics=process_metrics,
        weekly_off_metrics=weekly_off_metrics,
        conflict_metrics=conflict_metrics,
    )


@router.get("/export/roster/csv")
def export_roster_csv(
    month: int = Query(11, ge=1, le=12),
    year: int = Query(2026, ge=2024, le=2030),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Streams a full comma-separated values (CSV) export of the monthly roster schedule.
    """
    roster = db.query(Roster).filter(Roster.month == month, Roster.year == year).first()
    if not roster:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roster not found for selected period.")

    entries = db.query(RosterEntry).filter(
        RosterEntry.roster_id == roster.id
    ).order_by(RosterEntry.date, RosterEntry.employee_id).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Write CSV Header
    writer.writerow([
        "Roster_Month",
        "Roster_Year",
        "Date",
        "Day_Of_Week",
        "Employee_Code",
        "Employee_Name",
        "Designation",
        "Pod_Name",
        "Shift_Status",
        "Brand_Code",
        "Brand_Name",
        "Process_Code",
        "Process_Name",
        "Shift_Start",
        "Shift_End",
        "Is_Manual_Override",
        "Override_Reason",
    ])

    # Write Rows
    for e in entries:
        writer.writerow([
            calendar.month_name[month],
            year,
            e.date.isoformat(),
            e.date.strftime("%A"),
            e.employee.employee_code if e.employee else "N/A",
            e.employee.full_name if e.employee else "N/A",
            e.employee.designation if e.employee else "N/A",
            e.employee.pod.name if e.employee and e.employee.pod else "General",
            e.status.value if hasattr(e.status, "value") else str(e.status),
            e.brand.code if e.brand else "",
            e.brand.name if e.brand else "",
            e.process.code if e.process else "",
            e.process.name if e.process else "",
            e.shift_start,
            e.shift_end,
            "YES" if e.is_manual_override else "NO",
            e.override_reason or "",
        ])

    output.seek(0)
    filename = f"RosterIQ_Master_Roster_{calendar.month_name[month]}_{year}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/summary/csv")
def export_summary_csv(
    month: int = Query(11, ge=1, le=12),
    year: int = Query(2026, ge=2024, le=2030),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Streams a CSV operational summary report covering brand coverage and pod workforce.
    """
    roster = db.query(Roster).filter(Roster.month == month, Roster.year == year).first()
    brands = db.query(Brand).filter(Brand.is_active == True).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["RosterIQ Operational Summary Report"])
    writer.writerow(["Period", f"{calendar.month_name[month]} {year}"])
    writer.writerow(["Coverage Percentage", f"{roster.coverage_percentage if roster else 0}%"])
    writer.writerow(["Total Conflicts", f"{roster.total_conflicts if roster else 0}"])
    writer.writerow([])

    writer.writerow(["Brand_Code", "Brand_Name", "Resource_Type", "Staffed_Shifts", "Coverage_Target"])
    for b in brands:
        staffed = db.query(RosterEntry).filter(
            RosterEntry.roster_id == (roster.id if roster else -1),
            RosterEntry.brand_id == b.id,
            RosterEntry.status == ShiftStatus.WORKING,
        ).count()
        writer.writerow([
            b.code,
            b.name,
            "Single-Resource" if len(b.assignments) <= 4 else "Multi-Resource",
            staffed,
            "100%",
        ])

    output.seek(0)
    filename = f"RosterIQ_Operational_Summary_{calendar.month_name[month]}_{year}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
