import type { ShiftStatus } from './roster';

export type SimulationType =
  | 'EMPLOYEE_ABSENCE'
  | 'PLANNED_LEAVE'
  | 'COMP_OFF'
  | 'EMPLOYEE_REASSIGNMENT'
  | 'AVAILABILITY_CHANGE'
  | 'BRAND_RULE_CHANGE'
  | 'PROCESS_STAFFING_CHANGE';

export type ScenarioStatus = 'DRAFT' | 'SAVED' | 'APPLIED' | 'DISCARDED';

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

export interface BackupCandidate {
  employee_id: number;
  employee_code: string;
  full_name: string;
  pod_id?: number | null;
  pod_name: string;
  designation: string;
  current_status: ShiftStatus;
  suitability_score: number;
  match_reasons: string[];
  consecutive_days_after: number;
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
  created_by_name?: string | null;
  created_at: string;
  applied_at?: string | null;
}

export interface ApplyScenarioRequest {
  scenario_id?: number;
  replacement_employee_id?: number;
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
  applied_at: string;
}
