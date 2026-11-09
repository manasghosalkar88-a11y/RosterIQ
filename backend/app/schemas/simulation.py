from datetime import date, datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from app.models.simulation import SimulationType, ScenarioStatus
from app.schemas.change_management import BackupRecommendationResponse


class SimulationRequest(BaseModel):
    roster_id: int
    simulation_type: SimulationType
    start_date: date
    end_date: Optional[date] = None
    employee_id: Optional[int] = None
    target_employee_id: Optional[int] = None
    brand_id: Optional[int] = None
    process_id: Optional[int] = None
    new_rule_type: Optional[str] = None
    new_min_headcount: Optional[int] = None
    reason: Optional[str] = None


class AffectedEmployee(BaseModel):
    employee_id: int
    full_name: str
    employee_code: str
    pod_name: str
    shifts_before: int
    shifts_after: int
    shift_delta: int
    impact_note: str


class AffectedBrand(BaseModel):
    brand_id: int
    brand_name: str
    is_single_resource: bool
    coverage_before_pct: float
    coverage_after_pct: float
    coverage_delta_pct: float
    status_before: str  # "NORMAL", "WARNING", "CRITICAL"
    status_after: str
    can_absorb_internally: bool
    absorption_note: Optional[str] = None


class AffectedProcess(BaseModel):
    process_id: int
    process_code: str
    process_name: str
    shortfall_slots: int
    impact_note: str


class SimulatedConflict(BaseModel):
    date: str
    conflict_type: str
    severity: str
    brand_name: Optional[str] = None
    process_name: Optional[str] = None
    employee_name: Optional[str] = None
    title: str
    description: str


class SimulationResultResponse(BaseModel):
    roster_id: int
    simulation_type: str
    start_date: str
    end_date: str
    coverage_before: float
    coverage_after: float
    coverage_delta: float
    total_conflicts_before: int
    total_conflicts_after: int
    conflicts_delta: int
    newly_created_conflicts: List[SimulatedConflict] = []
    resolved_conflicts: List[SimulatedConflict] = []
    affected_employees: List[AffectedEmployee] = []
    affected_brands: List[AffectedBrand] = []
    affected_processes: List[AffectedProcess] = []
    affected_dates: List[str] = []
    cascading_effects: List[str] = []
    backup_recommendations: List[BackupRecommendationResponse] = []
    can_absorb_without_replacement: bool = False
    absorption_explanation: Optional[str] = None
    executive_summary: str
    is_viable: bool = True


class SaveScenarioRequest(BaseModel):
    roster_id: int
    name: str
    description: Optional[str] = None
    simulation_type: SimulationType
    parameters: Dict[str, Any]
    impact_summary: Dict[str, Any]


class ScenarioResponse(BaseModel):
    id: int
    roster_id: int
    name: str
    description: Optional[str]
    simulation_type: str
    status: str
    parameters: Dict[str, Any]
    impact_summary: Dict[str, Any]
    created_by_name: Optional[str] = None
    created_at: datetime
    applied_at: Optional[datetime] = None


class ApplyScenarioRequest(BaseModel):
    scenario_id: Optional[int] = None
    replacement_employee_id: Optional[int] = None
    simulation_params: Optional[Dict[str, Any]] = None
    override_reason: Optional[str] = None
    notes: Optional[str] = None


class ApplyScenarioResponse(BaseModel):
    success: bool
    message: str
    roster_id: int
    entries_updated: int
    new_coverage_pct: float
    remaining_conflicts_count: int
    audit_log_id: int
    applied_at: str
