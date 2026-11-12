from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

TopologyModeType = Literal["MOBIUS", "WAVE", "HELIX", "CYLINDER"]


class AnimationControllerPublicState(BaseModel):
    """Read-only runtime animation state consumed by the browser Three.js renderer."""
    mode: TopologyModeType = "MOBIUS"
    is_enabled: bool = True
    is_playing: bool = True
    burst_active: bool = False
    burst_nonce: int = 0
    subtle: bool = False
    speed_multiplier: float = 1.0
    particle_count: int = 70
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AnimationControllerAdminResponse(AnimationControllerPublicState):
    """Full persisted controller record visible to authorized backend administrators."""
    id: int
    controller_key: str
    updated_by_id: Optional[int] = None
    created_at: Optional[datetime] = None


class AnimationControllerUpdateRequest(BaseModel):
    mode: Optional[TopologyModeType] = None
    is_enabled: Optional[bool] = None
    is_playing: Optional[bool] = None
    burst_active: Optional[bool] = None
    trigger_burst: Optional[bool] = None
    subtle: Optional[bool] = None
    speed_multiplier: Optional[float] = Field(None, ge=0.1, le=3.0)
    particle_count: Optional[int] = Field(None, ge=0, le=120)


class AnimationModeUpdateRequest(BaseModel):
    mode: TopologyModeType
