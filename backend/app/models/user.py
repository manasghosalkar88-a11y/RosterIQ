import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    OPS_MANAGER = "OPS_MANAGER"
    POD_LEAD = "POD_LEAD"
    EMPLOYEE = "EMPLOYEE"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.EMPLOYEE, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    employee_profile = relationship("Employee", back_populates="user", uselist=False)
    audit_logs = relationship("AuditLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
