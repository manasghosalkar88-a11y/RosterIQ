import json
from datetime import datetime, date, timedelta
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
from app.models.simulation import SimulationScenario, ScenarioStatus
from app.models.audit import AuditLog
from app.models.notification import Notification
from app.engine.change_manager import ChangeManager
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
        emp = db.query(Employee).filter(Employee.user_id == user.id).first()
        if emp and emp.pod_id:
            return emp.pod_id
        if emp:
            pod = db.query(Pod).filter(Pod.pod_lead_id == emp.id).first()
            return pod.id if pod else None
    return None


def _scenario_to_approval_item(db: Session, scenario: SimulationScenario) -> ApprovalItemResponse:
    params = json.loads(scenario.parameters_json) if scenario.parameters_json else {}
    impact = json.loads(scenario.impact_summary_json) if scenario.impact_summary_json else {}

    src_emp_id = params.get("employee_id") or scenario.selected_backup_employee_id
    src_emp = db.query(Employee).filter(Employee.id == src_emp_id).first() if src_emp_id else None
    backup_emp = scenario.selected_backup_employee
    if not backup_emp and scenario.selected_backup_employee_id:
        backup_emp = db.query(Employee).filter(Employee.id == scenario.selected_backup_employee_id).first()

    start_str = params.get("start_date", "")
    end_str = params.get("end_date") or start_str
    date_range = f"{start_str} → {end_str}" if end_str and end_str != start_str else (start_str or "Scheduled Range")

    mapped_status = ApprovalStatus.PENDING
    if scenario.status in [ScenarioStatus.APPROVED, ScenarioStatus.APPLIED]:
        mapped_status = ApprovalStatus.APPROVED
    elif scenario.status == ScenarioStatus.REJECTED:
        mapped_status = ApprovalStatus.REJECTED

    cov_before = impact.get("coverage_before")
    cov_after = impact.get("coverage_after")
    impact_note = impact.get("executive_summary")
    if cov_before is not None and cov_after is not None:
        impact_note = f"Coverage {cov_before}% → {cov_after}%. {impact_note or ''}".strip()

    sim_type = scenario.simulation_type.value if hasattr(scenario.simulation_type, "value") else str(scenario.simulation_type)
    sc_status = scenario.status.value if hasattr(scenario.status, "value") else str(scenario.status)

    return ApprovalItemResponse(
        id=scenario.id,
        item_type="SIMULATION_SCENARIO",
        employee_id=src_emp.id if src_emp else None,
        employee_name=scenario.name,
        employee_code=f"SIM-{scenario.id}",
        pod_id=src_emp.pod_id if src_emp else None,
        pod_name=src_emp.pod.name if src_emp and src_emp.pod else "Cross-Pod / Governance",
        request_type=f"{sim_type.replace('_', ' ')} ({scenario.required_approver_role or 'OPS_MANAGER'})",
        date_range=date_range,
        reason=scenario.description or params.get("reason") or f"Roster simulation scenario submitted by {scenario.created_by.full_name if scenario.created_by else 'Planner'}",
        status=mapped_status,
        submitted_at=scenario.created_at,
        reviewed_by_name=scenario.reviewed_by.full_name if scenario.reviewed_by else None,
        reviewed_at=scenario.reviewed_at,
        review_comments=scenario.review_comments,
        required_approver_role=scenario.required_approver_role,
        selected_backup_name=backup_emp.full_name if backup_emp else None,
        scenario_status=sc_status,
        roster_id=scenario.roster_id,
        impact_summary_note=impact_note,
    )


