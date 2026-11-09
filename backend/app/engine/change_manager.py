"""
RosterIQ Change Management & Recommendation Engine
==================================================
Handles real-time employee availability changes without rebuilding the entire roster.
1. Evaluates eligible backup floaters from the same pod or cross-brand pool.
2. Ranks backups with transparent multi-factor suitability scoring.
3. Performs atomic shift swaps / overrides with zero regression to unaffected days.
4. Auto-resolves operational conflicts and awards compensatory off credits if applicable.
5. Produces immutable audit log and increments roster version snapshot.
"""

import json
from datetime import date, datetime, timedelta
from typing import List, Optional, Tuple, Dict
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.roster import Roster, RosterEntry, RosterVersion, ShiftStatus
from app.models.conflict import SchedulingConflict, ConflictType, ConflictSeverity
from app.models.employee import Employee, EmploymentStatus
from app.models.brand import Brand
from app.models.process import Process
from app.models.pod import Pod
from app.models.allocation import EmployeeAssignment, AssignmentType
from app.models.leave import LeaveRequest, CompOff, ApprovalStatus
from app.models.audit import AuditLog
from app.schemas.change_management import (
    BackupRecommendationResponse,
    ShiftOverrideRequest,
    ShiftOverrideResponse,
)


class ChangeManager:
    @staticmethod
    def get_backup_recommendations(
        db: Session,
        target_date: date,
        brand_id: int,
        process_id: Optional[int] = None,
        absent_employee_id: Optional[int] = None,
        roster_id: Optional[int] = None,
    ) -> List[BackupRecommendationResponse]:
        """
        Discovers and ranks candidate replacement specialists for a target shift.
        """
        brand = db.query(Brand).filter(Brand.id == brand_id).first()
        if not brand:
            return []

        absent_emp = None
        if absent_employee_id:
            absent_emp = db.query(Employee).filter(Employee.id == absent_employee_id).first()

        target_pod_id = absent_emp.pod_id if absent_emp else brand.pod_id

        # Query all active employees excluding the absent employee
        candidate_query = db.query(Employee).filter(
            Employee.is_active == True,
            Employee.employment_status == EmploymentStatus.ACTIVE,
        )
        if absent_employee_id:
            candidate_query = candidate_query.filter(Employee.id != absent_employee_id)
        candidates = candidate_query.all()

        # Pre-index candidates' existing roster entries on target_date
        entries_on_date: Dict[int, RosterEntry] = {}
        if roster_id:
            entries = db.query(RosterEntry).filter(
                RosterEntry.roster_id == roster_id,
                RosterEntry.date == target_date,
            ).all()
            entries_on_date = {e.employee_id: e for e in entries}

        # Pre-index all assignments for candidates
        assignments = db.query(EmployeeAssignment).filter(
            EmployeeAssignment.is_active == True
        ).all()
        emp_assignments: Dict[int, List[EmployeeAssignment]] = {}
        for a in assignments:
            emp_assignments.setdefault(a.employee_id, []).append(a)

        recommendations: List[BackupRecommendationResponse] = []

        for cand in candidates:
            # Check current status on target_date
            entry = entries_on_date.get(cand.id)
            current_status = entry.status if entry else ShiftStatus.WEEKLY_OFF

            # Disqualify if candidate is already on approved leave
            if current_status == ShiftStatus.LEAVE:
                continue

            score = 50  # Base suitability
            reasons = []
            requires_comp_off = False

            # Factor 1: Pod Match (Colleague in the same operational pod)
            if cand.pod_id and cand.pod_id == target_pod_id:
                score += 25
                reasons.append(f"Member of same operational pod ({cand.pod.name if cand.pod else 'Pod'})")
            else:
                score -= 5

            # Factor 2: Explicit Brand Allocation History
            cand_assigns = emp_assignments.get(cand.id, [])
            brand_assign_types = [
                a.assignment_type for a in cand_assigns if a.brand_id == brand_id
            ]
            if AssignmentType.BACKUP in brand_assign_types or AssignmentType.SECONDARY in brand_assign_types:
                score += 20
                reasons.append(f"Designated backup/secondary for {brand.name}")
            elif AssignmentType.PRIMARY in brand_assign_types:
                score += 15
                reasons.append(f"Primary specialist for {brand.name}")

            # Factor 3: Process Skill Compatibility
            if process_id:
                has_process_exp = any(a.process_id == process_id for a in cand_assigns)
                if has_process_exp:
                    score += 10
                    reasons.append("Trained and certified on required process")

            # Factor 4: Current Shift Availability on Target Date
            if current_status == ShiftStatus.WEEKLY_OFF:
                score += 5
                requires_comp_off = True
                reasons.append("Currently on Weekly Off · Eligible for compensatory off credit")
            elif current_status == ShiftStatus.HOLIDAY:
                score += 5
                requires_comp_off = True
                reasons.append("Public Holiday · Eligible for holiday overtime credit")
            elif current_status == ShiftStatus.WORKING:
                # Already scheduled on another shift
                if entry and entry.brand_id == brand_id:
                    score -= 5
                    reasons.append("Already scheduled for another process on this brand")
                else:
                    score -= 25
                    reasons.append("Currently scheduled on another brand (requires shift reassignment)")

            # Factor 5: Statutory Labor Law Compliance (Max 6 Consecutive Days)
            streak = ChangeManager._calculate_consecutive_days(db, roster_id, cand.id, target_date)
            consecutive_after = streak + 1
            is_labor_compliant = consecutive_after <= cand.max_consecutive_days

            if not is_labor_compliant:
                score -= 30
                reasons.append(f"Labor Compliance Alert: Shifts would reach {consecutive_after} consecutive days")
            else:
                score += 5
                reasons.append(f"Labor law compliant ({consecutive_after}/{cand.max_consecutive_days} consecutive days)")

            final_score = max(5, min(100, score))

            recommendations.append(BackupRecommendationResponse(
                employee_id=cand.id,
                employee_code=cand.employee_code,
                full_name=cand.full_name,
                pod_id=cand.pod_id,
                pod_name=cand.pod.name if cand.pod else "General",
                designation=cand.designation,
                current_status=current_status,
                suitability_score=final_score,
                match_reasons=reasons,
                consecutive_days_after=consecutive_after,
                is_labor_compliant=is_labor_compliant,
                requires_comp_off=requires_comp_off,
            ))

        # Sort recommendations by highest suitability score
        recommendations.sort(key=lambda r: (r.suitability_score, r.is_labor_compliant), reverse=True)
        return recommendations[:10]

    @staticmethod
    def _calculate_consecutive_days(
        db: Session,
        roster_id: Optional[int],
        employee_id: int,
        target_date: date,
    ) -> int:
        """
        Calculates how many consecutive working days the employee has worked leading up to target_date.
        """
        if not roster_id:
            return 0

        # Look back up to 6 days prior
        start_lookback = target_date - timedelta(days=6)
        prior_entries = db.query(RosterEntry).filter(
            RosterEntry.roster_id == roster_id,
            RosterEntry.employee_id == employee_id,
            RosterEntry.date >= start_lookback,
            RosterEntry.date < target_date,
        ).order_by(RosterEntry.date.desc()).all()

        streak = 0
        current_check = target_date - timedelta(days=1)
        prior_dict = {e.date: e.status for e in prior_entries}

        while current_check >= start_lookback:
            status = prior_dict.get(current_check)
            if status == ShiftStatus.WORKING:
                streak += 1
                current_check -= timedelta(days=1)
            else:
                break

        return streak

    @staticmethod
    def apply_shift_override(
        db: Session,
        req: ShiftOverrideRequest,
        user_id: Optional[int] = None,
    ) -> ShiftOverrideResponse:
        """
        Applies surgical shift override without rebuilding the entire roster.
        """
        roster = db.query(Roster).filter(Roster.id == req.roster_id).first()
        if not roster:
            raise ValueError(f"Roster #{req.roster_id} not found.")

        source_emp = db.query(Employee).filter(Employee.id == req.source_employee_id).first()
        target_emp = db.query(Employee).filter(Employee.id == req.target_employee_id).first()
        brand = db.query(Brand).filter(Brand.id == req.brand_id).first()

        if not source_emp or not target_emp or not brand:
            raise ValueError("Invalid employee or brand ID for override.")

        # Determine process ID if not explicitly specified
        process_id = req.process_id
        if not process_id:
            first_proc = db.query(Process).first()
            process_id = first_proc.id if first_proc else 1

        # 1. Update or create RosterEntry for source employee (mark as LEAVE/OFF)
        source_entry = db.query(RosterEntry).filter(
            RosterEntry.roster_id == roster.id,
            RosterEntry.employee_id == source_emp.id,
            RosterEntry.date == req.date,
        ).first()

        if source_entry:
            source_entry.status = ShiftStatus.LEAVE
            source_entry.brand_id = None
            source_entry.process_id = None
            source_entry.is_manual_override = True
            source_entry.override_reason = f"Replaced by {target_emp.full_name}: {req.reason}"
        else:
            source_entry = RosterEntry(
                roster_id=roster.id,
                employee_id=source_emp.id,
                date=req.date,
                status=ShiftStatus.LEAVE,
                is_manual_override=True,
                override_reason=f"Replaced by {target_emp.full_name}: {req.reason}",
            )
            db.add(source_entry)

        # 2. Update or create RosterEntry for target backup employee (mark as WORKING)
        target_entry = db.query(RosterEntry).filter(
            RosterEntry.roster_id == roster.id,
            RosterEntry.employee_id == target_emp.id,
            RosterEntry.date == req.date,
        ).first()

        was_off = (target_entry.status in [ShiftStatus.WEEKLY_OFF, ShiftStatus.HOLIDAY]) if target_entry else True

        if target_entry:
            target_entry.status = ShiftStatus.WORKING
            target_entry.brand_id = brand.id
            target_entry.process_id = process_id
            target_entry.shift_start = "09:00"
            target_entry.shift_end = "18:00"
            target_entry.is_manual_override = True
            target_entry.override_reason = f"Covering for {source_emp.full_name}: {req.reason}"
        else:
            target_entry = RosterEntry(
                roster_id=roster.id,
                employee_id=target_emp.id,
                date=req.date,
                status=ShiftStatus.WORKING,
                brand_id=brand.id,
                process_id=process_id,
                shift_start="09:00",
                shift_end="18:00",
                is_manual_override=True,
                override_reason=f"Covering for {source_emp.full_name}: {req.reason}",
            )
            db.add(target_entry)

        # 3. If target employee was off and is now working, award 1 Comp-Off credit
        if was_off:
            comp_off = CompOff(
                employee_id=target_emp.id,
                earned_date=req.date,
                reason=f"Emergency coverage shift for {brand.name} (Replaced {source_emp.full_name})",
                status=ApprovalStatus.APPROVED,
            )
            db.add(comp_off)

        # 4. Auto-resolve related SchedulingConflict for this date and brand
        conflicts = db.query(SchedulingConflict).filter(
            SchedulingConflict.roster_id == roster.id,
            SchedulingConflict.date == req.date,
            SchedulingConflict.brand_id == brand.id,
            SchedulingConflict.is_resolved == False,
        ).all()

        for c in conflicts:
            c.is_resolved = True
            c.resolved_by_id = user_id
            c.resolved_at = datetime.utcnow()
            c.description = f"{c.description} [Resolved: Replaced by {target_emp.full_name}]"

        # 5. Audit Log (Immutable record)
        audit = AuditLog(
            user_id=user_id,
            action="SHIFT_OVERRIDE",
            entity_type="ROSTER",
            entity_id=roster.id,
            change_details=json.dumps({
                "date": req.date.isoformat(),
                "source_employee": source_emp.full_name,
                "target_employee": target_emp.full_name,
                "brand": brand.name,
                "reason": req.reason,
                "comp_off_awarded": was_off,
            }),
        )
        db.add(audit)
        db.flush()

        # 6. Recalculate remaining conflicts count and update roster coverage
        remaining_conflicts = db.query(SchedulingConflict).filter(
            SchedulingConflict.roster_id == roster.id,
            SchedulingConflict.is_resolved == False,
        ).count()
        roster.total_conflicts = remaining_conflicts

        # Increment Roster Version
        version_num = len(roster.versions) + 1
        roster_ver = RosterVersion(
            roster_id=roster.id,
            version_number=version_num,
            change_summary=f"Shift Override on {req.date}: {target_emp.full_name} replaced {source_emp.full_name} for {brand.name}",
            created_by_id=user_id,
        )
        db.add(roster_ver)

        db.commit()
        db.refresh(roster)

        return ShiftOverrideResponse(
            success=True,
            message=f"Successfully reassigned shift to {target_emp.full_name}. Roster updated in-place.",
            roster_id=roster.id,
            date=req.date,
            source_employee_name=source_emp.full_name,
            target_employee_name=target_emp.full_name,
            brand_name=brand.name,
            new_coverage_percentage=roster.coverage_percentage,
            remaining_conflicts=roster.total_conflicts,
            audit_log_id=audit.id,
        )
