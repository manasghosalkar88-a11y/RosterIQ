"""
RosterIQ Impact Simulator Engine
=================================
Allows operations managers to simulate operational changes before applying them to the live roster.
- In-memory simulation with zero persistent side-effects until explicitly confirmed.
- Evaluates affected employees, brands, processes, and cascading ripple effects.
- Computes before-and-after operational coverage percentages and conflict deltas.
- Integrates with ChangeManager for multi-factor candidate backup scoring.
- Supports both Single-Resource (orphan risk) and Multi-Resource (internal absorption) scenarios.
- Deterministic, ACID-safe, and produces immutable audit records upon application.
"""

import hashlib
import json
from datetime import date, datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.roster import Roster, RosterEntry, RosterVersion, ShiftStatus
from app.models.conflict import SchedulingConflict, ConflictType, ConflictSeverity
from app.models.employee import Employee, EmploymentStatus
from app.models.brand import Brand
from app.models.process import Process
from app.models.pod import Pod
from app.models.allocation import EmployeeAssignment, AssignmentType
from app.models.operating_rule import BrandProcessRule, OperatingRuleType
from app.models.leave import LeaveRequest, CompOff, ApprovalStatus
from app.models.notification import Notification
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.models.simulation import SimulationScenario, SimulationType, ScenarioStatus
from app.schemas.change_management import BackupEvaluationSummary
from app.schemas.simulation import (
    SimulationRequest,
    SimulationResultResponse,
    AffectedEmployee,
    AffectedBrand,
    AffectedProcess,
    SimulatedConflict,
)
from app.engine.change_manager import ChangeManager


class StaleRosterError(ValueError):
    """Raised when the live roster changed after simulation snapshot was captured."""


class ConflictValidationError(ValueError):
    """Raised when pre-apply candidate or scenario revalidation fails."""


