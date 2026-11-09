import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class OperatingRuleType(str, enum.Enum):
    EVERY_DAY_365 = "EVERY_DAY_365"
    EXCEPT_PUBLIC_HOLIDAYS = "EXCEPT_PUBLIC_HOLIDAYS"
    EXCEPT_SUNDAYS_AND_HOLIDAYS = "EXCEPT_SUNDAYS_AND_HOLIDAYS"
    CUSTOM = "CUSTOM"


class BrandProcessRule(Base, TimestampMixin):
    __tablename__ = "brand_process_rules"

    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id", ondelete="CASCADE"), nullable=False, index=True)
    process_id = Column(Integer, ForeignKey("processes.id", ondelete="CASCADE"), nullable=False, index=True)
    
    rule_type = Column(Enum(OperatingRuleType), default=OperatingRuleType.EXCEPT_SUNDAYS_AND_HOLIDAYS, nullable=False)
    min_headcount = Column(Integer, default=1, nullable=False)

    # Granular day-of-week operating flags (auto-set by rule_type or customized)
    operates_monday = Column(Boolean, default=True, nullable=False)
    operates_tuesday = Column(Boolean, default=True, nullable=False)
    operates_wednesday = Column(Boolean, default=True, nullable=False)
    operates_thursday = Column(Boolean, default=True, nullable=False)
    operates_friday = Column(Boolean, default=True, nullable=False)
    operates_saturday = Column(Boolean, default=True, nullable=False)
    operates_sunday = Column(Boolean, default=False, nullable=False)
    operates_holidays = Column(Boolean, default=False, nullable=False)

    shift_start_time = Column(String(10), default="09:00", nullable=False)
    shift_end_time = Column(String(10), default="18:00", nullable=False)
    notes = Column(String(500), nullable=True)

    # Relationships
    brand = relationship("Brand", back_populates="process_rules")
    process = relationship("Process", back_populates="brand_rules")

    __table_args__ = (
        UniqueConstraint("brand_id", "process_id", name="uq_brand_process"),
    )
