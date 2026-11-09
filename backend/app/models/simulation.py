import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum
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

    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    applied_at = Column(DateTime, nullable=True)

    # Relationships
    roster = relationship("Roster")
    created_by = relationship("User")
