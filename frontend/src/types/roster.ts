export type RosterStatus = 'DRAFT' | 'VALIDATED' | 'PUBLISHED' | 'ARCHIVED';

export type ShiftStatus = 'WORKING' | 'WEEKLY_OFF' | 'LEAVE' | 'COMP_OFF' | 'HOLIDAY';

export type ConflictSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ConflictType =
  | 'UNSTAFFED_PROCESS'
  | 'OVERLAPPING_SHIFT'
  | 'LEAVE_VIOLATION'
  | 'WEEKLY_OFF_VIOLATION'
  | 'HOLIDAY_RULE_VIOLATION'
  | 'INSUFFICIENT_STAFFING'
  | 'EXCESSIVE_CONSECUTIVE_DAYS';

export interface Conflict {
  id: number;
  roster_id: number;
  date: string;
  brand_id?: number | null;
  brand_name?: string | null;
  process_id?: number | null;
  process_name?: string | null;
  employee_id?: number | null;
  employee_name?: string | null;
  conflict_type: ConflictType;
  severity: ConflictSeverity;
  title: string;
  description: string;
  recommended_action?: string | null;
  is_resolved: boolean;
}

export interface ConflictStats {
  total_conflicts: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  resolved_count: number;
  resolution_rate: number;
}

export interface DayMeta {
  date: string;
  day_number: number;
  day_name: string;
  is_weekend: boolean;
  is_sunday: boolean;
  is_holiday: boolean;
  holiday_name?: string | null;
}

export interface RosterGridCell {
  date: string;
  day_number: number;
  day_name: string;
  status: ShiftStatus;
  brand_id?: number | null;
  brand_name?: string | null;
  process_id?: number | null;
  process_name?: string | null;
  shift_start: string;
  shift_end: string;
  is_manual_override: boolean;
  has_conflict: boolean;
  conflict_title?: string | null;
}

export interface RosterGridRow {
  employee_id: number;
  employee_code: string;
  employee_name: string;
  designation: string;
  pod_id?: number | null;
  pod_name: string;
  default_off: string;
  total_working_days: number;
  total_off_days: number;
  total_leave_days: number;
  schedule: Record<string, RosterGridCell>;
}

export interface RosterGridResponse {
  roster_id: number;
  name: string;
  month: number;
  year: number;
  month_name: string;
  total_days: number;
  status: RosterStatus;
  coverage_percentage: number;
  fairness_score: number;
  total_conflicts: number;
  days: DayMeta[];
  rows: RosterGridRow[];
}

export interface BackupRecommendation {
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

export interface ShiftOverrideRequest {
  roster_id: number;
  date: string;
  source_employee_id: number;
  target_employee_id: number;
  brand_id: number;
  process_id?: number | null;
  reason: string;
}

export interface ShiftOverrideResponse {
  success: boolean;
  message: string;
  roster_id: number;
  date: string;
  source_employee_name: string;
  target_employee_name: string;
  brand_name: string;
  new_coverage_percentage: number;
  remaining_conflicts: number;
  audit_log_id: number;
}

export interface AuditLogItem {
  id: number;
  user_id?: number | null;
  user_name?: string | null;
  action: string;
  entity_type: string;
  entity_id?: number | null;
  change_details?: string | null;
  timestamp: string;
}

