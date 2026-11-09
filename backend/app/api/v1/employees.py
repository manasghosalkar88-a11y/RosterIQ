from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.models.employee import Employee, EmploymentStatus
from app.models.pod import Pod
from app.models.allocation import EmployeeAssignment
from app.models.user import UserRole
from app.schemas.employee import EmployeeOut, EmployeeCreate, EmployeeUpdate
from app.api.deps import get_current_user, require_roles

router = APIRouter()


def _format_employee(e: Employee) -> dict:
    """Format employee record with pod details and assigned brands matrix."""
    assigned_brands = []
    for a in e.assignments:
        if a.is_active and a.brand:
            assigned_brands.append({
                "id": a.id,
                "brand_id": a.brand_id,
                "brand_name": a.brand.name,
                "brand_code": a.brand.code,
                "process_id": a.process_id,
                "process_name": a.process.name if a.process else "All",
                "process_code": a.process.code if a.process else "",
                "assignment_type": a.assignment_type,
            })

    return {
        "id": e.id,
        "employee_code": e.employee_code,
        "full_name": e.full_name,
        "email": e.email,
        "phone": e.phone,
        "designation": e.designation,
        "pod_id": e.pod_id,
        "pod_name": e.pod.name if e.pod else None,
        "joining_date": e.joining_date,
        "employment_status": e.employment_status,
        "default_off_pref": e.default_off_pref,
        "max_consecutive_days": e.max_consecutive_days,
        "is_active": e.is_active,
        "notes": e.notes,
        "assigned_brands": assigned_brands,
        "created_at": e.created_at,
        "updated_at": e.updated_at,
    }


@router.get("", response_model=List[EmployeeOut], summary="List all employees with search and filters")
def list_employees(
    search: Optional[str] = None,
    pod_id: Optional[int] = None,
    status: Optional[EmploymentStatus] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(Employee)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Employee.full_name.ilike(search_filter),
                Employee.employee_code.ilike(search_filter),
                Employee.email.ilike(search_filter),
                Employee.designation.ilike(search_filter),
            )
        )
    
    if pod_id is not None:
        query = query.filter(Employee.pod_id == pod_id)
        
    if status is not None:
        query = query.filter(Employee.employment_status == status)
        
    if is_active is not None:
        query = query.filter(Employee.is_active == is_active)
        
    employees = query.order_by(Employee.employee_code).all()
    return [_format_employee(e) for e in employees]


@router.get("/{employee_id}", response_model=EmployeeOut, summary="Get employee details by ID")
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return _format_employee(emp)


@router.post("", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED, summary="Add new employee")
def create_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER))
):
    existing_code = db.query(Employee).filter(Employee.employee_code == payload.employee_code).first()
    if existing_code:
        raise HTTPException(status_code=400, detail=f"Employee code '{payload.employee_code}' already exists")
        
    existing_email = db.query(Employee).filter(Employee.email == payload.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail=f"Employee email '{payload.email}' already exists")

    emp = Employee(
        employee_code=payload.employee_code.upper(),
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        designation=payload.designation,
        pod_id=payload.pod_id,
        joining_date=payload.joining_date,
        employment_status=payload.employment_status,
        default_off_pref=payload.default_off_pref,
        max_consecutive_days=payload.max_consecutive_days,
        is_active=payload.is_active,
        notes=payload.notes,
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return _format_employee(emp)


@router.put("/{employee_id}", response_model=EmployeeOut, summary="Update employee")
def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER, UserRole.POD_LEAD))
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    if payload.full_name is not None:
        emp.full_name = payload.full_name
    if payload.email is not None:
        emp.email = payload.email
    if payload.phone is not None:
        emp.phone = payload.phone
    if payload.designation is not None:
        emp.designation = payload.designation
    if payload.pod_id is not None:
        emp.pod_id = payload.pod_id
    if payload.joining_date is not None:
        emp.joining_date = payload.joining_date
    if payload.employment_status is not None:
        emp.employment_status = payload.employment_status
    if payload.default_off_pref is not None:
        emp.default_off_pref = payload.default_off_pref
    if payload.max_consecutive_days is not None:
        emp.max_consecutive_days = payload.max_consecutive_days
    if payload.is_active is not None:
        emp.is_active = payload.is_active
    if payload.notes is not None:
        emp.notes = payload.notes

    db.commit()
    db.refresh(emp)
    return _format_employee(emp)


@router.delete("/{employee_id}", summary="Deactivate employee (safe soft-deletion)")
def deactivate_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER))
):
    """
    Prevents accidental hard-deletion if employee has historical roster shifts.
    Soft deactivates the employee by setting is_active = False and status = INACTIVE.
    """
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    emp.is_active = False
    emp.employment_status = EmploymentStatus.INACTIVE
    db.commit()
    return {"message": f"Employee '{emp.full_name}' ({emp.employee_code}) deactivated successfully."}
