from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ProcessBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool = True


class ProcessCreate(ProcessBase):
    pass


class ProcessUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ProcessOut(ProcessBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
