export interface AnalyticsKPIs {
  total_employees: number;
  active_brands: number;
  single_resource_brands: number;
  multi_resource_brands: number;
  active_processes: number;
  total_pods: number;
  monthly_coverage_percentage: number;
  total_unresolved_conflicts: number;
  approved_leaves_count: number;
  earned_compoffs_count: number;
}

export interface PodWorkforceMetric {
  pod_id: number;
  pod_name: string;
  pod_code: string;
  lead_name: string;
  employee_count: number;
  total_working_shifts: number;
}

export interface BrandCoverageMetric {
  brand_id: number;
  brand_name: string;
  brand_code: string;
  is_single_resource: boolean;
  primary_specialists_count: number;
  demanded_shifts: number;
  staffed_shifts: number;
  coverage_percentage: number;
}

export interface ProcessStaffingMetric {
  process_id: number;
  process_name: string;
  process_code: string;
  total_assignments: number;
  scheduled_shifts: number;
}

export interface WeeklyOffMetric {
  day_name: string;
  employee_count: number;
}

export interface ConflictSeverityMetric {
  severity: string;
  count: number;
}

export interface AnalyticsDashboardResponse {
  month: number;
  year: number;
  month_name: string;
  kpis: AnalyticsKPIs;
  pod_metrics: PodWorkforceMetric[];
  brand_metrics: BrandCoverageMetric[];
  process_metrics: ProcessStaffingMetric[];
  weekly_off_metrics: WeeklyOffMetric[];
  conflict_metrics: ConflictSeverityMetric[];
}
