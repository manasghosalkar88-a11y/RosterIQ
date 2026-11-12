from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class Brand(Base, TimestampMixin):
    __tablename__ = "brands"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "BRD-ALPHA"
    name = Column(String(255), nullable=False)                         # e.g., "Alpha Organics"
    client_name = Column(String(255), nullable=True)                   # Client corporate entity
    pod_id = Column(Integer, ForeignKey("pods.id", ondelete="SET NULL"), nullable=True)
    allow_cross_pod_backup = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    notes = Column(String(500), nullable=True)

    # Relationships
    pod = relationship("Pod", back_populates="brands")
    assignments = relationship("EmployeeAssignment", back_populates="brand", cascade="all, delete-orphan")
    process_rules = relationship("BrandProcessRule", back_populates="brand", cascade="all, delete-orphan")
    roster_entries = relationship("RosterEntry", back_populates="brand")
    conflicts = relationship("SchedulingConflict", back_populates="brand")
