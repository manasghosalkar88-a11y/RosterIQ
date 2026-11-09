from datetime import datetime
from sqlalchemy import Column, DateTime
from app.core.database import Base


class TimestampMixin:
    """Reusable mixin for created_at and updated_at timestamps."""
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
