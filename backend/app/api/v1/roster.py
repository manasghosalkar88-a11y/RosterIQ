import calendar
from datetime import date, datetime
from typing import List, Optional, Dict, Any, Tuple
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.api.deps import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.roster import Roster, RosterEntry, RosterStatus, ShiftStatus
from app.models.conflict import SchedulingConflict
from app.models.holiday import PublicHoliday
from app.models.employee import Employee
from app.models.brand import Brand
from app.models.process import Process
from app.schemas.roster import (
    RosterGenerateRequest,
    RosterSummaryResponse,
    RosterDetailResponse,
    ConflictResponse,
    RosterGridResponse,
    RosterGridRow,
    RosterGridCell,
    DayMeta,
)
from app.engine.scheduler import SchedulingEngine, WEEKDAY_NAMES

router = APIRouter(prefix="/roster", tags=["Roster Engine"])


@router.get("/list", response_model=List[RosterSummaryResponse])
def list_rosters(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all generated monthly rosters with coverage and conflict statistics.
    """
    rosters = db.query(Roster).order_by(desc(Roster.year), desc(Roster.month)).all()
    return rosters


@router.post("/generate", response_model=RosterSummaryResponse)
def generate_roster(
    req: RosterGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER)),
):
    """
    Generates a deterministic monthly roster using the constraint-based engine.
    Calculates demand from Brand & Process operating rules, evaluates employee availability,
    allocates dedicated specialists and pod floaters, enforces the 6-day labor rule,
    and logs all unsolvable coverage gaps as actionable SchedulingConflicts.
    """
    engine = SchedulingEngine(
        db=db,
        month=req.month,
        year=req.year,
        created_by_id=current_user.id,
    )
    roster = engine.generate(roster_name=req.name)
    return roster


@router.get("/{month}/{year}", response_model=RosterDetailResponse)
def get_roster_by_month_year(
    month: int,
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch a monthly roster including its conflicts and health statistics.
    """
    roster = db.query(Roster).filter(Roster.month == month, Roster.year == year).first()
    if not roster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No roster generated yet for {calendar.month_name[month]} {year}. Click 'Generate Monthly Roster' to create one.",
        )

    # Format conflicts
    conflicts_data = []
    for c in roster.conflicts:
        conflicts_data.append(ConflictResponse(
            id=c.id,
            roster_id=c.roster_id,
            date=c.date,
            brand_id=c.brand_id,
            brand_name=c.brand.name if c.brand else None,
            process_id=c.process_id,
            process_name=c.process.name if c.process else None,
            employee_id=c.employee_id,
            employee_name=c.employee.full_name if c.employee else None,
            conflict_type=c.conflict_type,
            severity=c.severity,
            title=c.title,
            description=c.description,
            recommended_action=c.recommended_action,
            is_resolved=c.is_resolved,
        ))

    return RosterDetailResponse(
        id=roster.id,
        name=roster.name,
        month=roster.month,
        year=roster.year,
        status=roster.status,
        coverage_percentage=roster.coverage_percentage,
        fairness_score=roster.fairness_score,
        total_conflicts=roster.total_conflicts,
        created_at=roster.created_at,
        published_at=roster.published_at,
        conflicts=conflicts_data,
    )


