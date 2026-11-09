export interface Pod {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  pod_lead_id?: number | null;
  lead?: {
    id: number;
    employee_code: string;
    full_name: string;
    email: string;
    designation: string;
  } | null;
  employee_count: number;
  brand_count: number;
  is_active: boolean;
}

export interface Process {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
}

export interface BrandProcessRule {
  id: number;
  brand_id: number;
  process_id: number;
  process_name?: string;
  process_code?: string;
  rule_type: 'EVERY_DAY_365' | 'EXCEPT_PUBLIC_HOLIDAYS' | 'EXCEPT_SUNDAYS_AND_HOLIDAYS' | 'CUSTOM';
  min_headcount: number;
  operates_monday: boolean;
  operates_tuesday: boolean;
  operates_wednesday: boolean;
  operates_thursday: boolean;
  operates_friday: boolean;
  operates_saturday: boolean;
  operates_sunday: boolean;
  operates_holidays: boolean;
  shift_start_time: string;
  shift_end_time: string;
  notes?: string | null;
}

export interface BrandAssignedEmployee {
  id: number;
  employee_code: string;
  full_name: string;
  designation: string;
  assignment_type: 'PRIMARY' | 'SECONDARY' | 'BACKUP';
  process_name: string;
}

export interface Brand {
  id: number;
  code: string;
  name: string;
  client_name?: string | null;
  pod_id?: number | null;
  pod_name?: string | null;
  is_active: boolean;
  notes?: string | null;
  process_rules: BrandProcessRule[];
  assigned_employees: BrandAssignedEmployee[];
  assigned_count: number;
  is_single_resource: boolean;
}

export interface EmployeeAssignment {
  id: number;
  brand_id: number;
  brand_name: string;
  brand_code: string;
  process_id: number;
  process_name: string;
  process_code: string;
  assignment_type: 'PRIMARY' | 'SECONDARY' | 'BACKUP';
}

export interface Employee {
  id: number;
  employee_code: string;
  full_name: string;
  email: string;
  phone?: string | null;
  designation: string;
  pod_id?: number | null;
  pod_name?: string | null;
  joining_date?: string | null;
  employment_status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
  default_off_pref: string;
  max_consecutive_days: number;
  is_active: boolean;
  notes?: string | null;
  assigned_brands: EmployeeAssignment[];
}
