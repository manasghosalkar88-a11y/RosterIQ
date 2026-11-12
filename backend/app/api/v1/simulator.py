import json
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.api.deps import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.roster import Roster
from app.models.employee import Employee
from app.models.audit import AuditLog
from app.models.notification import Notification
from app.models.simulation import SimulationScenario, SimulationType, ScenarioStatus
from app.schemas.simulation import (
    SimulationRequest,
    SimulationResultResponse,
    SaveScenarioRequest,
    ScenarioResponse,
    ApplyScenarioRequest,
    ApplyScenarioResponse,
)
from app.engine.impact_simulator import ImpactSimulator, StaleRosterError, ConflictValidationError

router = APIRouter(prefix="/simulator", tags=["RosterIQ Impact Simulator"])


def _parse_json_field(raw, default=None):
    if raw is None:
        return default
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except Exception:
            return default
    return raw


def _format_scenario(s: SimulationScenario) -> ScenarioResponse:
    return ScenarioResponse(
        id=s.id,
        roster_id=s.roster_id,
        name=s.name,
        description=s.description,
        simulation_type=s.simulation_type.value if hasattr(s.simulation_type, "value") else str(s.simulation_type),
        status=s.status.value if hasattr(s.status, "value") else str(s.status),
        parameters=_parse_json_field(s.parameters_json, {}),
        impact_summary=_parse_json_field(s.impact_summary_json, {}),
        candidate_ranking=_parse_json_field(s.candidate_ranking_json, None),
        selected_backup_employee_id=s.selected_backup_employee_id,
        selected_backup_employee_name=s.selected_backup_employee.full_name if s.selected_backup_employee else None,
        roster_snapshot_hash=s.roster_snapshot_hash,
        requires_approval=bool(s.requires_approval),
        required_approver_role=s.required_approver_role,
        created_by_name=s.created_by.full_name if s.created_by else None,
        reviewed_by_name=s.reviewed_by.full_name if s.reviewed_by else None,
        review_comments=s.review_comments,
        reviewed_at=s.reviewed_at,
        applied_by_name=s.applied_by.full_name if s.applied_by else None,
        created_at=s.created_at,
        applied_at=s.applied_at,
    )


