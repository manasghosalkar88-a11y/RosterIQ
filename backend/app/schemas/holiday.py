from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class PublicHolidayBase(BaseModel):
    date: date
    name: str
    description: Optional[str] = None
    is_national: bool = True
    brand_id: Optional[int] = None


class PublicHolidayCreate(PublicHolidayBase):
    pass


class PublicHolidayUpdate(BaseModel):
    date: Optional[date] = None
    name: Optional[str] = None
    description: Optional[str] = None
    is_national: Optional[bool] = None
    brand_id: Optional[int] = None


class PublicHolidayOut(PublicHolidayBase):
    id: int
    brand_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
