import enum
from sqlalchemy import Column, Integer, Boolean, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class AssignmentType(str, enum.Enum):
    PRIMARY = "PRIMARY"
    SECONDARY = "SECONDARY"
    BACKUP = "BACKUP"


class EmployeeAssignment(Base, TimestampMixin):
    """
    Core resource allocation matrix connecting Employee <-> Brand <-> Process.
    Supports single-resource brands (1 employee for all brand processes)
    and multi-resource brands (multiple employees dividing or sharing processes).
    """
    __tablename__ = "employee_assignments"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="CASCADE"), nullable=False, index=True)
    process_id = Column(Integer, ForeignKey("processes.id", ondelete="CASCADE"), nullable=False, index=True)
    
    assignment_type = Column(Enum(AssignmentType), default=AssignmentType.PRIMARY, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    employee = relationship("Employee", back_populates="assignments")
    brand = relationship("Brand", back_populates="assignments")
    process = relationship("Process", back_populates="assignments")

    __table_args__ = (
        UniqueConstraint("employee_id", "brand_id", "process_id", name="uq_employee_brand_process"),
    )
