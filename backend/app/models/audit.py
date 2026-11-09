from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    action = Column(String(50), nullable=False)        # "ROSTER_GENERATE", "SCHEDULE_OVERRIDE", "LEAVE_APPROVE", etc.
    entity_type = Column(String(50), nullable=False)   # "ROSTER", "EMPLOYEE", "ASSIGNMENT", "LEAVE"
    entity_id = Column(Integer, nullable=True)
    
    change_details = Column(Text, nullable=True)       # JSON or descriptive diff
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="audit_logs")
