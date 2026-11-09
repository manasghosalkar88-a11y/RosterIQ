from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.allocation import EmployeeAssignment, AssignmentType
from app.models.employee import Employee
from app.models.brand import Brand
from app.models.process import Process
from app.models.user import UserRole
from app.schemas.allocation import (
    AllocationOut, AllocationCreate, AllocationUpdate,
    EmployeeMatrixRow, MatrixCell
)
from app.api.deps import get_current_user, require_roles

router = APIRouter()


def _format_allocation(a: EmployeeAssignment) -> dict:
    return {
        "id": a.id,
        "employee_id": a.employee_id,
        "employee_name": a.employee.full_name if a.employee else "",
        "employee_code": a.employee.employee_code if a.employee else "",
        "employee_pod_name": a.employee.pod.name if (a.employee and a.employee.pod) else None,
        "brand_id": a.brand_id,
        "brand_name": a.brand.name if a.brand else "",
        "brand_code": a.brand.code if a.brand else "",
        "process_id": a.process_id,
        "process_name": a.process.name if a.process else "",
        "process_code": a.process.code if a.process else "",
        "assignment_type": a.assignment_type,
        "is_active": a.is_active,
        "created_at": a.created_at,
        "updated_at": a.updated_at,
    }


@router.get("", response_model=List[AllocationOut], summary="List all employee brand-process assignments")
def list_allocations(
    employee_id: Optional[int] = None,
    brand_id: Optional[int] = None,
    process_id: Optional[int] = None,
    assignment_type: Optional[AssignmentType] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(EmployeeAssignment)
    
    if employee_id is not None:
        query = query.filter(EmployeeAssignment.employee_id == employee_id)
    if brand_id is not None:
        query = query.filter(EmployeeAssignment.brand_id == brand_id)
    if process_id is not None:
        query = query.filter(EmployeeAssignment.process_id == process_id)
    if assignment_type is not None:
        query = query.filter(EmployeeAssignment.assignment_type == assignment_type)
    if is_active is not None:
        query = query.filter(EmployeeAssignment.is_active == is_active)
        
    allocations = query.all()
    return [_format_allocation(a) for a in allocations]


@router.get("/matrix", response_model=List[EmployeeMatrixRow], summary="Get full Employee -> Pod -> Brand -> Process visual matrix")
def get_allocation_matrix(
    pod_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Returns relational matrix showing how each employee is distributed across brands and processes.
    Used by operations managers to spot over-allocation or unassigned staff.
    """
    query = db.query(Employee).filter(Employee.is_active == True)
    if pod_id is not None:
        query = query.filter(Employee.pod_id == pod_id)
        
    employees = query.order_by(Employee.employee_code).all()
    
    matrix_rows = []
    for emp in employees:
        active_assignments = [a for a in emp.assignments if a.is_active]
        
        cells = []
        primary_brands = set()
        backup_brands = set()
        
        for a in active_assignments:
            if a.brand and a.process:
                cells.append({
                    "allocation_id": a.id,
                    "brand_id": a.brand_id,
                    "brand_name": a.brand.name,
                    "brand_code": a.brand.code,
                    "process_id": a.process_id,
                    "process_name": a.process.name,
                    "process_code": a.process.code,
                    "assignment_type": a.assignment_type,
                })
                if a.assignment_type == AssignmentType.PRIMARY:
                    primary_brands.add(a.brand_id)
                else:
                    backup_brands.add(a.brand_id)
                    
        matrix_rows.append({
            "employee_id": emp.id,
            "employee_code": emp.employee_code,
            "full_name": emp.full_name,
            "designation": emp.designation,
            "pod_id": emp.pod_id,
            "pod_name": emp.pod.name if emp.pod else None,
            "default_off_pref": emp.default_off_pref,
            "primary_brand_count": len(primary_brands),
            "backup_brand_count": len(backup_brands),
            "assignments": cells,
        })
        
    return matrix_rows


@router.post("", response_model=AllocationOut, status_code=status.HTTP_201_CREATED, summary="Allocate employee to brand process")
def create_allocation(
    payload: AllocationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER))
):
    # Verify employee, brand, process exist
    emp = db.query(Employee).filter(Employee.id == payload.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    brand = db.query(Brand).filter(Brand.id == payload.brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
        
    proc = db.query(Process).filter(Process.id == payload.process_id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Process not found")

    # Check for existing allocation
    existing = db.query(EmployeeAssignment).filter_by(
        employee_id=payload.employee_id,
        brand_id=payload.brand_id,
        process_id=payload.process_id
    ).first()
    
    if existing:
        if not existing.is_active:
            # Reactivate
            existing.is_active = True
            existing.assignment_type = payload.assignment_type
            db.commit()
            db.refresh(existing)
            return _format_allocation(existing)
        raise HTTPException(
            status_code=400,
            detail=f"Employee {emp.full_name} is already assigned to {brand.name} ({proc.name})."
        )

    alloc = EmployeeAssignment(
        employee_id=payload.employee_id,
        brand_id=payload.brand_id,
        process_id=payload.process_id,
        assignment_type=payload.assignment_type,
        is_active=payload.is_active,
    )
    db.add(alloc)
    db.commit()
    db.refresh(alloc)
    return _format_allocation(alloc)


@router.put("/{allocation_id}", response_model=AllocationOut, summary="Update allocation")
def update_allocation(
    allocation_id: int,
    payload: AllocationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER))
):
    alloc = db.query(EmployeeAssignment).filter(EmployeeAssignment.id == allocation_id).first()
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation not found")
        
    if payload.assignment_type is not None:
        alloc.assignment_type = payload.assignment_type
    if payload.is_active is not None:
        alloc.is_active = payload.is_active
        
    db.commit()
    db.refresh(alloc)
    return _format_allocation(alloc)


@router.delete("/{allocation_id}", summary="Remove allocation")
def delete_allocation(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER))
):
    alloc = db.query(EmployeeAssignment).filter(EmployeeAssignment.id == allocation_id).first()
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation not found")
        
    db.delete(alloc)
    db.commit()
    return {"message": "Resource allocation removed successfully"}
