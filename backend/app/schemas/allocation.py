from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.allocation import AssignmentType
from app.models.operating_rule import OperatingRuleType


class AllocationBase(BaseModel):
    employee_id: int
    brand_id: int
    process_id: int
    assignment_type: AssignmentType = AssignmentType.PRIMARY
    is_active: bool = True


class AllocationCreate(AllocationBase):
    pass


class AllocationUpdate(BaseModel):
    assignment_type: Optional[AssignmentType] = None
    is_active: Optional[bool] = None


class AllocationOut(AllocationBase):
    id: int
    employee_name: str
    employee_code: str
    employee_pod_name: Optional[str] = None
    brand_name: str
    brand_code: str
    process_name: str
    process_code: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MatrixCell(BaseModel):
    allocation_id: int
    brand_id: int
    brand_name: str
    brand_code: str
    process_id: int
    process_name: str
    process_code: str
    assignment_type: AssignmentType


class EmployeeMatrixRow(BaseModel):
    employee_id: int
    employee_code: str
    full_name: str
    designation: str
    pod_id: Optional[int] = None
    pod_name: Optional[str] = None
    default_off_pref: str
    primary_brand_count: int
    backup_brand_count: int
    assignments: List[MatrixCell]


class OperatingRuleUpdate(BaseModel):
    rule_type: Optional[OperatingRuleType] = None
    min_headcount: Optional[int] = None
    operates_monday: Optional[bool] = None
    operates_tuesday: Optional[bool] = None
    operates_wednesday: Optional[bool] = None
    operates_thursday: Optional[bool] = None
    operates_friday: Optional[bool] = None
    operates_saturday: Optional[bool] = None
    operates_sunday: Optional[bool] = None
    operates_holidays: Optional[bool] = None
    shift_start_time: Optional[str] = None
    shift_end_time: Optional[str] = None
    notes: Optional[str] = None
