import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, Enum, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class RosterStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    VALIDATED = "VALIDATED"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class ShiftStatus(str, enum.Enum):
    WORKING = "WORKING"
    WEEKLY_OFF = "WEEKLY_OFF"
    LEAVE = "LEAVE"
    COMP_OFF = "COMP_OFF"
    HOLIDAY = "HOLIDAY"


class Roster(Base, TimestampMixin):
    __tablename__ = "rosters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    month = Column(Integer, nullable=False, index=True)  # 1 to 12
    year = Column(Integer, nullable=False, index=True)   # e.g., 2026
    
    status = Column(Enum(RosterStatus), default=RosterStatus.DRAFT, nullable=False, index=True)
    coverage_percentage = Column(Float, default=0.0, nullable=False)
    fairness_score = Column(Float, default=100.0, nullable=False)
    total_conflicts = Column(Integer, default=0, nullable=False)

    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    published_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    published_at = Column(DateTime, nullable=True)

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
    published_by = relationship("User", foreign_keys=[published_by_id])
    entries = relationship("RosterEntry", back_populates="roster", cascade="all, delete-orphan")
    conflicts = relationship("SchedulingConflict", back_populates="roster", cascade="all, delete-orphan")
    versions = relationship("RosterVersion", back_populates="roster", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("month", "year", name="uq_roster_month_year"),
    )


class RosterEntry(Base, TimestampMixin):
    __tablename__ = "roster_entries"

    id = Column(Integer, primary_key=True, index=True)
    roster_id = Column(Integer, ForeignKey("rosters.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    
    status = Column(Enum(ShiftStatus), default=ShiftStatus.WORKING, nullable=False, index=True)
    
    # Populated if employee is WORKING
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="SET NULL"), nullable=True, index=True)
    process_id = Column(Integer, ForeignKey("processes.id", ondelete="SET NULL"), nullable=True, index=True)
    
    shift_start = Column(String(10), default="09:00", nullable=False)
    shift_end = Column(String(10), default="18:00", nullable=False)
    
    # Manual modification tracking
    is_manual_override = Column(Boolean, default=False, nullable=False)
    override_reason = Column(String(500), nullable=True)

    # Relationships
    roster = relationship("Roster", back_populates="entries")
    employee = relationship("Employee", back_populates="roster_entries")
    brand = relationship("Brand", back_populates="roster_entries")
    process = relationship("Process", back_populates="roster_entries")

    __table_args__ = (
        UniqueConstraint("roster_id", "employee_id", "date", name="uq_roster_emp_date"),
    )


class RosterVersion(Base, TimestampMixin):
    __tablename__ = "roster_versions"

    id = Column(Integer, primary_key=True, index=True)
    roster_id = Column(Integer, ForeignKey("rosters.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    change_summary = Column(String(500), nullable=False)
    snapshot_json = Column(Text, nullable=True)  # Serialized roster state
    
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    roster = relationship("Roster", back_populates="versions")
    created_by = relationship("User", foreign_keys=[created_by_id])
