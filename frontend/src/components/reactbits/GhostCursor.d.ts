import React from 'react';

export interface GhostCursorProps {
  color?: string;
  brightness?: number;
  size?: number;
  trailLength?: number;
  inertia?: number;
  turbulence?: number;
  drift?: number;
  detail?: number;
  grainIntensity?: number;
  bloomStrength?: number;
  bloomRadius?: number;
  bloomThreshold?: number;
  edgeIntensity?: number;
  clickPuff?: boolean;
  intro?: boolean;
  theme?: 'dark' | 'light';
  mixBlendMode?: React.CSSProperties['mixBlendMode'];
  fadeDelayMs?: number;
  fadeDurationMs?: number;
  maxDevicePixelRatio?: number;
  targetPixels?: number;
  zIndex?: number;
  className?: string;
  style?: React.CSSProperties;
}

declare const GhostCursor: React.FC<GhostCursorProps>;
export default GhostCursor;
