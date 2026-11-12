import * as THREE from 'three';

export type TopologyMode = 'MOBIUS' | 'WAVE' | 'HELIX' | 'CYLINDER';

export interface TopologyEngineOptions {
  subtle?: boolean;
  initialMode?: TopologyMode;
  initialPlaying?: boolean;
  initialBurstActive?: boolean;
  speedMultiplier?: number;
  particleCount?: number;
  onContextLost?: () => void;
  onContextRestored?: () => void;
  onError?: (err: unknown) => void;
}

export interface TopologyEngineStats {
  mode: TopologyMode;
  isPlaying: boolean;
  isDisposed: boolean;
  isContextLost: boolean;
  backend: 'webgl' | 'canvas2d' | 'none';
  rafActive: boolean;
  activeBursts: number;
}

interface BurstSlot {
  active: boolean;
  radius: number;
  maxRadius: number;
  strength: number;
  centerX: number;
  centerY: number;
  age: number;
}

interface ActiveParticle {
  pointIndex: number;
  progress: number;
  speed: number;
  direction: 0 | 1; // 0 = horizontal, 1 = vertical
  isTeal: boolean;
}

const COLS = 40;
const ROWS = 16;
const TOTAL_POINTS = COLS * ROWS;
const MAX_PARTICLES = 120;
const DEFAULT_PARTICLE_COUNT = 70;
const MAX_BURSTS = 8;

// Maximum segments: horizontal ROWS*COLS (640) + vertical (ROWS-1)*COLS (600)
const MAX_LINE_SEGMENTS = ROWS * COLS + (ROWS - 1) * COLS;
const MAX_LINE_VERTICES = MAX_LINE_SEGMENTS * 2;
const MAX_GLOW_VERTICES = TOTAL_POINTS * 2;

const LINE_VERTEX_SHADER = `
  attribute vec4 aColor;
  varying vec4 vColor;
  void main() {
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const LINE_FRAGMENT_SHADER = `
  varying vec4 vColor;
  void main() {
    gl_FragColor = vColor;
  }
`;

const POINT_VERTEX_SHADER = `
  attribute vec4 aColor;
  attribute float aSize;
  uniform float uPixelRatio;
  varying vec4 vColor;
  void main() {
    vColor = aColor;
    gl_PointSize = clamp(aSize * uPixelRatio, 0.5, 64.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const POINT_FRAGMENT_SHADER = `
  varying vec4 vColor;
  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float dist2 = dot(d, d);
    if (dist2 > 0.25) discard;
    float soft = smoothstep(0.25, 0.03, dist2);
    gl_FragColor = vec4(vColor.rgb, vColor.a * soft);
  }
`;

const CAMERA_FOV_DEG = 50;
const HALF_FOV_TAN = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV_DEG * 0.5));

