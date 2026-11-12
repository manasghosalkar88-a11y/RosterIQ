export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ApprovalItem {
  id: number;
  item_type: 'LEAVE' | 'COMPOFF' | 'SIMULATION_SCENARIO';
  employee_id?: number | null;
  employee_name: string;
  employee_code: string;
  pod_id?: number | null;
  pod_name: string;
  request_type: string;
  date_range: string;
  reason: string;
  status: ApprovalStatus;
  submitted_at: string;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  review_comments?: string | null;
  required_approver_role?: string | null;
  selected_backup_name?: string | null;
  scenario_status?: string | null;
  roster_id?: number | null;
  impact_summary_note?: string | null;
}

export interface ApprovalStats {
  total_pending: number;
  pending_leaves: number;
  pending_compoffs: number;
  pending_scenarios?: number;
  approved_this_month: number;
  rejected_this_month: number;
}