@router.post("/simulate", response_model=SimulationResultResponse, summary="Run in-memory operational impact simulation")
def run_simulation(
    req: SimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Executes a deterministic, in-memory simulation of proposed roster changes.
    Does NOT modify live database records until confirmed.
    """
    try:
        return ImpactSimulator.simulate(db, req)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Simulation error: {str(e)}",
        )


@router.post("/apply", response_model=ApplyScenarioResponse, summary="Directly apply simulation to live roster")
def apply_simulation_directly(
    req: SimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER)),
):
    """
    Revalidates and commits a simulation scenario to the live monthly roster.
    Blocks direct application if escalated approval is required or live roster became stale.
    """
    try:
        res = ImpactSimulator.apply_simulation(
            db=db,
            req=req,
            user_id=current_user.id,
            reason=req.reason or f"Impact Simulator applied by {current_user.full_name}",
            expected_snapshot_hash=req.expected_snapshot_hash,
            applied_by_user=current_user,
        )
        return ApplyScenarioResponse(**res)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except StaleRosterError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except (ConflictValidationError, ValueError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/scenarios", response_model=ScenarioResponse, status_code=status.HTTP_201_CREATED, summary="Save scenario for review")
def save_scenario(
    req: SaveScenarioRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER, UserRole.POD_LEAD)),
):
    """
    Validates the simulation scenario, captures impact analysis + candidate ranking snapshot,
    persists to SimulationScenario, records an AuditLog, and routes through Approvals when required.
    """
    roster = db.query(Roster).filter(Roster.id == req.roster_id).first()
    if not roster:
        raise HTTPException(status_code=404, detail="Roster not found")

    if not req.name or not req.name.strip():
        raise HTTPException(status_code=400, detail="Scenario name is required.")

    params = dict(req.parameters or {})
    if "start_date" not in params:
        raise HTTPException(status_code=400, detail="Scenario start_date parameter is required.")

    try:
        parsed_start = (
            datetime.fromisoformat(params["start_date"]).date()
            if isinstance(params["start_date"], str)
            else params["start_date"]
        )
        parsed_end = (
            datetime.fromisoformat(params["end_date"]).date()
            if params.get("end_date") and isinstance(params["end_date"], str)
            else (params.get("end_date") or parsed_start)
        )
        sim_req = SimulationRequest(
            roster_id=req.roster_id,
            simulation_type=req.simulation_type,
            start_date=parsed_start,
            end_date=parsed_end,
            employee_id=params.get("employee_id"),
            target_employee_id=req.selected_backup_employee_id or params.get("target_employee_id"),
            brand_id=params.get("brand_id"),
            process_id=params.get("process_id"),
            reason=params.get("reason") or req.description,
        )
        # Validate scenario deterministically against live database
        sim_result = ImpactSimulator.simulate(db, sim_req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    selected_backup_id = req.selected_backup_employee_id or params.get("target_employee_id")
    if selected_backup_id:
        params["target_employee_id"] = selected_backup_id

    candidate_ranking_snapshot = {
        "candidates": req.backup_recommendations
        if req.backup_recommendations is not None
        else [r.model_dump() for r in sim_result.backup_recommendations],
        "evaluation_summary": req.backup_evaluation_summary
        if req.backup_evaluation_summary is not None
        else (sim_result.backup_evaluation_summary.model_dump() if sim_result.backup_evaluation_summary else None),
    }

    requires_approval = sim_result.requires_approval
    required_approver_role = sim_result.required_approver_role
    # Pod Leads saving scenarios for review must obtain Operations/Admin approval
    if current_user.role == UserRole.POD_LEAD:
        requires_approval = True
        required_approver_role = required_approver_role or UserRole.OPS_MANAGER.value

    if req.submit_for_approval or requires_approval:
        initial_status = ScenarioStatus.PENDING_APPROVAL
        requires_approval = True
        required_approver_role = required_approver_role or UserRole.OPS_MANAGER.value
    else:
        initial_status = ScenarioStatus.SAVED

    snapshot_hash = req.roster_snapshot_hash or sim_result.roster_snapshot_hash

    scenario = SimulationScenario(
        roster_id=req.roster_id,
        name=req.name.strip(),
        description=req.description,
        simulation_type=req.simulation_type,
        status=initial_status,
        parameters_json=json.dumps(params, default=str),
        impact_summary_json=json.dumps(req.impact_summary, default=str),
        candidate_ranking_json=json.dumps(candidate_ranking_snapshot, default=str),
        selected_backup_employee_id=selected_backup_id,
        roster_snapshot_hash=snapshot_hash,
        requires_approval=requires_approval,
        required_approver_role=required_approver_role,
        created_by_id=current_user.id,
    )
    db.add(scenario)
    db.flush()

    audit = AuditLog(
        user_id=current_user.id,
        action="SUBMIT_SCENARIO_FOR_APPROVAL" if initial_status == ScenarioStatus.PENDING_APPROVAL else "SAVE_SIMULATION_SCENARIO",
        entity_type="SimulationScenario",
        entity_id=scenario.id,
        change_details=json.dumps({
            "scenario_id": scenario.id,
            "name": scenario.name,
            "simulation_type": req.simulation_type.value,
            "status": initial_status.value,
            "selected_backup_employee_id": selected_backup_id,
            "requires_approval": requires_approval,
            "required_approver_role": required_approver_role,
            "saved_by": current_user.full_name,
        }),
    )
    db.add(audit)

    if initial_status == ScenarioStatus.PENDING_APPROVAL:
        target_roles = [UserRole.SUPER_ADMIN] if required_approver_role == UserRole.SUPER_ADMIN.value else [UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER]
        approvers = db.query(User).filter(User.is_active == True, User.role.in_(target_roles)).all()
        for app_user in approvers:
            db.add(Notification(
                user_id=app_user.id,
                title="Scenario Awaiting Approval Review",
                message=f"{current_user.full_name} submitted simulation scenario '{scenario.name}' for managerial approval.",
                notification_type="WARNING",
                link_url="/approvals",
                is_read=False,
            ))

    db.commit()
    db.refresh(scenario)

    return _format_scenario(scenario)


@router.get("/scenarios", response_model=List[ScenarioResponse], summary="List saved simulation scenarios")
def list_scenarios(
    roster_id: Optional[int] = Query(None, description="Filter by Roster ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(SimulationScenario)
    if roster_id:
        query = query.filter(SimulationScenario.roster_id == roster_id)
    scenarios = query.order_by(desc(SimulationScenario.created_at)).all()
    return [_format_scenario(s) for s in scenarios]


@router.get("/scenarios/{scenario_id}", response_model=ScenarioResponse, summary="Get saved scenario by ID")
def get_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scenario = db.query(SimulationScenario).filter(SimulationScenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return _format_scenario(scenario)


@router.post("/scenarios/{scenario_id}/apply", response_model=ApplyScenarioResponse, summary="Apply saved scenario to live roster")
def apply_saved_scenario(
    scenario_id: int,
    apply_req: Optional[ApplyScenarioRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER)),
):
    """
    Validates governance approvals and live constraints, then applies a saved simulation scenario transactionally.
    """
    scenario = db.query(SimulationScenario).filter(SimulationScenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    if scenario.status == ScenarioStatus.APPLIED:
        raise HTTPException(status_code=400, detail="This scenario has already been applied to the live roster.")
    if scenario.status == ScenarioStatus.DISCARDED:
        raise HTTPException(status_code=400, detail="Discarded scenarios cannot be applied.")
    if scenario.status == ScenarioStatus.REJECTED:
        raise HTTPException(status_code=403, detail="This scenario was rejected in Approvals and cannot be applied.")

    if scenario.status == ScenarioStatus.PENDING_APPROVAL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Scenario #{scenario.id} is pending {scenario.required_approver_role or 'OPS_MANAGER'} approval in the Approvals workflow.",
        )

    if scenario.requires_approval and scenario.status != ScenarioStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Scenario #{scenario.id} requires approval ({scenario.required_approver_role or 'OPS_MANAGER'}) before applying.",
        )

    params = _parse_json_field(scenario.parameters_json, {})

    chosen_replacement_id = None
    override_reason = None
    expected_hash = scenario.roster_snapshot_hash
    if apply_req:
        chosen_replacement_id = apply_req.replacement_employee_id or apply_req.selected_backup_employee_id
        override_reason = apply_req.notes or apply_req.override_reason
        if apply_req.expected_snapshot_hash:
            expected_hash = apply_req.expected_snapshot_hash

    target_emp_id = chosen_replacement_id or scenario.selected_backup_employee_id or params.get("target_employee_id")

    sim_req = SimulationRequest(
        roster_id=scenario.roster_id,
        simulation_type=scenario.simulation_type,
        start_date=datetime.fromisoformat(params["start_date"]).date() if isinstance(params["start_date"], str) else params["start_date"],
        end_date=datetime.fromisoformat(params["end_date"]).date() if params.get("end_date") and isinstance(params["end_date"], str) else params.get("end_date"),
        employee_id=params.get("employee_id"),
        target_employee_id=target_emp_id,
        brand_id=params.get("brand_id"),
        process_id=params.get("process_id"),
        reason=override_reason or params.get("reason") or f"Applied saved scenario: {scenario.name}",
    )

    try:
        res = ImpactSimulator.apply_simulation(
            db=db,
            req=sim_req,
            user_id=current_user.id,
            reason=f"Applied scenario #{scenario.id} ({scenario.name}): {override_reason or 'Approved'}",
            expected_snapshot_hash=expected_hash,
            scenario_id=scenario.id,
            applied_by_user=current_user,
            skip_approval_check=(scenario.status == ScenarioStatus.APPROVED),
        )
        scenario.status = ScenarioStatus.APPLIED
        scenario.applied_at = datetime.utcnow()
        scenario.applied_by_id = current_user.id
        if target_emp_id:
            scenario.selected_backup_employee_id = target_emp_id
        db.commit()
        return ApplyScenarioResponse(**res)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except StaleRosterError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except (ConflictValidationError, ValueError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/scenarios/{scenario_id}", summary="Delete or discard saved scenario")
def delete_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER)),
):
    scenario = db.query(SimulationScenario).filter(SimulationScenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    db.delete(scenario)
    db.commit()
    return {"message": f"Scenario #{scenario_id} discarded successfully."}
