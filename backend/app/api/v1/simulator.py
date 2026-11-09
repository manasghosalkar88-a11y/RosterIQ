import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.api.deps import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.roster import Roster
from app.models.simulation import SimulationScenario, SimulationType, ScenarioStatus
from app.schemas.simulation import (
    SimulationRequest,
    SimulationResultResponse,
    SaveScenarioRequest,
    ScenarioResponse,
    ApplyScenarioRequest,
    ApplyScenarioResponse,
)
from app.engine.impact_simulator import ImpactSimulator

router = APIRouter(prefix="/simulator", tags=["RosterIQ Impact Simulator"])


def _format_scenario(s: SimulationScenario) -> ScenarioResponse:
    return ScenarioResponse(
        id=s.id,
        roster_id=s.roster_id,
        name=s.name,
        description=s.description,
        simulation_type=s.simulation_type.value if hasattr(s.simulation_type, "value") else str(s.simulation_type),
        status=s.status.value if hasattr(s.status, "value") else str(s.status),
        parameters=json.loads(s.parameters_json) if isinstance(s.parameters_json, str) else s.parameters_json,
        impact_summary=json.loads(s.impact_summary_json) if isinstance(s.impact_summary_json, str) else s.impact_summary_json,
        created_by_name=s.created_by.full_name if s.created_by else None,
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
    Directly commits a confirmed simulation scenario to the actual monthly roster.
    Mutates RosterEntry records, awards comp-offs, auto-resolves conflicts, and logs an Audit record.
    """
    try:
        res = ImpactSimulator.apply_simulation(
            db=db,
            req=req,
            user_id=current_user.id,
            reason=req.reason or f"Impact Simulator applied by {current_user.full_name}",
        )
        return ApplyScenarioResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/scenarios", response_model=ScenarioResponse, status_code=status.HTTP_201_CREATED, summary="Save scenario for review")
def save_scenario(
    req: SaveScenarioRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER, UserRole.POD_LEAD)),
):
    """
    Saves an impact scenario for managerial review or stakeholder comparison.
    """
    roster = db.query(Roster).filter(Roster.id == req.roster_id).first()
    if not roster:
        raise HTTPException(status_code=404, detail="Roster not found")

    scenario = SimulationScenario(
        roster_id=req.roster_id,
        name=req.name,
        description=req.description,
        simulation_type=req.simulation_type,
        status=ScenarioStatus.SAVED,
        parameters_json=json.dumps(req.parameters, default=str),
        impact_summary_json=json.dumps(req.impact_summary, default=str),
        created_by_id=current_user.id,
    )
    db.add(scenario)
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
    Approves and applies a previously saved simulation scenario to the actual monthly roster.
    """
    scenario = db.query(SimulationScenario).filter(SimulationScenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    params = json.loads(scenario.parameters_json)
    
    # Priority: explicitly passed replacement_id > saved target_employee_id
    chosen_replacement_id = None
    override_reason = None
    if apply_req:
        chosen_replacement_id = apply_req.replacement_employee_id
        override_reason = apply_req.notes or apply_req.override_reason

    target_emp_id = chosen_replacement_id or params.get("target_employee_id")

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
        )
        scenario.status = ScenarioStatus.APPLIED
        scenario.applied_at = datetime.utcnow()
        db.commit()
        return ApplyScenarioResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


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
