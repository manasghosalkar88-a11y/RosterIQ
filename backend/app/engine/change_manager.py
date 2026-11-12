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
from typing import List, Optional, Tuple, Dict, Set
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.roster import Roster, RosterEntry, RosterVersion, ShiftStatus
from app.models.conflict import SchedulingConflict, ConflictType, ConflictSeverity
from app.models.employee import Employee, EmploymentStatus
from app.models.brand import Brand
from app.models.process import Process
from app.models.pod import Pod
from app.models.allocation import EmployeeAssignment, AssignmentType
from app.models.operating_rule import BrandProcessRule
from app.models.holiday import PublicHoliday
from app.models.leave import LeaveRequest, CompOff, ApprovalStatus
from app.models.audit import AuditLog
from app.schemas.change_management import (
    BackupRecommendationResponse,
    BackupEvaluationSummary,
    ExclusionReasonSummary,
    ScoreBreakdown,
    ShiftOverrideRequest,
    ShiftOverrideResponse,
)

EXCLUSION_META = {
    "APPROVED_LEAVE": (
        "Employee on Approved Leave",
        "Employee has an approved leave or scheduled comp-off overlapping the required date(s).",
    ),
    "ALREADY_SCHEDULED": (
        "Already Scheduled on Conflicting Shift",
        "Employee is already assigned to a working shift on the required date(s).",
    ),
    "HOLIDAY_RESTRICTION": (
        "Public Holiday Restriction",
        "Required date falls on a public holiday without holiday operation authorization.",
    ),
    "POD_RESTRICTION": (
        "Organizational Pod Restriction",
        "Brand policy restricts backup assignment outside the primary operational pod.",
    ),
    "MISSING_CERTIFICATION": (
        "Missing Mandatory Certification",
        "Employee lacks one or more mandatory process certifications required for this role.",
    ),
    "NO_MATCHING_SKILLS": (
        "No Matching Skills Available",
        "Employee does not possess the required operational process skills.",
    ),
    "MAX_CONSECUTIVE_DAYS_EXCEEDED": (
        "Consecutive Working-Day Limit Exceeded",
        "Assigning this shift would exceed the employee's statutory consecutive working-day limit.",
    ),
    "MAX_WEEKLY_HOURS_EXCEEDED": (
        "Maximum Working Hours Exceeded",
        "Assigning this shift would exceed the employee's configured weekly working-hour limit.",
    ),
    "INSUFFICIENT_REST_PERIOD": (
        "Insufficient Rest Period Between Shifts",
        "Rest gap before/after adjacent scheduled shift is below the mandatory minimum rest period.",
    ),
}


def _parse_hhmm(value: Optional[str], default_hour: float = 9.0) -> float:
    if not value or ":" not in value:
        return default_hour
    try:
        parts = value.strip().split(":")
        return int(parts[0]) + int(parts[1]) / 60.0
    except Exception:
        return default_hour


def _shift_span_hours(shift_start: Optional[str], shift_end: Optional[str]) -> float:
    s = _parse_hhmm(shift_start, 9.0)
    e = _parse_hhmm(shift_end, 18.0)
    span = e - s
    if span <= 0:
        span += 24.0
    return span


def _effective_working_hours(shift_start: Optional[str], shift_end: Optional[str]) -> float:
    span = _shift_span_hours(shift_start, shift_end)
    # Standard 9-hour office span includes a 1-hour meal break (8h net work)
    return round(span - 1.0, 2) if span >= 8.5 else round(span, 2)


def _rest_gap_before(prev_start: Optional[str], prev_end: Optional[str], req_start: Optional[str]) -> float:
    ps = _parse_hhmm(prev_start, 9.0)
    pe = _parse_hhmm(prev_end, 18.0)
    rs = _parse_hhmm(req_start, 9.0)
    if pe <= ps:
        # Previous shift ran overnight and ended on the morning of target date
        return round(rs - pe, 2)
    return round((24.0 - pe) + rs, 2)


def _rest_gap_after(req_start: Optional[str], req_end: Optional[str], next_start: Optional[str]) -> float:
    rs = _parse_hhmm(req_start, 9.0)
    re = _parse_hhmm(req_end, 18.0)
    ns = _parse_hhmm(next_start, 9.0)
    if re <= rs:
        return round(ns - re, 2)
    return round((24.0 - re) + ns, 2)


