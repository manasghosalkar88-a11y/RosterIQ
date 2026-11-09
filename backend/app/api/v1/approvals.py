import json
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.api.deps import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.employee import Employee
from app.models.pod import Pod
from app.models.leave import LeaveRequest, CompOff, ApprovalStatus
from app.models.roster import Roster, RosterEntry, ShiftStatus
from app.models.audit import AuditLog
from app.schemas.approval import (
    ApprovalItemResponse,
    ApprovalReviewRequest,
    BatchApprovalRequest,
    ApprovalStatsResponse,
)

router = APIRouter(prefix="/approvals", tags=["Approvals Workflow & Governance"])


def _get_pod_lead_pod_id(db: Session, user: User) -> Optional[int]:
    """If user is a Pod Lead, returns their assigned pod ID."""
    if user.role == UserRole.POD_LEAD:
        pod = db.query(Pod).filter(Pod.lead_id == user.id).first()
        return pod.id if pod else None
    return None


@router.get("/pending", response_model=List[ApprovalItemResponse])
def get_pending_approvals(
    pod_id: Optional[int] = Query(None, description="Filter by Pod ID"),
    item_type: Optional[str] = Query(None, description="LEAVE or COMPOFF"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER, UserRole.POD_LEAD)),
):
    """
    Returns all pending approval requests across leaves and comp-off claims.
    Automatically scoped to Pod Lead's pod if logged in as Pod Lead.
    """
    lead_pod_id = _get_pod_lead_pod_id(db, current_user)
    effective_pod_id = lead_pod_id if lead_pod_id is not None else pod_id

    items: List[ApprovalItemResponse] = []

    # 1. Fetch pending leaves
    if item_type in [None, "LEAVE"]:
        leave_q = db.query(LeaveRequest).join(Employee).filter(LeaveRequest.status == ApprovalStatus.PENDING)
        if effective_pod_id:
            leave_q = leave_q.filter(Employee.pod_id == effective_pod_id)
        leaves = leave_q.order_by(desc(LeaveRequest.created_at)).all()

        for l in leaves:
            items.append(ApprovalItemResponse(
                id=l.id,
                item_type="LEAVE",
                employee_id=l.employee_id,
                employee_name=l.employee.full_name if l.employee else "Employee",
                employee_code=l.employee.employee_code if l.employee else "EMP",
                pod_id=l.employee.pod_id if l.employee else None,
                pod_name=l.employee.pod.name if l.employee and l.employee.pod else "General",
                request_type=l.leave_type.value if hasattr(l.leave_type, "value") else str(l.leave_type),
                date_range=f"{l.start_date.isoformat()} → {l.end_date.isoformat()}",
                reason=l.reason or "No justification provided",
                status=l.status,
                submitted_at=l.created_at,
            ))

    # 2. Fetch pending comp-offs
    if item_type in [None, "COMPOFF"]:
        comp_q = db.query(CompOff).join(Employee).filter(CompOff.status == ApprovalStatus.PENDING)
        if effective_pod_id:
            comp_q = comp_q.filter(Employee.pod_id == effective_pod_id)
        comps = comp_q.order_by(desc(CompOff.created_at)).all()

        for c in comps:
            items.append(ApprovalItemResponse(
                id=c.id,
                item_type="COMPOFF",
                employee_id=c.employee_id,
                employee_name=c.employee.full_name if c.employee else "Employee",
                employee_code=c.employee.employee_code if c.employee else "EMP",
                pod_id=c.employee.pod_id if c.employee else None,
                pod_name=c.employee.pod.name if c.employee and c.employee.pod else "General",
                request_type="Compensatory Credit",
                date_range=f"Earned on {c.earned_date.isoformat()}",
                reason=c.reason or "Overtime/Holiday Shift Work",
                status=c.status,
                submitted_at=c.created_at,
            ))

    items.sort(key=lambda x: x.submitted_at, reverse=True)
    return items


@router.get("/history", response_model=List[ApprovalItemResponse])
def get_approval_history(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER, UserRole.POD_LEAD)),
):
    """
    Returns past reviewed approvals (Approved or Rejected).
    """
    lead_pod_id = _get_pod_lead_pod_id(db, current_user)
    items: List[ApprovalItemResponse] = []

    # Resolved leaves
    l_q = db.query(LeaveRequest).join(Employee).filter(LeaveRequest.status != ApprovalStatus.PENDING)
    if lead_pod_id:
        l_q = l_q.filter(Employee.pod_id == lead_pod_id)
    leaves = l_q.order_by(desc(LeaveRequest.reviewed_at)).limit(limit).all()

    for l in leaves:
        items.append(ApprovalItemResponse(
            id=l.id,
            item_type="LEAVE",
            employee_id=l.employee_id,
            employee_name=l.employee.full_name if l.employee else "Employee",
            employee_code=l.employee.employee_code if l.employee else "EMP",
            pod_id=l.employee.pod_id if l.employee else None,
            pod_name=l.employee.pod.name if l.employee and l.employee.pod else "General",
            request_type=l.leave_type.value if hasattr(l.leave_type, "value") else str(l.leave_type),
            date_range=f"{l.start_date.isoformat()} → {l.end_date.isoformat()}",
            reason=l.reason or "No justification provided",
            status=l.status,
            submitted_at=l.created_at,
            reviewed_by_name=l.reviewed_by.full_name if l.reviewed_by else "Manager",
            reviewed_at=l.reviewed_at,
            review_comments=l.review_comments,
        ))

    items.sort(key=lambda x: x.reviewed_at or x.submitted_at, reverse=True)
    return items[:limit]