class ImpactSimulator:
    @staticmethod
    def compute_roster_snapshot_hash(
        db: Session,
        roster_id: int,
        sim_dates: List[date],
    ) -> str:
        """
        Produces a deterministic SHA-256 hash of all live RosterEntry and APPROVED LeaveRequest
        states overlapping the simulation dates so apply can detect concurrent roster edits.
        """
        if not sim_dates:
            return ""
        min_d = min(sim_dates)
        max_d = max(sim_dates)
        entries = (
            db.query(RosterEntry)
            .filter(
                RosterEntry.roster_id == roster_id,
                RosterEntry.date >= min_d,
                RosterEntry.date <= max_d,
            )
            .order_by(RosterEntry.employee_id, RosterEntry.date)
            .all()
        )
        leaves = (
            db.query(LeaveRequest)
            .filter(
                LeaveRequest.status == ApprovalStatus.APPROVED,
                LeaveRequest.start_date <= max_d,
                LeaveRequest.end_date >= min_d,
            )
            .order_by(LeaveRequest.id)
            .all()
        )
        payload = {
            "roster_id": roster_id,
            "entries": [
                (
                    e.employee_id,
                    e.date.isoformat(),
                    e.status.value if hasattr(e.status, "value") else str(e.status),
                    e.brand_id,
                    e.process_id,
                    e.shift_start,
                    e.shift_end,
                )
                for e in entries
            ],
            "leaves": [
                (lv.id, lv.employee_id, lv.start_date.isoformat(), lv.end_date.isoformat())
                for lv in leaves
            ],
        }
        raw = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]

    @staticmethod
    def determine_approval_policy(
        db: Session,
        sim_dates: List[date],
        simulation_type: SimulationType,
        can_absorb: bool,
        new_conflicts_count: int,
        brand_id: Optional[int],
        absent_emp: Optional[Employee],
        replacement_emp_id: Optional[int],
    ) -> Tuple[bool, Optional[str]]:
        """
        Determines whether applying the scenario requires explicit approval workflow sign-off
        and which role is authorized to grant approval.
        """
        if simulation_type in (SimulationType.BRAND_RULE_CHANGE, SimulationType.PROCESS_STAFFING_CHANGE):
            return True, UserRole.SUPER_ADMIN.value

        if replacement_emp_id:
            rep = db.query(Employee).filter(Employee.id == replacement_emp_id).first()
            brand = db.query(Brand).filter(Brand.id == brand_id).first() if brand_id else None
            target_pod_id = absent_emp.pod_id if (absent_emp and absent_emp.pod_id) else (brand.pod_id if brand else None)
            if rep and target_pod_id and rep.pod_id and rep.pod_id != target_pod_id:
                return True, UserRole.SUPER_ADMIN.value

        if len(sim_dates) > 1 and not can_absorb:
            return True, UserRole.SUPER_ADMIN.value

        if not replacement_emp_id and not can_absorb and new_conflicts_count > 0:
            return True, UserRole.SUPER_ADMIN.value

        return False, None

    @staticmethod
    def simulate(db: Session, req: SimulationRequest) -> SimulationResultResponse:
        """
        Executes a deterministic, in-memory simulation of the proposed operational change.
        Does NOT modify the live roster or database records.
        """
        roster = db.query(Roster).filter(Roster.id == req.roster_id).first()
        if not roster:
            raise ValueError(f"Roster #{req.roster_id} not found.")

        start_date = req.start_date
        end_date = req.end_date or req.start_date
        if end_date < start_date:
            end_date = start_date

        num_sim_days = (end_date - start_date).days + 1
        sim_dates = [start_date + timedelta(days=i) for i in range(num_sim_days)]
        sim_dates_str = [d.isoformat() for d in sim_dates]
        snapshot_hash = ImpactSimulator.compute_roster_snapshot_hash(db, roster.id, sim_dates)

        # 1. Baseline Metrics
        coverage_before = roster.coverage_percentage
        existing_conflicts = db.query(SchedulingConflict).filter(
            SchedulingConflict.roster_id == roster.id,
            SchedulingConflict.is_resolved == False,
        ).all()
        total_conflicts_before = len(existing_conflicts)

        # Preload all roster entries for the month
        all_entries = db.query(RosterEntry).filter(RosterEntry.roster_id == roster.id).all()
        entries_by_emp_date: Dict[Tuple[int, date], RosterEntry] = {
            (e.employee_id, e.date): e for e in all_entries
        }

        # Preload assignments and operating rules
        assignments = db.query(EmployeeAssignment).filter(EmployeeAssignment.is_active == True).all()
        brand_assignments: Dict[int, List[EmployeeAssignment]] = {}
        for a in assignments:
            brand_assignments.setdefault(a.brand_id, []).append(a)

        emp_assignments: Dict[int, List[EmployeeAssignment]] = {}
        for a in assignments:
            emp_assignments.setdefault(a.employee_id, []).append(a)

        # Simulation output accumulators
        affected_employees_map: Dict[int, AffectedEmployee] = {}
        affected_brands_map: Dict[int, AffectedBrand] = {}
        affected_processes_map: Dict[int, AffectedProcess] = {}
        newly_created_conflicts: List[SimulatedConflict] = []
        resolved_conflicts: List[SimulatedConflict] = []
        cascading_effects: List[str] = []
        can_absorb_without_replacement = False
        absorption_explanation = None

        # 2. Branch simulation by type
        if req.simulation_type in [
            SimulationType.EMPLOYEE_ABSENCE,
            SimulationType.PLANNED_LEAVE,
            SimulationType.COMP_OFF,
            SimulationType.AVAILABILITY_CHANGE,
        ]:
            if not req.employee_id:
                raise ValueError("employee_id is required for absence/leave simulation.")

            emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
            if not emp:
                raise ValueError(f"Employee #{req.employee_id} not found.")

            # Identify shifts scheduled for this employee across sim_dates
            orphaned_shifts: List[RosterEntry] = []
            for d in sim_dates:
                entry = entries_by_emp_date.get((emp.id, d))
                if entry and entry.status == ShiftStatus.WORKING:
                    if req.brand_id and entry.brand_id and entry.brand_id != req.brand_id:
                        pass
                    orphaned_shifts.append(entry)

            # Record affected employee
            shifts_before_count = sum(1 for e in all_entries if e.employee_id == emp.id and e.status == ShiftStatus.WORKING)
            shifts_after_count = shifts_before_count - len(orphaned_shifts)
            affected_employees_map[emp.id] = AffectedEmployee(
                employee_id=emp.id,
                full_name=emp.full_name,
                employee_code=emp.employee_code,
                pod_name=emp.pod.name if emp.pod else "General",
                shifts_before=shifts_before_count,
                shifts_after=shifts_after_count,
                shift_delta=-len(orphaned_shifts),
                impact_note=f"Proposed absence removes {len(orphaned_shifts)} scheduled shift(s) across {len(sim_dates)} day(s).",
            )

            if not orphaned_shifts:
                existing_statuses = [
                    (entries_by_emp_date.get((emp.id, d)).status.value if entries_by_emp_date.get((emp.id, d)) else "UNSCHEDULED")
                    for d in sim_dates
                ]
                executive_summary = (
                    f"Simulation evaluated: {emp.full_name} is already marked {'/'.join(set(existing_statuses))} on "
                    f"{', '.join(sim_dates_str)}. Zero operational shifts are orphaned; no replacement backup is required."
                )
                return SimulationResultResponse(
                    roster_id=roster.id,
                    simulation_type=req.simulation_type.value,
                    start_date=start_date.isoformat(),
                    end_date=end_date.isoformat(),
                    coverage_before=coverage_before,
                    coverage_after=coverage_before,
                    coverage_delta=0.0,
                    total_conflicts_before=total_conflicts_before,
                    total_conflicts_after=total_conflicts_before,
                    conflicts_delta=0,
                    newly_created_conflicts=[],
                    resolved_conflicts=[],
                    affected_employees=list(affected_employees_map.values()),
                    affected_brands=[],
                    affected_processes=[],
                    affected_dates=sim_dates_str,
                    cascading_effects=[],
                    backup_recommendations=[],
                    backup_evaluation_summary=BackupEvaluationSummary(
                        total_evaluated=0,
                        eligible_count=0,
                        excluded_count=0,
                        target_brand_id=req.brand_id,
                        target_process_id=req.process_id,
                        evaluated_dates=sim_dates_str,
                        exclusion_reasons=[],
                    ),
                    roster_snapshot_hash=snapshot_hash,
                    requires_approval=False,
                    required_approver_role=None,
                    can_absorb_without_replacement=True,
                    absorption_explanation=f"{emp.full_name} has no scheduled WORKING shift on {', '.join(sim_dates_str)} (current status: {', '.join(set(existing_statuses))}). Choose a scheduled working day to evaluate backup candidates.",
                    executive_summary=executive_summary,
                    is_viable=True,
                )

            # Analyze each orphaned shift by brand & process
            total_shortfall_slots = 0

            for entry in orphaned_shifts:
                d = entry.date
                brand = entry.brand or (db.query(Brand).filter(Brand.id == entry.brand_id).first() if entry.brand_id else None)
                process = entry.process or (db.query(Process).filter(Process.id == entry.process_id).first() if entry.process_id else None)

                if not brand:
                    continue

                b_assigns = brand_assignments.get(brand.id, [])
                primary_staff = [a for a in b_assigns if a.assignment_type == AssignmentType.PRIMARY]
                is_single_resource = len(primary_staff) <= 1

                # Check if multi-resource brand peers can absorb coverage
                brand_peers_working_on_date = [
                    a.employee_id for a in primary_staff
                    if a.employee_id != emp.id and entries_by_emp_date.get((a.employee_id, d))
                    and entries_by_emp_date[(a.employee_id, d)].status == ShiftStatus.WORKING
                ]

                if not is_single_resource and len(brand_peers_working_on_date) >= 1:
                    can_absorb_without_replacement = True
                    peer_names = [
                        a.employee.full_name for a in primary_staff
                        if a.employee_id in brand_peers_working_on_date and a.employee
                    ]
                    absorption_explanation = (
                        f"{brand.name} is a multi-resource brand with {len(primary_staff)} assigned specialists. "
                        f"Remaining peer(s) on duty ({', '.join(peer_names)}) maintain operational coverage without external backup."
                    )
                    affected_brands_map[brand.id] = AffectedBrand(
                        brand_id=brand.id,
                        brand_name=brand.name,
                        is_single_resource=False,
                        coverage_before_pct=100.0,
                        coverage_after_pct=100.0,
                        coverage_delta_pct=0.0,
                        status_before="NORMAL",
                        status_after="NORMAL",
                        can_absorb_internally=True,
                        absorption_note=absorption_explanation,
                    )
                else:
                    total_shortfall_slots += 1
                    status_after = "CRITICAL" if is_single_resource else "WARNING"

                    newly_created_conflicts.append(SimulatedConflict(
                        date=d.isoformat(),
                        conflict_type="UNSTAFFED_PROCESS",
                        severity="CRITICAL" if is_single_resource else "HIGH",
                        brand_name=brand.name,
                        process_name=process.name if process else "Core Operations",
                        employee_name=emp.full_name,
                        title=f"{'Single-Resource' if is_single_resource else 'Process'} Coverage Gap: {brand.name}",
                        description=(
                            f"Absence of {emp.full_name} leaves {brand.name} without primary staffing for "
                            f"{process.name if process else 'all operations'} on {d.isoformat()}."
                        ),
                    ))

                    affected_brands_map[brand.id] = AffectedBrand(
                        brand_id=brand.id,
                        brand_name=brand.name,
                        is_single_resource=is_single_resource,
                        coverage_before_pct=100.0,
                        coverage_after_pct=round(max(0.0, 100.0 - (100.0 / max(1, len(sim_dates)))), 1),
                        coverage_delta_pct=-round(100.0 / max(1, len(sim_dates)), 1),
                        status_before="NORMAL",
                        status_after=status_after,
                        can_absorb_internally=False,
                        absorption_note=(
                            f"{'Single-resource dedicated brand: zero internal redundancy.' if is_single_resource else 'Insufficient remaining brand staff on duty.'} Requires backup replacement."
                        ),
                    )

                if process:
                    if process.id not in affected_processes_map:
                        affected_processes_map[process.id] = AffectedProcess(
                            process_id=process.id,
                            process_code=process.code,
                            process_name=process.name,
                            shortfall_slots=0,
                            impact_note="",
                        )
                    if not can_absorb_without_replacement:
                        affected_processes_map[process.id].shortfall_slots += 1
                        affected_processes_map[process.id].impact_note = (
                            f"{affected_processes_map[process.id].shortfall_slots} unstaffed shift(s) created."
                        )

            cross_backups = [
                a for a in emp_assignments.get(emp.id, [])
                if a.assignment_type == AssignmentType.BACKUP
            ]
            if cross_backups:
                backup_brands = list({a.brand.name for a in cross_backups if a.brand})
                cascading_effects.append(
                    f"Cascading Risk: {emp.full_name} is designated secondary backup for {', '.join(backup_brands)}. "
                    f"During this absence, those accounts will have reduced emergency failover redundancy."
                )

            estimated_total_demand = max(100, int(roster.coverage_percentage * 5))
            coverage_drop = round((total_shortfall_slots / estimated_total_demand) * 100.0, 2) if total_shortfall_slots > 0 else 0.0
            coverage_after = max(0.0, round(coverage_before - coverage_drop, 2))
            coverage_delta = round(coverage_after - coverage_before, 2)
            total_conflicts_after = total_conflicts_before + len(newly_created_conflicts)
            conflicts_delta = len(newly_created_conflicts)

            # Evaluate Smart Backup Recommendations across actual orphaned dates
            orphaned_dates = [e.date for e in orphaned_shifts]
            target_brand_id = orphaned_shifts[0].brand_id or req.brand_id or (emp_assignments.get(emp.id, [None])[0].brand_id if emp_assignments.get(emp.id) else 1)
            target_proc_id = orphaned_shifts[0].process_id or req.process_id
            backup_recs, eval_summary = ChangeManager.evaluate_backup_candidates(
                db=db,
                target_dates=orphaned_dates,
                brand_id=target_brand_id,
                process_id=target_proc_id,
                absent_employee_id=emp.id,
                roster_id=roster.id,
            )

            top_cand_id = req.target_employee_id or (backup_recs[0].employee_id if backup_recs else None)
            requires_approval, required_approver_role = ImpactSimulator.determine_approval_policy(
                db=db,
                sim_dates=orphaned_dates,
                simulation_type=req.simulation_type,
                can_absorb=(can_absorb_without_replacement and total_shortfall_slots == 0),
                new_conflicts_count=len(newly_created_conflicts),
                brand_id=target_brand_id,
                absent_emp=emp,
                replacement_emp_id=top_cand_id if not (can_absorb_without_replacement and total_shortfall_slots == 0) else None,
            )

            if can_absorb_without_replacement and total_shortfall_slots == 0:
                executive_summary = (
                    f"Multi-resource resilience verified: Proposed absence of {emp.full_name} on {', '.join(sim_dates_str)} "
                    f"can be absorbed internally by co-assigned brand peers. Company coverage remains at {coverage_after}% with 0 new conflicts."
                )
            else:
                top_backup_name = backup_recs[0].full_name if backup_recs else "no eligible internal candidate"
                top_backup_score = f"{backup_recs[0].suitability_score}%" if backup_recs else "0 eligible"
                executive_summary = (
                    f"Simulation Warning: Absence of {emp.full_name} creates {total_shortfall_slots} coverage gap(s) "
                    f"across {len(affected_brands_map)} brand(s). Operational coverage drops from {coverage_before}% to {coverage_after}% ({coverage_delta}%). "
                    f"Evaluated {eval_summary.total_evaluated} candidates ({eval_summary.eligible_count} eligible). "
                    f"Top recommended replacement is {top_backup_name} ({top_backup_score})."
                )

            return SimulationResultResponse(
                roster_id=roster.id,
                simulation_type=req.simulation_type.value,
                start_date=start_date.isoformat(),
                end_date=end_date.isoformat(),
                coverage_before=coverage_before,
                coverage_after=coverage_after,
                coverage_delta=coverage_delta,
                total_conflicts_before=total_conflicts_before,
                total_conflicts_after=total_conflicts_after,
                conflicts_delta=conflicts_delta,
                newly_created_conflicts=newly_created_conflicts,
                resolved_conflicts=[],
                affected_employees=list(affected_employees_map.values()),
                affected_brands=list(affected_brands_map.values()),
                affected_processes=list(affected_processes_map.values()),
                affected_dates=sim_dates_str,
                cascading_effects=cascading_effects,
                backup_recommendations=backup_recs,
                backup_evaluation_summary=eval_summary,
                roster_snapshot_hash=snapshot_hash,
                requires_approval=requires_approval,
                required_approver_role=required_approver_role,
                can_absorb_without_replacement=can_absorb_without_replacement and total_shortfall_slots == 0,
                absorption_explanation=absorption_explanation,
                executive_summary=executive_summary,
                is_viable=(coverage_after >= 75.0),
            )

        elif req.simulation_type == SimulationType.EMPLOYEE_REASSIGNMENT:
            # Reassignment / Replacement Simulation
            if not req.employee_id:
                raise ValueError("employee_id (source specialist) is required for reassignment simulation.")

            source_emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
            if not source_emp:
                raise ValueError("Invalid source employee ID.")

            target_emp = (
                db.query(Employee).filter(Employee.id == req.target_employee_id).first()
                if req.target_employee_id
                else None
            )

            source_shifts = [
                entries_by_emp_date.get((source_emp.id, d))
                for d in sim_dates
                if entries_by_emp_date.get((source_emp.id, d))
            ]
            resolved_brand_id = req.brand_id or (source_shifts[0].brand_id if source_shifts and source_shifts[0].brand_id else None) or 1
            resolved_proc_id = req.process_id or (source_shifts[0].process_id if source_shifts and source_shifts[0].process_id else None)
            brand = db.query(Brand).filter(Brand.id == resolved_brand_id).first()

            backup_recs, eval_summary = ChangeManager.evaluate_backup_candidates(
                db=db,
                target_dates=sim_dates,
                brand_id=resolved_brand_id,
                process_id=resolved_proc_id,
                absent_employee_id=source_emp.id,
                roster_id=roster.id,
            )

            if not target_emp and backup_recs:
                target_emp = db.query(Employee).filter(Employee.id == backup_recs[0].employee_id).first()

            shifts_before_src = sum(1 for e in all_entries if e.employee_id == source_emp.id and e.status == ShiftStatus.WORKING)
            affected_employees_map[source_emp.id] = AffectedEmployee(
                employee_id=source_emp.id,
                full_name=source_emp.full_name,
                employee_code=source_emp.employee_code,
                pod_name=source_emp.pod.name if source_emp.pod else "General",
                shifts_before=shifts_before_src,
                shifts_after=max(0, shifts_before_src - len(source_shifts)),
                shift_delta=-len(source_shifts),
                impact_note=f"Shift(s) queued for transfer to backup replacement.",
            )

            is_viable = bool(backup_recs or target_emp)
            coverage_after = coverage_before

            if target_emp:
                is_valid, fail_msg, matched_rec = ChangeManager.validate_candidate_eligibility(
                    db=db,
                    candidate_id=target_emp.id,
                    target_dates=sim_dates,
                    brand_id=resolved_brand_id,
                    process_id=resolved_proc_id,
                    absent_employee_id=source_emp.id,
                    roster_id=roster.id,
                )
                is_labor_compliant = is_valid
                if not is_valid and fail_msg:
                    cascading_effects.append(f"Selected Candidate Validation Warning: {fail_msg}")
                    newly_created_conflicts.append(SimulatedConflict(
                        date=start_date.isoformat(),
                        conflict_type="EXCESSIVE_CONSECUTIVE_DAYS",
                        severity="HIGH",
                        brand_name=brand.name if brand else "General",
                        employee_name=target_emp.full_name,
                        title=f"Eligibility / Compliance Alert: {target_emp.full_name}",
                        description=fail_msg,
                    ))
                    is_viable = False
                else:
                    resolved_conflicts.append(SimulatedConflict(
                        date=start_date.isoformat(),
                        conflict_type="UNSTAFFED_PROCESS",
                        severity="CRITICAL",
                        brand_name=brand.name if brand else "General",
                        employee_name=source_emp.full_name,
                        title=f"Resolved: Coverage Gap on {brand.name if brand else 'Brand'}",
                        description=f"Eligible replacement {target_emp.full_name} covers all operating requirements in place of {source_emp.full_name}.",
                    ))

                shifts_before_tgt = sum(1 for e in all_entries if e.employee_id == target_emp.id and e.status == ShiftStatus.WORKING)
                affected_employees_map[target_emp.id] = AffectedEmployee(
                    employee_id=target_emp.id,
                    full_name=target_emp.full_name,
                    employee_code=target_emp.employee_code,
                    pod_name=target_emp.pod.name if target_emp.pod else "General",
                    shifts_before=shifts_before_tgt,
                    shifts_after=shifts_before_tgt + len(sim_dates),
                    shift_delta=+len(sim_dates),
                    impact_note=f"Assigned replacement shift for {brand.name if brand else 'Brand'}. {'Eligible for Comp-Off credit.' if (matched_rec and matched_rec.requires_comp_off) else ''}",
                )

                if brand and is_valid:
                    affected_brands_map[brand.id] = AffectedBrand(
                        brand_id=brand.id,
                        brand_name=brand.name,
                        is_single_resource=True,
                        coverage_before_pct=coverage_before,
                        coverage_after_pct=min(100.0, coverage_before + 1.2),
                        coverage_delta_pct=+1.2,
                        status_before="CRITICAL",
                        status_after="NORMAL",
                        can_absorb_internally=True,
                        absorption_note=f"Successfully covered by {target_emp.full_name} ({target_emp.pod.name if target_emp.pod else 'Pod'}).",
                    )
                    coverage_after = min(100.0, round(coverage_before + 1.2, 2))
            else:
                newly_created_conflicts.append(SimulatedConflict(
                    date=start_date.isoformat(),
                    conflict_type="UNSTAFFED_PROCESS",
                    severity="CRITICAL",
                    brand_name=brand.name if brand else "Brand",
                    employee_name=source_emp.full_name,
                    title=f"No Eligible Backup Available for {brand.name if brand else 'Brand'}",
                    description=f"All {eval_summary.total_evaluated} evaluated candidates were excluded by availability, skill/certification, or labor rules.",
                ))

            coverage_delta = round(coverage_after - coverage_before, 2)
            total_conflicts_after = max(0, total_conflicts_before - len(resolved_conflicts) + len(newly_created_conflicts))
            requires_approval, required_approver_role = ImpactSimulator.determine_approval_policy(
                db=db,
                sim_dates=sim_dates,
                simulation_type=req.simulation_type,
                can_absorb=False,
                new_conflicts_count=len(newly_created_conflicts),
                brand_id=resolved_brand_id,
                absent_emp=source_emp,
                replacement_emp_id=target_emp.id if target_emp else None,
            )

            executive_summary = (
                f"Reassignment Evaluated: Replacing {source_emp.full_name} "
                f"{'with ' + target_emp.full_name if target_emp else '(no eligible backup selected)'} "
                f"on {brand.name if brand else 'Brand'}. "
                f"Evaluated {eval_summary.total_evaluated} candidates ({eval_summary.eligible_count} eligible)."
            )

            return SimulationResultResponse(
                roster_id=roster.id,
                simulation_type=req.simulation_type.value,
                start_date=start_date.isoformat(),
                end_date=end_date.isoformat(),
                coverage_before=coverage_before,
                coverage_after=coverage_after,
                coverage_delta=coverage_delta,
                total_conflicts_before=total_conflicts_before,
                total_conflicts_after=total_conflicts_after,
                conflicts_delta=total_conflicts_after - total_conflicts_before,
                newly_created_conflicts=newly_created_conflicts,
                resolved_conflicts=resolved_conflicts,
                affected_employees=list(affected_employees_map.values()),
                affected_brands=list(affected_brands_map.values()),
                affected_processes=[],
                affected_dates=sim_dates_str,
                cascading_effects=cascading_effects,
                backup_recommendations=backup_recs,
                backup_evaluation_summary=eval_summary,
                roster_snapshot_hash=snapshot_hash,
                requires_approval=requires_approval,
                required_approver_role=required_approver_role,
                can_absorb_without_replacement=False,
                absorption_explanation=None,
                executive_summary=executive_summary,
                is_viable=is_viable,
            )

        elif req.simulation_type == SimulationType.BRAND_RULE_CHANGE:
            brand = db.query(Brand).filter(Brand.id == (req.brand_id or 1)).first()
            if not brand:
                raise ValueError("brand_id is required for operating rule simulation.")

            new_rule = req.new_rule_type or "EVERY_DAY_365"
            sundays_in_range = [d for d in sim_dates if d.weekday() == 6]
            new_conflicts_count = len(sundays_in_range) * 2
            coverage_drop = round((new_conflicts_count / max(100, int(roster.coverage_percentage * 5))) * 100.0, 2)
            coverage_after = max(50.0, round(coverage_before - coverage_drop, 2))

            for d in sundays_in_range:
                newly_created_conflicts.append(SimulatedConflict(
                    date=d.isoformat(),
                    conflict_type="UNSTAFFED_PROCESS",
                    severity="HIGH",
                    brand_name=brand.name,
                    title=f"New Sunday Operating Requirement: {brand.name}",
                    description=f"Rule change to {new_rule} demands Sunday coverage on {d.isoformat()} when staff are currently scheduled weekly off.",
                ))

            affected_brands_map[brand.id] = AffectedBrand(
                brand_id=brand.id,
                brand_name=brand.name,
                is_single_resource=True,
                coverage_before_pct=coverage_before,
                coverage_after_pct=coverage_after,
                coverage_delta_pct=round(coverage_after - coverage_before, 2),
                status_before="NORMAL",
                status_after="WARNING",
                can_absorb_internally=False,
                absorption_note=f"Rule change to {new_rule} creates {new_conflicts_count} additional weekend demand slots requiring rotational staff.",
            )

            eval_dates = sundays_in_range or sim_dates
            backup_recs, eval_summary = ChangeManager.evaluate_backup_candidates(
                db=db,
                target_dates=eval_dates,
                brand_id=brand.id,
                process_id=req.process_id,
                absent_employee_id=req.employee_id,
                roster_id=roster.id,
            )

            executive_summary = (
                f"Operating Rule Simulation: Transitioning {brand.name} to {new_rule} adds weekend demand. "
                f"Evaluated {eval_summary.total_evaluated} backup floaters ({eval_summary.eligible_count} eligible)."
            )

            return SimulationResultResponse(
                roster_id=roster.id,
                simulation_type=req.simulation_type.value,
                start_date=start_date.isoformat(),
                end_date=end_date.isoformat(),
                coverage_before=coverage_before,
                coverage_after=coverage_after,
                coverage_delta=round(coverage_after - coverage_before, 2),
                total_conflicts_before=total_conflicts_before,
                total_conflicts_after=total_conflicts_before + len(newly_created_conflicts),
                conflicts_delta=len(newly_created_conflicts),
                newly_created_conflicts=newly_created_conflicts,
                resolved_conflicts=[],
                affected_employees=[],
                affected_brands=list(affected_brands_map.values()),
                affected_processes=[],
                affected_dates=sim_dates_str,
                cascading_effects=["Staff weekly-off preferences will need adjustment to cover weekend schedules."],
                backup_recommendations=backup_recs,
                backup_evaluation_summary=eval_summary,
                roster_snapshot_hash=snapshot_hash,
                requires_approval=True,
                required_approver_role=UserRole.SUPER_ADMIN.value,
                can_absorb_without_replacement=False,
                absorption_explanation=None,
                executive_summary=executive_summary,
                is_viable=True,
            )

        elif req.simulation_type == SimulationType.PROCESS_STAFFING_CHANGE:
            brand = db.query(Brand).filter(Brand.id == (req.brand_id or 1)).first()
            process = db.query(Process).filter(Process.id == (req.process_id or 1)).first()
            new_headcount = req.new_min_headcount or 2

            added_slots = (new_headcount - 1) * len(sim_dates)
            coverage_drop = round((added_slots / max(100, int(roster.coverage_percentage * 5))) * 100.0, 2)
            coverage_after = max(50.0, round(coverage_before - coverage_drop, 2))

            for d in sim_dates:
                newly_created_conflicts.append(SimulatedConflict(
                    date=d.isoformat(),
                    conflict_type="UNSTAFFED_PROCESS",
                    severity="HIGH",
                    brand_name=brand.name if brand else "Brand",
                    process_name=process.name if process else "Process",
                    title=f"Headcount Increase Gap: {brand.name if brand else 'Brand'} ({process.code if process else 'Process'})",
                    description=f"Staffing requirement increased to {new_headcount} agent(s). Additional certified backup required on {d.isoformat()}.",
                ))

            backup_recs, eval_summary = ChangeManager.evaluate_backup_candidates(
                db=db,
                target_dates=sim_dates,
                brand_id=brand.id if brand else 1,
                process_id=process.id if process else None,
                absent_employee_id=req.employee_id,
                roster_id=roster.id,
            )

            executive_summary = (
                f"Headcount Requirement Simulation: Increasing minimum staffing for {process.name if process else 'Process'} on "
                f"{brand.name if brand else 'Brand'} to {new_headcount} creates {added_slots} unstaffed slot(s). "
                f"Evaluated {eval_summary.total_evaluated} backup candidates ({eval_summary.eligible_count} eligible)."
            )

            return SimulationResultResponse(
                roster_id=roster.id,
                simulation_type=req.simulation_type.value,
                start_date=start_date.isoformat(),
                end_date=end_date.isoformat(),
                coverage_before=coverage_before,
                coverage_after=coverage_after,
                coverage_delta=round(coverage_after - coverage_before, 2),
                total_conflicts_before=total_conflicts_before,
                total_conflicts_after=total_conflicts_before + len(newly_created_conflicts),
                conflicts_delta=len(newly_created_conflicts),
                newly_created_conflicts=newly_created_conflicts,
                resolved_conflicts=[],
                affected_employees=[],
                affected_brands=[],
                affected_processes=[AffectedProcess(
                    process_id=process.id if process else 1,
                    process_code=process.code if process else "CS",
                    process_name=process.name if process else "Customer Support",
                    shortfall_slots=added_slots,
                    impact_note=f"Required headcount elevated from 1 to {new_headcount} agent(s).",
                )],
                affected_dates=sim_dates_str,
                cascading_effects=[],
                backup_recommendations=backup_recs,
                backup_evaluation_summary=eval_summary,
                roster_snapshot_hash=snapshot_hash,
                requires_approval=True,
                required_approver_role=UserRole.SUPER_ADMIN.value,
                can_absorb_without_replacement=False,
                absorption_explanation=None,
                executive_summary=executive_summary,
                is_viable=True,
            )

        else:
            raise ValueError(f"Unsupported simulation type: {req.simulation_type}")

    @staticmethod
    def apply_simulation(
        db: Session,
        req: SimulationRequest,
        user_id: Optional[int] = None,
        reason: Optional[str] = None,
        expected_snapshot_hash: Optional[str] = None,
        scenario_id: Optional[int] = None,
        applied_by_user: Optional[User] = None,
        skip_approval_check: bool = False,
    ) -> Dict[str, Any]:
        """
        Controlled transactional application of a validated simulation scenario:
        1. Validates dates and roster existence.
        2. Detects stale roster changes via snapshot hash.
        3. Enforces approval governance policies (cannot be bypassed by Ops Manager).
        4. Revalidates candidate eligibility, skills, certifications, workload & labour laws live.
        5. Applies RosterEntry mutations, CompOff credits, conflict resolution,
           coverage recalculation, RosterVersion bump, AuditLog, and Notifications atomically.
        """
        roster = db.query(Roster).filter(Roster.id == req.roster_id).first()
        if not roster:
            raise ValueError(f"Roster #{req.roster_id} not found.")

        start_date = req.start_date
        end_date = req.end_date or req.start_date
        if end_date < start_date:
            raise ConflictValidationError("End date cannot precede start date.")

        sim_dates = [start_date + timedelta(days=i) for i in range((end_date - start_date).days + 1)]
        for d in sim_dates:
            if d.month != roster.month or d.year != roster.year:
                raise ConflictValidationError(
                    f"Date {d.isoformat()} falls outside roster month {roster.month}/{roster.year}."
                )

        # 1. Stale roster detection
        if expected_snapshot_hash:
            live_hash = ImpactSimulator.compute_roster_snapshot_hash(db, roster.id, sim_dates)
            if live_hash != expected_snapshot_hash:
                raise StaleRosterError(
                    "Live roster entries or approved leaves have changed since this simulation was evaluated. "
                    "Please re-run the simulation to revalidate candidate eligibility before applying."
                )

        # Resolve source employee, target brand/process, and operating rule
        emp = db.query(Employee).filter(Employee.id == req.employee_id).first() if req.employee_id else None
        if req.simulation_type in (
            SimulationType.EMPLOYEE_ABSENCE,
            SimulationType.PLANNED_LEAVE,
            SimulationType.COMP_OFF,
            SimulationType.AVAILABILITY_CHANGE,
            SimulationType.EMPLOYEE_REASSIGNMENT,
        ) and not emp:
            raise ConflictValidationError("Valid source employee is required for this scenario.")

        if req.simulation_type == SimulationType.EMPLOYEE_REASSIGNMENT and not req.target_employee_id:
            raise ConflictValidationError("A replacement backup candidate must be selected for reassignment.")

        source_entries: List[RosterEntry] = []
        if emp:
            source_entries = (
                db.query(RosterEntry)
                .filter(
                    RosterEntry.roster_id == roster.id,
                    RosterEntry.employee_id == emp.id,
                    RosterEntry.date.in_(sim_dates),
                )
                .order_by(RosterEntry.date)
                .all()
            )
            orphaned_working = [e for e in source_entries if e.status == ShiftStatus.WORKING]
            if not orphaned_working and req.target_employee_id:
                raise ConflictValidationError(
                    f"{emp.full_name} no longer has any active WORKING shifts on the selected dates (already updated or on leave)."
                )
        else:
            orphaned_working = []

        eff_brand_id = req.brand_id or (orphaned_working[0].brand_id if orphaned_working and orphaned_working[0].brand_id else None)
        eff_proc_id = req.process_id or (orphaned_working[0].process_id if orphaned_working and orphaned_working[0].process_id else None)

        # Check multi-resource absorption if no replacement provided
        can_absorb = False
        new_conflicts_expected = 0
        if emp and orphaned_working:
            for e in orphaned_working:
                b_id = e.brand_id or eff_brand_id
                if b_id:
                    primary_staff = db.query(EmployeeAssignment).filter(
                        EmployeeAssignment.brand_id == b_id,
                        EmployeeAssignment.is_active == True,
                        EmployeeAssignment.assignment_type == AssignmentType.PRIMARY,
                    ).all()
                    peers_working = 0
                    for a in primary_staff:
                        if a.employee_id == emp.id:
                            continue
                        pe = db.query(RosterEntry).filter(
                            RosterEntry.roster_id == roster.id,
                            RosterEntry.employee_id == a.employee_id,
                            RosterEntry.date == e.date,
                        ).first()
                        if pe and pe.status == ShiftStatus.WORKING:
                            peers_working += 1
                    if len(primary_staff) > 1 and peers_working >= 1:
                        can_absorb = True
                    else:
                        can_absorb = False
                        new_conflicts_expected += 1

        # 2. Enforce approval governance
        requires_approval, required_approver_role = ImpactSimulator.determine_approval_policy(
            db=db,
            sim_dates=[e.date for e in orphaned_working] if orphaned_working else sim_dates,
            simulation_type=req.simulation_type,
            can_absorb=can_absorb,
            new_conflicts_count=new_conflicts_expected,
            brand_id=eff_brand_id,
            absent_emp=emp,
            replacement_emp_id=req.target_employee_id,
        )

        if requires_approval and not skip_approval_check:
            actor_role = applied_by_user.role.value if applied_by_user else None
            if actor_role != UserRole.SUPER_ADMIN.value:
                raise PermissionError(
                    f"This scenario requires {required_approver_role or 'SUPER_ADMIN'} approval via the Approvals workflow "
                    f"before it can be applied to the live roster."
                )

        # 3. Live backup candidate revalidation (mandatory checks never bypassed)
        target_emp = None
        if req.target_employee_id:
            eval_dates = [e.date for e in orphaned_working] if orphaned_working else sim_dates
            if not eff_brand_id:
                first_assign = db.query(EmployeeAssignment).filter(
                    EmployeeAssignment.employee_id == emp.id,
                    EmployeeAssignment.is_active == True,
                ).first() if emp else None
                eff_brand_id = first_assign.brand_id if first_assign else 1

            is_valid, fail_reason, _ = ChangeManager.validate_candidate_eligibility(
                db=db,
                candidate_id=req.target_employee_id,
                target_dates=eval_dates,
                brand_id=eff_brand_id,
                process_id=eff_proc_id,
                absent_employee_id=emp.id if emp else None,
                roster_id=roster.id,
            )
            if not is_valid:
                raise ConflictValidationError(fail_reason or "Selected backup candidate is no longer eligible.")

            target_emp = db.query(Employee).filter(Employee.id == req.target_employee_id).first()

        # Resolve shift times from BrandProcessRule
        rule = None
        if eff_brand_id and eff_proc_id:
            rule = db.query(BrandProcessRule).filter(
                BrandProcessRule.brand_id == eff_brand_id,
                BrandProcessRule.process_id == eff_proc_id,
            ).first()
        shift_start = rule.shift_start_time if rule else "09:00"
        shift_end = rule.shift_end_time if rule else "18:00"

        entries_updated = 0
        previous_coverage = roster.coverage_percentage
        conflicts_resolved_count = 0
        conflicts_created_count = 0

        if req.simulation_type in [
            SimulationType.EMPLOYEE_ABSENCE,
            SimulationType.PLANNED_LEAVE,
            SimulationType.COMP_OFF,
            SimulationType.AVAILABILITY_CHANGE,
            SimulationType.EMPLOYEE_REASSIGNMENT,
        ]:
            assert emp is not None
            for d in sim_dates:
                entry = db.query(RosterEntry).filter(
                    RosterEntry.roster_id == roster.id,
                    RosterEntry.employee_id == emp.id,
                    RosterEntry.date == d,
                ).first()

                was_working = bool(entry and entry.status == ShiftStatus.WORKING)
                slot_brand_id = (entry.brand_id if entry and entry.brand_id else eff_brand_id)
                slot_proc_id = (entry.process_id if entry and entry.process_id else eff_proc_id)

                if entry and entry.status == ShiftStatus.WORKING:
                    entry.status = ShiftStatus.LEAVE
                    entry.is_manual_override = True
                    entry.override_reason = reason or req.reason or f"Approved {req.simulation_type.value}"
                    entries_updated += 1

                if target_emp and (was_working or req.simulation_type == SimulationType.EMPLOYEE_REASSIGNMENT):
                    target_entry = db.query(RosterEntry).filter(
                        RosterEntry.roster_id == roster.id,
                        RosterEntry.employee_id == target_emp.id,
                        RosterEntry.date == d,
                    ).first()

                    # Duplicate shift safeguard
                    if target_entry and target_entry.status == ShiftStatus.WORKING:
                        raise ConflictValidationError(
                            f"Duplicate allocation prevented: {target_emp.full_name} is already WORKING on {d.isoformat()}."
                        )

                    was_weekly_off = bool(target_entry and target_entry.status in [ShiftStatus.WEEKLY_OFF, ShiftStatus.HOLIDAY])

                    if target_entry:
                        target_entry.status = ShiftStatus.WORKING
                        target_entry.brand_id = slot_brand_id
                        target_entry.process_id = slot_proc_id
                        target_entry.shift_start = shift_start
                        target_entry.shift_end = shift_end
                        target_entry.is_manual_override = True
                        target_entry.override_reason = f"Replacement for {emp.full_name}: {reason or 'Simulation Applied'}"
                        entries_updated += 1
                    else:
                        new_entry = RosterEntry(
                            roster_id=roster.id,
                            employee_id=target_emp.id,
                            date=d,
                            status=ShiftStatus.WORKING,
                            brand_id=slot_brand_id,
                            process_id=slot_proc_id,
                            shift_start=shift_start,
                            shift_end=shift_end,
                            is_manual_override=True,
                            override_reason=f"Replacement for {emp.full_name}: {reason or 'Simulation Applied'}",
                        )
                        db.add(new_entry)
                        entries_updated += 1

                    if was_weekly_off:
                        existing_comp = db.query(CompOff).filter(
                            CompOff.employee_id == target_emp.id,
                            CompOff.earned_date == d,
                        ).first()
                        if not existing_comp:
                            comp = CompOff(
                                employee_id=target_emp.id,
                                earned_date=d,
                                reason=f"Worked on weekly off/holiday replacing {emp.full_name} for Brand #{slot_brand_id}",
                                status=ApprovalStatus.APPROVED,
                            )
                            db.add(comp)

                    # Auto-resolve matching conflict cleanly
                    conflict = db.query(SchedulingConflict).filter(
                        SchedulingConflict.roster_id == roster.id,
                        SchedulingConflict.date == d,
                        SchedulingConflict.brand_id == slot_brand_id,
                        SchedulingConflict.is_resolved == False,
                    ).first()
                    if conflict:
                        conflict.is_resolved = True
                        conflict.resolved_by_id = user_id
                        conflict.resolved_at = datetime.utcnow()
                        conflict.description = f"{conflict.description} [Resolved via Simulator: {target_emp.full_name}]"
                        conflicts_resolved_count += 1

                elif was_working and not target_emp and not can_absorb and slot_brand_id:
                    # Single-resource absence applied without backup: record explicit unresolved conflict
                    db.add(SchedulingConflict(
                        roster_id=roster.id,
                        date=d,
                        brand_id=slot_brand_id,
                        process_id=slot_proc_id,
                        employee_id=emp.id,
                        conflict_type=ConflictType.UNSTAFFED_PROCESS,
                        severity=ConflictSeverity.CRITICAL,
                        title=f"Unstaffed Shift on {d.isoformat()}",
                        description=f"Simulation applied without backup replacement after {emp.full_name} leave/absence.",
                        recommended_action="Assign an eligible certified backup via Impact Simulator.",
                        is_resolved=False,
                    ))
                    conflicts_created_count += 1

        elif req.simulation_type in [SimulationType.BRAND_RULE_CHANGE, SimulationType.PROCESS_STAFFING_CHANGE]:
            if rule:
                if req.simulation_type == SimulationType.BRAND_RULE_CHANGE and req.new_rule_type:
                    from app.models.brand import OperatingRuleType
                    try:
                        rule.operating_rule_type = OperatingRuleType(req.new_rule_type)
                    except ValueError:
                        pass
                if req.simulation_type == SimulationType.PROCESS_STAFFING_CHANGE and req.new_min_headcount:
                    rule.min_headcount = req.new_min_headcount
                entries_updated += 1

            if target_emp:
                apply_dates = [d for d in sim_dates if d.weekday() == 6] or sim_dates if req.simulation_type == SimulationType.BRAND_RULE_CHANGE else sim_dates
                for d in apply_dates:
                    target_entry = db.query(RosterEntry).filter(
                        RosterEntry.roster_id == roster.id,
                        RosterEntry.employee_id == target_emp.id,
                        RosterEntry.date == d,
                    ).first()
                    if target_entry and target_entry.status == ShiftStatus.WORKING:
                        raise ConflictValidationError(
                            f"Duplicate allocation prevented: {target_emp.full_name} is already WORKING on {d.isoformat()}."
                        )
                    was_weekly_off = bool(target_entry and target_entry.status in [ShiftStatus.WEEKLY_OFF, ShiftStatus.HOLIDAY])
                    if target_entry:
                        target_entry.status = ShiftStatus.WORKING
                        target_entry.brand_id = eff_brand_id
                        target_entry.process_id = eff_proc_id
                        target_entry.shift_start = shift_start
                        target_entry.shift_end = shift_end
                        target_entry.is_manual_override = True
                        target_entry.override_reason = f"{req.simulation_type.value}: {reason or 'Simulation Applied'}"
                    else:
                        db.add(RosterEntry(
                            roster_id=roster.id,
                            employee_id=target_emp.id,
                            date=d,
                            status=ShiftStatus.WORKING,
                            brand_id=eff_brand_id,
                            process_id=eff_proc_id,
                            shift_start=shift_start,
                            shift_end=shift_end,
                            is_manual_override=True,
                            override_reason=f"{req.simulation_type.value}: {reason or 'Simulation Applied'}",
                        ))
                    entries_updated += 1
                    if was_weekly_off:
                        existing_comp = db.query(CompOff).filter(
                            CompOff.employee_id == target_emp.id,
                            CompOff.earned_date == d,
                        ).first()
                        if not existing_comp:
                            db.add(CompOff(
                                employee_id=target_emp.id,
                                earned_date=d,
                                reason=f"Worked on weekly off/holiday for {req.simulation_type.value} on Brand #{eff_brand_id}",
                                status=ApprovalStatus.APPROVED,
                            ))

        # Recalculate remaining unresolved conflicts & live coverage percentage
        remaining_conflicts = db.query(SchedulingConflict).filter(
            SchedulingConflict.roster_id == roster.id,
            SchedulingConflict.is_resolved == False,
        ).count()
        roster.total_conflicts = remaining_conflicts

        net_conflict_change = conflicts_created_count - conflicts_resolved_count
        if net_conflict_change != 0:
            est_demand = max(100, int(max(50.0, previous_coverage) * 5))
            pct_shift = round((net_conflict_change / est_demand) * 100.0, 2)
            roster.coverage_percentage = round(max(0.0, min(100.0, previous_coverage - pct_shift)), 2)

        # Increment RosterVersion snapshot
        version_num = db.query(RosterVersion).filter(RosterVersion.roster_id == roster.id).count() + 1
        actor_label = applied_by_user.full_name if applied_by_user else f"User #{user_id or 'System'}"
        db.add(RosterVersion(
            roster_id=roster.id,
            version_number=version_num,
            change_summary=(
                f"Simulator Apply by {actor_label}: "
                f"{emp.full_name if emp else 'Roster'} -> "
                f"{target_emp.full_name if target_emp else ('Self-absorbed' if can_absorb else 'No backup')} "
                f"({start_date.isoformat()} to {end_date.isoformat()})"
            ),
            created_by_id=user_id,
        ))

        # Create AuditLog Record
        audit_details = {
            "summary": f"Applied {req.simulation_type.value if hasattr(req.simulation_type, 'value') else req.simulation_type} scenario: {entries_updated} shift(s) updated.",
            "scenario_id": scenario_id,
            "applied_by_user_id": user_id,
            "applied_by_name": actor_label,
            "before_state": {
                "roster_id": roster.id,
                "previous_coverage": previous_coverage,
            },
            "after_state": {
                "roster_id": roster.id,
                "new_coverage": roster.coverage_percentage,
                "simulation_type": req.simulation_type.value if hasattr(req.simulation_type, 'value') else str(req.simulation_type),
                "dates": [d.isoformat() for d in sim_dates],
                "absent_employee_id": emp.id if emp else None,
                "backup_employee_id": target_emp.id if target_emp else None,
                "entries_updated": entries_updated,
                "remaining_conflicts": remaining_conflicts,
            },
            "reason": reason or req.reason,
        }
        audit = AuditLog(
            user_id=user_id,
            action="APPLY_SIMULATION_SCENARIO",
            entity_type="Roster",
            entity_id=roster.id,
            change_details=json.dumps(audit_details),
        )
        db.add(audit)
        db.flush()

        # Notify affected parties through existing Notification system
        notify_user_ids: set[int] = set()
        if user_id:
            notify_user_ids.add(user_id)
        if emp and emp.user_id:
            notify_user_ids.add(emp.user_id)
        if target_emp and target_emp.user_id:
            notify_user_ids.add(target_emp.user_id)
        if eff_brand_id:
            brand_obj = db.query(Brand).filter(Brand.id == eff_brand_id).first()
            if brand_obj and brand_obj.pod and brand_obj.pod.lead and brand_obj.pod.lead.user_id:
                notify_user_ids.add(brand_obj.pod.lead.user_id)

        ops_users = db.query(User).filter(
            User.is_active == True,
            User.role.in_([UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER]),
        ).all()
        for ou in ops_users:
            notify_user_ids.add(ou.id)

        notif_msg = (
            f"{actor_label} applied Impact Simulator scenario for {', '.join([d.isoformat() for d in sim_dates])}: "
            f"{emp.full_name if emp else 'Update'}"
            f"{' backed up by ' + target_emp.full_name if target_emp else ''}. "
            f"Roster coverage: {roster.coverage_percentage}%."
        )
        for uid in notify_user_ids:
            db.add(Notification(
                user_id=uid,
                title="Live Roster Updated via Impact Simulator",
                message=notif_msg,
                notification_type="SUCCESS" if target_emp or can_absorb else "WARNING",
                link_url="/roster",
                is_read=False,
            ))

        db.commit()
        db.refresh(roster)

        return {
            "success": True,
            "message": f"Successfully applied simulation scenario to live roster #{roster.id}.",
            "roster_id": roster.id,
            "entries_updated": entries_updated,
            "new_coverage_pct": roster.coverage_percentage,
            "remaining_conflicts_count": remaining_conflicts,
            "audit_log_id": audit.id,
            "applied_at": datetime.utcnow().isoformat(),
            "applied_by_name": actor_label,
            "requires_approval": requires_approval,
            "approval_status": "APPROVED" if skip_approval_check or not requires_approval else None,
        }