function finiteOrZero(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

/**
 * Isolated 3D interactive topology engine supporting WebGL (Three.js) with
 * automatic Canvas2D fallback, fixed pre-allocated GPU buffers, single-RAF
 * pause/resume lifecycle, and complete deterministic resource disposal.
 */
export class TopologyEngine {
  private readonly container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private mode: TopologyMode;
  private isPlaying: boolean;
  private subtle: boolean;
  private burstActive: boolean;
  private burstPulseCooldown = 0;
  private speedMultiplier: number;
  private particleCount: number;

  private readonly onContextLost?: () => void;
  private readonly onContextRestored?: () => void;
  private readonly onError?: (err: unknown) => void;

  private isDisposed = false;
  private isContextLost = false;
  private backend: 'webgl' | 'canvas2d' | 'none' = 'none';

  // Viewport & DPR
  private width = 0;
  private height = 0;
  private dpr = 1;
  private cameraZ = 800;

  // Animation loop state (persists smoothly across mode switches & pause/resume)
  private rafId = 0;
  private lastTimestamp = 0;
  private animTime = 0;

  // Pointer state
  private pointerX = -2000;
  private pointerY = -2000;
  private pointerTargetX = -2000;
  private pointerTargetY = -2000;
  private readonly pointerRadius = 190;

  // Pre-allocated simulation typed arrays
  private readonly ptX = new Float32Array(TOTAL_POINTS);
  private readonly ptY = new Float32Array(TOTAL_POINTS);
  private readonly ptZ = new Float32Array(TOTAL_POINTS);
  private readonly ptVx = new Float32Array(TOTAL_POINTS);
  private readonly ptVy = new Float32Array(TOTAL_POINTS);
  private readonly ptVz = new Float32Array(TOTAL_POINTS);
  private readonly ptExcitation = new Float32Array(TOTAL_POINTS);

  // Bounded burst ring buffer
  private readonly bursts: BurstSlot[];
  private readonly particles: ActiveParticle[];

  // Three.js resources (when backend === 'webgl')
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;

  private lineGeometry: THREE.BufferGeometry | null = null;
  private lineMaterial: THREE.ShaderMaterial | null = null;
  private linePosAttr: THREE.BufferAttribute | null = null;
  private lineColorAttr: THREE.BufferAttribute | null = null;
  private linePosArr: Float32Array | null = null;
  private lineColorArr: Float32Array | null = null;

  private glowGeometry: THREE.BufferGeometry | null = null;
  private glowMaterial: THREE.ShaderMaterial | null = null;
  private glowPosAttr: THREE.BufferAttribute | null = null;
  private glowColorAttr: THREE.BufferAttribute | null = null;
  private glowSizeAttr: THREE.BufferAttribute | null = null;
  private glowPosArr: Float32Array | null = null;
  private glowColorArr: Float32Array | null = null;
  private glowSizeArr: Float32Array | null = null;

  private particleGeometry: THREE.BufferGeometry | null = null;
  private particleMaterial: THREE.ShaderMaterial | null = null;
  private particlePosAttr: THREE.BufferAttribute | null = null;
  private particleColorAttr: THREE.BufferAttribute | null = null;
  private particleSizeAttr: THREE.BufferAttribute | null = null;
  private particlePosArr: Float32Array | null = null;
  private particleColorArr: Float32Array | null = null;
  private particleSizeArr: Float32Array | null = null;

  // Fallback Canvas2D context (when backend === 'canvas2d')
  private ctx2d: CanvasRenderingContext2D | null = null;

  // Observers & bound listeners
  private resizeObserver: ResizeObserver | null = null;
  private readonly handleMouseMoveBound: (e: MouseEvent) => void;
  private readonly handleBlurBound: () => void;
  private readonly handleCanvasClickBound: (e: MouseEvent) => void;
  private readonly handleContextLostBound: (e: Event) => void;
  private readonly handleContextRestoredBound: () => void;
  private readonly renderFrameBound: (now: number) => void;

  constructor(container: HTMLElement, options: TopologyEngineOptions = {}) {
    this.container = container;
    this.mode = options.initialMode ?? 'MOBIUS';
    this.isPlaying = options.initialPlaying ?? true;
    this.subtle = options.subtle ?? true;
    this.burstActive = options.initialBurstActive ?? false;
    this.speedMultiplier = Math.min(3.0, Math.max(0.1, options.speedMultiplier ?? 1.0));
    this.particleCount = Math.min(MAX_PARTICLES, Math.max(0, Math.round(options.particleCount ?? DEFAULT_PARTICLE_COUNT)));
    this.onContextLost = options.onContextLost;
    this.onContextRestored = options.onContextRestored;
    this.onError = options.onError;

    // Initialize bounded burst slots
    this.bursts = Array.from({ length: MAX_BURSTS }, () => ({
      active: false,
      radius: 0,
      maxRadius: 0,
      strength: 0,
      centerX: 0,
      centerY: 0,
      age: 0,
    }));

    // Initialize fixed lattice particles (max pool size; rendered count configured via particleCount)
    this.particles = Array.from({ length: MAX_PARTICLES }, () => ({
      pointIndex: Math.floor(Math.random() * TOTAL_POINTS),
      progress: Math.random(),
      speed: 0.008 + Math.random() * 0.016,
      direction: Math.random() > 0.5 ? 0 : 1,
      isTeal: Math.random() > 0.4,
    }));

    this.initSimulationState();

    // Remove any orphaned topology canvas inside container before mounting
    const staleCanvases = container.querySelectorAll('canvas[data-topology-canvas="true"]');
    staleCanvases.forEach((node) => node.parentElement?.removeChild(node));

    this.canvas = this.createCanvasElement();
    container.insertBefore(this.canvas, container.firstChild);

    // Bind handlers once
    this.handleMouseMoveBound = this.onMouseMove.bind(this);
    this.handleBlurBound = this.onWindowBlur.bind(this);
    this.handleCanvasClickBound = this.onCanvasClick.bind(this);
    this.handleContextLostBound = this.onWebGLContextLost.bind(this);
    this.handleContextRestoredBound = this.onWebGLContextRestored.bind(this);
    this.renderFrameBound = this.tick.bind(this);

    // Initialize WebGL first; gracefully fall back to Canvas2D if WebGL fails
    if (!this.initWebGL()) {
      this.initCanvas2DFallback();
    }

    this.attachListeners();
    this.updateSize();
    this.drawCurrentScene();

    if (this.isPlaying) {
      this.startLoop();
    }
  }

  private createCanvasElement(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.dataset.topologyCanvas = 'true';
    canvas.className = 'absolute inset-0 block h-full w-full pointer-events-none select-none opacity-100';
    return canvas;
  }

  private initSimulationState(): void {
    for (let i = 0; i < TOTAL_POINTS; i++) {
      this.ptX[i] = (Math.random() - 0.5) * 400;
      this.ptY[i] = (Math.random() - 0.5) * 400;
      this.ptZ[i] = (Math.random() - 0.5) * 400;
      this.ptVx[i] = 0;
      this.ptVy[i] = 0;
      this.ptVz[i] = 0;
      this.ptExcitation[i] = 0;
    }
  }

  private initWebGL(): boolean {
    try {
      const renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(CAMERA_FOV_DEG, 1, 10, 6000);
      camera.position.set(0, 0, this.cameraZ);

      // 1. Pre-allocated LineSegments buffer
      const linePosArr = new Float32Array(MAX_LINE_VERTICES * 3);
      const lineColorArr = new Float32Array(MAX_LINE_VERTICES * 4);
      const linePosAttr = new THREE.BufferAttribute(linePosArr, 3);
      linePosAttr.setUsage(THREE.DynamicDrawUsage);
      const lineColorAttr = new THREE.BufferAttribute(lineColorArr, 4);
      lineColorAttr.setUsage(THREE.DynamicDrawUsage);

      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute('position', linePosAttr);
      lineGeometry.setAttribute('aColor', lineColorAttr);
      lineGeometry.setDrawRange(0, 0);

      const lineMaterial = new THREE.ShaderMaterial({
        vertexShader: LINE_VERTEX_SHADER,
        fragmentShader: LINE_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NormalBlending,
      });

      const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
      lineSegments.frustumCulled = false;
      scene.add(lineSegments);

      // 2. Pre-allocated Excited Glow Points buffer
      const glowPosArr = new Float32Array(MAX_GLOW_VERTICES * 3);
      const glowColorArr = new Float32Array(MAX_GLOW_VERTICES * 4);
      const glowSizeArr = new Float32Array(MAX_GLOW_VERTICES);
      const glowPosAttr = new THREE.BufferAttribute(glowPosArr, 3);
      glowPosAttr.setUsage(THREE.DynamicDrawUsage);
      const glowColorAttr = new THREE.BufferAttribute(glowColorArr, 4);
      glowColorAttr.setUsage(THREE.DynamicDrawUsage);
      const glowSizeAttr = new THREE.BufferAttribute(glowSizeArr, 1);
      glowSizeAttr.setUsage(THREE.DynamicDrawUsage);

      const glowGeometry = new THREE.BufferGeometry();
      glowGeometry.setAttribute('position', glowPosAttr);
      glowGeometry.setAttribute('aColor', glowColorAttr);
      glowGeometry.setAttribute('aSize', glowSizeAttr);
      glowGeometry.setDrawRange(0, 0);

      const glowMaterial = new THREE.ShaderMaterial({
        vertexShader: POINT_VERTEX_SHADER,
        fragmentShader: POINT_FRAGMENT_SHADER,
        uniforms: {
          uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        },
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NormalBlending,
      });

      const glowPoints = new THREE.Points(glowGeometry, glowMaterial);
      glowPoints.frustumCulled = false;
      scene.add(glowPoints);

      // 3. Pre-allocated Active Flowing Particles buffer (sized to MAX_PARTICLES)
      const particlePosArr = new Float32Array(MAX_PARTICLES * 3);
      const particleColorArr = new Float32Array(MAX_PARTICLES * 4);
      const particleSizeArr = new Float32Array(MAX_PARTICLES);
      const particlePosAttr = new THREE.BufferAttribute(particlePosArr, 3);
      particlePosAttr.setUsage(THREE.DynamicDrawUsage);
      const particleColorAttr = new THREE.BufferAttribute(particleColorArr, 4);
      particleColorAttr.setUsage(THREE.DynamicDrawUsage);
      const particleSizeAttr = new THREE.BufferAttribute(particleSizeArr, 1);
      particleSizeAttr.setUsage(THREE.DynamicDrawUsage);

      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute('position', particlePosAttr);
      particleGeometry.setAttribute('aColor', particleColorAttr);
      particleGeometry.setAttribute('aSize', particleSizeAttr);
      particleGeometry.setDrawRange(0, 0);

      const particleMaterial = new THREE.ShaderMaterial({
        vertexShader: POINT_VERTEX_SHADER,
        fragmentShader: POINT_FRAGMENT_SHADER,
        uniforms: {
          uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        },
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NormalBlending,
      });

      const particlePoints = new THREE.Points(particleGeometry, particleMaterial);
      particlePoints.frustumCulled = false;
      scene.add(particlePoints);

      this.renderer = renderer;
      this.scene = scene;
      this.camera = camera;

      this.lineGeometry = lineGeometry;
      this.lineMaterial = lineMaterial;
      this.linePosAttr = linePosAttr;
      this.lineColorAttr = lineColorAttr;
      this.linePosArr = linePosArr;
      this.lineColorArr = lineColorArr;

      this.glowGeometry = glowGeometry;
      this.glowMaterial = glowMaterial;
      this.glowPosAttr = glowPosAttr;
      this.glowColorAttr = glowColorAttr;
      this.glowSizeAttr = glowSizeAttr;
      this.glowPosArr = glowPosArr;
      this.glowColorArr = glowColorArr;
      this.glowSizeArr = glowSizeArr;

      this.particleGeometry = particleGeometry;
      this.particleMaterial = particleMaterial;
      this.particlePosAttr = particlePosAttr;
      this.particleColorAttr = particleColorAttr;
      this.particleSizeAttr = particleSizeAttr;
      this.particlePosArr = particlePosArr;
      this.particleColorArr = particleColorArr;
      this.particleSizeArr = particleSizeArr;

      this.backend = 'webgl';
      return true;
    } catch (err) {
      this.disposeThreeObjects();
      // Recreate a clean canvas element in case partial WebGL context was bound to the old one
      const freshCanvas = this.createCanvasElement();
      if (this.canvas.parentElement) {
        this.canvas.parentElement.replaceChild(freshCanvas, this.canvas);
      }
      this.canvas = freshCanvas;
      this.onError?.(err);
      return false;
    }
  }

  private initCanvas2DFallback(): void {
    try {
      const ctx = this.canvas.getContext('2d', { alpha: true });
      if (ctx) {
        this.ctx2d = ctx;
        this.backend = 'canvas2d';
        return;
      }
    } catch (err) {
      this.onError?.(err);
    }
    this.backend = 'none';
  }

  private attachListeners(): void {
    window.addEventListener('mousemove', this.handleMouseMoveBound, { passive: true });
    window.addEventListener('blur', this.handleBlurBound);
    this.canvas.addEventListener('click', this.handleCanvasClickBound);
    this.canvas.addEventListener('webglcontextlost', this.handleContextLostBound);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestoredBound);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (!this.isDisposed) {
          this.updateSize();
          if (!this.isPlaying) {
            this.drawCurrentScene();
          }
        }
      });
      this.resizeObserver.observe(this.container);
    }
  }

  private detachListeners(): void {
    window.removeEventListener('mousemove', this.handleMouseMoveBound);
    window.removeEventListener('blur', this.handleBlurBound);
    this.canvas.removeEventListener('click', this.handleCanvasClickBound);
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLostBound);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestoredBound);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isDisposed) return;
    const rect = this.container.getBoundingClientRect();
    this.pointerTargetX = e.clientX - rect.left;
    this.pointerTargetY = e.clientY - rect.top;
  }

  private onWindowBlur(): void {
    this.pointerTargetX = -2000;
    this.pointerTargetY = -2000;
  }

  private onCanvasClick(e: MouseEvent): void {
    if (this.isDisposed) return;
    const rect = this.canvas.getBoundingClientRect();
    this.triggerBurst(e.clientX - rect.left, e.clientY - rect.top);
  }

  private onWebGLContextLost(e: Event): void {
    e.preventDefault();
    this.isContextLost = true;
    this.stopLoop();
    this.onContextLost?.();
  }

  private onWebGLContextRestored(): void {
    if (this.isDisposed) return;
    this.isContextLost = false;
    this.updateSize();
    this.drawCurrentScene();
    if (this.isPlaying) {
      this.startLoop();
    }
    this.onContextRestored?.();
  }

  private updateSize(): void {
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(0, Math.floor(rect.width));
    const height = Math.max(0, Math.floor(rect.height));
    if (width === 0 || height === 0) return;

    this.width = width;
    this.height = height;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cameraZ = Math.max(320, (height * 0.5) / HALF_FOV_TAN);

    if (this.backend === 'webgl' && this.renderer && this.camera) {
      this.renderer.setPixelRatio(this.dpr);
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.position.set(0, 0, this.cameraZ);
      this.camera.updateProjectionMatrix();

      if (this.glowMaterial) {
        this.glowMaterial.uniforms.uPixelRatio.value = this.dpr;
      }
      if (this.particleMaterial) {
        this.particleMaterial.uniforms.uPixelRatio.value = this.dpr;
      }
    } else if (this.backend === 'canvas2d' && this.ctx2d) {
      this.canvas.width = Math.floor(width * this.dpr);
      this.canvas.height = Math.floor(height * this.dpr);
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      this.ctx2d.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
  }

  public setMode(mode: TopologyMode): void {
    if (this.isDisposed || this.mode === mode) return;
    this.mode = mode;
    if (!this.isPlaying) {
      // Snap one light projection refresh cleanly without restarting loop or advancing time
      this.drawCurrentScene();
    }
  }

  public setSubtle(subtle: boolean): void {
    if (this.isDisposed || this.subtle === subtle) return;
    this.subtle = subtle;
    if (!this.isPlaying) {
      this.drawCurrentScene();
    }
  }

  public setPlaying(playing: boolean): void {
    if (this.isDisposed || this.isPlaying === playing) return;
    this.isPlaying = playing;
    if (playing) {
      this.lastTimestamp = 0;
      this.startLoop();
    } else {
      this.stopLoop();
    }
  }

  public setBurstActive(active: boolean): void {
    if (this.isDisposed) return;
    const wasActive = this.burstActive;
    this.burstActive = active;
    if (active && !wasActive) {
      this.burstPulseCooldown = 0;
      this.triggerBurst();
    }
  }

  public setSpeedMultiplier(multiplier: number): void {
    if (this.isDisposed || !Number.isFinite(multiplier)) return;
    this.speedMultiplier = Math.min(3.0, Math.max(0.1, multiplier));
  }

  public setParticleCount(count: number): void {
    if (this.isDisposed || !Number.isFinite(count)) return;
    this.particleCount = Math.min(MAX_PARTICLES, Math.max(0, Math.round(count)));
    if (!this.isPlaying) {
      this.drawCurrentScene();
    }
  }

  public triggerBurst(localX?: number, localY?: number): void {
    if (this.isDisposed) return;
    const width = this.width || this.container.clientWidth || 1280;
    const height = this.height || this.container.clientHeight || 720;
    const maxRadius = Math.max(width, height) * 1.25;

    // Pick first inactive slot, or recycle the oldest active slot to cap O(1)
    let chosen = this.bursts[0];
    let maxAge = -1;
    for (let i = 0; i < MAX_BURSTS; i++) {
      const slot = this.bursts[i];
      if (!slot.active) {
        chosen = slot;
        break;
      }
      if (slot.age > maxAge) {
        maxAge = slot.age;
        chosen = slot;
      }
    }

    chosen.active = true;
    chosen.radius = 0;
    chosen.maxRadius = maxRadius;
    chosen.strength = 1.0;
    chosen.centerX = typeof localX === 'number' && Number.isFinite(localX) ? localX : width * 0.5;
    chosen.centerY = typeof localY === 'number' && Number.isFinite(localY) ? localY : height * 0.5;
    chosen.age = 0;
  }

  public isUsingWebGL(): boolean {
    return this.backend === 'webgl';
  }

  public getStats(): TopologyEngineStats {
    let activeBursts = 0;
    for (let i = 0; i < MAX_BURSTS; i++) {
      if (this.bursts[i].active) activeBursts++;
    }
    return {
      mode: this.mode,
      isPlaying: this.isPlaying,
      isDisposed: this.isDisposed,
      isContextLost: this.isContextLost,
      backend: this.backend,
      rafActive: this.rafId !== 0,
      activeBursts,
    };
  }

  private startLoop(): void {
    if (this.isDisposed || this.isContextLost || !this.isPlaying) return;
    if (this.rafId !== 0) return; // Strict single-loop guard
    this.lastTimestamp = 0;
    this.rafId = requestAnimationFrame(this.renderFrameBound);
  }

  private stopLoop(): void {
    if (this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private tick(now: number): void {
    this.rafId = 0;
    if (this.isDisposed || this.isContextLost || !this.isPlaying) {
      return;
    }

    if (this.lastTimestamp === 0) {
      this.lastTimestamp = now;
    }
    const rawDt = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;

    // Guard against huge delta jumps after tab switches or resume
    const dt = Math.min(Math.max(Number.isFinite(rawDt) ? rawDt : 0.016, 0.001), 0.05);

    this.stepPhysics(dt);
    this.drawCurrentScene();

    if (this.isPlaying && !this.isDisposed && !this.isContextLost) {
      this.rafId = requestAnimationFrame(this.renderFrameBound);
    }
  }

  private stepPhysics(dt: number): void {
    const width = this.width;
    const height = this.height;
    if (width <= 0 || height <= 0) return;

    const frameScale = Math.min(Math.max(dt * 60, 0.25), 2.5);
    this.animTime += dt * 0.54 * this.speedMultiplier;

    if (this.burstActive) {
      this.burstPulseCooldown -= dt * this.speedMultiplier;
      if (this.burstPulseCooldown <= 0) {
        this.triggerBurst();
        this.burstPulseCooldown = 1.25;
      }
    }

    // Smooth pointer tracking
    const ptrAlpha = 1 - Math.pow(0.92, frameScale);
    this.pointerX += (this.pointerTargetX - this.pointerX) * ptrAlpha;
    this.pointerY += (this.pointerTargetY - this.pointerY) * ptrAlpha;

    const centerX = width * 0.5;
    const centerY = height * 0.5;

    // Update fixed burst pool
    const decay = Math.pow(0.955, frameScale);
    for (let b = 0; b < MAX_BURSTS; b++) {
      const burst = this.bursts[b];
      if (!burst.active) continue;
      burst.radius += 16 * frameScale;
      burst.strength *= decay;
      burst.age += dt;
      if (burst.radius > burst.maxRadius || burst.strength < 0.01) {
        burst.active = false;
      }
    }

    const cosX = Math.cos(this.animTime);
    const sinX = Math.sin(this.animTime);
    const cosY = Math.cos(this.animTime * 0.7);
    const sinY = Math.sin(this.animTime * 0.7);

    const minDim = Math.min(width, height);
    const scale = minDim * 0.40;
    const camDist = this.cameraZ;
    const damping = Math.pow(0.85, frameScale);
    const spring = 0.04 * frameScale;
    const excitationDecay = Math.pow(0.925, frameScale);

    const mode = this.mode;
    const ptrX = this.pointerX;
    const ptrY = this.pointerY;
    const ptrRad = this.pointerRadius;

    for (let i = 0; i < TOTAL_POINTS; i++) {
      const col = i % COLS;
      const row = (i / COLS) | 0;
      const u = (col / COLS) * Math.PI * 2;
      const v = (row / (ROWS - 1)) * 2 - 1;

      let tx = 0;
      let ty = 0;
      let tz = 0;

      if (mode === 'MOBIUS') {
        const ribbon = v * scale * 0.44;
        tx = (scale + ribbon * Math.cos(u * 0.5)) * Math.cos(u);
        tz = (scale + ribbon * Math.cos(u * 0.5)) * Math.sin(u);
        ty = ribbon * Math.sin(u * 0.5);
      } else if (mode === 'WAVE') {
        const waveStep = minDim * 0.035;
        tx = (col - (COLS - 1) * 0.5) * waveStep;
        tz = (row - (ROWS - 1) * 0.5) * waveStep;
        ty =
          Math.sin(col * 0.32 + this.animTime * 2.8) * 44 +
          Math.cos(row * 0.32 + this.animTime * 2.0) * 44;
      } else if (mode === 'HELIX') {
        const helixRadius = scale * 0.64;
        const turns = 2.0;
        tx = helixRadius * Math.cos(u * 2 + v * Math.PI * turns);
        tz = helixRadius * Math.sin(u * 2 + v * Math.PI * turns);
        ty = v * scale * 1.45;
      } else {
        // CYLINDER
        tx = scale * 0.74 * Math.cos(u);
        tz = scale * 0.74 * Math.sin(u);
        ty = v * scale * 1.15;
      }

      // 3D rotation
      const rx = tx * cosX - tz * sinX;
      const rz1 = tx * sinX + tz * cosX;
      const ry = ty * cosY - rz1 * sinY;
      const rz = ty * sinY + rz1 * cosY;

      let x = finiteOrZero(this.ptX[i]);
      let y = finiteOrZero(this.ptY[i]);
      let z = finiteOrZero(this.ptZ[i]);
      let vx = finiteOrZero(this.ptVx[i]);
      let vy = finiteOrZero(this.ptVy[i]);
      let vz = finiteOrZero(this.ptVz[i]);
      let excitation = finiteOrZero(this.ptExcitation[i]);

      vx = vx * damping + (rx - x) * spring;
      vy = vy * damping + (ry - y) * spring;
      vz = vz * damping + (rz - z) * spring;

      x += vx;
      y += vy;
      z += vz;

      // Guard against runaway divergence
      const maxExtent = Math.max(width, height) * 2.5;
      if (Math.abs(x) > maxExtent || Math.abs(y) > maxExtent || Math.abs(z) > maxExtent) {
        x = rx;
        y = ry;
        z = rz;
        vx = 0;
        vy = 0;
        vz = 0;
      }

      // Safe perspective projection for cursor & ripple proximity
      const denom = Math.max(80, camDist + z);
      const persp = camDist / denom;
      const projX = centerX + x * persp;
      const projY = centerY + y * persp;

      const dx = projX - ptrX;
      const dy = projY - ptrY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ptrRad && dist > 0) {
        const normDist = 1 - dist / ptrRad;
        const smooth = normDist * normDist * (3 - 2 * normDist);
        excitation = Math.max(excitation, smooth * 1.1);
      }

      for (let b = 0; b < MAX_BURSTS; b++) {
        const burst = this.bursts[b];
        if (!burst.active) continue;
        const bx = projX - burst.centerX;
        const by = projY - burst.centerY;
        const distToBurst = Math.sqrt(bx * bx + by * by);
        const ringWidth = 65;
        const diff = Math.abs(distToBurst - burst.radius);
        if (diff < ringWidth) {
          const norm = 1 - diff / ringWidth;
          const smooth = norm * norm * (3 - 2 * norm);
          excitation = Math.max(excitation, smooth * burst.strength);
        }
      }

      excitation *= excitationDecay;

      this.ptX[i] = x;
      this.ptY[i] = y;
      this.ptZ[i] = z;
      this.ptVx[i] = vx;
      this.ptVy[i] = vy;
      this.ptVz[i] = vz;
      this.ptExcitation[i] = excitation;
    }

    // Advance lattice particles along grid connections
    const activeCount = this.particleCount;
    for (let i = 0; i < activeCount; i++) {
      const ap = this.particles[i];
      ap.progress += ap.speed * frameScale;
      if (ap.progress >= 1) {
        ap.progress = 0;
        ap.pointIndex = Math.floor(Math.random() * TOTAL_POINTS);
        ap.direction = Math.random() > 0.5 ? 0 : 1;
        ap.isTeal = Math.random() > 0.4;
      }
    }
  }

  private drawCurrentScene(): void {
    if (this.isDisposed || this.isContextLost) return;
    if (this.width <= 0 || this.height <= 0) return;

    if (this.backend === 'webgl') {
      this.drawWebGL();
    } else if (this.backend === 'canvas2d') {
      this.drawCanvas2D();
    }
  }

  private drawWebGL(): void {
    if (
      !this.renderer ||
      !this.scene ||
      !this.camera ||
      !this.lineGeometry ||
      !this.linePosArr ||
      !this.lineColorArr ||
      !this.linePosAttr ||
      !this.lineColorAttr ||
      !this.glowGeometry ||
      !this.glowPosArr ||
      !this.glowColorArr ||
      !this.glowSizeArr ||
      !this.glowPosAttr ||
      !this.glowColorAttr ||
      !this.glowSizeAttr ||
      !this.particleGeometry ||
      !this.particlePosArr ||
      !this.particleColorArr ||
      !this.particleSizeArr ||
      !this.particlePosAttr ||
      !this.particleColorAttr ||
      !this.particleSizeAttr
    ) {
      return;
    }

    const baseOpacityFactor = this.subtle ? 0.48 : 0.65;
    const camDist = this.cameraZ;
    const mode = this.mode;

    let lineVert = 0;
    let glowVert = 0;

    // 1 & 2. Mesh edges, connection nodes and excited node halos
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const idx = r * COLS + c;
        const x1 = this.ptX[idx];
        const y1 = -this.ptY[idx];
        const z1 = -this.ptZ[idx];
        const ex1 = this.ptExcitation[idx];

        const rawZ1 = this.ptZ[idx];
        const depthAlpha = Math.max(0.18, Math.min(1, 1 - (rawZ1 + 300) / 600));

        // A. Horizontal edge
        let targetHIdx = -1;
        if (c < COLS - 1) {
          targetHIdx = r * COLS + c + 1;
        } else if (mode === 'CYLINDER') {
          targetHIdx = r * COLS;
        } else if (mode === 'MOBIUS') {
          targetHIdx = (ROWS - 1 - r) * COLS;
        }

        if (targetHIdx !== -1 && lineVert + 2 <= MAX_LINE_VERTICES) {
          const x2 = this.ptX[targetHIdx];
          const y2 = -this.ptY[targetHIdx];
          const z2 = -this.ptZ[targetHIdx];
          const edgeEx = Math.max(ex1, this.ptExcitation[targetHIdx]);

          let cr: number;
          let cg: number;
          let cb: number;
          let ca: number;
          if (edgeEx > 0.06) {
            cr = 20 / 255;
            cg = 184 / 255;
            cb = 166 / 255;
            ca = Math.min(0.85, (depthAlpha * 0.45 + edgeEx * 0.85) * baseOpacityFactor * 1.8);
          } else if (r % 2 === 0) {
            // Enhanced luminous cyan lattice threads (approx +38% opacity)
            cr = 56 / 255;
            cg = 189 / 255;
            cb = 248 / 255;
            ca = Math.min(0.48, (depthAlpha * 0.46 + 0.20) * baseOpacityFactor);
          } else {
            // Enhanced luminous teal lattice threads (approx +38% opacity)
            cr = 20 / 255;
            cg = 184 / 255;
            cb = 166 / 255;
            ca = Math.min(0.58, (depthAlpha * 0.56 + 0.24) * baseOpacityFactor);
          }

          const pOff = lineVert * 3;
          this.linePosArr[pOff] = x1;
          this.linePosArr[pOff + 1] = y1;
          this.linePosArr[pOff + 2] = z1;
          this.linePosArr[pOff + 3] = x2;
          this.linePosArr[pOff + 4] = y2;
          this.linePosArr[pOff + 5] = z2;

          const cOff = lineVert * 4;
          this.lineColorArr[cOff] = cr;
          this.lineColorArr[cOff + 1] = cg;
          this.lineColorArr[cOff + 2] = cb;
          this.lineColorArr[cOff + 3] = ca;
          this.lineColorArr[cOff + 4] = cr;
          this.lineColorArr[cOff + 5] = cg;
          this.lineColorArr[cOff + 6] = cb;
          this.lineColorArr[cOff + 7] = ca;

          lineVert += 2;
        }

        // B. Vertical edge
        if (r < ROWS - 1 && lineVert + 2 <= MAX_LINE_VERTICES) {
          const targetVIdx = (r + 1) * COLS + c;
          const x2 = this.ptX[targetVIdx];
          const y2 = -this.ptY[targetVIdx];
          const z2 = -this.ptZ[targetVIdx];
          const edgeEx = Math.max(ex1, this.ptExcitation[targetVIdx]);

          let cr: number;
          let cg: number;
          let cb: number;
          let ca: number;
          if (edgeEx > 0.06) {
            cr = 20 / 255;
            cg = 184 / 255;
            cb = 166 / 255;
            ca = Math.min(0.85, (depthAlpha * 0.45 + edgeEx * 0.85) * baseOpacityFactor * 1.8);
          } else if (c % 2 === 0) {
            cr = 56 / 255;
            cg = 189 / 255;
            cb = 248 / 255;
            ca = Math.min(0.42, (depthAlpha * 0.42 + 0.16) * baseOpacityFactor);
          } else {
            cr = 20 / 255;
            cg = 184 / 255;
            cb = 166 / 255;
            ca = Math.min(0.52, (depthAlpha * 0.50 + 0.20) * baseOpacityFactor);
          }

          const pOff = lineVert * 3;
          this.linePosArr[pOff] = x1;
          this.linePosArr[pOff + 1] = y1;
          this.linePosArr[pOff + 2] = z1;
          this.linePosArr[pOff + 3] = x2;
          this.linePosArr[pOff + 4] = y2;
          this.linePosArr[pOff + 5] = z2;

          const cOff = lineVert * 4;
          this.lineColorArr[cOff] = cr;
          this.lineColorArr[cOff + 1] = cg;
          this.lineColorArr[cOff + 2] = cb;
          this.lineColorArr[cOff + 3] = ca;
          this.lineColorArr[cOff + 4] = cr;
          this.lineColorArr[cOff + 5] = cg;
          this.lineColorArr[cOff + 6] = cb;
          this.lineColorArr[cOff + 7] = ca;

          lineVert += 2;
        }

        // C. Connection nodes: excited glow halo + core OR ambient soft cyan/teal connection points
        const persp = camDist / Math.max(80, camDist + rawZ1);
        if (ex1 > 0.06 && glowVert + 2 <= MAX_GLOW_VERTICES) {
          const glowR = Math.max(0.5, (1.8 + ex1 * 3.5) * persp);

          // Outer teal halo
          let pOff = glowVert * 3;
          let cOff = glowVert * 4;
          this.glowPosArr[pOff] = x1;
          this.glowPosArr[pOff + 1] = y1;
          this.glowPosArr[pOff + 2] = z1;
          this.glowColorArr[cOff] = 20 / 255;
          this.glowColorArr[cOff + 1] = 184 / 255;
          this.glowColorArr[cOff + 2] = 166 / 255;
          this.glowColorArr[cOff + 3] = Math.min(1, ex1 * 0.75);
          this.glowSizeArr[glowVert] = glowR * 3.0;
          glowVert++;

          // Inner white core
          pOff = glowVert * 3;
          cOff = glowVert * 4;
          this.glowPosArr[pOff] = x1;
          this.glowPosArr[pOff + 1] = y1;
          this.glowPosArr[pOff + 2] = z1;
          this.glowColorArr[cOff] = 1;
          this.glowColorArr[cOff + 1] = 1;
          this.glowColorArr[cOff + 2] = 1;
          this.glowColorArr[cOff + 3] = Math.min(1, ex1 * 1.2);
          this.glowSizeArr[glowVert] = glowR * 1.4;
          glowVert++;
        } else if ((r + c) % 2 === 0 && glowVert + 1 <= MAX_GLOW_VERTICES) {
          // Soft ambient luminous node at alternating lattice junctions
          const nodeR = Math.max(0.7, 1.8 * persp);
          const nodeAlpha = Math.min(0.48, (depthAlpha * 0.40 + 0.16) * baseOpacityFactor * 1.4);
          let pOff = glowVert * 3;
          let cOff = glowVert * 4;
          this.glowPosArr[pOff] = x1;
          this.glowPosArr[pOff + 1] = y1;
          this.glowPosArr[pOff + 2] = z1;
          if (r % 2 === 0) {
            this.glowColorArr[cOff] = 56 / 255;
            this.glowColorArr[cOff + 1] = 189 / 255;
            this.glowColorArr[cOff + 2] = 248 / 255; // Cyan
          } else {
            this.glowColorArr[cOff] = 20 / 255;
            this.glowColorArr[cOff + 1] = 184 / 255;
            this.glowColorArr[cOff + 2] = 166 / 255; // Teal
          }
          this.glowColorArr[cOff + 3] = nodeAlpha;
          this.glowSizeArr[glowVert] = nodeR * 2.4;
          glowVert++;
        }
      }
    }

    this.lineGeometry.setDrawRange(0, lineVert);
    this.linePosAttr.needsUpdate = true;
    this.lineColorAttr.needsUpdate = true;

    this.glowGeometry.setDrawRange(0, glowVert);
    this.glowPosAttr.needsUpdate = true;
    this.glowColorAttr.needsUpdate = true;
    this.glowSizeAttr.needsUpdate = true;

    // 3. Flowing lattice particles
    let particleVert = 0;
    const activeParticleLimit = this.particleCount;
    for (let i = 0; i < activeParticleLimit; i++) {
      const ap = this.particles[i];
      const sIdx = ap.pointIndex;
      const col = sIdx % COLS;
      const row = (sIdx / COLS) | 0;

      let endIdx = -1;
      if (ap.direction === 0) {
        if (col < COLS - 1) endIdx = row * COLS + col + 1;
        else if (mode === 'CYLINDER') endIdx = row * COLS;
        else if (mode === 'MOBIUS') endIdx = (ROWS - 1 - row) * COLS;
      } else if (row < ROWS - 1) {
        endIdx = (row + 1) * COLS + col;
      }

      if (endIdx !== -1) {
        const sx = this.ptX[sIdx];
        const sy = -this.ptY[sIdx];
        const sz = -this.ptZ[sIdx];
        const ex = this.ptX[endIdx];
        const ey = -this.ptY[endIdx];
        const ez = -this.ptZ[endIdx];

        const t = ap.progress;
        const x = sx + (ex - sx) * t;
        const y = sy + (ey - sy) * t;
        const z = sz + (ez - sz) * t;

        const rawAvgZ = (this.ptZ[sIdx] + this.ptZ[endIdx]) * 0.5;
        const avgPersp = camDist / Math.max(80, camDist + rawAvgZ);
        const depthAlpha = Math.max(0.25, Math.min(1, 1 - (rawAvgZ + 300) / 600));

        const pOff = particleVert * 3;
        const cOff = particleVert * 4;
        this.particlePosArr[pOff] = x;
        this.particlePosArr[pOff + 1] = y;
        this.particlePosArr[pOff + 2] = z;

        if (ap.isTeal) {
          this.particleColorArr[cOff] = 20 / 255;
          this.particleColorArr[cOff + 1] = 184 / 255;
          this.particleColorArr[cOff + 2] = 166 / 255;
          this.particleColorArr[cOff + 3] = Math.min(1.0, depthAlpha * 1.1);
          this.particleSizeArr[particleVert] = Math.max(2.0, 6.4 * avgPersp);
        } else {
          this.particleColorArr[cOff] = 1;
          this.particleColorArr[cOff + 1] = 1;
          this.particleColorArr[cOff + 2] = 1;
          this.particleColorArr[cOff + 3] = Math.min(1.0, depthAlpha * 1.15);
          this.particleSizeArr[particleVert] = Math.max(1.6, 4.8 * avgPersp);
        }
        particleVert++;
      }
    }

    this.particleGeometry.setDrawRange(0, particleVert);
    this.particlePosAttr.needsUpdate = true;
    this.particleColorAttr.needsUpdate = true;
    this.particleSizeAttr.needsUpdate = true;

    try {
      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      this.onError?.(err);
    }
  }

  private drawCanvas2D(): void {
    const ctx = this.ctx2d;
    if (!ctx) return;

    const width = this.width;
    const height = this.height;
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const camDist = this.cameraZ;
    const baseOpacityFactor = this.subtle ? 0.48 : 0.65;
    const mode = this.mode;

    ctx.clearRect(0, 0, width, height);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const idx = r * COLS + c;
        const pz = this.ptZ[idx];
        const persp = camDist / Math.max(80, camDist + pz);
        const px = centerX + this.ptX[idx] * persp;
        const py = centerY + this.ptY[idx] * persp;
        const depthAlpha = Math.max(0.18, Math.min(1, 1 - (pz + 300) / 600));
        const ex1 = this.ptExcitation[idx];

        let targetHIdx = -1;
        if (c < COLS - 1) targetHIdx = r * COLS + c + 1;
        else if (mode === 'CYLINDER') targetHIdx = r * COLS;
        else if (mode === 'MOBIUS') targetHIdx = (ROWS - 1 - r) * COLS;

        if (targetHIdx !== -1) {
          const nz = this.ptZ[targetHIdx];
          const nPersp = camDist / Math.max(80, camDist + nz);
          const nx = centerX + this.ptX[targetHIdx] * nPersp;
          const ny = centerY + this.ptY[targetHIdx] * nPersp;
          const edgeEx = Math.max(ex1, this.ptExcitation[targetHIdx]);

          if (edgeEx > 0.06) {
            ctx.strokeStyle = `rgba(20, 184, 166, ${Math.min(0.85, (depthAlpha * 0.45 + edgeEx * 0.85) * baseOpacityFactor * 1.8)})`;
            ctx.lineWidth = 1.2 + edgeEx * 1.6;
          } else if (r % 2 === 0) {
            ctx.strokeStyle = `rgba(56, 189, 248, ${Math.min(0.48, (depthAlpha * 0.46 + 0.20) * baseOpacityFactor)})`;
            ctx.lineWidth = 1;
          } else {
            ctx.strokeStyle = `rgba(20, 184, 166, ${Math.min(0.58, (depthAlpha * 0.56 + 0.24) * baseOpacityFactor)})`;
            ctx.lineWidth = 1;
          }

          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(nx, ny);
          ctx.stroke();
        }

        if (r < ROWS - 1) {
          const targetVIdx = (r + 1) * COLS + c;
          const nz = this.ptZ[targetVIdx];
          const nPersp = camDist / Math.max(80, camDist + nz);
          const nx = centerX + this.ptX[targetVIdx] * nPersp;
          const ny = centerY + this.ptY[targetVIdx] * nPersp;
          const edgeEx = Math.max(ex1, this.ptExcitation[targetVIdx]);

          if (edgeEx > 0.06) {
            ctx.strokeStyle = `rgba(20, 184, 166, ${Math.min(0.85, (depthAlpha * 0.45 + edgeEx * 0.85) * baseOpacityFactor * 1.8)})`;
            ctx.lineWidth = 1.2 + edgeEx * 1.6;
          } else if (c % 2 === 0) {
            ctx.strokeStyle = `rgba(56, 189, 248, ${Math.min(0.42, (depthAlpha * 0.42 + 0.16) * baseOpacityFactor)})`;
            ctx.lineWidth = 1;
          } else {
            ctx.strokeStyle = `rgba(20, 184, 166, ${Math.min(0.52, (depthAlpha * 0.50 + 0.20) * baseOpacityFactor)})`;
            ctx.lineWidth = 1;
          }

          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(nx, ny);
          ctx.stroke();
        }

        if (ex1 > 0.06) {
          const glowR = Math.max(0.4, (1.8 + ex1 * 3.5) * persp);
          ctx.fillStyle = `rgba(20, 184, 166, ${Math.min(1, ex1 * 0.75)})`;
          ctx.beginPath();
          ctx.arc(px, py, glowR * 1.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, ex1 * 1.2)})`;
          ctx.beginPath();
          ctx.arc(px, py, glowR * 0.7, 0, Math.PI * 2);
          ctx.fill();
        } else if ((r + c) % 2 === 0) {
          const nodeR = Math.max(0.6, 1.6 * persp);
          const nodeAlpha = Math.min(0.48, (depthAlpha * 0.40 + 0.16) * baseOpacityFactor * 1.4);
          ctx.fillStyle = r % 2 === 0
            ? `rgba(56, 189, 248, ${nodeAlpha})`
            : `rgba(20, 184, 166, ${nodeAlpha})`;
          ctx.beginPath();
          ctx.arc(px, py, nodeR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const activeParticleLimit = this.particleCount;
    for (let i = 0; i < activeParticleLimit; i++) {
      const ap = this.particles[i];
      const sIdx = ap.pointIndex;
      const col = sIdx % COLS;
      const row = (sIdx / COLS) | 0;

      let endIdx = -1;
      if (ap.direction === 0) {
        if (col < COLS - 1) endIdx = row * COLS + col + 1;
        else if (mode === 'CYLINDER') endIdx = row * COLS;
        else if (mode === 'MOBIUS') endIdx = (ROWS - 1 - row) * COLS;
      } else if (row < ROWS - 1) {
        endIdx = (row + 1) * COLS + col;
      }

      if (endIdx !== -1) {
        const sPersp = camDist / Math.max(80, camDist + this.ptZ[sIdx]);
        const ePersp = camDist / Math.max(80, camDist + this.ptZ[endIdx]);
        const sx = centerX + this.ptX[sIdx] * sPersp;
        const sy = centerY + this.ptY[sIdx] * sPersp;
        const ex = centerX + this.ptX[endIdx] * ePersp;
        const ey = centerY + this.ptY[endIdx] * ePersp;

        const cx = sx + (ex - sx) * ap.progress;
        const cy = sy + (ey - sy) * ap.progress;
        const avgPersp = (sPersp + ePersp) * 0.5;
        const depthAlpha = Math.max(0.25, Math.min(1, 1 - ((this.ptZ[sIdx] + this.ptZ[endIdx]) * 0.5 + 300) / 600));
        const rPx = Math.max(0.4, (ap.isTeal ? 3.2 : 2.4) * avgPersp);

        ctx.fillStyle = ap.isTeal
          ? `rgba(20, 184, 166, ${Math.min(1.0, depthAlpha * 1.1)})`
          : `rgba(255, 255, 255, ${Math.min(1.0, depthAlpha * 1.15)})`;
        ctx.beginPath();
        ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private disposeThreeObjects(): void {
    if (this.lineGeometry) {
      this.lineGeometry.dispose();
      this.lineGeometry = null;
    }
    if (this.lineMaterial) {
      this.lineMaterial.dispose();
      this.lineMaterial = null;
    }
    if (this.glowGeometry) {
      this.glowGeometry.dispose();
      this.glowGeometry = null;
    }
    if (this.glowMaterial) {
      this.glowMaterial.dispose();
      this.glowMaterial = null;
    }
    if (this.particleGeometry) {
      this.particleGeometry.dispose();
      this.particleGeometry = null;
    }
    if (this.particleMaterial) {
      this.particleMaterial.dispose();
      this.particleMaterial = null;
    }
    if (this.scene) {
      this.scene.clear();
      this.scene = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    this.camera = null;

    this.linePosAttr = null;
    this.lineColorAttr = null;
    this.linePosArr = null;
    this.lineColorArr = null;

    this.glowPosAttr = null;
    this.glowColorAttr = null;
    this.glowSizeAttr = null;
    this.glowPosArr = null;
    this.glowColorArr = null;
    this.glowSizeArr = null;

    this.particlePosAttr = null;
    this.particleColorAttr = null;
    this.particleSizeAttr = null;
    this.particlePosArr = null;
    this.particleColorArr = null;
    this.particleSizeArr = null;
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.isPlaying = false;

    this.stopLoop();
    this.detachListeners();
    this.disposeThreeObjects();

    this.ctx2d = null;
    this.backend = 'none';

    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}