@router.get("/pending", response_model=List[ApprovalItemResponse])
def get_pending_approvals(
    pod_id: Optional[int] = Query(None, description="Filter by Pod ID"),
    item_type: Optional[str] = Query(None, description="LEAVE, COMPOFF, or SIMULATION_SCENARIO"),
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

    # 3. Fetch pending simulation scenarios requiring approval
    if item_type in [None, "SIMULATION_SCENARIO"]:
        pending_scenarios = (
            db.query(SimulationScenario)
            .filter(SimulationScenario.status == ScenarioStatus.PENDING_APPROVAL)
            .order_by(desc(SimulationScenario.created_at))
            .all()
        )
        for s in pending_scenarios:
            item = _scenario_to_approval_item(db, s)
            if effective_pod_id and item.pod_id and item.pod_id != effective_pod_id:
                continue
            items.append(item)

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

    reviewed_scenarios = (
        db.query(SimulationScenario)
        .filter(
            SimulationScenario.status.in_([
                ScenarioStatus.APPROVED,
                ScenarioStatus.REJECTED,
                ScenarioStatus.APPLIED,
            ])
        )
        .order_by(desc(SimulationScenario.reviewed_at), desc(SimulationScenario.updated_at))
        .limit(limit)
        .all()
    )
    for s in reviewed_scenarios:
        if s.requires_approval or s.reviewed_at is not None or s.status in [ScenarioStatus.APPROVED, ScenarioStatus.REJECTED]:
            item = _scenario_to_approval_item(db, s)
            if lead_pod_id and item.pod_id and item.pod_id != lead_pod_id:
                continue
            items.append(item)

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
    pending_scenarios = db.query(SimulationScenario).filter(
        SimulationScenario.status == ScenarioStatus.PENDING_APPROVAL
    ).count()

    approved_scenarios = db.query(SimulationScenario).filter(
        SimulationScenario.status.in_([ScenarioStatus.APPROVED, ScenarioStatus.APPLIED]),
        SimulationScenario.requires_approval == True,
    ).count()
    rejected_scenarios = db.query(SimulationScenario).filter(
        SimulationScenario.status == ScenarioStatus.REJECTED
    ).count()

    approved_count = (
        leave_q.filter(LeaveRequest.status == ApprovalStatus.APPROVED).count()
        + comp_q.filter(CompOff.status == ApprovalStatus.APPROVED).count()
        + approved_scenarios
    )

    rejected_count = (
        leave_q.filter(LeaveRequest.status == ApprovalStatus.REJECTED).count()
        + comp_q.filter(CompOff.status == ApprovalStatus.REJECTED).count()
        + rejected_scenarios
    )

    return ApprovalStatsResponse(
        total_pending=pending_leaves + pending_comps + pending_scenarios,
        pending_leaves=pending_leaves,
        pending_compoffs=pending_comps,
        pending_scenarios=pending_scenarios,
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
    comp.reviewed_by_id = current_user.id

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
            c.reviewed_by_id = current_user.id
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


@router.put("/scenario/{scenario_id}")
def review_simulation_scenario(
    scenario_id: int,
    req: ApprovalReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER, UserRole.POD_LEAD)),
):
    """
    Approves or rejects a saved SimulationScenario pending approval.
    Enforces required_approver_role governance and revalidates live candidate eligibility upon approval.
    """
    scenario = db.query(SimulationScenario).filter(SimulationScenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation scenario not found.")

    if scenario.status != ScenarioStatus.PENDING_APPROVAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Scenario #{scenario_id} is not pending approval (current status: {scenario.status.value}).",
        )

    if current_user.role == UserRole.POD_LEAD:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pod Leads cannot approve escalated roster scenarios. Ops Manager or Super Admin approval required.",
        )

    if scenario.required_approver_role == UserRole.SUPER_ADMIN.value and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This cross-pod or escalated roster scenario requires SUPER_ADMIN approval.",
        )

    params = json.loads(scenario.parameters_json) if scenario.parameters_json else {}

    if req.status == ApprovalStatus.APPROVED:
        if scenario.selected_backup_employee_id:
            start_val = params.get("start_date")
            end_val = params.get("end_date") or start_val
            s_date = datetime.fromisoformat(start_val).date() if isinstance(start_val, str) else start_val
            e_date = datetime.fromisoformat(end_val).date() if isinstance(end_val, str) else end_val
            target_dates: List[date] = []
            curr = s_date
            while curr and e_date and curr <= e_date:
                target_dates.append(curr)
                curr += timedelta(days=1)

            brand_id = params.get("brand_id")
            if not brand_id and params.get("employee_id"):
                from app.models.employee import EmployeeBrandAssignment
                assign = db.query(EmployeeBrandAssignment).filter(
                    EmployeeBrandAssignment.employee_id == params.get("employee_id")
                ).first()
                brand_id = assign.brand_id if assign else 1

            is_valid, fail_reason, _ = ChangeManager.validate_candidate_eligibility(
                db=db,
                candidate_id=scenario.selected_backup_employee_id,
                target_dates=target_dates,
                brand_id=brand_id or 1,
                process_id=params.get("process_id"),
                absent_employee_id=params.get("employee_id"),
                roster_id=scenario.roster_id,
            )
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot approve scenario: selected backup is no longer eligible ({fail_reason}).",
                )

        scenario.status = ScenarioStatus.APPROVED
    elif req.status == ApprovalStatus.REJECTED:
        scenario.status = ScenarioStatus.REJECTED
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Approval decision must be APPROVED or REJECTED.",
        )

    scenario.reviewed_by_id = current_user.id
    scenario.reviewed_at = datetime.utcnow()
    scenario.review_comments = req.review_comments or f"Decision applied by {current_user.full_name}"

    audit = AuditLog(
        user_id=current_user.id,
        action=f"SCENARIO_{req.status.value}",
        entity_type="SimulationScenario",
        entity_id=scenario.id,
        change_details=json.dumps({
            "scenario_id": scenario.id,
            "scenario_name": scenario.name,
            "decision": req.status.value,
            "selected_backup_employee_id": scenario.selected_backup_employee_id,
            "required_approver_role": scenario.required_approver_role,
            "comments": scenario.review_comments,
        }),
    )
    db.add(audit)

    if scenario.created_by_id:
        db.add(Notification(
            user_id=scenario.created_by_id,
            title=f"Simulation Scenario {req.status.value.title()}",
            message=f"Scenario '{scenario.name}' was {req.status.value.lower()} by {current_user.full_name}.",
            notification_type="SUCCESS" if req.status == ApprovalStatus.APPROVED else "WARNING",
            link_url="/planner",
            is_read=False,
        ))

    db.commit()
    db.refresh(scenario)

    return {
        "message": f"Simulation scenario #{scenario_id} marked as {scenario.status.value}.",
        "scenario_id": scenario.id,
        "status": scenario.status.value,
    }
