from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.leave import ApprovalStatus, LeaveType


class ApprovalItemResponse(BaseModel):
    id: int
    item_type: str  # "LEAVE", "COMPOFF", "SIMULATION_SCENARIO"
    employee_id: Optional[int] = None
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
    required_approver_role: Optional[str] = None
    selected_backup_name: Optional[str] = None
    scenario_status: Optional[str] = None
    roster_id: Optional[int] = None
    impact_summary_note: Optional[str] = None


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
    pending_scenarios: int = 0
    approved_this_month: int
    rejected_this_month: int
