from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.models.roster import RosterStatus, ShiftStatus
from app.models.conflict import ConflictType, ConflictSeverity


class RosterGenerateRequest(BaseModel):
    month: int = Field(..., ge=1, le=12, description="Month (1-12)")
    year: int = Field(..., ge=2024, le=2030, description="Year (e.g., 2026)")
    name: Optional[str] = None
    allow_overrides: bool = True


class RosterEntryResponse(BaseModel):
    id: int
    roster_id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    pod_id: Optional[int] = None
    pod_name: Optional[str] = None
    date: date
    status: ShiftStatus
    brand_id: Optional[int] = None
    brand_name: Optional[str] = None
    process_id: Optional[int] = None
    process_name: Optional[str] = None
    shift_start: str
    shift_end: str
    is_manual_override: bool
    override_reason: Optional[str] = None

    class Config:
        from_attributes = True


class ConflictResponse(BaseModel):
    id: int
    roster_id: int
    date: date
    brand_id: Optional[int] = None
    brand_name: Optional[str] = None
    process_id: Optional[int] = None
    process_name: Optional[str] = None
    employee_id: Optional[int] = None
    employee_name: Optional[str] = None
    conflict_type: ConflictType
    severity: ConflictSeverity
    title: str
    description: str
    recommended_action: Optional[str] = None
    is_resolved: bool

    class Config:
        from_attributes = True


class RosterSummaryResponse(BaseModel):
    id: int
    name: str
    month: int
    year: int
    status: RosterStatus
    coverage_percentage: float
    fairness_score: float
    total_conflicts: int
    created_at: datetime
    published_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RosterDetailResponse(RosterSummaryResponse):
    conflicts: List[ConflictResponse] = []


class DayMeta(BaseModel):
    date: str
    day_number: int
    day_name: str
    is_weekend: bool
    is_sunday: bool
    is_holiday: bool
    holiday_name: Optional[str] = None


class RosterGridCell(BaseModel):
    date: str
    day_number: int
    day_name: str
    status: ShiftStatus
    brand_id: Optional[int] = None
    brand_name: Optional[str] = None
    process_id: Optional[int] = None
    process_name: Optional[str] = None
    shift_start: str
    shift_end: str
    is_manual_override: bool = False
    has_conflict: bool = False
    conflict_title: Optional[str] = None


class RosterGridRow(BaseModel):
    employee_id: int
    employee_code: str
    employee_name: str
    designation: str
    pod_id: Optional[int] = None
    pod_name: str
    default_off: str
    total_working_days: int
    total_off_days: int
    total_leave_days: int
    schedule: Dict[str, RosterGridCell]  # Key: "YYYY-MM-DD"


class RosterGridResponse(BaseModel):
    roster_id: int
    name: str
    month: int
    year: int
    month_name: str
    total_days: int
    status: RosterStatus
    coverage_percentage: float
    fairness_score: float
    total_conflicts: int
    days: List[DayMeta]
    rows: List[RosterGridRow]
