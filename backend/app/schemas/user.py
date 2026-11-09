from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.EMPLOYEE
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class EmployeeProfileOut(BaseModel):
    id: int
    employee_code: str
    designation: str
    pod_id: Optional[int] = None
    default_off_pref: str

    model_config = ConfigDict(from_attributes=True)


class UserOut(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    employee_profile: Optional[EmployeeProfileOut] = None

    model_config = ConfigDict(from_attributes=True)
