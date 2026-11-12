import json
from fastapi import APIRouter, Depends
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.animation_controller import AnimationControllerConfig
from app.models.audit import AuditLog
from app.models.user import User, UserRole
from app.schemas.animation_controller import (
    AnimationControllerAdminResponse,
    AnimationControllerPublicState,
    AnimationControllerUpdateRequest,
    AnimationModeUpdateRequest,
)

router = APIRouter(prefix="/animation-controller", tags=["3D Animation Controller"])

DEFAULT_CONTROLLER_KEY = "topology_mesh"


def get_or_create_controller_config(db: Session) -> AnimationControllerConfig:
    """Fetches the singleton topology animation controller config or creates defaults idempotently."""
    config = (
        db.query(AnimationControllerConfig)
        .filter(AnimationControllerConfig.controller_key == DEFAULT_CONTROLLER_KEY)
        .first()
    )
    if config is not None:
        return config

    config = AnimationControllerConfig(
        controller_key=DEFAULT_CONTROLLER_KEY,
        mode="MOBIUS",
        is_enabled=True,
        is_playing=True,
        burst_active=False,
        burst_nonce=0,
        subtle=False,
        speed_multiplier=1.0,
        particle_count=70,
    )
    db.add(config)
    try:
        db.commit()
        db.refresh(config)
        return config
    except IntegrityError:
        db.rollback()
        existing = (
            db.query(AnimationControllerConfig)
            .filter(AnimationControllerConfig.controller_key == DEFAULT_CONTROLLER_KEY)
            .first()
        )
        if existing is not None:
            return existing
        raise


def _record_controller_audit(
    db: Session,
    admin_user: User,
    config: AnimationControllerConfig,
    action: str,
    details: dict,
) -> None:
    log = AuditLog(
        user_id=admin_user.id,
        action=action,
        entity_type="ANIMATION_CONTROLLER",
        entity_id=config.id,
        change_details=json.dumps(details),
    )
    db.add(log)


@router.get("", response_model=AnimationControllerPublicState)
def get_animation_controller_state(db: Session = Depends(get_db)):
    """
    Public read-only animation runtime state consumed by the browser Three.js renderer.
    Exposes no administrative controls or user metadata.
    """
    return get_or_create_controller_config(db)


@router.get("/admin", response_model=AnimationControllerAdminResponse)
def get_animation_controller_admin_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    """Administrator-only full view of persisted animation controller configuration."""
    return get_or_create_controller_config(db)


