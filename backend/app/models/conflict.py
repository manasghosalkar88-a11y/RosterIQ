import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class ConflictSeverity(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class ConflictType(str, enum.Enum):
    UNSTAFFED_PROCESS = "UNSTAFFED_PROCESS"
    OVERLAPPING_SHIFT = "OVERLAPPING_SHIFT"
    LEAVE_VIOLATION = "LEAVE_VIOLATION"
    WEEKLY_OFF_VIOLATION = "WEEKLY_OFF_VIOLATION"
    HOLIDAY_RULE_VIOLATION = "HOLIDAY_RULE_VIOLATION"
    INSUFFICIENT_STAFFING = "INSUFFICIENT_STAFFING"
    EXCESSIVE_CONSECUTIVE_DAYS = "EXCESSIVE_CONSECUTIVE_DAYS"


class SchedulingConflict(Base, TimestampMixin):
    __tablename__ = "scheduling_conflicts"

    id = Column(Integer, primary_key=True, index=True)
    roster_id = Column(Integer, ForeignKey("rosters.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="CASCADE"), nullable=True, index=True)
    process_id = Column(Integer, ForeignKey("processes.id", ondelete="CASCADE"), nullable=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=True, index=True)
    
    conflict_type = Column(Enum(ConflictType), nullable=False)
    severity = Column(Enum(ConflictSeverity), default=ConflictSeverity.CRITICAL, nullable=False, index=True)
    
    title = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=False)
    recommended_action = Column(String(1000), nullable=True)
    
    is_resolved = Column(Boolean, default=False, nullable=False, index=True)
    resolved_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    roster = relationship("Roster", back_populates="conflicts")
    brand = relationship("Brand", back_populates="conflicts")
    process = relationship("Process", back_populates="conflicts")
    employee = relationship("Employee")
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])
