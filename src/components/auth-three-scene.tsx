"use client";

import { useEffect, useRef, useState } from "react";
import type { Mesh } from "three";

type AuthThreeSceneProps = {
  variant?: "student" | "faculty";
};

export function AuthThreeScene({ variant = "student" }: AuthThreeSceneProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const updateViewport = () => setIsDesktop(desktop.matches);
    updateViewport();
    desktop.addEventListener("change", updateViewport);
    return () => desktop.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas || !isDesktop) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let disposed = false;
    let frame = 0;
    let disposeScene: (() => void) | undefined;
    let renderer: import("three").WebGLRenderer | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let observer: IntersectionObserver | undefined;
    let isVisible = true;
    let previousFrame = 0;
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const hue = variant === "faculty" ? 0.72 : 0.57;

    void import("three").then((THREE) => {
      if (disposed) return;

      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: false,
          powerPreference: "low-power",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setClearColor(0x000000, 0);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
        camera.position.set(0, 0, 9);

        const world = new THREE.Group();
        scene.add(world);

        const core = new THREE.Group();
        core.position.set(1.8, 0.08, 0);
        world.add(core);

        const coreGeometry = new THREE.IcosahedronGeometry(1.02, 2);
        const coreMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(hue, 0.78, 0.49),
          emissive: new THREE.Color().setHSL(hue, 0.92, 0.18),
          metalness: 0.56,
          roughness: 0.24,
          transparent: true,
          opacity: 0.74,
          flatShading: true,
        });
        const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
        core.add(coreMesh);

        const wireframe = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.055, 2)),
          new THREE.LineBasicMaterial({
            color: variant === "faculty" ? 0xc4b5fd : 0x7dd3fc,
            transparent: true,
            opacity: 0.76,
          }),
        );
        core.add(wireframe);

        const innerGeometry = new THREE.IcosahedronGeometry(0.52, 1);
        const innerMesh = new THREE.Mesh(
          innerGeometry,
          new THREE.MeshBasicMaterial({
            color: variant === "faculty" ? 0xa78bfa : 0x60a5fa,
            wireframe: true,
            transparent: true,
            opacity: 0.34,
          }),
        );
        innerMesh.rotation.set(0.4, 0.2, 0.7);
        core.add(innerMesh);

        const orbitRings: Mesh[] = [];
        for (let index = 0; index < 3; index += 1) {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(1.47 + index * 0.2, 0.006, 5, 144),
            new THREE.MeshBasicMaterial({
              color: index === 1 ? 0x818cf8 : variant === "faculty" ? 0xc4b5fd : 0x67e8f9,
              transparent: true,
              opacity: 0.5 - index * 0.08,
            }),
          );
          ring.rotation.set(0.66 + index * 0.56, 0.2 + index * 0.42, index * 0.28);
          core.add(ring);
          orbitRings.push(ring);
        }

        const satelliteGeometry = new THREE.SphereGeometry(0.035, 8, 6);
        const satelliteMaterial = new THREE.MeshBasicMaterial({
          color: variant === "faculty" ? 0xe9d5ff : 0xbae6fd,
        });
        const satellites = Array.from({ length: 8 }, (_, index) => {
          const satellite = new THREE.Mesh(satelliteGeometry, satelliteMaterial);
          satellite.userData = { phase: (index / 8) * Math.PI * 2, radius: 1.8 + (index % 3) * 0.12 };
          core.add(satellite);
          return satellite;
        });

        const particleCount = window.innerWidth < 1440 ? 260 : 420;
        const positions = new Float32Array(particleCount * 3);
        for (let index = 0; index < particleCount; index += 1) {
          positions[index * 3] = (Math.random() - 0.5) * 12;
          positions[index * 3 + 1] = (Math.random() - 0.5) * 7.5;
          positions[index * 3 + 2] = (Math.random() - 0.5) * 5 - 1;
        }
        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const particleField = new THREE.Points(
          particleGeometry,
          new THREE.PointsMaterial({
            color: variant === "faculty" ? 0xc4b5fd : 0x93c5fd,
            size: 0.018,
            transparent: true,
            opacity: 0.58,
            sizeAttenuation: true,
            depthWrite: false,
          }),
        );
        scene.add(particleField);

        const ambientLight = new THREE.AmbientLight(0x8097cb, 1.2);
        const keyLight = new THREE.PointLight(variant === "faculty" ? 0xa78bfa : 0x38bdf8, 20, 10);
        keyLight.position.set(1.2, 1.4, 3.2);
        scene.add(ambientLight, keyLight);

        const resize = () => {
          if (!renderer) return;
          const { width, height } = stage.getBoundingClientRect();
          if (!width || !height) return;
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.position.x = width < 900 ? 0.25 : 0;
          camera.updateProjectionMatrix();
          if (reducedMotion.matches) renderer.render(scene, camera);
        };

        const handlePointerMove = (event: PointerEvent) => {
          const bounds = stage.getBoundingClientRect();
          pointer.targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.4;
          pointer.targetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.3;
        };
        const resetPointer = () => {
          pointer.targetX = 0;
          pointer.targetY = 0;
        };

        const animate = (now: number) => {
          frame = 0;
          if (disposed || !renderer || !isVisible || document.hidden) return;
          if (now - previousFrame < 32) {
            frame = requestAnimationFrame(animate);
            return;
          }
          const delta = Math.min((now - previousFrame) / 1000, 0.05);
          previousFrame = now;
          const time = now * 0.00018;
          pointer.x += (pointer.targetX - pointer.x) * Math.min(delta * 2.6, 1);
          pointer.y += (pointer.targetY - pointer.y) * Math.min(delta * 2.6, 1);
          core.rotation.y = time + pointer.x;
          core.rotation.x = Math.sin(time * 0.7) * 0.12 + pointer.y;
          core.position.y = 0.08 + Math.sin(time * 1.8) * 0.1;
          innerMesh.rotation.y = -time * 1.7;
          innerMesh.rotation.x = time * 0.8;
          orbitRings.forEach((ring, index) => {
            ring.rotation.z += delta * (index % 2 === 0 ? 0.08 : -0.06);
          });
          satellites.forEach((satellite) => {
            const { phase, radius } = satellite.userData as { phase: number; radius: number };
            const angle = phase + time * 3;
            satellite.position.set(
              Math.cos(angle) * radius,
              Math.sin(angle * 1.1) * radius * 0.48,
              Math.sin(angle) * radius * 0.58,
            );
          });
          particleField.rotation.y = pointer.x * 0.18 + time * 0.04;
          world.rotation.y += (pointer.x * 0.16 - world.rotation.y) * delta;
          world.rotation.x += (pointer.y * 0.12 - world.rotation.x) * delta;
          renderer.render(scene, camera);
          frame = requestAnimationFrame(animate);
        };

        const startAnimation = () => {
          if (reducedMotion.matches || !isVisible || document.hidden || frame) return;
          previousFrame = performance.now();
          frame = requestAnimationFrame(animate);
        };
        const handleVisibility = () => {
          if (document.hidden) {
            if (frame) cancelAnimationFrame(frame);
            frame = 0;
          } else {
            startAnimation();
          }
        };
        const handleMotionChange = () => {
          if (reducedMotion.matches) {
            if (frame) cancelAnimationFrame(frame);
            frame = 0;
            renderer?.render(scene, camera);
          } else {
            startAnimation();
          }
        };

        resize();
        renderer.render(scene, camera);
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(stage);
        observer = new IntersectionObserver(([entry]) => {
          isVisible = entry.isIntersecting;
          if (isVisible) startAnimation();
          else if (frame) {
            cancelAnimationFrame(frame);
            frame = 0;
          }
        });
        observer.observe(stage);
        stage.addEventListener("pointermove", handlePointerMove, { passive: true });
        stage.addEventListener("pointerleave", resetPointer);
        document.addEventListener("visibilitychange", handleVisibility);
        reducedMotion.addEventListener("change", handleMotionChange);
        startAnimation();

        const cleanup = () => {
          if (frame) cancelAnimationFrame(frame);
          resizeObserver?.disconnect();
          observer?.disconnect();
          stage.removeEventListener("pointermove", handlePointerMove);
          stage.removeEventListener("pointerleave", resetPointer);
          document.removeEventListener("visibilitychange", handleVisibility);
          reducedMotion.removeEventListener("change", handleMotionChange);
          scene.traverse((object) => {
            if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
              object.geometry.dispose();
              const materials = Array.isArray(object.material) ? object.material : [object.material];
              materials.forEach((material) => material.dispose());
            }
          });
          renderer?.dispose();
          renderer = undefined;
        };

        if (disposed) cleanup();
        else {
          disposeScene = cleanup;
          stage.dataset.webglReady = "true";
        }
      } catch (error) {
        console.error("Unable to initialize the login WebGL scene.", error);
        renderer?.dispose();
        renderer = undefined;
      }
    }).catch((error: unknown) => {
      if (!disposed) console.error("Unable to load the login WebGL scene.", error);
    });

    return () => {
      disposed = true;
      disposeScene?.();
      delete stage.dataset.webglReady;
    };
  }, [isDesktop, variant]);

  return (
    <div ref={stageRef} aria-hidden="true" className="auth-three-stage">
      <canvas ref={canvasRef} className="auth-three-canvas" />
      <div className="auth-three-vignette" />
      <div className="auth-three-hud">
        <span className="auth-hud-ring auth-hud-ring-one" />
        <span className="auth-hud-ring auth-hud-ring-two" />
        <span className="auth-hud-cross auth-hud-cross-one">+</span>
        <span className="auth-hud-cross auth-hud-cross-two">+</span>
        <span className="auth-hud-coordinate">PH / 01—10</span>
        <span className="auth-hud-signal"><i /> LIVE SIGNAL</span>
      </div>
    </div>
  );
}
