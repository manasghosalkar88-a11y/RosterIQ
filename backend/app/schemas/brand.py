from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.operating_rule import OperatingRuleType


class BrandProcessRuleBase(BaseModel):
    process_id: int
    rule_type: OperatingRuleType = OperatingRuleType.EXCEPT_SUNDAYS_AND_HOLIDAYS
    min_headcount: int = 1
    operates_monday: bool = True
    operates_tuesday: bool = True
    operates_wednesday: bool = True
    operates_thursday: bool = True
    operates_friday: bool = True
    operates_saturday: bool = True
    operates_sunday: bool = False
    operates_holidays: bool = False
    shift_start_time: str = "09:00"
    shift_end_time: str = "18:00"
    notes: Optional[str] = None


class BrandProcessRuleOut(BrandProcessRuleBase):
    id: int
    brand_id: int
    process_name: Optional[str] = None
    process_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class BrandBase(BaseModel):
    code: str
    name: str
    client_name: Optional[str] = None
    pod_id: Optional[int] = None
    is_active: bool = True
    notes: Optional[str] = None


class BrandCreate(BrandBase):
    rules: Optional[List[BrandProcessRuleBase]] = None


class BrandUpdate(BaseModel):
    name: Optional[str] = None
    client_name: Optional[str] = None
    pod_id: Optional[int] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class BrandEmployeeSummary(BaseModel):
    id: int
    employee_code: str
    full_name: str
    designation: str
    assignment_type: str
    process_name: str


class BrandOut(BrandBase):
    id: int
    pod_name: Optional[str] = None
    process_rules: List[BrandProcessRuleOut] = []
    assigned_employees: List[BrandEmployeeSummary] = []
    assigned_count: int = 0
    is_single_resource: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