@router.get("/{month}/{year}/grid", response_model=RosterGridResponse)
def get_roster_grid(
    month: int,
    year: int,
    pod_id: Optional[int] = Query(None, description="Filter by Pod ID"),
    brand_id: Optional[int] = Query(None, description="Filter by Brand ID"),
    process_id: Optional[int] = Query(None, description="Filter by Process ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns pivoted tabular roster grid (rows=Employees, cols=Days)
    with enriched shift metadata, brand/process info, and conflict tags.
    Supports Company-wide, Pod-wise, Brand-wise, Process-wise, and Employee filtering.
    """
    roster = db.query(Roster).filter(Roster.month == month, Roster.year == year).first()
    if not roster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No roster exists for {calendar.month_name[month]} {year}.",
        )

    _, num_days = calendar.monthrange(year, month)
    month_dates = [date(year, month, d) for d in range(1, num_days + 1)]

    # Fetch holidays for month
    holidays = {
        h.date: h for h in db.query(PublicHoliday).filter(
            PublicHoliday.date >= month_dates[0],
            PublicHoliday.date <= month_dates[-1],
        ).all()
    }

    # Prepare day metadata
    days_meta: List[DayMeta] = []
    for d in month_dates:
        weekday = d.weekday()
        days_meta.append(DayMeta(
            date=d.isoformat(),
            day_number=d.day,
            day_name=WEEKDAY_NAMES[weekday][:3],
            is_weekend=(weekday in [5, 6]),
            is_sunday=(weekday == 6),
            is_holiday=(d in holidays),
            holiday_name=holidays[d].name if d in holidays else None,
        ))

    # Fetch entries with relationships
    entries_query = db.query(RosterEntry).filter(RosterEntry.roster_id == roster.id)
    if brand_id:
        entries_query = entries_query.filter(RosterEntry.brand_id == brand_id)
    if process_id:
        entries_query = entries_query.filter(RosterEntry.process_id == process_id)
    entries = entries_query.all()

    # Index entries by (employee_id, date)
    entries_map: Dict[Tuple[int, date], RosterEntry] = {
        (e.employee_id, e.date): e for e in entries
    }

    # Index conflicts by (employee_id, date)
    conflicts_by_emp_date: Dict[Tuple[int, date], SchedulingConflict] = {
        (c.employee_id, c.date): c for c in roster.conflicts if c.employee_id is not None
    }

    # Fetch employees
    emp_query = db.query(Employee).filter(Employee.is_active == True)
    if pod_id:
        emp_query = emp_query.filter(Employee.pod_id == pod_id)
    employees = emp_query.order_by(Employee.pod_id, Employee.full_name).all()

    # Filter to active employees if brand or process filter is active
    if brand_id or process_id:
        active_emp_ids = {e.employee_id for e in entries}
        employees = [e for e in employees if e.id in active_emp_ids]

    rows: List[RosterGridRow] = []

    for emp in employees:
        schedule: Dict[str, RosterGridCell] = {}
        working_days = 0
        off_days = 0
        leave_days = 0

        for d in month_dates:
            d_str = d.isoformat()
            weekday = d.weekday()
            entry = entries_map.get((emp.id, d))
            conflict = conflicts_by_emp_date.get((emp.id, d))

            if entry:
                if entry.status == ShiftStatus.WORKING:
                    working_days += 1
                elif entry.status in [ShiftStatus.WEEKLY_OFF, ShiftStatus.HOLIDAY]:
                    off_days += 1
                elif entry.status in [ShiftStatus.LEAVE, ShiftStatus.COMP_OFF]:
                    leave_days += 1

                schedule[d_str] = RosterGridCell(
                    date=d_str,
                    day_number=d.day,
                    day_name=WEEKDAY_NAMES[weekday][:3],
                    status=entry.status,
                    brand_id=entry.brand_id,
                    brand_name=entry.brand.name if entry.brand else None,
                    process_id=entry.process_id,
                    process_name=entry.process.name if entry.process else None,
                    shift_start=entry.shift_start,
                    shift_end=entry.shift_end,
                    is_manual_override=entry.is_manual_override,
                    has_conflict=(conflict is not None),
                    conflict_title=conflict.title if conflict else None,
                )
            else:
                # Default cell if unallocated
                schedule[d_str] = RosterGridCell(
                    date=d_str,
                    day_number=d.day,
                    day_name=WEEKDAY_NAMES[weekday][:3],
                    status=ShiftStatus.WEEKLY_OFF,
                    shift_start="09:00",
                    shift_end="18:00",
                )

        rows.append(RosterGridRow(
            employee_id=emp.id,
            employee_code=emp.employee_code,
            employee_name=emp.full_name,
            designation=emp.designation,
            pod_id=emp.pod_id,
            pod_name=emp.pod.name if emp.pod else "General",
            default_off=emp.default_off_pref or "Sunday",
            total_working_days=working_days,
            total_off_days=off_days,
            total_leave_days=leave_days,
            schedule=schedule,
        ))

    return RosterGridResponse(
        roster_id=roster.id,
        name=roster.name,
        month=roster.month,
        year=roster.year,
        month_name=calendar.month_name[month],
        total_days=num_days,
        status=roster.status,
        coverage_percentage=roster.coverage_percentage,
        fairness_score=roster.fairness_score,
        total_conflicts=roster.total_conflicts,
        days=days_meta,
        rows=rows,
    )


@router.post("/{roster_id}/publish", response_model=RosterSummaryResponse)
def publish_roster(
    roster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER)),
):
    """
    Approves and publishes the monthly roster, freezing changes for general staff visibility.
    """
    roster = db.query(Roster).filter(Roster.id == roster_id).first()
    if not roster:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roster not found.")

    roster.status = RosterStatus.PUBLISHED
    roster.published_by_id = current_user.id
    roster.published_at = datetime.utcnow()

    db.commit()
    db.refresh(roster)
    return roster
