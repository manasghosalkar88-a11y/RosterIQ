export type UserRole = 'SUPER_ADMIN' | 'OPS_MANAGER' | 'POD_LEAD' | 'EMPLOYEE';

export interface EmployeeProfile {
  id: number;
  employee_code: string;
  designation: string;
  pod_id?: number | null;
  default_off_pref: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  employee_profile?: EmployeeProfile | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
