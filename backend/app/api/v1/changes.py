from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.api.deps import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.schemas.change_management import (
    BackupRecommendationResponse,
    ShiftOverrideRequest,
    ShiftOverrideResponse,
    AuditLogResponse,
)
from app.engine.change_manager import ChangeManager

router = APIRouter(prefix="/changes", tags=["Change Management & Recommendations"])


@router.get("/recommendations", response_model=List[BackupRecommendationResponse])
def get_backup_recommendations(
    date: date = Query(..., description="Target shift date"),
    brand_id: int = Query(..., description="Target brand ID"),
    process_id: Optional[int] = Query(None, description="Optional target process ID"),
    absent_employee_id: Optional[int] = Query(None, description="Unavailable specialist ID"),
    roster_id: Optional[int] = Query(None, description="Active roster ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Ranks candidate replacement specialists using multi-factor suitability scoring:
    1. Operational pod membership
    2. Explicit brand assignment (backup/secondary)
    3. Process skill certification
    4. Shift availability (weekly off / holiday)
    5. Statutory labor compliance (consecutive days <= 6)
    """
    recommendations = ChangeManager.get_backup_recommendations(
        db=db,
        target_date=date,
        brand_id=brand_id,
        process_id=process_id,
        absent_employee_id=absent_employee_id,
        roster_id=roster_id,
    )
    return recommendations


@router.post("/override", response_model=ShiftOverrideResponse)
def apply_shift_override(
    req: ShiftOverrideRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER, UserRole.POD_LEAD)),
):
    """
    Applies an atomic shift reassignment to replace an unavailable specialist.
    Updates the roster in-place with zero regression to unaffected dates,
    auto-resolves operational conflicts, awards compensatory off credits if applicable,
    and logs an immutable audit entry.
    """
    try:
        res = ChangeManager.apply_shift_override(
            db=db,
            req=req,
            user_id=current_user.id,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Shift override failed: {str(e)}",
        )


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def list_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns immutable audit trail of roster adjustments, manual overrides, and approvals.
    """
    logs = db.query(AuditLog).order_by(desc(AuditLog.timestamp)).limit(limit).all()
    return [
        AuditLogResponse(
            id=l.id,
            user_id=l.user_id,
            user_name=l.user.full_name if l.user else "System",
            action=l.action,
            entity_type=l.entity_type,
            entity_id=l.entity_id,
            change_details=l.change_details,
            timestamp=l.timestamp,
        )
        for l in logs
    ]
