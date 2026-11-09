from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.leave import LeaveRequest, CompOff, LeaveType, ApprovalStatus
from app.models.employee import Employee
from app.models.user import UserRole
from app.schemas.leave import (
    LeaveRequestOut, LeaveRequestCreate, LeaveRequestReview,
    CompOffOut, CompOffCreate
)
from app.api.deps import get_current_user, require_roles

router = APIRouter()


def _format_leave(l: LeaveRequest) -> dict:
    return {
        "id": l.id,
        "employee_id": l.employee_id,
        "employee_name": l.employee.full_name if l.employee else "",
        "employee_code": l.employee.employee_code if l.employee else "",
        "employee_pod_name": l.employee.pod.name if (l.employee and l.employee.pod) else None,
        "leave_type": l.leave_type,
        "start_date": l.start_date,
        "end_date": l.end_date,
        "reason": l.reason,
        "status": l.status,
        "reviewed_by_id": l.reviewed_by_id,
        "reviewed_by_name": l.reviewed_by.full_name if l.reviewed_by else None,
        "review_comments": l.review_comments,
        "reviewed_at": l.reviewed_at,
        "created_at": l.created_at,
        "updated_at": l.updated_at,
    }


def _format_compoff(c: CompOff) -> dict:
    return {
        "id": c.id,
        "employee_id": c.employee_id,
        "employee_name": c.employee.full_name if c.employee else "",
        "employee_code": c.employee.employee_code if c.employee else "",
        "earned_date": c.earned_date,
        "reason": c.reason,
        "status": c.status,
        "is_utilized": c.is_utilized,
        "utilized_date": c.utilized_date,
        "created_at": c.created_at,
    }


@router.get("", response_model=List[LeaveRequestOut], summary="List employee leave requests")
def list_leaves(
    employee_id: Optional[int] = None,
    status: Optional[ApprovalStatus] = None,
    pod_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(LeaveRequest)
    
    if employee_id is not None:
        query = query.filter(LeaveRequest.employee_id == employee_id)
    if status is not None:
        query = query.filter(LeaveRequest.status == status)
    if pod_id is not None:
        query = query.join(Employee).filter(Employee.pod_id == pod_id)
        
    leaves = query.order_by(LeaveRequest.start_date.desc()).all()
    return [_format_leave(l) for l in leaves]


@router.post("", response_model=LeaveRequestOut, status_code=status.HTTP_201_CREATED, summary="Submit leave request")
def submit_leave(
    payload: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    emp = db.query(Employee).filter(Employee.id == payload.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="End date cannot precede start date")

    # Creates with default status PENDING
    leave = LeaveRequest(
        employee_id=payload.employee_id,
        leave_type=payload.leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason,
        status=ApprovalStatus.PENDING,
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return _format_leave(leave)


@router.put("/{leave_id}/review", response_model=LeaveRequestOut, summary="Review leave request (Approve/Reject)")
def review_leave(
    leave_id: int,
    payload: LeaveRequestReview,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER, UserRole.POD_LEAD))
):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    leave.status = payload.status
    leave.review_comments = payload.review_comments
    leave.reviewed_by_id = current_user.id
    leave.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(leave)
    return _format_leave(leave)


@router.get("/comp-offs", response_model=List[CompOffOut], summary="List comp-off credit requests and balances")
def list_comp_offs(
    employee_id: Optional[int] = None,
    status: Optional[ApprovalStatus] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(CompOff)
    if employee_id is not None:
        query = query.filter(CompOff.employee_id == employee_id)
    if status is not None:
        query = query.filter(CompOff.status == status)
        
    comp_offs = query.order_by(CompOff.earned_date.desc()).all()
    return [_format_compoff(c) for c in comp_offs]


@router.post("/comp-offs", response_model=CompOffOut, status_code=status.HTTP_201_CREATED, summary="Submit comp-off credit")
def submit_comp_off(
    payload: CompOffCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    emp = db.query(Employee).filter(Employee.id == payload.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    comp = CompOff(
        employee_id=payload.employee_id,
        earned_date=payload.earned_date,
        reason=payload.reason,
        status=ApprovalStatus.PENDING,
    )
    db.add(comp)
    db.commit()
    db.refresh(comp)
    return _format_compoff(comp)


@router.put("/comp-offs/{comp_id}/approve", response_model=CompOffOut, summary="Approve comp-off credit")
def approve_comp_off(
    comp_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER, UserRole.POD_LEAD))
):
    comp = db.query(CompOff).filter(CompOff.id == comp_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Comp-off credit not found")

    comp.status = ApprovalStatus.APPROVED
    comp.reviewed_by_id = current_user.id
    db.commit()
    db.refresh(comp)
    return _format_compoff(comp)
