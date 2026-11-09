from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class SystemSettingsResponse(BaseModel):
    company_name: str
    default_shift_start: str
    default_shift_end: str
    max_consecutive_days: int
    single_resource_threshold: int
    auto_resolve_on_override: bool
    version: str
    environment: str
    database_status: str
    table_counts: Dict[str, int]


class SystemSettingsUpdateRequest(BaseModel):
    company_name: Optional[str] = None
    default_shift_start: Optional[str] = None
    default_shift_end: Optional[str] = None
    max_consecutive_days: Optional[int] = Field(None, ge=4, le=14)
    auto_resolve_on_override: Optional[bool] = None


class SystemDiagnosticsResponse(BaseModel):
    status: str
    database_connected: bool
    database_latency_ms: float
    total_records: int
    active_users: int
    total_tables: int
    uptime_seconds: float
