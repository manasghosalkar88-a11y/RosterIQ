import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const GeometricBackground: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.z = 25;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Group for combined rotation
    const networkGroup = new THREE.Group();
    scene.add(networkGroup);

    // 1. Central icosahedron wireframe (representing operational cluster)
    const icoGeometry = new THREE.IcosahedronGeometry(10, 1);
    const icoWireframe = new THREE.WireframeGeometry(icoGeometry);
    const icoMaterial = new THREE.LineBasicMaterial({
      color: 0x14B8A6, // DataStraw Teal
      transparent: true,
      opacity: 0.35,
    });
    const icoLines = new THREE.LineSegments(icoWireframe, icoMaterial);
    networkGroup.add(icoLines);

    // 2. Inner core octahedron (representing scheduling engine core)
    const coreGeometry = new THREE.OctahedronGeometry(5, 0);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x334E68,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    networkGroup.add(coreMesh);

    // 3. Orbiting node points (representing 30+ employees / pods)
    const particleCount = 45;
    const particlePositions = new Float32Array(particleCount * 3);
    const radius = 14;

    for (let i = 0; i < particleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = radius * Math.cbrt(Math.random());

      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = r * Math.cos(phi);
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x14B8A6,
      size: 0.45,
      transparent: true,
      opacity: 0.75,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    networkGroup.add(particles);

    // Animation loop
    let animationFrameId: number;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      mouseX = (event.clientX / innerWidth) * 2 - 1;
      mouseY = -(event.clientY / innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Subtle constant rotation
      networkGroup.rotation.x += 0.0018;
      networkGroup.rotation.y += 0.0028;

      // Soft damping toward mouse orientation
      networkGroup.rotation.x += (mouseY * 0.2 - networkGroup.rotation.x) * 0.02;
      networkGroup.rotation.y += (mouseX * 0.2 - networkGroup.rotation.y) * 0.02;

      coreMesh.rotation.y -= 0.004;

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      icoGeometry.dispose();
      icoMaterial.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none opacity-40 overflow-hidden"
      aria-hidden="true"
    />
  );
};
