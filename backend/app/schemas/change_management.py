from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.roster import ShiftStatus


class BackupRecommendationResponse(BaseModel):
    employee_id: int
    employee_code: str
    full_name: str
    pod_id: Optional[int] = None
    pod_name: str
    designation: str
    current_status: ShiftStatus
    suitability_score: int = Field(..., ge=0, le=100)
    match_reasons: List[str] = []
    consecutive_days_after: int
    is_labor_compliant: bool
    requires_comp_off: bool = False


class ShiftOverrideRequest(BaseModel):
    roster_id: int
    date: date
    source_employee_id: int
    target_employee_id: int
    brand_id: int
    process_id: Optional[int] = None
    reason: str = Field(..., min_length=3, description="Operational justification for the shift override")


class ShiftOverrideResponse(BaseModel):
    success: bool
    message: str
    roster_id: int
    date: date
    source_employee_name: str
    target_employee_name: str
    brand_name: str
    new_coverage_percentage: float
    remaining_conflicts: int
    audit_log_id: int


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    change_details: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True
