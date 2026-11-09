from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import extract
from app.core.database import get_db
from app.models.holiday import PublicHoliday
from app.models.brand import Brand
from app.models.user import UserRole
from app.schemas.holiday import PublicHolidayOut, PublicHolidayCreate, PublicHolidayUpdate
from app.api.deps import get_current_user, require_roles

router = APIRouter()


def _format_holiday(h: PublicHoliday) -> dict:
    return {
        "id": h.id,
        "date": h.date,
        "name": h.name,
        "description": h.description,
        "is_national": h.is_national,
        "brand_id": h.brand_id,
        "brand_name": h.brand.name if h.brand else "All Applicable Brands",
        "created_at": h.created_at,
        "updated_at": h.updated_at,
    }


@router.get("", response_model=List[PublicHolidayOut], summary="List public holidays")
def list_holidays(
    year: Optional[int] = None,
    brand_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(PublicHoliday)
    
    if year is not None:
        query = query.filter(extract('year', PublicHoliday.date) == year)
    if brand_id is not None:
        # Returns global holidays (brand_id is None) OR specific to brand
        query = query.filter((PublicHoliday.brand_id == None) | (PublicHoliday.brand_id == brand_id))
        
    holidays = query.order_by(PublicHoliday.date).all()
    return [_format_holiday(h) for h in holidays]


@router.post("", response_model=PublicHolidayOut, status_code=status.HTTP_201_CREATED, summary="Add public holiday")
def create_holiday(
    payload: PublicHolidayCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER))
):
    holiday = PublicHoliday(
        date=payload.date,
        name=payload.name,
        description=payload.description,
        is_national=payload.is_national,
        brand_id=payload.brand_id,
    )
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    return _format_holiday(holiday)


@router.put("/{holiday_id}", response_model=PublicHolidayOut, summary="Update public holiday")
def update_holiday(
    holiday_id: int,
    payload: PublicHolidayUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER))
):
    holiday = db.query(PublicHoliday).filter(PublicHoliday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")

    if payload.date is not None:
        holiday.date = payload.date
    if payload.name is not None:
        holiday.name = payload.name
    if payload.description is not None:
        holiday.description = payload.description
    if payload.is_national is not None:
        holiday.is_national = payload.is_national
    if payload.brand_id is not None:
        holiday.brand_id = payload.brand_id

    db.commit()
    db.refresh(holiday)
    return _format_holiday(holiday)


@router.delete("/{holiday_id}", summary="Delete public holiday")
def delete_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.OPS_MANAGER))
):
    holiday = db.query(PublicHoliday).filter(PublicHoliday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")

    db.delete(holiday)
    db.commit()
    return {"message": "Public holiday removed successfully"}
