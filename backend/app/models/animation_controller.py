from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey
from app.core.database import Base
from app.models.base import TimestampMixin


class AnimationControllerConfig(Base, TimestampMixin):
    """
    Persistent backend state and configuration for the ROSTERIQ 3D Topology
    Animation Controller. Managed exclusively by authorized backend administrators.
    """
    __tablename__ = "animation_controller_configs"

    id = Column(Integer, primary_key=True, index=True)
    controller_key = Column(String(64), unique=True, nullable=False, default="topology_mesh", index=True)
    mode = Column(String(20), nullable=False, default="MOBIUS")
    is_enabled = Column(Boolean, nullable=False, default=True)
    is_playing = Column(Boolean, nullable=False, default=True)
    burst_active = Column(Boolean, nullable=False, default=False)
    burst_nonce = Column(Integer, nullable=False, default=0)
    subtle = Column(Boolean, nullable=False, default=False)
    speed_multiplier = Column(Float, nullable=False, default=1.0)
    particle_count = Column(Integer, nullable=False, default=70)
    updated_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