@router.get("/stats", response_model=ApprovalStatsResponse)
def get_approval_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Aggregates pending approvals, approved counts, and rejection rates.
    """
    lead_pod_id = _get_pod_lead_pod_id(db, current_user)

    leave_q = db.query(LeaveRequest).join(Employee)
    comp_q = db.query(CompOff).join(Employee)

    if lead_pod_id:
        leave_q = leave_q.filter(Employee.pod_id == lead_pod_id)
        comp_q = comp_q.filter(Employee.pod_id == lead_pod_id)

    pending_leaves = leave_q.filter(LeaveRequest.status == ApprovalStatus.PENDING).count()
    pending_comps = comp_q.filter(CompOff.status == ApprovalStatus.PENDING).count()

    approved_count = leave_q.filter(LeaveRequest.status == ApprovalStatus.APPROVED).count() + \
                     comp_q.filter(CompOff.status == ApprovalStatus.APPROVED).count()

    rejected_count = leave_q.filter(LeaveRequest.status == ApprovalStatus.REJECTED).count() + \
                     comp_q.filter(CompOff.status == ApprovalStatus.REJECTED).count()

    return ApprovalStatsResponse(
        total_pending=pending_leaves + pending_comps,
        pending_leaves=pending_leaves,
        pending_compoffs=pending_comps,
        approved_this_month=approved_count,
        rejected_this_month=rejected_count,
    )


@router.put("/leave/{leave_id}")
def review_leave(
    leave_id: int,
    req: ApprovalReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER, UserRole.POD_LEAD)),
):
    """
    Reviews a pending leave request (Approved or Rejected).
    If approved, automatically adjusts existing roster entries to LEAVE status.
    """
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found.")

    leave.status = req.status
    leave.reviewed_by_id = current_user.id
    leave.review_comments = req.review_comments or f"Decision applied by {current_user.full_name}"
    leave.reviewed_at = datetime.utcnow()

    # If approved, update active roster entries for this employee to LEAVE
    if req.status == ApprovalStatus.APPROVED:
        # Check active roster entries
        entries = db.query(RosterEntry).filter(
            RosterEntry.employee_id == leave.employee_id,
            RosterEntry.date >= leave.start_date,
            RosterEntry.date <= leave.end_date,
        ).all()
        for e in entries:
            e.status = ShiftStatus.LEAVE
            e.is_manual_override = True
            e.override_reason = f"Approved {leave.leave_type}: {leave.reason}"

    # Add audit log
    audit = AuditLog(
        user_id=current_user.id,
        action=f"LEAVE_{req.status.value}",
        entity_type="LEAVE_REQUEST",
        entity_id=leave.id,
        change_details=json.dumps({
            "employee_id": leave.employee_id,
            "status": req.status.value,
            "dates": f"{leave.start_date} → {leave.end_date}",
            "comments": leave.review_comments,
        }),
    )
    db.add(audit)
    db.commit()
    db.refresh(leave)

    return {"message": f"Leave request #{leave_id} successfully marked as {req.status.value}."}


@router.put("/compoff/{comp_id}")
def review_compoff(
    comp_id: int,
    req: ApprovalReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER, UserRole.POD_LEAD)),
):
    """
    Reviews a pending compensatory off credit claim.
    """
    comp = db.query(CompOff).filter(CompOff.id == comp_id).first()
    if not comp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comp-off record not found.")

    comp.status = req.status
    comp.approved_by_id = current_user.id

    audit = AuditLog(
        user_id=current_user.id,
        action=f"COMPOFF_{req.status.value}",
        entity_type="COMP_OFF",
        entity_id=comp.id,
        change_details=json.dumps({
            "employee_id": comp.employee_id,
            "status": req.status.value,
            "earned_date": comp.earned_date.isoformat(),
        }),
    )
    db.add(audit)
    db.commit()

    return {"message": f"Comp-off #{comp_id} successfully marked as {req.status.value}."}


@router.post("/batch")
def batch_review_approvals(
    req: BatchApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER, UserRole.POD_LEAD)),
):
    """
    Batch approves or rejects multiple leave and comp-off requests in one click.
    """
    processed_leaves = 0
    processed_comps = 0

    if req.leave_ids:
        leaves = db.query(LeaveRequest).filter(
            LeaveRequest.id.in_(req.leave_ids),
            LeaveRequest.status == ApprovalStatus.PENDING,
        ).all()
        for l in leaves:
            l.status = req.decision
            l.reviewed_by_id = current_user.id
            l.review_comments = req.comments or f"Batch decision by {current_user.full_name}"
            l.reviewed_at = datetime.utcnow()
            processed_leaves += 1

    if req.comp_off_ids:
        comps = db.query(CompOff).filter(
            CompOff.id.in_(req.comp_off_ids),
            CompOff.status == ApprovalStatus.PENDING,
        ).all()
        for c in comps:
            c.status = req.decision
            c.approved_by_id = current_user.id
            processed_comps += 1

    # Record batch audit log
    audit = AuditLog(
        user_id=current_user.id,
        action=f"BATCH_{req.decision.value}",
        entity_type="APPROVAL_BATCH",
        change_details=json.dumps({
            "decision": req.decision.value,
            "leaves_count": processed_leaves,
            "compoffs_count": processed_comps,
            "comments": req.comments,
        }),
    )
    db.add(audit)
    db.commit()

    return {
        "message": f"Batch process completed. {processed_leaves} leave(s) and {processed_comps} comp-off(s) marked as {req.decision.value}.",
        "processed_leaves": processed_leaves,
        "processed_comps": processed_comps,
    }
