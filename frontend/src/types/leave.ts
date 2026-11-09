export type LeaveType = 'CASUAL' | 'SICK' | 'PLANNED' | 'COMP_OFF' | 'EMERGENCY';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveRequest {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  employee_pod_name?: string | null;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason?: string | null;
  status: ApprovalStatus;
  reviewed_by_id?: number | null;
  reviewed_by_name?: string | null;
  review_comments?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface CompOff {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  earned_date: string;
  reason?: string | null;
  status: ApprovalStatus;
  is_utilized: number;
  utilized_date?: string | null;
  created_at: string;
}

export interface PublicHoliday {
  id: number;
  date: string;
  name: string;
  description?: string | null;
  is_national: boolean;
  brand_id?: number | null;
  brand_name?: string | null;
}
