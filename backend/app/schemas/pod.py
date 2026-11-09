from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class PodBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool = True


class PodCreate(PodBase):
    pod_lead_id: Optional[int] = None


class PodUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    pod_lead_id: Optional[int] = None
    is_active: Optional[bool] = None


class PodLeadSummary(BaseModel):
    id: int
    employee_code: str
    full_name: str
    email: str
    designation: str

    model_config = ConfigDict(from_attributes=True)


class PodOut(PodBase):
    id: int
    pod_lead_id: Optional[int] = None
    lead: Optional[PodLeadSummary] = None
    employee_count: Optional[int] = 0
    brand_count: Optional[int] = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
