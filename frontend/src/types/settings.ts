export interface SystemSettings {
  company_name: string;
  default_shift_start: string;
  default_shift_end: string;
  max_consecutive_days: number;
  single_resource_threshold: number;
  auto_resolve_on_override: boolean;
  version: string;
  environment: string;
  database_status: string;
  table_counts: { [key: string]: number };
}

export interface SystemDiagnostics {
  status: string;
  database_connected: boolean;
  database_latency_ms: number;
  total_records: number;
  active_users: number;
  total_tables: number;
  uptime_seconds: number;
}
