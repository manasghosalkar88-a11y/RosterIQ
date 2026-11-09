from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel


class EmployeeWorkingItem(BaseModel):
    employee_id: int
    employee_name: str
    employee_code: str
    pod_name: str
    brand_name: str
    process_name: str
    shift_hours: str


class EmployeeLeaveItem(BaseModel):
    employee_id: int
    employee_name: str
    employee_code: str
    pod_name: str
    leave_type: str
    start_date: str
    end_date: str
    reason: str


class UpcomingHolidayItem(BaseModel):
    date: str
    name: str
    day_name: str


class CriticalAlertItem(BaseModel):
    conflict_id: int
    date: str
    brand_name: str
    process_name: str
    title: str
    description: str
    severity: str


class RecentChangeItem(BaseModel):
    id: int
    action: str
    user_name: str
    change_details: str
    timestamp: datetime


class OverviewKPIs(BaseModel):
    total_employees: int
    active_brands: int
    active_processes: int
    total_pods: int
    working_today: int
    on_leave_today: int
    coverage_percentage: float
    unresolved_conflicts: int


class TodayWorkforceStatus(BaseModel):
    date: str
    day_name: str
    working_count: int
    leave_count: int
    weekly_off_count: int
    working_sample: List[EmployeeWorkingItem] = []
    leave_sample: List[EmployeeLeaveItem] = []


class OverviewDashboardResponse(BaseModel):
    kpis: OverviewKPIs
    today_status: TodayWorkforceStatus
    upcoming_leaves: List[EmployeeLeaveItem]
    critical_alerts: List[CriticalAlertItem]
    recent_changes: List[RecentChangeItem]
    upcoming_holidays: List[UpcomingHolidayItem]
    pending_approvals_count: int
