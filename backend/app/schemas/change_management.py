from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.roster import ShiftStatus


class ScoreBreakdown(BaseModel):
    skill_score: float = 0.0
    availability_score: float = 0.0
    pod_score: float = 0.0
    workload_score: float = 0.0
    certification_score: float = 0.0


class ExclusionReasonSummary(BaseModel):
    code: str
    label: str
    count: int
    description: str
    employee_names: List[str] = []


class BackupEvaluationSummary(BaseModel):
    total_evaluated: int = 0
    eligible_count: int = 0
    excluded_count: int = 0
    target_brand_id: Optional[int] = None
    target_brand_name: Optional[str] = None
    target_process_id: Optional[int] = None
    target_process_name: Optional[str] = None
    required_shift: str = "09:00 - 18:00"
    required_skills: List[str] = []
    mandatory_certifications: List[str] = []
    evaluated_dates: List[str] = []
    exclusion_reasons: List[ExclusionReasonSummary] = []


class BackupRecommendationResponse(BaseModel):
    employee_id: int
    employee_code: str
    full_name: str
    pod_id: Optional[int] = None
    pod_name: str
    designation: str
    current_status: ShiftStatus
    available_shift: str = "09:00 - 18:00"
    pod_proximity: str = "SAME_POD"
    suitability_score: int = Field(..., ge=0, le=100)
    score_breakdown: Optional[ScoreBreakdown] = None
    skill_match_pct: float = 100.0
    matched_skills: List[str] = []
    certification_status: str = "VERIFIED"
    certifications: List[str] = []
    current_weekly_hours: float = 0.0
    projected_weekly_hours: float = 8.0
    max_weekly_hours: int = 48
    consecutive_days_before: int = 0
    consecutive_days_after: int
    max_consecutive_days: int = 6
    min_rest_hours_gap: Optional[float] = None
    min_rest_hours_required: int = 12
    eligibility_status: str = "ELIGIBLE"
    is_labor_compliant: bool
    requires_comp_off: bool = False
    recommendation_summary: str = ""
    match_reasons: List[str] = []


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
