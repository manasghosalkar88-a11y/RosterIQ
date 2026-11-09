from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.api.deps import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.conflict import SchedulingConflict, ConflictSeverity, ConflictType
from app.schemas.roster import ConflictResponse
from pydantic import BaseModel

router = APIRouter(prefix="/conflicts", tags=["Conflicts & Alerts"])


class ConflictResolveRequest(BaseModel):
    notes: Optional[str] = None


class ConflictStatsResponse(BaseModel):
    total_conflicts: int
    critical_count: int
    high_count: int
    medium_count: int
    resolved_count: int
    resolution_rate: float


@router.get("", response_model=List[ConflictResponse])
def list_conflicts(
    roster_id: Optional[int] = Query(None, description="Filter by Roster ID"),
    severity: Optional[ConflictSeverity] = Query(None, description="Filter by Severity"),
    is_resolved: Optional[bool] = Query(None, description="Filter by resolution state"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all detected scheduling conflicts and operational coverage alerts.
    """
    query = db.query(SchedulingConflict)
    if roster_id is not None:
        query = query.filter(SchedulingConflict.roster_id == roster_id)
    if severity is not None:
        query = query.filter(SchedulingConflict.severity == severity)
    if is_resolved is not None:
        query = query.filter(SchedulingConflict.is_resolved == is_resolved)

    conflicts = query.order_by(
        SchedulingConflict.is_resolved.asc(),
        desc(SchedulingConflict.severity),
        SchedulingConflict.date.asc(),
    ).all()

    return [
        ConflictResponse(
            id=c.id,
            roster_id=c.roster_id,
            date=c.date,
            brand_id=c.brand_id,
            brand_name=c.brand.name if c.brand else None,
            process_id=c.process_id,
            process_name=c.process.name if c.process else None,
            employee_id=c.employee_id,
            employee_name=c.employee.full_name if c.employee else None,
            conflict_type=c.conflict_type,
            severity=c.severity,
            title=c.title,
            description=c.description,
            recommended_action=c.recommended_action,
            is_resolved=c.is_resolved,
        )
        for c in conflicts
    ]


@router.get("/stats", response_model=ConflictStatsResponse)
def get_conflict_stats(
    roster_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns aggregate conflict metrics and resolution health.
    """
    query = db.query(SchedulingConflict)
    if roster_id is not None:
        query = query.filter(SchedulingConflict.roster_id == roster_id)

    all_conflicts = query.all()
    total = len(all_conflicts)
    critical = sum(1 for c in all_conflicts if c.severity == ConflictSeverity.CRITICAL)
    high = sum(1 for c in all_conflicts if c.severity == ConflictSeverity.HIGH)
    medium = sum(1 for c in all_conflicts if c.severity in [ConflictSeverity.MEDIUM, ConflictSeverity.LOW])
    resolved = sum(1 for c in all_conflicts if c.is_resolved)
    rate = round((resolved / total * 100.0), 1) if total > 0 else 100.0

    return ConflictStatsResponse(
        total_conflicts=total,
        critical_count=critical,
        high_count=high,
        medium_count=medium,
        resolved_count=resolved,
        resolution_rate=rate,
    )


@router.put("/{conflict_id}/resolve", response_model=ConflictResponse)
def resolve_conflict(
    conflict_id: int,
    body: ConflictResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER, UserRole.POD_LEAD)),
):
    """
    Mark a scheduling conflict as resolved with optional resolution notes.
    """
    conflict = db.query(SchedulingConflict).filter(SchedulingConflict.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conflict not found.")

    conflict.is_resolved = True
    conflict.resolved_by_id = current_user.id
    conflict.resolved_at = datetime.utcnow()
    if body.notes:
        conflict.description = f"{conflict.description} [Resolved: {body.notes}]"

    db.commit()
    db.refresh(conflict)

    return ConflictResponse(
        id=conflict.id,
        roster_id=conflict.roster_id,
        date=conflict.date,
        brand_id=conflict.brand_id,
        brand_name=conflict.brand.name if conflict.brand else None,
        process_id=conflict.process_id,
        process_name=conflict.process.name if conflict.process else None,
        employee_id=conflict.employee_id,
        employee_name=conflict.employee.full_name if conflict.employee else None,
        conflict_type=conflict.conflict_type,
        severity=conflict.severity,
        title=conflict.title,
        description=conflict.description,
        recommended_action=conflict.recommended_action,
        is_resolved=conflict.is_resolved,
    )
