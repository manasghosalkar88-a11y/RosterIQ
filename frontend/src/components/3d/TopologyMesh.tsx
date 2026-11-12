import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import { TopologyEngine, type TopologyMode } from './TopologyEngine';

export type { TopologyMode };

interface AnimationControllerState {
  mode: TopologyMode;
  is_enabled: boolean;
  is_playing: boolean;
  burst_active: boolean;
  burst_nonce: number;
  subtle: boolean;
  speed_multiplier: number;
  particle_count: number;
}

interface TopologyMeshProps {
  className?: string;
  subtle?: boolean;
}

const DEFAULT_CONTROLLER_STATE: AnimationControllerState = {
  mode: 'MOBIUS',
  is_enabled: true,
  is_playing: true,
  burst_active: false,
  burst_nonce: 0,
  subtle: false,
  speed_multiplier: 1.0,
  particle_count: 70,
};

const VALID_MODES: ReadonlySet<TopologyMode> = new Set(['MOBIUS', 'WAVE', 'HELIX', 'CYLINDER']);
const POLL_INTERVAL_MS = 10000;

function normalizeControllerState(raw: Partial<AnimationControllerState> | null | undefined): AnimationControllerState {
  if (!raw) return DEFAULT_CONTROLLER_STATE;
  const mode = raw.mode && VALID_MODES.has(raw.mode) ? raw.mode : 'MOBIUS';
  return {
    mode,
    is_enabled: typeof raw.is_enabled === 'boolean' ? raw.is_enabled : true,
    is_playing: typeof raw.is_playing === 'boolean' ? raw.is_playing : true,
    burst_active: typeof raw.burst_active === 'boolean' ? raw.burst_active : false,
    burst_nonce: typeof raw.burst_nonce === 'number' && Number.isFinite(raw.burst_nonce) ? raw.burst_nonce : 0,
    subtle: typeof raw.subtle === 'boolean' ? raw.subtle : false,
    speed_multiplier:
      typeof raw.speed_multiplier === 'number' && Number.isFinite(raw.speed_multiplier)
        ? Math.min(3.0, Math.max(0.1, raw.speed_multiplier))
        : 1.0,
    particle_count:
      typeof raw.particle_count === 'number' && Number.isFinite(raw.particle_count)
        ? Math.min(120, Math.max(0, Math.round(raw.particle_count)))
        : 70,
  };
}

export const TopologyMesh: React.FC<TopologyMeshProps> = ({
  className = '',
  subtle = true,
}) => {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<TopologyEngine | null>(null);

  const [controller, setController] = useState<AnimationControllerState>(DEFAULT_CONTROLLER_STATE);

  const controllerRef = useRef<AnimationControllerState>(controller);
  const subtlePropRef = useRef<boolean>(subtle);
  const lastBurstNonceRef = useRef<number>(0);

  // Poll backend controller state (no visible UI controls exposed in frontend)
  useEffect(() => {
    let active = true;

    const syncControllerState = async () => {
      try {
        const res = await api.get<Partial<AnimationControllerState>>('/animation-controller');
        if (!active) return;
        const next = normalizeControllerState(res.data);
        setController((prev) => {
          if (
            prev.mode === next.mode &&
            prev.is_enabled === next.is_enabled &&
            prev.is_playing === next.is_playing &&
            prev.burst_active === next.burst_active &&
            prev.burst_nonce === next.burst_nonce &&
            prev.subtle === next.subtle &&
            prev.speed_multiplier === next.speed_multiplier &&
            prev.particle_count === next.particle_count
          ) {
            return prev;
          }
          return next;
        });
      } catch {
        // Keep current or safe default state when backend is offline
      }
    };

    syncControllerState();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncControllerState();
      }
    }, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncControllerState();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Create and dispose isolated 3D engine solely when backend enables/disables animation
  useEffect(() => {
    const host = canvasHostRef.current;
    if (!controller.is_enabled || !host) {
      return;
    }

    const latest = controllerRef.current;
    const engine = new TopologyEngine(host, {
      subtle: subtlePropRef.current || latest.subtle,
      initialMode: latest.mode,
      initialPlaying: latest.is_playing,
      initialBurstActive: latest.burst_active,
      speedMultiplier: latest.speed_multiplier,
      particleCount: latest.particle_count,
    });
    engineRef.current = engine;
    lastBurstNonceRef.current = latest.burst_nonce;

    return () => {
      engine.dispose();
      if (engineRef.current === engine) {
        engineRef.current = null;
      }
    };
  }, [controller.is_enabled]);

  // Imperatively sync backend configuration without recreating WebGL renderer or loop
  useEffect(() => {
    controllerRef.current = controller;
    subtlePropRef.current = subtle;

    const engine = engineRef.current;
    if (!engine) return;

    engine.setMode(controller.mode);
    engine.setPlaying(controller.is_playing);
    engine.setBurstActive(controller.burst_active);
    engine.setSpeedMultiplier(controller.speed_multiplier);
    engine.setParticleCount(controller.particle_count);
    engine.setSubtle(subtle || controller.subtle);

    if (controller.burst_nonce > lastBurstNonceRef.current) {
      lastBurstNonceRef.current = controller.burst_nonce;
      engine.triggerBurst();
    }
  }, [controller, subtle]);

  return (
    <div
      className={`fixed inset-0 pointer-events-none select-none overflow-hidden z-0 ${className}`}
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* Isolated Engine Canvas Mount Host (stays strictly behind all page content) */}
      <div ref={canvasHostRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} />

      {/* Subtle Bottom Ambient Gradient for UI Depth */}
      {controller.is_enabled && (
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent pointer-events-none" style={{ zIndex: 1 }} />
      )}
    </div>
  );
};

export default TopologyMesh;
