from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.operating_rule import BrandProcessRule, OperatingRuleType
from app.models.brand import Brand
from app.models.process import Process
from app.models.user import UserRole
from app.schemas.brand import BrandProcessRuleOut, BrandProcessRuleBase
from app.schemas.allocation import OperatingRuleUpdate
from app.api.deps import get_current_user, require_roles

router = APIRouter()


def _format_rule(r: BrandProcessRule) -> dict:
    return {
        "id": r.id,
        "brand_id": r.brand_id,
        "process_id": r.process_id,
        "process_name": r.process.name if r.process else "",
        "process_code": r.process.code if r.process else "",
        "rule_type": r.rule_type,
        "min_headcount": r.min_headcount,
        "operates_monday": r.operates_monday,
        "operates_tuesday": r.operates_tuesday,
        "operates_wednesday": r.operates_wednesday,
        "operates_thursday": r.operates_thursday,
        "operates_friday": r.operates_friday,
        "operates_saturday": r.operates_saturday,
        "operates_sunday": r.operates_sunday,
        "operates_holidays": r.operates_holidays,
        "shift_start_time": r.shift_start_time,
        "shift_end_time": r.shift_end_time,
        "notes": r.notes,
    }


@router.get("", response_model=List[BrandProcessRuleOut], summary="List all brand process operating rules")
def list_rules(
    brand_id: Optional[int] = None,
    process_id: Optional[int] = None,
    rule_type: Optional[OperatingRuleType] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(BrandProcessRule)
    if brand_id is not None:
        query = query.filter(BrandProcessRule.brand_id == brand_id)
    if process_id is not None:
        query = query.filter(BrandProcessRule.process_id == process_id)
    if rule_type is not None:
        query = query.filter(BrandProcessRule.rule_type == rule_type)
        
    rules = query.all()
    return [_format_rule(r) for r in rules]


@router.put("/{rule_id}", response_model=BrandProcessRuleOut, summary="Update operating rule and calendar requirements")
def update_rule(
    rule_id: int,
    payload: OperatingRuleUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER))
):
    rule = db.query(BrandProcessRule).filter(BrandProcessRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Operating rule not found")

    if payload.rule_type is not None:
        rule.rule_type = payload.rule_type
        # Automatically update day operating flags based on standard rule types
        if payload.rule_type == OperatingRuleType.EVERY_DAY_365:
            rule.operates_sunday = True
            rule.operates_holidays = True
        elif payload.rule_type == OperatingRuleType.EXCEPT_PUBLIC_HOLIDAYS:
            rule.operates_sunday = True
            rule.operates_holidays = False
        elif payload.rule_type == OperatingRuleType.EXCEPT_SUNDAYS_AND_HOLIDAYS:
            rule.operates_sunday = False
            rule.operates_holidays = False

    if payload.min_headcount is not None:
        rule.min_headcount = max(1, payload.min_headcount)
    if payload.operates_sunday is not None:
        rule.operates_sunday = payload.operates_sunday
    if payload.operates_holidays is not None:
        rule.operates_holidays = payload.operates_holidays
    if payload.shift_start_time is not None:
        rule.shift_start_time = payload.shift_start_time
    if payload.shift_end_time is not None:
        rule.shift_end_time = payload.shift_end_time
    if payload.notes is not None:
        rule.notes = payload.notes

    db.commit()
    db.refresh(rule)
    return _format_rule(rule)
