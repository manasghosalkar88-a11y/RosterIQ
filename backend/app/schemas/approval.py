from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.leave import ApprovalStatus, LeaveType


class ApprovalItemResponse(BaseModel):
    id: int
    item_type: str  # "LEAVE", "COMPOFF"
    employee_id: int
    employee_name: str
    employee_code: str
    pod_id: Optional[int] = None
    pod_name: str
    request_type: str
    date_range: str
    reason: str
    status: ApprovalStatus
    submitted_at: datetime
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_comments: Optional[str] = None


class ApprovalReviewRequest(BaseModel):
    status: ApprovalStatus
    review_comments: Optional[str] = None


class BatchApprovalRequest(BaseModel):
    leave_ids: List[int] = []
    comp_off_ids: List[int] = []
    decision: ApprovalStatus  # APPROVED or REJECTED
    comments: Optional[str] = None


class ApprovalStatsResponse(BaseModel):
    total_pending: int
    pending_leaves: int
    pending_compoffs: int
    approved_this_month: int
    rejected_this_month: int
