from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class AnalyticsKPIs(BaseModel):
    total_employees: int
    active_brands: int
    single_resource_brands: int
    multi_resource_brands: int
    active_processes: int
    total_pods: int
    monthly_coverage_percentage: float
    total_unresolved_conflicts: int
    approved_leaves_count: int
    earned_compoffs_count: int


class PodWorkforceMetric(BaseModel):
    pod_id: int
    pod_name: str
    pod_code: str
    lead_name: str
    employee_count: int
    total_working_shifts: int


class BrandCoverageMetric(BaseModel):
    brand_id: int
    brand_name: str
    brand_code: str
    is_single_resource: bool
    primary_specialists_count: int
    demanded_shifts: int
    staffed_shifts: int
    coverage_percentage: float


class ProcessStaffingMetric(BaseModel):
    process_id: int
    process_name: str
    process_code: str
    total_assignments: int
    scheduled_shifts: int


class WeeklyOffMetric(BaseModel):
    day_name: str
    employee_count: int


class ConflictSeverityMetric(BaseModel):
    severity: str
    count: int


class AnalyticsDashboardResponse(BaseModel):
    month: int
    year: int
    month_name: str
    kpis: AnalyticsKPIs
    pod_metrics: List[PodWorkforceMetric]
    brand_metrics: List[BrandCoverageMetric]
    process_metrics: List[ProcessStaffingMetric]
    weekly_off_metrics: List[WeeklyOffMetric]
    conflict_metrics: List[ConflictSeverityMetric]