class ChangeManager:
    @staticmethod
    def evaluate_backup_candidates(
        db: Session,
        target_dates: List[date],
        brand_id: int,
        process_id: Optional[int] = None,
        absent_employee_id: Optional[int] = None,
        roster_id: Optional[int] = None,
        limit: Optional[int] = 15,
    ) -> Tuple[List[BackupRecommendationResponse], BackupEvaluationSummary]:
        """
        Evaluates all active employees against hard availability, qualification,
        workload, and labour-law eligibility gates, ranks eligible candidates using
        weighted scoring (35% skill, 25% availability, 15% pod, 15% workload, 10% cert),
        and captures exact exclusion diagnostics.
        """
        sorted_dates = sorted(set(target_dates))
        if not sorted_dates:
            return [], BackupEvaluationSummary()

        brand = db.query(Brand).filter(Brand.id == brand_id).first()
        if not brand:
            return [], BackupEvaluationSummary()

        absent_emp = None
        if absent_employee_id:
            absent_emp = db.query(Employee).filter(Employee.id == absent_employee_id).first()

        # Resolve target process & operating rule
        process = db.query(Process).filter(Process.id == process_id).first() if process_id else None
        rule = None
        if process:
            rule = db.query(BrandProcessRule).filter(
                BrandProcessRule.brand_id == brand.id,
                BrandProcessRule.process_id == process.id,
            ).first()
        if not rule:
            rule = db.query(BrandProcessRule).filter(BrandProcessRule.brand_id == brand.id).first()
            if not process and rule:
                process = db.query(Process).filter(Process.id == rule.process_id).first()

        req_shift_start = rule.shift_start_time if rule else "09:00"
        req_shift_end = rule.shift_end_time if rule else "18:00"
        if absent_emp and roster_id:
            absent_entry = db.query(RosterEntry).filter(
                RosterEntry.roster_id == roster_id,
                RosterEntry.employee_id == absent_emp.id,
                RosterEntry.date == sorted_dates[0],
            ).first()
            if absent_entry and absent_entry.shift_start and absent_entry.shift_end:
                req_shift_start = absent_entry.shift_start
                req_shift_end = absent_entry.shift_end

        req_shift_str = f"{req_shift_start} - {req_shift_end}"
        added_shift_hours = _effective_working_hours(req_shift_start, req_shift_end)
        req_skills: List[str] = list(process.required_skills) if process else []
        mand_certs: List[str] = list(process.mandatory_certifications) if process else []
        target_pod_id = absent_emp.pod_id if (absent_emp and absent_emp.pod_id) else brand.pod_id

        # Query active employees (excluding absent employee)
        cand_query = db.query(Employee).filter(
            Employee.is_active == True,
            Employee.employment_status == EmploymentStatus.ACTIVE,
        )
        if absent_employee_id:
            cand_query = cand_query.filter(Employee.id != absent_employee_id)
        candidates = cand_query.order_by(Employee.id).all()

        # Preload roster entries across lookback + target + lookahead window
        min_d = sorted_dates[0]
        max_d = sorted_dates[-1]
        window_start = min_d - timedelta(days=14)
        window_end = max_d + timedelta(days=14)

        entries_by_emp_date: Dict[Tuple[int, date], RosterEntry] = {}
        if roster_id:
            all_window_entries = db.query(RosterEntry).filter(
                RosterEntry.roster_id == roster_id,
                RosterEntry.date >= window_start,
                RosterEntry.date <= window_end,
            ).all()
            entries_by_emp_date = {(e.employee_id, e.date): e for e in all_window_entries}

        # Preload approved leave requests overlapping target dates
        approved_leaves = db.query(LeaveRequest).filter(
            LeaveRequest.status == ApprovalStatus.APPROVED,
            LeaveRequest.start_date <= max_d,
            LeaveRequest.end_date >= min_d,
        ).all()
        leaves_by_emp: Dict[int, List[LeaveRequest]] = {}
        for lv in approved_leaves:
            leaves_by_emp.setdefault(lv.employee_id, []).append(lv)

        # Preload public holidays in target dates (global or matching brand)
        holidays = db.query(PublicHoliday).filter(
            PublicHoliday.date.in_(sorted_dates),
            or_(PublicHoliday.brand_id == None, PublicHoliday.brand_id == brand.id),
        ).all()
        holiday_dates: Set[date] = {h.date for h in holidays}

        # Preload active assignments and process code map
        all_procs = {p.id: p for p in db.query(Process).all()}
        assignments = db.query(EmployeeAssignment).filter(EmployeeAssignment.is_active == True).all()
        emp_assignments: Dict[int, List[EmployeeAssignment]] = {}
        for a in assignments:
            emp_assignments.setdefault(a.employee_id, []).append(a)

        exclusion_buckets: Dict[str, List[str]] = {}
        recommendations: List[BackupRecommendationResponse] = []

        def _record_exclusion(reason_code: str, emp_name: str):
            exclusion_buckets.setdefault(reason_code, []).append(emp_name)

        for cand in candidates:
            cand_entries_map = {
                d: entries_by_emp_date[(cand.id, d)]
                for (eid, d) in entries_by_emp_date
                if eid == cand.id
            }

            # 1. Availability Gate: Approved Leave / Comp-Off overlap
            has_leave_req = any(
                lv.start_date <= d <= lv.end_date
                for d in sorted_dates
                for lv in leaves_by_emp.get(cand.id, [])
            )
            entry_statuses = [
                cand_entries_map[d].status if d in cand_entries_map else ShiftStatus.WEEKLY_OFF
                for d in sorted_dates
            ]
            if has_leave_req or any(st in (ShiftStatus.LEAVE, ShiftStatus.COMP_OFF) for st in entry_statuses):
                _record_exclusion("APPROVED_LEAVE", cand.full_name)
                continue

            # 2. Availability Gate: Already Scheduled on conflicting shift
            if any(st == ShiftStatus.WORKING for st in entry_statuses):
                _record_exclusion("ALREADY_SCHEDULED", cand.full_name)
                continue

            # 3. Availability Gate: Public Holiday constraint when rule disallows holidays
            if any(d in holiday_dates for d in sorted_dates) and rule and not rule.operates_holidays:
                _record_exclusion("HOLIDAY_RESTRICTION", cand.full_name)
                continue

            # 4. Organizational Pod Restriction Gate
            same_pod = bool(target_pod_id and cand.pod_id == target_pod_id)
            if not same_pod and not brand.allow_cross_pod_backup:
                _record_exclusion("POD_RESTRICTION", cand.full_name)
                continue

            # 5. Mandatory Certification Gate
            cand_certs = set(cand.certifications)
            if mand_certs and not set(mand_certs).issubset(cand_certs):
                _record_exclusion("MISSING_CERTIFICATION", cand.full_name)
                continue

            # 6. Required Skill Gate
            cand_assigns = emp_assignments.get(cand.id, [])
            cand_skills = set(cand.skills)
            for a in cand_assigns:
                proc_obj = all_procs.get(a.process_id)
                if proc_obj:
                    cand_skills.add(proc_obj.code)
                    cand_skills.update(proc_obj.required_skills)

            matched_skills = [s for s in req_skills if s in cand_skills]
            if req_skills and len(matched_skills) == 0:
                _record_exclusion("NO_MATCHING_SKILLS", cand.full_name)
                continue

            # 7. Labour Law Gate: Consecutive Working Days across lookback + target + lookahead
            max_streak_projected, streak_before = ChangeManager._projected_consecutive_streak(
                cand_entries_map=cand_entries_map,
                target_dates=sorted_dates,
                max_limit=cand.max_consecutive_days,
            )
            if max_streak_projected > cand.max_consecutive_days:
                _record_exclusion("MAX_CONSECUTIVE_DAYS_EXCEEDED", cand.full_name)
                continue

            # 8. Workload & Labour Law Gate: Weekly Working Hours Limit
            current_week_hours, projected_week_hours = ChangeManager._projected_weekly_hours(
                cand_entries_map=cand_entries_map,
                target_dates=sorted_dates,
                added_shift_hours=added_shift_hours,
            )
            if projected_week_hours > float(cand.max_weekly_hours):
                _record_exclusion("MAX_WEEKLY_HOURS_EXCEEDED", cand.full_name)
                continue

            # 9. Labour Law Gate: Minimum Rest Period Between Shifts
            min_rest_gap = ChangeManager._min_rest_gap_hours(
                cand_entries_map=cand_entries_map,
                target_dates=sorted_dates,
                req_start=req_shift_start,
                req_end=req_shift_end,
            )
            if min_rest_gap is not None and min_rest_gap < float(cand.min_rest_hours):
                _record_exclusion("INSUFFICIENT_REST_PERIOD", cand.full_name)
                continue

            # --- ALL MANDATORY ELIGIBILITY & LABOUR LAW GATES PASSED ---
            # Weighted Ranking (Skill 35%, Availability 25%, Pod 15%, Workload 15%, Certification 10%)
            skill_ratio = (len(matched_skills) / len(req_skills)) if req_skills else 1.0
            brand_assign_types = [a.assignment_type for a in cand_assigns if a.brand_id == brand_id]
            proc_exp = bool(process and any(a.process_id == process.id for a in cand_assigns))
            familiarity_pts = 0.0
            if AssignmentType.BACKUP in brand_assign_types or AssignmentType.SECONDARY in brand_assign_types:
                familiarity_pts = 10.0
            elif AssignmentType.PRIMARY in brand_assign_types:
                familiarity_pts = 7.0
            elif proc_exp:
                familiarity_pts = 5.0
            elif cand_assigns:
                familiarity_pts = 2.0
            skill_score = round(min(35.0, skill_ratio * 25.0 + familiarity_pts), 2)

            primary_status = entry_statuses[0]
            if primary_status == ShiftStatus.WEEKLY_OFF and not any(d in holiday_dates for d in sorted_dates):
                availability_score = 25.0
            elif primary_status == ShiftStatus.HOLIDAY or any(d in holiday_dates for d in sorted_dates):
                availability_score = 21.0
            else:
                availability_score = 23.0

            pod_score = 15.0 if same_pod else 6.0

            hours_headroom = max(0.0, 1.0 - (projected_week_hours / max(1.0, float(cand.max_weekly_hours))))
            streak_headroom = max(0.0, 1.0 - (max_streak_projected / max(1.0, float(cand.max_consecutive_days))))
            workload_score = round(min(15.0, hours_headroom * 9.0 + streak_headroom * 6.0), 2)

            extra_certs = len(cand_certs - set(mand_certs))
            cert_score = round(min(10.0, 7.0 + min(3.0, float(extra_certs))), 2)

            final_score = max(1, min(100, round(skill_score + availability_score + pod_score + workload_score + cert_score)))
            requires_comp_off = primary_status in (ShiftStatus.WEEKLY_OFF, ShiftStatus.HOLIDAY) or any(
                d in holiday_dates for d in sorted_dates
            )

            reasons: List[str] = []
            if same_pod:
                reasons.append(f"Same operational pod ({cand.pod.name if cand.pod else 'Pod'})")
            else:
                reasons.append(f"Eligible cross-pod specialist ({cand.pod.name if cand.pod else 'Adjacent Pod'})")

            if AssignmentType.BACKUP in brand_assign_types or AssignmentType.SECONDARY in brand_assign_types:
                reasons.append(f"Designated backup for {brand.name}")
            elif AssignmentType.PRIMARY in brand_assign_types:
                reasons.append(f"Brand-certified on {brand.name}")

            if matched_skills:
                reasons.append(f"Skill match {round(skill_ratio * 100)}% ({', '.join(matched_skills)})")
            if mand_certs:
                reasons.append(f"Mandatory cert verified ({', '.join(mand_certs)})")

            if requires_comp_off:
                reasons.append("Free on Weekly Off/Holiday (Comp-Off eligible)")
            else:
                reasons.append("Fully available for target shift window")

            reasons.append(
                f"Workload {projected_week_hours}h/{cand.max_weekly_hours}h · Streak {max_streak_projected}/{cand.max_consecutive_days}d"
            )
            if min_rest_gap is not None:
                reasons.append(f"Rest gap {min_rest_gap}h (min {cand.min_rest_hours}h)")

            rec_summary = (
                f"{'Top pod match' if same_pod else 'Cross-pod backup'} with {round(skill_ratio * 100)}% skill match, "
                f"{'verified certifications, ' if mand_certs else ''}"
                f"{projected_week_hours}h/{cand.max_weekly_hours}h weekly load, and "
                f"{max_streak_projected}/{cand.max_consecutive_days} consecutive days."
            )

            recommendations.append(
                BackupRecommendationResponse(
                    employee_id=cand.id,
                    employee_code=cand.employee_code,
                    full_name=cand.full_name,
                    pod_id=cand.pod_id,
                    pod_name=cand.pod.name if cand.pod else "General",
                    designation=cand.designation,
                    current_status=primary_status,
                    available_shift=req_shift_str,
                    pod_proximity="SAME_POD" if same_pod else "ADJACENT_POD",
                    suitability_score=final_score,
                    score_breakdown=ScoreBreakdown(
                        skill_score=skill_score,
                        availability_score=availability_score,
                        pod_score=pod_score,
                        workload_score=workload_score,
                        certification_score=cert_score,
                    ),
                    skill_match_pct=round(skill_ratio * 100.0, 1),
                    matched_skills=matched_skills,
                    certification_status="VERIFIED" if mand_certs else "NOT_REQUIRED",
                    certifications=sorted(cand_certs),
                    current_weekly_hours=current_week_hours,
                    projected_weekly_hours=projected_week_hours,
                    max_weekly_hours=cand.max_weekly_hours,
                    consecutive_days_before=streak_before,
                    consecutive_days_after=max_streak_projected,
                    max_consecutive_days=cand.max_consecutive_days,
                    min_rest_hours_gap=min_rest_gap,
                    min_rest_hours_required=cand.min_rest_hours,
                    eligibility_status="ELIGIBLE",
                    is_labor_compliant=True,
                    requires_comp_off=requires_comp_off,
                    recommendation_summary=rec_summary,
                    match_reasons=reasons,
                )
            )

        recommendations.sort(
            key=lambda r: (
                r.suitability_score,
                r.score_breakdown.pod_score if r.score_breakdown else 0.0,
                r.score_breakdown.skill_score if r.score_breakdown else 0.0,
                r.score_breakdown.workload_score if r.score_breakdown else 0.0,
                -r.employee_id,
            ),
            reverse=True,
        )

        excl_summaries = [
            ExclusionReasonSummary(
                code=code,
                label=EXCLUSION_META[code][0],
                count=len(names),
                description=EXCLUSION_META[code][1],
                employee_names=names,
            )
            for code, names in sorted(exclusion_buckets.items(), key=lambda kv: len(kv[1]), reverse=True)
        ]

        summary = BackupEvaluationSummary(
            total_evaluated=len(candidates),
            eligible_count=len(recommendations),
            excluded_count=len(candidates) - len(recommendations),
            target_brand_id=brand.id,
            target_brand_name=brand.name,
            target_process_id=process.id if process else None,
            target_process_name=process.name if process else None,
            required_shift=req_shift_str,
            required_skills=req_skills,
            mandatory_certifications=mand_certs,
            evaluated_dates=[d.isoformat() for d in sorted_dates],
            exclusion_reasons=excl_summaries,
        )

        return (recommendations[:limit] if limit is not None else recommendations), summary

    @staticmethod
    def _projected_consecutive_streak(
        cand_entries_map: Dict[date, RosterEntry],
        target_dates: List[date],
        max_limit: int,
    ) -> Tuple[int, int]:
        """Calculates maximum contiguous WORKING streak intersecting target_dates, plus prior streak."""
        min_d = target_dates[0]
        max_d = target_dates[-1]
        target_set = set(target_dates)

        # Prior contiguous working streak immediately leading up to min_d
        streak_before = 0
        check_d = min_d - timedelta(days=1)
        for _ in range(max_limit + 7):
            entry = cand_entries_map.get(check_d)
            if entry and entry.status == ShiftStatus.WORKING:
                streak_before += 1
                check_d -= timedelta(days=1)
            else:
                break

        scan_start = min_d - timedelta(days=max_limit + 5)
        scan_end = max_d + timedelta(days=max_limit + 5)
        cur = scan_start
        running = 0
        touches_target = False
        max_touching_streak = 0

        while cur <= scan_end:
            is_working = (cur in target_set) or (
                cur in cand_entries_map and cand_entries_map[cur].status == ShiftStatus.WORKING
            )
            if is_working:
                running += 1
                if cur in target_set:
                    touches_target = True
                if touches_target:
                    max_touching_streak = max(max_touching_streak, running)
            else:
                running = 0
                touches_target = False
            cur += timedelta(days=1)

        return max_touching_streak, streak_before

    @staticmethod
    def _projected_weekly_hours(
        cand_entries_map: Dict[date, RosterEntry],
        target_dates: List[date],
        added_shift_hours: float,
    ) -> Tuple[float, float]:
        """Computes existing weekly hours and projected weekly hours across any ISO week touched."""
        target_set = set(target_dates)
        weeks_touched: Dict[Tuple[int, int], List[date]] = {}
        for d in target_dates:
            iso = d.isocalendar()
            weeks_touched.setdefault((iso[0], iso[1]), []).append(d)

        max_existing = 0.0
        max_projected = 0.0

        for week_key, week_targets in weeks_touched.items():
            # Find Monday..Sunday of this ISO week
            ref_d = week_targets[0]
            monday = ref_d - timedelta(days=ref_d.weekday())
            existing_hrs = 0.0
            added_hrs = 0.0
            for offset in range(7):
                day = monday + timedelta(days=offset)
                entry = cand_entries_map.get(day)
                if entry and entry.status == ShiftStatus.WORKING:
                    existing_hrs += _effective_working_hours(entry.shift_start, entry.shift_end)
                elif day in target_set:
                    added_hrs += added_shift_hours

            max_existing = max(max_existing, round(existing_hrs, 2))
            max_projected = max(max_projected, round(existing_hrs + added_hrs, 2))

        return max_existing, max_projected

    @staticmethod
    def _min_rest_gap_hours(
        cand_entries_map: Dict[date, RosterEntry],
        target_dates: List[date],
        req_start: str,
        req_end: str,
    ) -> Optional[float]:
        """Returns minimum rest gap (in hours) against adjacent day shifts, or None if no adjacent shifts."""
        target_set = set(target_dates)
        gaps: List[float] = []

        for d in target_dates:
            prev_d = d - timedelta(days=1)
            next_d = d + timedelta(days=1)

            if prev_d in target_set:
                gaps.append(_rest_gap_before(req_start, req_end, req_start))
            elif prev_d in cand_entries_map and cand_entries_map[prev_d].status == ShiftStatus.WORKING:
                pe = cand_entries_map[prev_d]
                gaps.append(_rest_gap_before(pe.shift_start, pe.shift_end, req_start))

            if next_d in target_set:
                gaps.append(_rest_gap_after(req_start, req_end, req_start))
            elif next_d in cand_entries_map and cand_entries_map[next_d].status == ShiftStatus.WORKING:
                ne = cand_entries_map[next_d]
                gaps.append(_rest_gap_after(req_start, req_end, ne.shift_start))

        return min(gaps) if gaps else None

    @staticmethod
    def get_backup_recommendations(
        db: Session,
        target_date: date,
        brand_id: int,
        process_id: Optional[int] = None,
        absent_employee_id: Optional[int] = None,
        roster_id: Optional[int] = None,
        end_date: Optional[date] = None,
    ) -> List[BackupRecommendationResponse]:
        """
        Backward-compatible wrapper returning ranked eligible replacement specialists.
        """
        end_d = end_date or target_date
        if end_d < target_date:
            end_d = target_date
        dates = [target_date + timedelta(days=i) for i in range((end_d - target_date).days + 1)]
        recs, _ = ChangeManager.evaluate_backup_candidates(
            db=db,
            target_dates=dates,
            brand_id=brand_id,
            process_id=process_id,
            absent_employee_id=absent_employee_id,
            roster_id=roster_id,
        )
        return recs

    @staticmethod
    def validate_candidate_eligibility(
        db: Session,
        candidate_id: int,
        target_dates: List[date],
        brand_id: int,
        process_id: Optional[int] = None,
        absent_employee_id: Optional[int] = None,
        roster_id: Optional[int] = None,
    ) -> Tuple[bool, Optional[str], Optional[BackupRecommendationResponse]]:
        """
        Revalidates a specific candidate against all mandatory eligibility, skill, certification,
        workload, and labour-law rules using live database state.
        """
        emp = db.query(Employee).filter(
            Employee.id == candidate_id,
            Employee.is_active == True,
            Employee.employment_status == EmploymentStatus.ACTIVE,
        ).first()
        if not emp:
            return False, f"Selected backup employee #{candidate_id} is inactive or no longer exists.", None

        if absent_employee_id and candidate_id == absent_employee_id:
            return False, "Backup candidate cannot be the same employee being replaced.", None

        recs, summary = ChangeManager.evaluate_backup_candidates(
            db=db,
            target_dates=target_dates,
            brand_id=brand_id,
            process_id=process_id,
            absent_employee_id=absent_employee_id,
            roster_id=roster_id,
            limit=None,
        )
        matched = next((r for r in recs if r.employee_id == candidate_id), None)
        if matched:
            return True, None, matched

        # Find exact reason from exclusion buckets cleanly
        for excl in summary.exclusion_reasons:
            if emp.full_name in excl.employee_names:
                return False, f"[{excl.code}] {emp.full_name} is no longer eligible: {excl.label} ({excl.description})", None

        return False, f"{emp.full_name} failed live eligibility/compliance revalidation.", None

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

        # Look back up to 14 days prior
        start_lookback = target_date - timedelta(days=14)
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
            st = prior_dict.get(current_check)
            if st == ShiftStatus.WORKING:
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
