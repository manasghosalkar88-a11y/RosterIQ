from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class Process(Base, TimestampMixin):
    __tablename__ = "processes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "CS", "ACC", "RETENTION", "NDR"
    name = Column(String(255), nullable=False)                         # e.g., "Customer Support"
    description = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    assignments = relationship("EmployeeAssignment", back_populates="process", cascade="all, delete-orphan")
    brand_rules = relationship("BrandProcessRule", back_populates="process", cascade="all, delete-orphan")
    roster_entries = relationship("RosterEntry", back_populates="process")
    conflicts = relationship("SchedulingConflict", back_populates="process")
