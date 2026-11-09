import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface WorkforceNetworkProps {
  totalEmployees?: number;
  podCount?: number;
}

export const WorkforceNetwork: React.FC<WorkforceNetworkProps> = ({
  totalEmployees = 32,
  podCount = 5,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.z = 22;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // 1. Pod Hub Centers (5 hubs arranged in a circle)
    const podPositions: THREE.Vector3[] = [];
    const podRadius = 7.5;
    for (let i = 0; i < podCount; i++) {
      const angle = (i / podCount) * Math.PI * 2;
      const x = Math.cos(angle) * podRadius;
      const y = Math.sin(angle) * podRadius;
      const z = (Math.random() - 0.5) * 2;
      const pos = new THREE.Vector3(x, y, z);
      podPositions.push(pos);

      // Pod Hub Mesh (glowing sphere)
      const hubGeo = new THREE.SphereGeometry(0.7, 16, 16);
      const hubMat = new THREE.MeshBasicMaterial({ color: 0x14B8A6 });
      const hubMesh = new THREE.Mesh(hubGeo, hubMat);
      hubMesh.position.copy(pos);
      group.add(hubMesh);
    }

    // Connect Pod Hubs with Ring Lines
    const ringPoints: THREE.Vector3[] = [...podPositions, podPositions[0]];
    const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPoints);
    const ringMat = new THREE.LineBasicMaterial({ color: 0x14B8A6, transparent: true, opacity: 0.4 });
    const ringLine = new THREE.Line(ringGeo, ringMat);
    group.add(ringLine);

    // 2. Employee Nodes orbiting their respective Pod Hubs
    const empCount = totalEmployees;
    const empPositions: THREE.Vector3[] = [];
    const linePairs: THREE.Vector3[] = [];

    for (let i = 0; i < empCount; i++) {
      const podIdx = i % podCount;
      const podPos = podPositions[podIdx];

      // Local offset around pod
      const localAngle = Math.random() * Math.PI * 2;
      const localDist = 1.8 + Math.random() * 2.2;
      const ex = podPos.x + Math.cos(localAngle) * localDist;
      const ey = podPos.y + Math.sin(localAngle) * localDist;
      const ez = podPos.z + (Math.random() - 0.5) * 2.5;

      const empPos = new THREE.Vector3(ex, ey, ez);
      empPositions.push(empPos);

      // Connect Employee to Pod Hub
      linePairs.push(podPos);
      linePairs.push(empPos);
    }

    // Connection Filaments
    const linesGeo = new THREE.BufferGeometry().setFromPoints(linePairs);
    const linesMat = new THREE.LineSegments(
      linesGeo,
      new THREE.LineBasicMaterial({ color: 0x334E68, transparent: true, opacity: 0.35 })
    );
    group.add(linesMat);

    // Employee Dots Points
    const empGeo = new THREE.BufferGeometry().setFromPoints(empPositions);
    const empMat = new THREE.PointsMaterial({
      color: 0x0284C7,
      size: 0.45,
      transparent: true,
      opacity: 0.85,
    });
    const empPoints = new THREE.Points(empGeo, empMat);
    group.add(empPoints);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / mount.clientWidth - 0.5) * 2;
      mouseY = -((e.clientY - rect.top) / mount.clientHeight - 0.5) * 2;
    };
    mount.addEventListener('mousemove', handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      group.rotation.y += 0.003;
      group.rotation.x += 0.001;

      // Subtle mouse follow
      camera.position.x += (mouseX * 4 - camera.position.x) * 0.04;
      camera.position.y += (mouseY * 4 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      mount.removeEventListener('mousemove', handleMouseMove);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [totalEmployees, podCount]);

  return <div ref={mountRef} className="w-full h-full min-h-[220px]" />;
};
