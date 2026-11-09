from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class PublicHoliday(Base, TimestampMixin):
    __tablename__ = "public_holidays"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    is_national = Column(Boolean, default=True, nullable=False)
    
    # Nullable brand_id allows global company holidays OR brand-specific holiday calendars
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="CASCADE"), nullable=True)

    # Relationships
    brand = relationship("Brand")
