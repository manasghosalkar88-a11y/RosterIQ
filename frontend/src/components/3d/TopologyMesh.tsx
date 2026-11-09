import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Sparkles, Play, Pause, Compass } from 'lucide-react';

export type TopologyMode = 'MOBIUS' | 'WAVE' | 'HELIX' | 'CYLINDER';

interface MeshPoint {
  id: number;
  col: number;
  row: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  excitation: number;
}

interface Burst {
  radius: number;
  maxRadius: number;
  strength: number;
  centerX?: number;
  centerY?: number;
}

interface ActiveParticle {
  pointIndex: number;
  progress: number;
  speed: number;
  direction: 'h' | 'v';
  color: 'teal' | 'white';
}

interface TopologyMeshProps {
  className?: string;
  subtle?: boolean;
}

export const TopologyMesh: React.FC<TopologyMeshProps> = ({
  className = '',
  subtle = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [mode, setMode] = useState<TopologyMode>('MOBIUS');
  const [showControls, setShowControls] = useState<boolean>(true);

  // Mesh resolution
  const COLS = 40;
  const ROWS = 16;
  const TOTAL_POINTS = COLS * ROWS;

  // Pointer state for parallax & ripple excitation
  const pointerRef = useRef({
    x: -2000,
    y: -2000,
    targetX: -2000,
    targetY: -2000,
    radius: 190,
    isDown: false,
  });

  const pointsRef = useRef<MeshPoint[]>([]);
  const burstsRef = useRef<Burst[]>([]);
  const particlesRef = useRef<ActiveParticle[]>([]);
  const dimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // Initialize point grid
  const initPoints = useCallback(() => {
    const pts: MeshPoint[] = [];
    let id = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        pts.push({
          id: id++,
          col: c,
          row: r,
          x: (Math.random() - 0.5) * 400,
          y: (Math.random() - 0.5) * 400,
          z: (Math.random() - 0.5) * 400,
          vx: 0,
          vy: 0,
          vz: 0,
          excitation: 0,
        });
      }
    }
    pointsRef.current = pts;

    // Initialize flowing active particles across topology mesh lines
    const activeParticles: ActiveParticle[] = [];
    for (let p = 0; p < 45; p++) {
      activeParticles.push({
        pointIndex: Math.floor(Math.random() * TOTAL_POINTS),
        progress: Math.random(),
        speed: 0.008 + Math.random() * 0.016,
        direction: Math.random() > 0.5 ? 'h' : 'v',
        color: Math.random() > 0.4 ? 'teal' : 'white',
      });
    }
    particlesRef.current = activeParticles;
  }, [COLS, ROWS, TOTAL_POINTS]);

  useEffect(() => {
    initPoints();
  }, [initPoints]);

  // Handle ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) continue;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        dimensionsRef.current = { width, height };
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        if (pointsRef.current.length === 0) {
          initPoints();
        }
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, [initPoints]);

  // Main 3D Topology Physics & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId = 0;
    let lastTime = 0;
    let animTime = 0;

    const render = (now: number) => {
      if (lastTime === 0) lastTime = now;
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!isPlaying) {
        animId = requestAnimationFrame(render);
        return;
      }

      animTime += dt * 0.45;

      const { width, height } = dimensionsRef.current;
      if (width === 0 || height === 0) {
        animId = requestAnimationFrame(render);
        return;
      }

      const pointer = pointerRef.current;
      const pts = pointsRef.current;
      const bursts = burstsRef.current;
      const activeParticles = particlesRef.current;

      if (!pts || pts.length < TOTAL_POINTS) {
        animId = requestAnimationFrame(render);
        return;
      }

      // Smooth pointer position
      pointer.x += (pointer.targetX - pointer.x) * 0.08;
      pointer.y += (pointer.targetY - pointer.y) * 0.08;

      // Transparent clear to let layout pure black background (#050505) show through cleanly
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Update bursts
      for (let b = bursts.length - 1; b >= 0; b--) {
        const burst = bursts[b];
        burst.radius += 16;
        burst.strength *= 0.955;
        if (burst.radius > burst.maxRadius || burst.strength < 0.01) {
          bursts.splice(b, 1);
        }
      }

      // 3D Rotation matrices (continuous rotation with subtle tilt)
      const cosX = Math.cos(animTime);
      const sinX = Math.sin(animTime);
      const cosY = Math.cos(animTime * 0.7);
      const sinY = Math.sin(animTime * 0.7);

      const minDim = Math.min(width, height);
      const scale = minDim * 0.28;

      // 1. Calculate Target Positions for each node based on the selected Topology
      for (let i = 0; i < TOTAL_POINTS; i++) {
        const pt = pts[i];
        if (!pt) continue;

        const u = (pt.col / COLS) * Math.PI * 2;
        const v = (pt.row / (ROWS - 1)) * 2 - 1; // [-1, 1]

        let tx = 0;
        let ty = 0;
        let tz = 0;

        if (mode === 'MOBIUS') {
          // Möbius strip parametric equation
          const ribbon = v * scale * 0.42;
          tx = (scale + ribbon * Math.cos(u / 2)) * Math.cos(u);
          tz = (scale + ribbon * Math.cos(u / 2)) * Math.sin(u);
          ty = ribbon * Math.sin(u / 2);
        } else if (mode === 'WAVE') {
          // Undulating wave parametric surface
          const waveStep = minDim * 0.034;
          tx = (pt.col - (COLS - 1) / 2) * waveStep;
          tz = (pt.row - (ROWS - 1) / 2) * waveStep;
          ty = Math.sin(pt.col * 0.32 + animTime * 3.2) * 38 + Math.cos(pt.row * 0.32 + animTime * 2.2) * 38;
        } else if (mode === 'HELIX') {
          // Double helix ribbon
          const helixRadius = scale * 0.62;
          const turns = 2.0;
          tx = helixRadius * Math.cos(u * 2 + v * Math.PI * turns);
          tz = helixRadius * Math.sin(u * 2 + v * Math.PI * turns);
          ty = v * scale * 1.5;
        } else if (mode === 'CYLINDER') {
          // Tubular cylindrical grid
          tx = scale * 0.72 * Math.cos(u);
          tz = scale * 0.72 * Math.sin(u);
          ty = v * scale * 1.1;
        }

        // Apply 3D Rotation
        let rx = tx * cosX - tz * sinX;
        let rz = tx * sinX + tz * cosX;
        let ry = ty * cosY - rz * sinY;
        rz = ty * sinY + rz * cosY;

        // Spring acceleration & physics
        const spring = 0.04;
        const damping = 0.85;
        pt.vx += (rx - pt.x) * spring;
        pt.vy += (ry - pt.y) * spring;
        pt.vz += (rz - pt.z) * spring;

        // Perspective Projection
        const focalLength = 800;
        const cameraDist = 600;
        const persp = focalLength / (cameraDist + pt.z);
        const projX = centerX + pt.x * persp;
        const projY = centerY + pt.y * persp;

        // Pointer proximity excitation
        const dx = projX - pointer.x;
        const dy = projY - pointer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < pointer.radius && dist > 0) {
          const normDist = 1 - dist / pointer.radius;
          const smooth = normDist * normDist * (3 - 2 * normDist);
          pt.excitation = Math.max(pt.excitation, smooth * 1.1);
        }

        // Burst ripple excitation
        for (let b = 0; b < bursts.length; b++) {
          const burst = bursts[b];
          const bCenterX = burst.centerX ?? centerX;
          const bCenterY = burst.centerY ?? centerY;
          const distToBurst = Math.sqrt((projX - bCenterX) ** 2 + (projY - bCenterY) ** 2);
          const ringWidth = 65;
          const diff = Math.abs(distToBurst - burst.radius);
          if (diff < ringWidth) {
            const norm = 1 - diff / ringWidth;
            const smooth = norm * norm * (3 - 2 * norm);
            pt.excitation = Math.max(pt.excitation, smooth * burst.strength);
          }
        }

        // Apply damping and step integration
        pt.vx *= damping;
        pt.vy *= damping;
        pt.vz *= damping;
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.z += pt.vz;
        pt.excitation *= 0.925;
      }

      // 2. Render Mesh Edges (Horizontal and Vertical Connections)
      const focalLength = 800;
      const cameraDist = 600;
      const baseOpacityFactor = subtle ? 0.38 : 0.65;

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const idx = r * COLS + c;
          const pt = pts[idx];
          if (!pt) continue;

          const persp = focalLength / (cameraDist + pt.z);
          const px = centerX + pt.x * persp;
          const py = centerY + pt.y * persp;

          // Depth-based alpha fade
          const depthAlpha = Math.max(0.08, Math.min(1, 1 - (pt.z + 300) / 600));

          // A. Horizontal connection (right neighbor)
          let hasH = false;
          let targetHIdx = -1;

          if (c < COLS - 1) {
            hasH = true;
            targetHIdx = r * COLS + c + 1;
          } else if (c === COLS - 1) {
            if (mode === 'CYLINDER') {
              hasH = true;
              targetHIdx = r * COLS + 0; // Wrap around cylinder
            } else if (mode === 'MOBIUS') {
              hasH = true;
              targetHIdx = (ROWS - 1 - r) * COLS + 0; // Möbius inverted seam
            }
          }

          if (hasH) {
            const neighbor = pts[targetHIdx];
            if (neighbor) {
              const nPersp = focalLength / (cameraDist + neighbor.z);
              const nx = centerX + neighbor.x * nPersp;
              const ny = centerY + neighbor.y * nPersp;

              const edgeExcitation = Math.max(pt.excitation, neighbor.excitation);

              if (edgeExcitation > 0.06) {
                // Excited wireframe: vivid teal with white core
                ctx.strokeStyle = `rgba(20, 184, 166, ${Math.min(0.95, (depthAlpha * 0.4 + edgeExcitation) * baseOpacityFactor * 2.2)})`;
                ctx.lineWidth = 1 + edgeExcitation * 1.8;
              } else {
                // Primary soft white lines (#E5E7EB) or secondary muted teal (#397C70)
                if (r % 2 === 0) {
                  // Primary soft white lines
                  ctx.strokeStyle = `rgba(229, 231, 235, ${depthAlpha * 0.22 * baseOpacityFactor})`;
                } else {
                  // Secondary muted teal lines
                  ctx.strokeStyle = `rgba(57, 124, 112, ${depthAlpha * 0.32 * baseOpacityFactor})`;
                }
                ctx.lineWidth = 1;
              }

              ctx.beginPath();
              ctx.moveTo(px, py);
              ctx.lineTo(nx, ny);
              ctx.stroke();
            }
          }

          // B. Vertical connection (down neighbor)
          if (r < ROWS - 1) {
            const targetVIdx = (r + 1) * COLS + c;
            const neighbor = pts[targetVIdx];
            if (neighbor) {
              const nPersp = focalLength / (cameraDist + neighbor.z);
              const nx = centerX + neighbor.x * nPersp;
              const ny = centerY + neighbor.y * nPersp;

              const edgeExcitation = Math.max(pt.excitation, neighbor.excitation);

              if (edgeExcitation > 0.06) {
                ctx.strokeStyle = `rgba(20, 184, 166, ${Math.min(0.95, (depthAlpha * 0.4 + edgeExcitation) * baseOpacityFactor * 2.2)})`;
                ctx.lineWidth = 1 + edgeExcitation * 1.8;
              } else {
                if (c % 2 === 0) {
                  ctx.strokeStyle = `rgba(229, 231, 235, ${depthAlpha * 0.18 * baseOpacityFactor})`;
                } else {
                  ctx.strokeStyle = `rgba(57, 124, 112, ${depthAlpha * 0.28 * baseOpacityFactor})`;
                }
                ctx.lineWidth = 1;
              }

              ctx.beginPath();
              ctx.moveTo(px, py);
              ctx.lineTo(nx, ny);
              ctx.stroke();
            }
          }

          // C. Node particle glow for excited nodes
          if (pt.excitation > 0.09) {
            const glowR = (1.5 + pt.excitation * 3.2) * persp;

            // Outer Teal Glow
            ctx.fillStyle = `rgba(20, 184, 166, ${pt.excitation * 0.65})`;
            ctx.beginPath();
            ctx.arc(px, py, glowR * 1.4, 0, Math.PI * 2);
            ctx.fill();

            // Inner Pure White Core
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, pt.excitation * 1.1)})`;
            ctx.beginPath();
            ctx.arc(px, py, glowR * 0.65, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 3. Render Active Flowing Particles along the lattice
      for (let i = 0; i < activeParticles.length; i++) {
        const ap = activeParticles[i];
        ap.progress += ap.speed;
        if (ap.progress >= 1) {
          ap.progress = 0;
          ap.pointIndex = Math.floor(Math.random() * TOTAL_POINTS);
          ap.direction = Math.random() > 0.5 ? 'h' : 'v';
          ap.color = Math.random() > 0.4 ? 'teal' : 'white';
        }

        const startPt = pts[ap.pointIndex];
        if (!startPt) continue;

        let endIdx = -1;
        if (ap.direction === 'h') {
          const c = startPt.col;
          const r = startPt.row;
          if (c < COLS - 1) endIdx = r * COLS + c + 1;
          else if (mode === 'CYLINDER') endIdx = r * COLS + 0;
          else if (mode === 'MOBIUS') endIdx = (ROWS - 1 - r) * COLS + 0;
        } else {
          const c = startPt.col;
          const r = startPt.row;
          if (r < ROWS - 1) endIdx = (r + 1) * COLS + c;
        }

        if (endIdx !== -1 && pts[endIdx]) {
          const endPt = pts[endIdx];

          const sPersp = focalLength / (cameraDist + startPt.z);
          const ePersp = focalLength / (cameraDist + endPt.z);

          const sx = centerX + startPt.x * sPersp;
          const sy = centerY + startPt.y * sPersp;
          const ex = centerX + endPt.x * ePersp;
          const ey = centerY + endPt.y * ePersp;

          const cx = sx + (ex - sx) * ap.progress;
          const cy = sy + (ey - sy) * ap.progress;
          const avgPersp = (sPersp + ePersp) * 0.5;

          const depthAlpha = Math.max(0.15, Math.min(1, 1 - ((startPt.z + endPt.z) * 0.5 + 300) / 600));

          if (ap.color === 'teal') {
            // Active Teal Particle
            ctx.fillStyle = `rgba(20, 184, 166, ${depthAlpha * 0.85})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 2.2 * avgPersp, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Active White Particle
            ctx.fillStyle = `rgba(255, 255, 255, ${depthAlpha * 0.95})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 1.8 * avgPersp, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, mode, subtle, COLS, ROWS, TOTAL_POINTS]);

  // Global mousemove tracking for smooth parallax
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      pointerRef.current.targetX = e.clientX - rect.left;
      pointerRef.current.targetY = e.clientY - rect.top;
    };

    const handleGlobalMouseLeave = () => {
      pointerRef.current.targetX = -2000;
      pointerRef.current.targetY = -2000;
      pointerRef.current.isDown = false;
    };

    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
    window.addEventListener('blur', handleGlobalMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('blur', handleGlobalMouseLeave);
    };
  }, []);

  // Trigger Burst Effect (radiating ripple excitation)
  const triggerBurst = useCallback((clickX?: number, clickY?: number) => {
    const { width, height } = dimensionsRef.current;
    const maxRadius = Math.max(width, height) * 1.25;
    burstsRef.current.push({
      radius: 0,
      maxRadius,
      strength: 1.0,
      centerX: clickX ?? width / 2,
      centerY: clickY ?? height / 2,
    });
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    triggerBurst(x, y);
  };

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 pointer-events-none select-none overflow-hidden z-0 ${className}`}
      aria-hidden="true"
    >
      {/* 100% Transparent WebGL / 2D Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="absolute inset-0 block h-full w-full pointer-events-auto cursor-default opacity-85"
      />

      {/* Subtle Bottom Ambient Gradient for UI Depth */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent pointer-events-none" />

      {/* Floating Interactive 21st.dev Control Pill */}
      {showControls && (
        <aside
          aria-label="3D Topology Controls"
          className="fixed bottom-5 right-5 z-40 pointer-events-auto flex items-center gap-2 px-2 py-1.5 rounded-2xl bg-[#151719]/85 backdrop-blur-md border border-[#23262A] shadow-elevated transition-all duration-300"
        >
          {/* Topology Mode Switches */}
          <div className="flex items-center gap-1 rounded-xl bg-[#0C0D0E]/80 p-0.5 border border-[#23262A]/60">
            {(['MOBIUS', 'WAVE', 'HELIX', 'CYLINDER'] as TopologyMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase transition-all duration-200 ${
                  mode === m
                    ? 'bg-[#397C70] text-white shadow-sm shadow-teal-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-[#1A1D20]'
                }`}
                title={`Switch to ${m} 3D Topology`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-[#23262A]" />

          {/* Interactive Burst Button */}
          <button
            onClick={() => triggerBurst()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-teal-400 bg-teal-950/40 border border-teal-800/40 hover:bg-teal-900/50 hover:border-teal-700 transition-colors shadow-sm"
            title="Trigger Teal Particle Burst Ripple"
          >
            <Sparkles className="w-3 h-3 text-teal-400" />
            <span className="hidden sm:inline tracking-wider font-mono">BURST</span>
          </button>

          {/* Play / Pause Toggle */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#1A1D20] transition-colors"
            title={isPlaying ? 'Pause 3D Topology Rotation' : 'Resume 3D Topology Rotation'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Hide / Minimize Controls */}
          <button
            onClick={() => setShowControls(false)}
            className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#1A1D20] text-[10px] transition-colors ml-0.5"
            title="Minimize controls bar"
          >
            ✕
          </button>
        </aside>
      )}

      {/* Re-expand button if minimized */}
      {!showControls && (
        <button
          onClick={() => setShowControls(true)}
          className="fixed bottom-5 right-5 z-40 pointer-events-auto p-2 rounded-xl bg-[#151719]/80 backdrop-blur-md border border-[#23262A] text-teal-400 hover:text-white shadow-elevated transition-colors"
          title="Open 3D Topology Mesh Controls"
        >
          <Compass className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default TopologyMesh;
