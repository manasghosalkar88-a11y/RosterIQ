from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.brand import Brand
from app.models.pod import Pod
from app.models.process import Process
from app.models.operating_rule import BrandProcessRule, OperatingRuleType
from app.models.allocation import EmployeeAssignment, AssignmentType
from app.models.user import UserRole
from app.schemas.brand import BrandOut, BrandCreate, BrandUpdate, BrandProcessRuleBase
from app.api.deps import get_current_user, require_roles

router = APIRouter()


def _format_brand(b: Brand) -> dict:
    """Helper to assemble BrandOut representation with staff and operating rules."""
    distinct_primary = {a.employee_id for a in b.assignments if a.is_active and a.assignment_type == AssignmentType.PRIMARY}
    all_distinct = {a.employee_id for a in b.assignments if a.is_active}
    
    assigned_list = []
    for a in b.assignments:
        if a.is_active and a.employee:
            assigned_list.append({
                "id": a.employee.id,
                "employee_code": a.employee.employee_code,
                "full_name": a.employee.full_name,
                "designation": a.employee.designation,
                "assignment_type": a.assignment_type.value,
                "process_name": a.process.name if a.process else "All",
            })
    
    rules_list = []
    for r in b.process_rules:
        rules_list.append({
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
        })
    
    return {
        "id": b.id,
        "code": b.code,
        "name": b.name,
        "client_name": b.client_name,
        "pod_id": b.pod_id,
        "pod_name": b.pod.name if b.pod else None,
        "is_active": b.is_active,
        "notes": b.notes,
        "process_rules": rules_list,
        "assigned_employees": assigned_list,
        "assigned_count": len(distinct_primary),
        "is_single_resource": len(distinct_primary) <= 1,
        "created_at": b.created_at,
        "updated_at": b.updated_at,
    }


@router.get("", response_model=List[BrandOut], summary="List all D2C brands with staffing & rules")
def list_brands(
    pod_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(Brand)
    if pod_id is not None:
        query = query.filter(Brand.pod_id == pod_id)
    if is_active is not None:
        query = query.filter(Brand.is_active == is_active)
    
    brands = query.order_by(Brand.name).all()
    return [_format_brand(b) for b in brands]


@router.get("/{brand_id}", response_model=BrandOut, summary="Get brand by ID")
def get_brand(
    brand_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    return _format_brand(brand)


@router.post("", response_model=BrandOut, status_code=status.HTTP_201_CREATED, summary="Create brand")
def create_brand(
    payload: BrandCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER))
):
    existing = db.query(Brand).filter(Brand.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Brand code '{payload.code}' already exists")
    
    brand = Brand(
        code=payload.code.upper(),
        name=payload.name,
        client_name=payload.client_name,
        pod_id=payload.pod_id,
        is_active=payload.is_active,
        notes=payload.notes,
    )
    db.add(brand)
    db.commit()
    db.refresh(brand)
    
    # Optionally configure initial process rules
    if payload.rules:
        for r in payload.rules:
            rule = BrandProcessRule(
                brand_id=brand.id,
                process_id=r.process_id,
                rule_type=r.rule_type,
                min_headcount=r.min_headcount,
                operates_monday=r.operates_monday,
                operates_tuesday=r.operates_tuesday,
                operates_wednesday=r.operates_wednesday,
                operates_thursday=r.operates_thursday,
                operates_friday=r.operates_friday,
                operates_saturday=r.operates_saturday,
                operates_sunday=r.operates_sunday,
                operates_holidays=r.operates_holidays,
                shift_start_time=r.shift_start_time,
                shift_end_time=r.shift_end_time,
                notes=r.notes,
            )
            db.add(rule)
        db.commit()
        db.refresh(brand)
    
    return _format_brand(brand)


@router.put("/{brand_id}", response_model=BrandOut, summary="Update brand")
def update_brand(
    brand_id: int,
    payload: BrandUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER))
):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    if payload.name is not None:
        brand.name = payload.name
    if payload.client_name is not None:
        brand.client_name = payload.client_name
    if payload.pod_id is not None:
        brand.pod_id = payload.pod_id
    if payload.is_active is not None:
        brand.is_active = payload.is_active
    if payload.notes is not None:
        brand.notes = payload.notes
    
    db.commit()
    db.refresh(brand)
    return _format_brand(brand)


@router.delete("/{brand_id}", summary="Deactivate brand (safe archive)")
def deactivate_brand(
    brand_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER))
):
    """Soft deactivation prevents breaking historical roster and audit records."""
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    brand.is_active = False
    db.commit()
    return {"message": f"Brand '{brand.name}' deactivated successfully"}
