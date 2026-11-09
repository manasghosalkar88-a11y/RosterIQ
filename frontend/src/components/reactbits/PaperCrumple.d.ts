import React from 'react';

export interface PaperCrumpleProps {
  src: string;
  alt?: string;
  backSrc?: string;
  width?: number;
  height?: number;
  sceneHeight?: number;
  imageFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  releaseBehavior?: 'restore' | 'stay' | 'creased';
  crumpleAmount?: number;
  crumpleDuration?: number;
  releaseDuration?: number;
  foldCount?: number;
  foldSharpness?: number;
  wrinkleDepth?: number;
  creaseStrength?: number;
  paperColor?: string;
  roughness?: number;
  paperTexture?: number;
  lightIntensity?: number;
  lightAngle?: number;
  shadow?: boolean;
  shadowOpacity?: number;
  draggable?: boolean;
  dragRotation?: number;
  dragRadius?: number;
  returnToOrigin?: boolean;
  rotation?: number;
  seed?: number;
  detail?: number;
  disabled?: boolean;
  resetKey?: number;
  onStateChange?: (state: string) => void;
  intro?: 'none' | 'unfold';
  introDuration?: number;
  onUnfoldComplete?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

declare const PaperCrumple: React.FC<PaperCrumpleProps>;
export default PaperCrumple;
