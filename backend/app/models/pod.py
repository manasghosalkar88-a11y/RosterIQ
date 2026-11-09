from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class Pod(Base, TimestampMixin):
    __tablename__ = "pods"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "POD-A", "POD-B"
    name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    pod_lead_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    lead = relationship("Employee", foreign_keys=[pod_lead_id], post_update=True)
    employees = relationship("Employee", back_populates="pod", foreign_keys="Employee.pod_id")
    brands = relationship("Brand", back_populates="pod")
