import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class LeaveType(str, enum.Enum):
    CASUAL = "CASUAL"
    SICK = "SICK"
    PLANNED = "PLANNED"
    COMP_OFF = "COMP_OFF"
    EMERGENCY = "EMERGENCY"


class ApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class LeaveRequest(Base, TimestampMixin):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type = Column(Enum(LeaveType), default=LeaveType.PLANNED, nullable=False)
    
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    reason = Column(String(500), nullable=True)
    
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING, nullable=False, index=True)
    reviewed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_comments = Column(String(500), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="leave_requests", foreign_keys=[employee_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])


class CompOff(Base, TimestampMixin):
    __tablename__ = "comp_offs"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    earned_date = Column(Date, nullable=False)  # Date worked on weekend/holiday
    reason = Column(String(255), nullable=True)
    
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.APPROVED, nullable=False)
    is_utilized = Column(Integer, default=0, nullable=False)  # 0 = Available, 1 = Used
    utilized_date = Column(Date, nullable=True)
    
    reviewed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="comp_offs")
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])
