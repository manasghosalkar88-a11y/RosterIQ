export interface EmployeeWorkingItem {
  employee_id: number;
  employee_name: string;
  employee_code: string;
  pod_name: string;
  brand_name: string;
  process_name: string;
  shift_hours: string;
}

export interface EmployeeLeaveItem {
  employee_id: number;
  employee_name: string;
  employee_code: string;
  pod_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
}

export interface UpcomingHolidayItem {
  date: string;
  name: string;
  day_name: string;
}

export interface CriticalAlertItem {
  conflict_id: number;
  date: string;
  brand_name: string;
  process_name: string;
  title: string;
  description: string;
  severity: string;
}

export interface RecentChangeItem {
  id: number;
  action: string;
  user_name: string;
  change_details: string;
  timestamp: string;
}

export interface OverviewKPIs {
  total_employees: number;
  active_brands: number;
  active_processes: number;
  total_pods: number;
  working_today: number;
  on_leave_today: number;
  coverage_percentage: number;
  unresolved_conflicts: number;
}

export interface TodayWorkforceStatus {
  date: string;
  day_name: string;
  working_count: number;
  leave_count: number;
  weekly_off_count: number;
  working_sample: EmployeeWorkingItem[];
  leave_sample: EmployeeLeaveItem[];
}

export interface OverviewDashboardResponse {
  kpis: OverviewKPIs;
  today_status: TodayWorkforceStatus;
  upcoming_leaves: EmployeeLeaveItem[];
  critical_alerts: CriticalAlertItem[];
  recent_changes: RecentChangeItem[];
  upcoming_holidays: UpcomingHolidayItem[];
  pending_approvals_count: number;
}

export interface NetworkGraphNode {
  id: string;
  name: string;
  type: 'pod' | 'employee' | 'brand' | 'process';
  status: 'NORMAL' | 'WARNING' | 'CONFLICT';
  code?: string;
  pod_id?: number;
  pod_name?: string;
  designation?: string;
  assigned_brands?: Array<{ id: number; name: string; type: string }>;
  assigned_processes?: Array<{ id: number; code: string; name: string }>;
  assigned_employees?: Array<{ id: number; name: string; type: string }>;
  employee_count?: number;
  brand_count?: number;
  conflict_count: number;
  availability?: string;
  is_single_resource?: boolean;
}

export interface NetworkGraphLink {
  source: string;
  target: string;
  relation: string;
}

export interface NetworkGraphResponse {
  nodes: NetworkGraphNode[];
  links: NetworkGraphLink[];
  pods_count: number;
  employees_count: number;
  brands_count: number;
  processes_count: number;
  conflicts_count: number;
}

