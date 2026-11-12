import type { ShiftStatus } from './roster';

export type SimulationType =
  | 'EMPLOYEE_ABSENCE'
  | 'PLANNED_LEAVE'
  | 'COMP_OFF'
  | 'EMPLOYEE_REASSIGNMENT'
  | 'AVAILABILITY_CHANGE'
  | 'BRAND_RULE_CHANGE'
  | 'PROCESS_STAFFING_CHANGE';

export type ScenarioStatus =
  | 'DRAFT'
  | 'SAVED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'APPLIED'
  | 'DISCARDED';

export interface SimulationRequest {
  roster_id: number;
  simulation_type: SimulationType;
  start_date: string;
  end_date?: string;
  employee_id?: number;
  target_employee_id?: number;
  brand_id?: number;
  process_id?: number;
  new_rule_type?: string;
  new_min_headcount?: number;
  reason?: string;
  expected_snapshot_hash?: string;
}

export interface AffectedEmployee {
  employee_id: number;
  full_name: string;
  employee_code: string;
  pod_name: string;
  shifts_before: number;
  shifts_after: number;
  shift_delta: number;
  impact_note: string;
}

export interface AffectedBrand {
  brand_id: number;
  brand_name: string;
  is_single_resource: boolean;
  coverage_before_pct: number;
  coverage_after_pct: number;
  coverage_delta_pct: number;
  status_before: 'NORMAL' | 'WARNING' | 'CRITICAL' | string;
  status_after: 'NORMAL' | 'WARNING' | 'CRITICAL' | string;
  can_absorb_internally: boolean;
  absorption_note?: string | null;
}

export interface AffectedProcess {
  process_id: number;
  process_code: string;
  process_name: string;
  shortfall_slots: number;
  impact_note: string;
}

export interface SimulatedConflict {
  date: string;
  conflict_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  brand_name?: string | null;
  process_name?: string | null;
  employee_name?: string | null;
  title: string;
  description: string;
}

export interface ScoreBreakdown {
  skill_score: number;
  availability_score: number;
  pod_score: number;
  workload_score: number;
  certification_score: number;
}

export interface ExclusionReasonSummary {
  code: string;
  label: string;
  count: number;
  description: string;
  employee_names: string[];
}

export interface BackupEvaluationSummary {
  total_evaluated: number;
  eligible_count: number;
  excluded_count: number;
  target_brand_id?: number | null;
  target_brand_name?: string | null;
  target_process_id?: number | null;
  target_process_name?: string | null;
  required_shift: string;
  required_skills: string[];
  mandatory_certifications: string[];
  evaluated_dates: string[];
  exclusion_reasons: ExclusionReasonSummary[];
}

export interface BackupCandidate {
  employee_id: number;
  employee_code: string;
  full_name: string;
  pod_id?: number | null;
  pod_name: string;
  designation: string;
  current_status: ShiftStatus;
  available_shift?: string;
  pod_proximity?: string;
  suitability_score: number;
  score_breakdown?: ScoreBreakdown | null;
  skill_match_pct?: number;
  matched_skills?: string[];
  certification_status?: string;
  certifications?: string[];
  current_weekly_hours?: number;
  projected_weekly_hours?: number;
  max_weekly_hours?: number;
  consecutive_days_before?: number;
  consecutive_days_after: number;
  max_consecutive_days?: number;
  min_rest_hours_gap?: number | null;
  match_reasons: string[];
  recommendation_summary?: string | null;
  is_labor_compliant: boolean;
  requires_comp_off: boolean;
}

export interface SimulationResultResponse {
  roster_id: number;
  simulation_type: string;
  start_date: string;
  end_date: string;
  coverage_before: number;
  coverage_after: number;
  coverage_delta: number;
  total_conflicts_before: number;
  total_conflicts_after: number;
  conflicts_delta: number;
  newly_created_conflicts: SimulatedConflict[];
  resolved_conflicts: SimulatedConflict[];
  affected_employees: AffectedEmployee[];
  affected_brands: AffectedBrand[];
  affected_processes: AffectedProcess[];
  affected_dates: string[];
  cascading_effects: string[];
  backup_recommendations: BackupCandidate[];
  backup_evaluation_summary?: BackupEvaluationSummary | null;
  roster_snapshot_hash?: string | null;
  requires_approval?: boolean;
  required_approver_role?: string | null;
  can_absorb_without_replacement: boolean;
  absorption_explanation?: string | null;
  executive_summary: string;
  is_viable: boolean;
}

export interface SaveScenarioRequest {
  roster_id: number;
  name: string;
  description?: string;
  simulation_type: SimulationType;
  parameters: Record<string, any>;
  impact_summary: Record<string, any>;
  candidate_ranking?: Record<string, any> | null;
  selected_backup_employee_id?: number | null;
  roster_snapshot_hash?: string | null;
  submit_for_approval?: boolean;
}

export interface ScenarioResponse {
  id: number;
  roster_id: number;
  name: string;
  description?: string | null;
  simulation_type: string;
  status: ScenarioStatus;
  parameters: Record<string, any>;
  impact_summary: Record<string, any>;
  candidate_ranking?: Record<string, any> | null;
  selected_backup_employee_id?: number | null;
  selected_backup_employee_name?: string | null;
  roster_snapshot_hash?: string | null;
  requires_approval?: boolean;
  required_approver_role?: string | null;
  created_by_name?: string | null;
  reviewed_by_name?: string | null;
  review_comments?: string | null;
  reviewed_at?: string | null;
  applied_by_name?: string | null;
  created_at: string;
  applied_at?: string | null;
}

export interface ApplyScenarioRequest {
  scenario_id?: number;
  replacement_employee_id?: number;
  selected_backup_employee_id?: number;
  expected_snapshot_hash?: string;
  simulation_params?: Record<string, any>;
  override_reason?: string;
  notes?: string;
}

export interface ApplyScenarioResponse {
  success: boolean;
  message: string;
  roster_id: number;
  entries_updated: number;
  new_coverage_pct: number;
  remaining_conflicts_count: number;
  audit_log_id: number;
  applied_by_user_id?: number | null;
  applied_by_name?: string | null;
  applied_at: string;
}