@router.put("", response_model=AnimationControllerAdminResponse)
@router.patch("", response_model=AnimationControllerAdminResponse)
def update_animation_controller(
    req: AnimationControllerUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    """
    Administrator-only endpoint to update mode, pause/resume, burst activation,
    enabled/closed state, speed multiplier, and particle configuration.
    """
    config = get_or_create_controller_config(db)
    changes: dict = {}

    if req.mode is not None:
        config.mode = req.mode
        changes["mode"] = req.mode

    if req.is_enabled is not None:
        config.is_enabled = req.is_enabled
        changes["is_enabled"] = req.is_enabled
        if not req.is_enabled:
            # Closing cancels active playback and bursts cleanly
            config.is_playing = False
            config.burst_active = False
            changes["is_playing"] = False
            changes["burst_active"] = False

    if req.is_playing is not None:
        config.is_playing = req.is_playing if config.is_enabled else False
        changes["is_playing"] = config.is_playing

    if req.burst_active is not None:
        was_active = bool(config.burst_active)
        config.burst_active = req.burst_active if config.is_enabled else False
        changes["burst_active"] = config.burst_active
        if config.burst_active and not was_active:
            config.burst_nonce = int(config.burst_nonce or 0) + 1
            changes["burst_nonce"] = config.burst_nonce

    if req.trigger_burst and config.is_enabled:
        config.burst_active = True
        config.burst_nonce = int(config.burst_nonce or 0) + 1
        changes["burst_active"] = True
        changes["burst_nonce"] = config.burst_nonce

    if req.subtle is not None:
        config.subtle = req.subtle
        changes["subtle"] = req.subtle

    if req.speed_multiplier is not None:
        config.speed_multiplier = req.speed_multiplier
        changes["speed_multiplier"] = req.speed_multiplier

    if req.particle_count is not None:
        config.particle_count = req.particle_count
        changes["particle_count"] = req.particle_count

    config.updated_by_id = current_user.id
    _record_controller_audit(db, current_user, config, "ANIMATION_CONTROLLER_UPDATE", changes)
    db.commit()
    db.refresh(config)
    return config


@router.post("/mode", response_model=AnimationControllerAdminResponse)
def set_animation_mode(
    req: AnimationModeUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    """Switch active 3D topology mode (MOBIUS, WAVE, HELIX, CYLINDER)."""
    config = get_or_create_controller_config(db)
    config.mode = req.mode
    config.updated_by_id = current_user.id
    _record_controller_audit(db, current_user, config, "ANIMATION_MODE_CHANGE", {"mode": req.mode})
    db.commit()
    db.refresh(config)
    return config


@router.post("/pause", response_model=AnimationControllerAdminResponse)
def pause_animation(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    """Pause the 3D animation while preserving the rendered scene."""
    config = get_or_create_controller_config(db)
    config.is_playing = False
    config.updated_by_id = current_user.id
    _record_controller_audit(db, current_user, config, "ANIMATION_PAUSE", {"is_playing": False})
    db.commit()
    db.refresh(config)
    return config


@router.post("/resume", response_model=AnimationControllerAdminResponse)
def resume_animation(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    """Resume the 3D animation (enables renderer cleanly if needed)."""
    config = get_or_create_controller_config(db)
    config.is_enabled = True
    config.is_playing = True
    config.updated_by_id = current_user.id
    _record_controller_audit(
        db,
        current_user,
        config,
        "ANIMATION_RESUME",
        {"is_enabled": True, "is_playing": True},
    )
    db.commit()
    db.refresh(config)
    return config


@router.post("/open", response_model=AnimationControllerAdminResponse)
def open_animation_engine(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    """Enable and initialize the 3D animation engine on frontend clients."""
    config = get_or_create_controller_config(db)
    config.is_enabled = True
    config.is_playing = True
    config.updated_by_id = current_user.id
    _record_controller_audit(
        db,
        current_user,
        config,
        "ANIMATION_OPEN",
        {"is_enabled": True, "is_playing": True},
    )
    db.commit()
    db.refresh(config)
    return config


@router.post("/close", response_model=AnimationControllerAdminResponse)
def close_animation_engine(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    """Close the 3D animation engine on frontend clients so WebGL/RAF resources are disposed."""
    config = get_or_create_controller_config(db)
    config.is_enabled = False
    config.is_playing = False
    config.burst_active = False
    config.updated_by_id = current_user.id
    _record_controller_audit(
        db,
        current_user,
        config,
        "ANIMATION_CLOSE",
        {"is_enabled": False, "is_playing": False, "burst_active": False},
    )
    db.commit()
    db.refresh(config)
    return config


@router.post("/burst/activate", response_model=AnimationControllerAdminResponse)
def activate_animation_burst(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    """Activate a teal burst ripple sequence across the 3D topology mesh."""
    config = get_or_create_controller_config(db)
    config.burst_active = True
    config.burst_nonce = int(config.burst_nonce or 0) + 1
    config.updated_by_id = current_user.id
    _record_controller_audit(
        db,
        current_user,
        config,
        "ANIMATION_BURST_ACTIVATE",
        {"burst_active": True, "burst_nonce": config.burst_nonce},
    )
    db.commit()
    db.refresh(config)
    return config


@router.post("/burst/deactivate", response_model=AnimationControllerAdminResponse)
def deactivate_animation_burst(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    """Deactivate sustained burst mode on the 3D topology mesh."""
    config = get_or_create_controller_config(db)
    config.burst_active = False
    config.updated_by_id = current_user.id
    _record_controller_audit(
        db,
        current_user,
        config,
        "ANIMATION_BURST_DEACTIVATE",
        {"burst_active": False},
    )
    db.commit()
    db.refresh(config)
    return config
