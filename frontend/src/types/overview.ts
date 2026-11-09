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
