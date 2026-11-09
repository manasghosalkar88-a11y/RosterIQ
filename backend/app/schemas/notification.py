from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    notification_type: str
    link_url: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
