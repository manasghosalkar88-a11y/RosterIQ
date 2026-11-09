from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.employee import EmploymentStatus
from app.models.allocation import AssignmentType


class EmployeeAssignmentSummary(BaseModel):
    id: int
    brand_id: int
    brand_name: str
    brand_code: str
    process_id: int
    process_name: str
    process_code: str
    assignment_type: AssignmentType


class EmployeeBase(BaseModel):
    employee_code: str
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    designation: str
    pod_id: Optional[int] = None
    joining_date: Optional[date] = None
    employment_status: EmploymentStatus = EmploymentStatus.ACTIVE
    default_off_pref: str = "Sunday"
    max_consecutive_days: int = 6
    is_active: bool = True
    notes: Optional[str] = None


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    pod_id: Optional[int] = None
    joining_date: Optional[date] = None
    employment_status: Optional[EmploymentStatus] = None
    default_off_pref: Optional[str] = None
    max_consecutive_days: Optional[int] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class EmployeeOut(EmployeeBase):
    id: int
    pod_name: Optional[str] = None
    assigned_brands: List[EmployeeAssignmentSummary] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
