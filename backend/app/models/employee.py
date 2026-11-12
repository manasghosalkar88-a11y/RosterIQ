import enum
import json
from sqlalchemy import Column, Integer, String, Text, Boolean, Date, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class EmploymentStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ON_LEAVE = "ON_LEAVE"


class Employee(Base, TimestampMixin):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "EMP-001"
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=True)
    designation = Column(String(100), nullable=False)  # e.g., "Operations Associate", "Senior Specialist"
    
    pod_id = Column(Integer, ForeignKey("pods.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, unique=True)
    
    joining_date = Column(Date, nullable=True)
    employment_status = Column(Enum(EmploymentStatus), default=EmploymentStatus.ACTIVE, nullable=False)
    default_off_pref = Column(String(50), default="Sunday", nullable=False)  # "Sunday", "Saturday", "Rotational", etc.
    max_consecutive_days = Column(Integer, default=6, nullable=False)
    max_weekly_hours = Column(Integer, default=48, nullable=False)
    min_rest_hours = Column(Integer, default=12, nullable=False)
    skills_json = Column(Text, default="[]", nullable=False)
    certifications_json = Column(Text, default="[]", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    notes = Column(String(500), nullable=True)

    # Relationships
    pod = relationship("Pod", back_populates="employees", foreign_keys=[pod_id])
    user = relationship("User", back_populates="employee_profile")
    assignments = relationship("EmployeeAssignment", back_populates="employee", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", back_populates="employee", cascade="all, delete-orphan", foreign_keys="LeaveRequest.employee_id")
    comp_offs = relationship("CompOff", back_populates="employee", cascade="all, delete-orphan")
    roster_entries = relationship("RosterEntry", back_populates="employee", cascade="all, delete-orphan")

    @property
    def skills(self) -> list:
        try:
            data = json.loads(self.skills_json or "[]")
            return data if isinstance(data, list) else []
        except Exception:
            return []

    @property
    def certifications(self) -> list:
        try:
            data = json.loads(self.certifications_json or "[]")
            return data if isinstance(data, list) else []
        except Exception:
            return []
