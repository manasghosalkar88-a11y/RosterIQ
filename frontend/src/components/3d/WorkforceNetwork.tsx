import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { api } from '../../services/api';
import type { NetworkGraphResponse, NetworkGraphNode, NetworkGraphLink } from '../../types/overview';
import {
  Play,
  Pause,
  RotateCcw,
  Filter,
  Info,
  Maximize2,
  Minimize2,
  X,
  RefreshCw,
  Search,
} from 'lucide-react';

interface WorkforceNetworkProps {
  totalEmployees?: number;
  podCount?: number;
}

export const WorkforceNetwork: React.FC<WorkforceNetworkProps> = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<NetworkGraphResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Interaction State
  const [hoveredNode, setHoveredNode] = useState<NetworkGraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<NetworkGraphNode | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Filters State
  const [podFilter, setPodFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const nodeMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const linkObjectsRef = useRef<Array<{ line: THREE.Line | THREE.LineSegments; link: NetworkGraphLink }>>([]);
  const pulseParticlesRef = useRef<Array<{ mesh: THREE.Mesh; p1: THREE.Vector3; p2: THREE.Vector3; progress: number; speed: number }>>([]);
  const animFrameIdRef = useRef<number | null>(null);

  // 1. Fetch live authentic workforce network data
  const fetchGraphData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<NetworkGraphResponse>('/overview/network-graph');
      setGraphData(res.data);
    } catch (err) {
      console.error('Failed to load authentic workforce graph from backend', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  // Filtered nodes logic
  const filteredNodeIds = useMemo(() => {
    if (!graphData) return new Set<string>();
    const ids = new Set<string>();

    graphData.nodes.forEach((node) => {
      // Pod filter
      if (podFilter !== 'ALL') {
        const podNum = podFilter.replace('pod-', '');
        if (node.type === 'pod' && node.id !== podFilter) return;
        if (node.type === 'employee' && String(node.pod_id) !== podNum) return;
        if (node.type === 'brand' && String(node.pod_id) !== podNum) return;
      }

      // Type filter
      if (typeFilter !== 'ALL' && node.type !== typeFilter) return;

      // Status filter
      if (statusFilter !== 'ALL' && node.status !== statusFilter) return;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matches =
          node.name.toLowerCase().includes(query) ||
          (node.code && node.code.toLowerCase().includes(query)) ||
          (node.designation && node.designation.toLowerCase().includes(query));
        if (!matches) return;
      }

      ids.add(node.id);
    });

    return ids;
  }, [graphData, podFilter, typeFilter, statusFilter, searchQuery]);

  // Compute connected node IDs for highlighting
  const connectedNodeIds = useMemo(() => {
    if (!selectedNode || !graphData) return null;
    const connected = new Set<string>();
    connected.add(selectedNode.id);

    graphData.links.forEach((link) => {
      if (link.source === selectedNode.id) {
        connected.add(link.target);
      } else if (link.target === selectedNode.id) {
        connected.add(link.source);
      }
    });

    return connected;
  }, [selectedNode, graphData]);

  // 2. Initialize Three.js Scene
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !graphData) return;

    // Clear any previous canvas
    while (mount.firstChild) {
      mount.removeChild(mount.firstChild);
    }

    const width = mount.clientWidth || 600;
    const height = mount.clientHeight || 400;

    // Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 3, 24);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = !isPaused;
    controls.autoRotateSpeed = 0.65;
    controls.maxDistance = 55;
    controls.minDistance = 6;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x14b8a6, 2.5);
    dirLight1.position.set(12, 18, 12);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x06b6d4, 1.8);
    dirLight2.position.set(-12, -10, -12);
    scene.add(dirLight2);

    const centralGlow = new THREE.PointLight(0x2dd4bf, 2.2, 40);
    centralGlow.position.set(0, 0, 0);
    scene.add(centralGlow);

    // Groups
    const graphGroup = new THREE.Group();
    scene.add(graphGroup);

    const nodesMap = new Map<string, THREE.Mesh>();
    const nodePositions = new Map<string, THREE.Vector3>();

    // Node Geometries
    const podGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.45, 6);
    const brandGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);
    const processGeo = new THREE.TorusGeometry(0.65, 0.18, 12, 24);
    const employeeGeo = new THREE.SphereGeometry(0.44, 16, 16);

    // 1. Calculate positions & instantiate Pod Hubs
    const pods = graphData.nodes.filter((n) => n.type === 'pod');
    const podRadius = 9.2;
    pods.forEach((p, idx) => {
      const angle = (idx / pods.length) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * podRadius;
      const z = Math.sin(angle) * podRadius;
      const y = Math.sin(angle * 2) * 0.8;
      const pos = new THREE.Vector3(x, y, z);
      nodePositions.set(p.id, pos);

      // Status color
      const colorHex = p.status === 'CONFLICT' ? 0xef4444 : p.status === 'WARNING' ? 0xf59e0b : 0x14b8a6;
      const podMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.35,
        roughness: 0.2,
        metalness: 0.6,
      });

      const podMesh = new THREE.Mesh(podGeo, podMat);
      podMesh.position.copy(pos);
      podMesh.userData = { node: p, defaultScale: 1.0 };

      // Outer glowing ring for Pod
      const ringGeo = new THREE.RingGeometry(1.6, 1.8, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      podMesh.add(ringMesh);

      graphGroup.add(podMesh);
      nodesMap.set(p.id, podMesh);
    });

    // 2. Position Core Processes centrally
    const processes = graphData.nodes.filter((n) => n.type === 'process');
    const processOffsets = [
      new THREE.Vector3(-3.2, 1.6, 0.5),
      new THREE.Vector3(3.2, 1.6, 0.5),
      new THREE.Vector3(0, 3.6, 1.8),
      new THREE.Vector3(0, -2.6, -1.8),
    ];
    processes.forEach((pr, idx) => {
      const pos = processOffsets[idx % processOffsets.length];
      nodePositions.set(pr.id, pos);

      const colorHex = pr.status === 'CONFLICT' ? 0xef4444 : pr.status === 'WARNING' ? 0xf59e0b : 0x8b5cf6;
      const prMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.4,
        roughness: 0.25,
        metalness: 0.5,
      });

      const prMesh = new THREE.Mesh(processGeo, prMat);
      prMesh.position.copy(pos);
      prMesh.rotation.x = Math.PI / 4;
      prMesh.userData = { node: pr, defaultScale: 1.0 };
      graphGroup.add(prMesh);
      nodesMap.set(pr.id, prMesh);
    });

    // 3. Position Brands (elevated outer ring around their respective Pod)
    const brands = graphData.nodes.filter((n) => n.type === 'brand');
    const brandsByPod: { [key: number]: NetworkGraphNode[] } = {};
    brands.forEach((b) => {
      const pid = b.pod_id || 1;
      if (!brandsByPod[pid]) brandsByPod[pid] = [];
      brandsByPod[pid].push(b);
    });

    Object.entries(brandsByPod).forEach(([podIdStr, bList]) => {
      const podPos = nodePositions.get(`pod-${podIdStr}`) || new THREE.Vector3(0, 0, 0);
      bList.forEach((b, bIdx) => {
        const offsetAngle = ((bIdx + 0.5) / bList.length) * Math.PI - Math.PI / 2;
        const bDist = 3.6;
        const bx = podPos.x + Math.cos(offsetAngle) * bDist;
        const by = podPos.y + 2.4 + (bIdx % 2) * 0.6;
        const bz = podPos.z + Math.sin(offsetAngle) * bDist;
        const pos = new THREE.Vector3(bx, by, bz);
        nodePositions.set(b.id, pos);

        const colorHex = b.status === 'CONFLICT' ? 0xef4444 : b.status === 'WARNING' ? 0xf59e0b : 0x06b6d4;
        const bMat = new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: colorHex,
          emissiveIntensity: 0.35,
          roughness: 0.3,
          metalness: 0.5,
        });

        const bMesh = new THREE.Mesh(brandGeo, bMat);
        bMesh.position.copy(pos);
        bMesh.rotation.y = Math.PI / 4;
        bMesh.userData = { node: b, defaultScale: 1.0 };
        graphGroup.add(bMesh);
        nodesMap.set(b.id, bMesh);
      });
    });

    // 4. Position Employees orbiting their respective Pod
    const employees = graphData.nodes.filter((n) => n.type === 'employee');
    const employeesByPod: { [key: number]: NetworkGraphNode[] } = {};
    employees.forEach((e) => {
      const pid = e.pod_id || 1;
      if (!employeesByPod[pid]) employeesByPod[pid] = [];
      employeesByPod[pid].push(e);
    });

    Object.entries(employeesByPod).forEach(([podIdStr, eList]) => {
      const podPos = nodePositions.get(`pod-${podIdStr}`) || new THREE.Vector3(0, 0, 0);
      eList.forEach((e, eIdx) => {
        const angle = (eIdx / eList.length) * Math.PI * 2;
        const dist = 2.4 + (eIdx % 3) * 0.9;
        const ex = podPos.x + Math.cos(angle) * dist;
        const ey = podPos.y - 1.0 + Math.sin(angle * 2) * 1.1;
        const ez = podPos.z + Math.sin(angle) * dist;
        const pos = new THREE.Vector3(ex, ey, ez);
        nodePositions.set(e.id, pos);

        const colorHex = e.status === 'CONFLICT' ? 0xef4444 : e.status === 'WARNING' ? 0xf59e0b : 0x14b8a6;
        const eMat = new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: colorHex,
          emissiveIntensity: 0.3,
          roughness: 0.4,
          metalness: 0.2,
        });

        const eMesh = new THREE.Mesh(employeeGeo, eMat);
        eMesh.position.copy(pos);
        eMesh.userData = { node: e, defaultScale: 1.0 };
        graphGroup.add(eMesh);
        nodesMap.set(e.id, eMesh);
      });
    });

    nodeMeshesRef.current = nodesMap;

    // 5. Build Relational Connection Lines
    const linkObjects: Array<{ line: THREE.Line | THREE.LineSegments; link: NetworkGraphLink }> = [];
    const pulseParticles: Array<{ mesh: THREE.Mesh; p1: THREE.Vector3; p2: THREE.Vector3; progress: number; speed: number }> = [];

    const pulseGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.9 });

    graphData.links.forEach((link) => {
      const p1 = nodePositions.get(link.source);
      const p2 = nodePositions.get(link.target);
      if (!p1 || !p2) return;

      let lineColor = 0x334e68;
      let opacity = 0.35;

      if (link.relation === 'EMPLOYEE_BRAND_PRIMARY') {
        lineColor = 0x14b8a6;
        opacity = 0.65;
      } else if (link.relation === 'EMPLOYEE_BRAND_BACKUP') {
        lineColor = 0xf59e0b;
        opacity = 0.4;
      } else if (link.relation === 'POD_BRAND') {
        lineColor = 0x06b6d4;
        opacity = 0.55;
      } else if (link.relation === 'BRAND_PROCESS') {
        lineColor = 0x8b5cf6;
        opacity = 0.4;
      }

      const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const lineMat = new THREE.LineBasicMaterial({
        color: lineColor,
        transparent: true,
        opacity,
      });

      const line = new THREE.Line(lineGeo, lineMat);
      line.userData = { link };
      graphGroup.add(line);
      linkObjects.push({ line, link });

      // Add flowing pulse particle for primary assignments & brand-process lines
      if (link.relation === 'EMPLOYEE_BRAND_PRIMARY' || link.relation === 'BRAND_PROCESS') {
        const pMesh = new THREE.Mesh(pulseGeo, pulseMat);
        pMesh.position.copy(p1);
        graphGroup.add(pMesh);
        pulseParticles.push({
          mesh: pMesh,
          p1,
          p2,
          progress: Math.random(),
          speed: 0.006 + Math.random() * 0.008,
        });
      }
    });

    linkObjectsRef.current = linkObjects;
    pulseParticlesRef.current = pulseParticles;

    // 6. Ambient Dust Particles
    const dustCount = 100;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPositions[i] = (Math.random() - 0.5) * 36;
      dustPositions[i + 1] = (Math.random() - 0.5) * 24;
      dustPositions[i + 2] = (Math.random() - 0.5) * 36;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x2dd4bf,
      size: 0.16,
      transparent: true,
      opacity: 0.4,
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    graphGroup.add(dustPoints);

    // 7. Raycasting for Hover & Click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let currentHoveredMesh: THREE.Mesh | null = null;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / mount.clientWidth) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / mount.clientHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(nodesMap.values());
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        if (currentHoveredMesh !== hit) {
          if (currentHoveredMesh) currentHoveredMesh.scale.set(1, 1, 1);
          currentHoveredMesh = hit;
          hit.scale.set(1.28, 1.28, 1.28);
        }
        setHoveredNode(hit.userData.node as NetworkGraphNode);
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      } else {
        if (currentHoveredMesh) {
          currentHoveredMesh.scale.set(1, 1, 1);
          currentHoveredMesh = null;
        }
        setHoveredNode(null);
      }
    };

    const handlePointerDown = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / mount.clientWidth) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / mount.clientHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(nodesMap.values());
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        setSelectedNode(hit.userData.node as NetworkGraphNode);
      } else {
        // Clicked empty background
        setSelectedNode(null);
      }
    };

    mount.addEventListener('mousemove', handlePointerMove);
    mount.addEventListener('click', handlePointerDown);

    // 8. Resize Handler
    const resizeObserver = new ResizeObserver(() => {
      if (!mount) return;
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    resizeObserver.observe(mount);

    // 9. Animation Loop
    let lastTime = performance.now();
    const animate = (time: number) => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = (time - lastTime) * 0.001;
      lastTime = time;

      controls.update();

      // Gentle subtle floating particle movement along connection lines
      if (!isPaused) {
        pulseParticles.forEach((p) => {
          p.progress += p.speed;
          if (p.progress > 1) p.progress = 0;
          p.mesh.position.lerpVectors(p.p1, p.p2, p.progress);
        });

        // Slow ambient dust drift
        dustPoints.rotation.y += delta * 0.02;
      }

      renderer.render(scene, camera);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      mount.removeEventListener('mousemove', handlePointerMove);
      mount.removeEventListener('click', handlePointerDown);
      renderer.dispose();
      podGeo.dispose();
      brandGeo.dispose();
      processGeo.dispose();
      employeeGeo.dispose();
      pulseGeo.dispose();
      dustGeo.dispose();
    };
  }, [graphData, isPaused]);

  // Update controls autoRotate when isPaused changes
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = !isPaused;
    }
  }, [isPaused]);

  // 3. Highlight / Dim effect when a node is selected or filtered
  useEffect(() => {
    if (!graphData) return;

    const nodesMap = nodeMeshesRef.current;
    const linkObjects = linkObjectsRef.current;

    // Highlight/dim nodes
    nodesMap.forEach((mesh, id) => {
      const isFilteredIn = filteredNodeIds.has(id);
      const isConnected = connectedNodeIds ? connectedNodeIds.has(id) : true;
      const isSelected = selectedNode?.id === id;

      const mat = mesh.material as THREE.MeshStandardMaterial;

      if (isSelected) {
        mesh.scale.set(1.4, 1.4, 1.4);
        mat.opacity = 1.0;
        mat.emissiveIntensity = 0.8;
      } else if (isConnected && isFilteredIn) {
        mesh.scale.set(1.0, 1.0, 1.0);
        mat.opacity = 1.0;
        mat.emissiveIntensity = 0.35;
      } else {
        mesh.scale.set(0.8, 0.8, 0.8);
        mat.opacity = 0.12;
        mat.emissiveIntensity = 0.05;
      }
    });

    // Highlight/dim links
    linkObjects.forEach(({ line, link }) => {
      const mat = line.material as THREE.LineBasicMaterial;
      const isSourceActive = connectedNodeIds ? connectedNodeIds.has(link.source) : filteredNodeIds.has(link.source);
      const isTargetActive = connectedNodeIds ? connectedNodeIds.has(link.target) : filteredNodeIds.has(link.target);

      if (isSourceActive && isTargetActive) {
        mat.opacity = link.relation === 'EMPLOYEE_BRAND_PRIMARY' ? 0.85 : 0.55;
      } else {
        mat.opacity = 0.05;
      }
    });
  }, [selectedNode, connectedNodeIds, filteredNodeIds, graphData]);

  // Reset Camera action
  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(0, 3, 24);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
    setSelectedNode(null);
    setPodFilter('ALL');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setSearchQuery('');
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col ${
        isExpanded ? 'fixed inset-0 z-50 bg-[#0B132B]/95 backdrop-blur-md p-6' : 'min-h-[260px]'
      }`}
    >
      {/* 3D Canvas Container */}
      <div ref={mountRef} className="relative w-full flex-1 overflow-hidden cursor-grab active:cursor-grabbing" />

      {/* Top Left Live Indicator & Stats (Shown in Expanded Mode) */}
      {isExpanded && (
        <div className="absolute top-6 left-6 z-10 pointer-events-none flex items-center space-x-3">
          <span className="w-3 h-3 rounded-full bg-teal-400 animate-ping" />
          <span className="text-sm font-mono text-teal-300 font-bold uppercase tracking-wider">
            Live Workforce Network Explorer (3D)
          </span>
          {graphData && (
            <span className="text-xs text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700/80 font-mono">
              {graphData.employees_count} Specialists · {graphData.pods_count} Pod Hubs · {graphData.brands_count} Brands · {graphData.processes_count} Processes
            </span>
          )}
        </div>
      )}

      {/* Top Right Floating Toolbar Controls */}
      <div
        className={`absolute z-20 flex items-center space-x-1.5 bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-xl ${
          isExpanded ? 'top-6 right-6' : 'top-3 right-4'
        }`}
      >
        {/* Pause / Resume */}
        <button
          onClick={() => setIsPaused(!isPaused)}
          className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
            isPaused ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title={isPaused ? 'Resume Autorotation' : 'Pause Autorotation'}
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>

        {/* Reset Camera */}
        <button
          onClick={handleResetCamera}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-all"
          title="Reset Camera & Clear Selection"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Filters Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-1.5 rounded-lg text-xs transition-all ${
            showFilters || podFilter !== 'ALL' || typeFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Toggle Filters Bar"
        >
          <Filter className="w-4 h-4" />
        </button>

        {/* Legend Toggle */}
        <button
          onClick={() => setShowLegend(!showLegend)}
          className={`p-1.5 rounded-lg text-xs transition-all ${
            showLegend ? 'bg-teal-500/20 text-teal-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Toggle Network Legend"
        >
          <Info className="w-4 h-4" />
        </button>

        {/* Fullscreen / Expand Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-all"
          title={isExpanded ? 'Collapse View' : 'Expand Network Explorer'}
        >
          {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Floating Tooltip */}
      {hoveredNode && !selectedNode && (
        <div
          className="absolute z-30 pointer-events-none bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[200px]"
          style={{
            left: Math.min(tooltipPos.x + 12, (mountRef.current?.clientWidth || 400) - 220),
            top: Math.min(tooltipPos.y + 12, (mountRef.current?.clientHeight || 300) - 120),
          }}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-sm truncate mr-2">{hoveredNode.name}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                hoveredNode.status === 'CONFLICT'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : hoveredNode.status === 'WARNING'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
              }`}
            >
              {hoveredNode.status}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 capitalize">
            Type: <span className="text-slate-200 font-semibold">{hoveredNode.type}</span> ·{' '}
            {hoveredNode.pod_name || hoveredNode.code}
          </div>

          {hoveredNode.type === 'employee' && (
            <div className="text-[11px] text-slate-300">
              Brands:{' '}
              <span className="text-teal-400 font-medium">
                {hoveredNode.assigned_brands?.map((b) => b.name).join(', ') || 'General Pod Floater'}
              </span>
            </div>
          )}

          {hoveredNode.type === 'brand' && (
            <div className="text-[11px] text-slate-300">
              Staffing: <span className="text-teal-400">{hoveredNode.is_single_resource ? 'Single-Resource (80%)' : 'Multi-Resource'}</span>
            </div>
          )}

          {hoveredNode.type === 'pod' && (
            <div className="text-[11px] text-slate-300">
              Capacity: <span className="text-teal-400">{hoveredNode.employee_count} Specialists</span> ·{' '}
              <span className="text-cyan-400">{hoveredNode.brand_count} Brands</span>
            </div>
          )}

          <div className="text-[10px] text-slate-500 italic pt-0.5">Click node to inspect relationships</div>
        </div>
      )}

      {/* Selected Node Details Card (Bottom / Side Flyout) */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-30 bg-slate-900/95 border border-teal-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-xs space-y-3 max-h-[80%] overflow-y-auto">
          <div className="flex items-start justify-between border-b border-slate-800 pb-2.5">
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    selectedNode.status === 'CONFLICT'
                      ? 'bg-rose-500'
                      : selectedNode.status === 'WARNING'
                      ? 'bg-amber-500'
                      : 'bg-teal-400'
                  }`}
                />
                <h4 className="font-bold text-white text-sm">{selectedNode.name}</h4>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {selectedNode.code} · {selectedNode.designation || selectedNode.type.toUpperCase()}
              </p>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Employee Inspection Details */}
          {selectedNode.type === 'employee' && (
            <div className="space-y-2.5 text-slate-300">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Pod Team</span>
                <span className="font-medium text-teal-300">{selectedNode.pod_name}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Assigned Brands</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedNode.assigned_brands && selectedNode.assigned_brands.length > 0 ? (
                    selectedNode.assigned_brands.map((b) => (
                      <span
                        key={b.id}
                        className="bg-slate-800 border border-teal-500/30 text-teal-300 px-2 py-0.5 rounded text-[11px]"
                      >
                        {b.name} ({b.type})
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic">Pod Shared Backup</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Processes Handled</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedNode.assigned_processes && selectedNode.assigned_processes.length > 0 ? (
                    selectedNode.assigned_processes.map((p) => (
                      <span key={p.id} className="bg-purple-950/60 border border-purple-500/40 text-purple-300 px-2 py-0.5 rounded text-[11px]">
                        {p.code} - {p.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic">All Pod Processes</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Contract Availability</span>
                <span className="font-mono text-[11px] text-slate-200">{selectedNode.availability}</span>
              </div>
            </div>
          )}

          {/* Pod Inspection Details */}
          {selectedNode.type === 'pod' && (
            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Specialists:</span>
                <span className="font-bold text-teal-400">{selectedNode.employee_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Managed Brands:</span>
                <span className="font-bold text-cyan-400">{selectedNode.brand_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Coverage Status:</span>
                <span className={selectedNode.status === 'CONFLICT' ? 'text-rose-400 font-bold' : 'text-teal-400'}>
                  {selectedNode.status} ({selectedNode.conflict_count} alerts)
                </span>
              </div>
              <div className="text-[11px] text-slate-400 pt-1">
                Connected employees and brands are now illuminated in the 3D network.
              </div>
            </div>
          )}

          {/* Brand Inspection Details */}
          {selectedNode.type === 'brand' && (
            <div className="space-y-2 text-slate-300">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Operational Model</span>
                <span className="font-semibold text-cyan-300">
                  {selectedNode.is_single_resource ? '80% Single-Resource Dedicated Specialist' : 'Multi-Resource Team'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Assigned Specialists</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedNode.assigned_employees?.map((e) => (
                    <span key={e.id} className="bg-slate-800 text-teal-300 px-2 py-0.5 rounded text-[11px]">
                      {e.name} ({e.type})
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Active Processes</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedNode.assigned_processes?.map((p) => (
                    <span key={p.id} className="bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded text-[11px]">
                      {p.code}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Process Inspection Details */}
          {selectedNode.type === 'process' && (
            <div className="space-y-2 text-slate-300">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Active Client Accounts</span>
                <span className="font-bold text-purple-300">{selectedNode.brand_count} D2C Brands</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Coverage Shortages:</span>
                <span className={selectedNode.status === 'CONFLICT' ? 'text-rose-400 font-bold' : 'text-teal-400'}>
                  {selectedNode.conflict_count} Shifts Short
                </span>
              </div>
            </div>
          )}

          <button
            onClick={() => setSelectedNode(null)}
            className="w-full mt-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all text-center"
          >
            Clear Selection & Restore View
          </button>
        </div>
      )}

      {/* Collapsible Filter Bar Overlay */}
      {showFilters && (
        <div className="absolute top-14 right-4 z-20 bg-slate-900/95 border border-slate-700/80 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs space-y-2.5 w-72">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-white text-xs uppercase tracking-wider">Network Filters</span>
            <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee, brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Filter by Pod */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
              Filter by Pod
            </label>
            <select
              value={podFilter}
              onChange={(e) => setPodFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Operational Pods</option>
              <option value="pod-1">Pod Alpha (Lifestyle & Fashion)</option>
              <option value="pod-2">Pod Beta (Beauty & Skincare)</option>
              <option value="pod-3">Pod Gamma (Food & Gourmet)</option>
              <option value="pod-4">Pod Delta (Consumer Electronics)</option>
              <option value="pod-5">Pod Epsilon (Home & Living)</option>
            </select>
          </div>

          {/* Filter by Node Type */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
              Node Type
            </label>
            <div className="grid grid-cols-4 gap-1">
              {['ALL', 'pod', 'brand', 'employee'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`py-1 rounded text-[10px] font-semibold uppercase ${
                    typeFilter === t ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Filter by Operational Status */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
              Status Color
            </label>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => setStatusFilter(statusFilter === 'NORMAL' ? 'ALL' : 'NORMAL')}
                className={`py-1 rounded text-[10px] font-semibold border ${
                  statusFilter === 'NORMAL'
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500'
                    : 'bg-slate-800 text-slate-400 border-transparent hover:text-white'
                }`}
              >
                Teal (OK)
              </button>
              <button
                onClick={() => setStatusFilter(statusFilter === 'WARNING' ? 'ALL' : 'WARNING')}
                className={`py-1 rounded text-[10px] font-semibold border ${
                  statusFilter === 'WARNING'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                    : 'bg-slate-800 text-slate-400 border-transparent hover:text-white'
                }`}
              >
                Amber (Warn)
              </button>
              <button
                onClick={() => setStatusFilter(statusFilter === 'CONFLICT' ? 'ALL' : 'CONFLICT')}
                className={`py-1 rounded text-[10px] font-semibold border ${
                  statusFilter === 'CONFLICT'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                    : 'bg-slate-800 text-slate-400 border-transparent hover:text-white'
                }`}
              >
                Red (Conflict)
              </button>
            </div>
          </div>

          {/* Reset Filters */}
          {(podFilter !== 'ALL' || typeFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setPodFilter('ALL');
                setTypeFilter('ALL');
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
              className="w-full py-1 text-[11px] text-teal-400 hover:text-teal-300 underline font-semibold text-center"
            >
              Reset All Filters
            </button>
          )}
        </div>
      )}

      {/* Floating Legend Overlay */}
      {showLegend && (
        <div className="absolute bottom-4 left-4 z-20 bg-slate-900/95 border border-slate-700/80 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs space-y-2 max-w-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-white text-xs uppercase tracking-wider">Workforce Network Legend</span>
            <button onClick={() => setShowLegend(false)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="font-semibold text-slate-300 text-[10px] uppercase tracking-wider">Node Geometries</div>
            <div className="flex items-center space-x-2 text-slate-300">
              <span className="w-3 h-3 rounded bg-teal-500/80 inline-block text-center text-[8px] font-bold">⬢</span>
              <span>Pod Hub (Hexagonal Ring)</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-300">
              <span className="w-3 h-3 bg-cyan-500/80 inline-block transform rotate-45" />
              <span>D2C Brand (Diamond Cube)</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-300">
              <span className="w-3 h-3 rounded-full bg-purple-500/80 inline-block" />
              <span>Core Process (Torus Ring)</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block" />
              <span>Employee Specialist (Sphere)</span>
            </div>

            <div className="font-semibold text-slate-300 text-[10px] uppercase tracking-wider pt-1">
              Operational Status
            </div>
            <div className="flex items-center space-x-2 text-teal-400">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span>Teal: Normal / Operational</span>
            </div>
            <div className="flex items-center space-x-2 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Amber: Warning / At-Risk</span>
            </div>
            <div className="flex items-center space-x-2 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Red: Active Coverage Conflict</span>
            </div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-40 backdrop-blur-xs">
          <div className="flex items-center space-x-2 text-teal-400 text-xs font-mono">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading live workforce topology...</span>
          </div>
        </div>
      )}
    </div>
  );
};
