import enum
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class SimulationType(str, enum.Enum):
    EMPLOYEE_ABSENCE = "EMPLOYEE_ABSENCE"
    PLANNED_LEAVE = "PLANNED_LEAVE"
    COMP_OFF = "COMP_OFF"
    EMPLOYEE_REASSIGNMENT = "EMPLOYEE_REASSIGNMENT"
    AVAILABILITY_CHANGE = "AVAILABILITY_CHANGE"
    BRAND_RULE_CHANGE = "BRAND_RULE_CHANGE"
    PROCESS_STAFFING_CHANGE = "PROCESS_STAFFING_CHANGE"


class ScenarioStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SAVED = "SAVED"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    APPLIED = "APPLIED"
    DISCARDED = "DISCARDED"


class SimulationScenario(Base, TimestampMixin):
    __tablename__ = "simulation_scenarios"

    id = Column(Integer, primary_key=True, index=True)
    roster_id = Column(Integer, ForeignKey("rosters.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    simulation_type = Column(SQLEnum(SimulationType), nullable=False)
    status = Column(SQLEnum(ScenarioStatus), default=ScenarioStatus.SAVED, nullable=False)

    parameters_json = Column(Text, nullable=False)  # JSON with input parameters
    impact_summary_json = Column(Text, nullable=False)  # JSON with before/after metrics
    candidate_ranking_json = Column(Text, nullable=True)  # JSON snapshot of candidate rankings & exclusion summary
    selected_backup_employee_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    roster_snapshot_hash = Column(String(128), nullable=True)

    requires_approval = Column(Boolean, default=False, nullable=False)
    required_approver_role = Column(String(50), nullable=True)  # e.g. "OPS_MANAGER" or "SUPER_ADMIN"

    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_comments = Column(String(500), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    applied_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    applied_at = Column(DateTime, nullable=True)

    # Relationships
    roster = relationship("Roster")
    selected_backup_employee = relationship("Employee", foreign_keys=[selected_backup_employee_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])
    applied_by = relationship("User", foreign_keys=[applied_by_id])
