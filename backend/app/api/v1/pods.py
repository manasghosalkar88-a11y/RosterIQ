from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.pod import Pod
from app.models.employee import Employee
from app.models.user import UserRole
from app.schemas.pod import PodOut, PodCreate, PodUpdate
from app.api.deps import get_current_user, require_roles

router = APIRouter()


@router.get("", response_model=List[PodOut], summary="List all operational pods")
def list_pods(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(Pod)
    if is_active is not None:
        query = query.filter(Pod.is_active == is_active)
    
    pods = query.order_by(Pod.code).all()
    
    # Calculate counts dynamically
    results = []
    for p in pods:
        p_dict = {
            "id": p.id,
            "code": p.code,
            "name": p.name,
            "description": p.description,
            "pod_lead_id": p.pod_lead_id,
            "lead": p.lead,
            "is_active": p.is_active,
            "employee_count": len(p.employees),
            "brand_count": len(p.brands),
            "created_at": p.created_at,
            "updated_at": p.updated_at,
        }
        results.append(p_dict)
    
    return results


@router.get("/{pod_id}", response_model=PodOut, summary="Get pod by ID")
def get_pod(
    pod_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    pod = db.query(Pod).filter(Pod.id == pod_id).first()
    if not pod:
        raise HTTPException(status_code=404, detail="Pod not found")
    
    return {
        "id": pod.id,
        "code": pod.code,
        "name": pod.name,
        "description": pod.description,
        "pod_lead_id": pod.pod_lead_id,
        "lead": pod.lead,
        "is_active": pod.is_active,
        "employee_count": len(pod.employees),
        "brand_count": len(pod.brands),
        "created_at": pod.created_at,
        "updated_at": pod.updated_at,
    }


@router.post("", response_model=PodOut, status_code=status.HTTP_201_CREATED, summary="Create new pod")
def create_pod(
    payload: PodCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER))
):
    existing = db.query(Pod).filter(Pod.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Pod code '{payload.code}' already exists")
    
    pod = Pod(
        code=payload.code.upper(),
        name=payload.name,
        description=payload.description,
        pod_lead_id=payload.pod_lead_id,
        is_active=payload.is_active,
    )
    db.add(pod)
    db.commit()
    db.refresh(pod)
    
    return {
        "id": pod.id,
        "code": pod.code,
        "name": pod.name,
        "description": pod.description,
        "pod_lead_id": pod.pod_lead_id,
        "lead": pod.lead,
        "is_active": pod.is_active,
        "employee_count": 0,
        "brand_count": 0,
        "created_at": pod.created_at,
        "updated_at": pod.updated_at,
    }


@router.put("/{pod_id}", response_model=PodOut, summary="Update pod")
def update_pod(
    pod_id: int,
    payload: PodUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER))
):
    pod = db.query(Pod).filter(Pod.id == pod_id).first()
    if not pod:
        raise HTTPException(status_code=404, detail="Pod not found")
    
    if payload.name is not None:
        pod.name = payload.name
    if payload.description is not None:
        pod.description = payload.description
    if payload.pod_lead_id is not None:
        pod.pod_lead_id = payload.pod_lead_id
    if payload.is_active is not None:
        pod.is_active = payload.is_active
    
    db.commit()
    db.refresh(pod)
    
    return {
        "id": pod.id,
        "code": pod.code,
        "name": pod.name,
        "description": pod.description,
        "pod_lead_id": pod.pod_lead_id,
        "lead": pod.lead,
        "is_active": pod.is_active,
        "employee_count": len(pod.employees),
        "brand_count": len(pod.brands),
        "created_at": pod.created_at,
        "updated_at": pod.updated_at,
    }
