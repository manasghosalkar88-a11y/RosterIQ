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
from app.schemas.overview import (
    OverviewDashboardResponse,
    OverviewKPIs,
    TodayWorkforceStatus,
    EmployeeWorkingItem,
    EmployeeLeaveItem,
    UpcomingHolidayItem,
    CriticalAlertItem,
    RecentChangeItem,
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
