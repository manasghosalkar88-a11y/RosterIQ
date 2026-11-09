import time
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.api.deps import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.employee import Employee
from app.models.brand import Brand
from app.models.process import Process
from app.models.pod import Pod
from app.models.allocation import EmployeeAssignment
from app.models.operating_rule import BrandProcessRule
from app.models.roster import Roster, RosterEntry
from app.models.conflict import SchedulingConflict
from app.models.leave import LeaveRequest, CompOff
from app.models.holiday import PublicHoliday
from app.models.audit import AuditLog
from app.models.notification import Notification
from app.schemas.settings import (
    SystemSettingsResponse,
    SystemSettingsUpdateRequest,
    SystemDiagnosticsResponse,
)
from app.seeds.seed_data import seed_database

router = APIRouter(prefix="/settings", tags=["Settings & System Diagnostics"])

# Runtime configurable settings store
_SETTINGS_STATE = {
    "company_name": "DataStraw Operations",
    "default_shift_start": "09:00",
    "default_shift_end": "18:00",
    "max_consecutive_days": 6,
    "single_resource_threshold": 1,
    "auto_resolve_on_override": True,
}

_START_TIME = time.time()


@router.get("", response_model=SystemSettingsResponse)
def get_system_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns company-wide operational configuration and table record counts.
    """
    table_counts = {
        "employees": db.query(Employee).count(),
        "brands": db.query(Brand).count(),
        "processes": db.query(Process).count(),
        "pods": db.query(Pod).count(),
        "assignments": db.query(EmployeeAssignment).count(),
        "operating_rules": db.query(BrandProcessRule).count(),
        "rosters": db.query(Roster).count(),
        "roster_entries": db.query(RosterEntry).count(),
        "conflicts": db.query(SchedulingConflict).count(),
        "leaves": db.query(LeaveRequest).count(),
        "comp_offs": db.query(CompOff).count(),
        "holidays": db.query(PublicHoliday).count(),
        "audit_logs": db.query(AuditLog).count(),
        "notifications": db.query(Notification).count(),
        "users": db.query(User).count(),
    }

    return SystemSettingsResponse(
        company_name=_SETTINGS_STATE["company_name"],
        default_shift_start=_SETTINGS_STATE["default_shift_start"],
        default_shift_end=_SETTINGS_STATE["default_shift_end"],
        max_consecutive_days=_SETTINGS_STATE["max_consecutive_days"],
        single_resource_threshold=_SETTINGS_STATE["single_resource_threshold"],
        auto_resolve_on_override=_SETTINGS_STATE["auto_resolve_on_override"],
        version="1.0.0",
        environment="production-ready",
        database_status="CONNECTED",
        table_counts=table_counts,
    )


@router.put("", response_model=SystemSettingsResponse)
def update_system_settings(
    req: SystemSettingsUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER)),
):
    """
    Updates operational rules (e.g., standard shift timings or max consecutive working days).
    """
    if req.company_name is not None:
        _SETTINGS_STATE["company_name"] = req.company_name
    if req.default_shift_start is not None:
        _SETTINGS_STATE["default_shift_start"] = req.default_shift_start
    if req.default_shift_end is not None:
        _SETTINGS_STATE["default_shift_end"] = req.default_shift_end
    if req.max_consecutive_days is not None:
        _SETTINGS_STATE["max_consecutive_days"] = req.max_consecutive_days
        # Propagate to active employees
        db.query(Employee).update({"max_consecutive_days": req.max_consecutive_days})
        db.commit()
    if req.auto_resolve_on_override is not None:
        _SETTINGS_STATE["auto_resolve_on_override"] = req.auto_resolve_on_override

    return get_system_settings(db=db, current_user=current_user)


@router.get("/diagnostics", response_model=SystemDiagnosticsResponse)
def get_system_diagnostics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Performs live latency ping and system health check.
    """
    t0 = time.time()
    db.execute(text("SELECT 1"))
    latency = round((time.time() - t0) * 1000.0, 2)

    total_records = (
        db.query(Employee).count() +
        db.query(Brand).count() +
        db.query(RosterEntry).count() +
        db.query(SchedulingConflict).count()
    )

    return SystemDiagnosticsResponse(
        status="OPERATIONAL",
        database_connected=True,
        database_latency_ms=latency,
        total_records=total_records,
        active_users=db.query(User).filter(User.is_active == True).count(),
        total_tables=16,
        uptime_seconds=round(time.time() - _START_TIME, 1),
    )


@router.post("/reset-demo")
def reset_demo_database(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER)),
):
    """
    Re-seeds the entire database to the pristine DataStraw assessment state:
    32 employees, 10 brands, 5 pods, 4 processes, 40 operating rules, and generated master rosters.
    """
    seed_database(db)
    return {
        "success": True,
        "message": "Database successfully reset and re-seeded to master assessment state.",
        "stats": {
            "employees": db.query(Employee).count(),
            "brands": db.query(Brand).count(),
            "pods": db.query(Pod).count(),
            "rosters": db.query(Roster).count(),
        }
    }
