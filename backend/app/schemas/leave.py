from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from app.models.leave import LeaveType, ApprovalStatus


class LeaveRequestBase(BaseModel):
    employee_id: int
    leave_type: LeaveType = LeaveType.PLANNED
    start_date: date
    end_date: date
    reason: Optional[str] = None


class LeaveRequestCreate(LeaveRequestBase):
    pass


class LeaveRequestReview(BaseModel):
    status: ApprovalStatus  # APPROVED or REJECTED
    review_comments: Optional[str] = None


class LeaveRequestOut(LeaveRequestBase):
    id: int
    employee_name: str
    employee_code: str
    employee_pod_name: Optional[str] = None
    status: ApprovalStatus
    reviewed_by_id: Optional[int] = None
    reviewed_by_name: Optional[str] = None
    review_comments: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CompOffBase(BaseModel):
    employee_id: int
    earned_date: date
    reason: Optional[str] = None


class CompOffCreate(CompOffBase):
    pass


class CompOffOut(CompOffBase):
    id: int
    employee_name: str
    employee_code: str
    status: ApprovalStatus
    is_utilized: int
    utilized_date: Optional[date] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
