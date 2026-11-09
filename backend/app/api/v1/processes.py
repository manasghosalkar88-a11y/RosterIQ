from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.process import Process
from app.models.user import UserRole
from app.schemas.process import ProcessOut, ProcessCreate, ProcessUpdate
from app.api.deps import get_current_user, require_roles

router = APIRouter()


@router.get("", response_model=List[ProcessOut], summary="List all operational processes")
def list_processes(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(Process)
    if is_active is not None:
        query = query.filter(Process.is_active == is_active)
    return query.order_by(Process.code).all()


@router.get("/{process_id}", response_model=ProcessOut, summary="Get process by ID")
def get_process(
    process_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    proc = db.query(Process).filter(Process.id == process_id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Process not found")
    return proc


@router.post("", response_model=ProcessOut, status_code=status.HTTP_201_CREATED, summary="Dynamically create new process")
def create_process(
    payload: ProcessCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER))
):
    existing = db.query(Process).filter(Process.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Process code '{payload.code}' already exists")
    
    proc = Process(
        code=payload.code.upper(),
        name=payload.name,
        description=payload.description,
        is_active=payload.is_active,
    )
    db.add(proc)
    db.commit()
    db.refresh(proc)
    return proc


@router.put("/{process_id}", response_model=ProcessOut, summary="Update process")
def update_process(
    process_id: int,
    payload: ProcessUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER))
):
    proc = db.query(Process).filter(Process.id == process_id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Process not found")
    
    if payload.name is not None:
        proc.name = payload.name
    if payload.description is not None:
        proc.description = payload.description
    if payload.is_active is not None:
        proc.is_active = payload.is_active
    
    db.commit()
    db.refresh(proc)
    return proc
