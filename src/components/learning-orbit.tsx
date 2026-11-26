"use client";

import { useEffect, useRef, useState } from "react";

type Point3D = { x: number; y: number; z: number };

function createSpherePoints(latitudeBands: number, longitudeSegments: number) {
  const points: Point3D[] = [];
  for (let latitude = 1; latitude < latitudeBands; latitude += 1) {
    const polar = Math.PI * latitude / latitudeBands;
    for (let longitude = 0; longitude < longitudeSegments; longitude += 1) {
      const azimuth = Math.PI * 2 * longitude / longitudeSegments;
      points.push({
        x: Math.sin(polar) * Math.cos(azimuth),
        y: Math.cos(polar),
        z: Math.sin(polar) * Math.sin(azimuth),
      });
    }
  }
  return points;
}

export function LearningOrbit() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signal, setSignal] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const points = createSpherePoints(
      window.innerWidth < 640 ? 9 : 13,
      window.innerWidth < 640 ? 18 : 26,
    );
    const stars = Array.from({ length: window.innerWidth < 640 ? 28 : 54 }, () => ({
      x: Math.random(),
      y: Math.random(),
      radius: Math.random() * 1.3 + 0.3,
      alpha: Math.random() * 0.45 + 0.15,
    }));
    let frame = 0;
    let rotation = 0;
    let pointerX = 0;
    let pointerY = 0;
    let targetX = 0;
    let targetY = 0;
    let visible = false;
    let width = 0;
    let height = 0;

    function resize() {
      const bounds = canvas!.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = bounds.width;
      height = bounds.height;
      canvas!.width = Math.round(width * ratio);
      canvas!.height = Math.round(height * ratio);
      context!.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    }

    function draw() {
      if (!width || !height) return;
      context!.clearRect(0, 0, width, height);
      for (const star of stars) {
        context!.beginPath();
        context!.fillStyle = `rgba(191, 219, 254, ${star.alpha})`;
        context!.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
        context!.fill();
      }

      const centerX = width * 0.5;
      const centerY = height * 0.49;
      const radius = Math.min(width, height) * 0.29;
      const tilt = 0.28 + pointerY * 0.12;
      const cosine = Math.cos(rotation);
      const sine = Math.sin(rotation);
      const projected = points.map((point) => {
        const x = point.x * cosine - point.z * sine;
        const z = point.x * sine + point.z * cosine;
        const y = point.y * Math.cos(tilt) - z * Math.sin(tilt);
        const depth = point.y * Math.sin(tilt) + z * Math.cos(tilt);
        const scale = 1.75 / (1.75 - depth * 0.32);
        return {
          x: centerX + (x + pointerX * 0.12) * radius * scale,
          y: centerY + y * radius * scale,
          depth,
          scale,
        };
      });

      const columns = window.innerWidth < 640 ? 18 : 26;
      for (let index = 0; index < projected.length; index += 1) {
        const row = Math.floor(index / columns);
        const column = index % columns;
        const point = projected[index];
        const nextColumn = projected[row * columns + (column + 1) % columns];
        const nextRow = projected[(row + 1) * columns + column];
        context!.lineWidth = 0.6;
        if (nextColumn) {
          context!.strokeStyle = `rgba(96, 165, 250, ${0.08 + Math.max(0, point.depth) * 0.12})`;
          context!.beginPath();
          context!.moveTo(point.x, point.y);
          context!.lineTo(nextColumn.x, nextColumn.y);
          context!.stroke();
        }
        if (nextRow) {
          context!.strokeStyle = `rgba(129, 140, 248, ${0.07 + Math.max(0, point.depth) * 0.1})`;
          context!.beginPath();
          context!.moveTo(point.x, point.y);
          context!.lineTo(nextRow.x, nextRow.y);
          context!.stroke();
        }
        context!.beginPath();
        context!.fillStyle = `rgba(191, 219, 254, ${0.28 + Math.max(0, point.depth) * 0.58})`;
        context!.arc(point.x, point.y, Math.max(0.65, point.scale * 1.2), 0, Math.PI * 2);
        context!.fill();
      }

      context!.save();
      context!.translate(centerX, centerY);
      context!.rotate(-0.3);
      context!.beginPath();
      context!.ellipse(0, 0, radius * 1.52, radius * 0.48, 0, 0, Math.PI * 2);
      context!.strokeStyle = "rgba(125, 211, 252, 0.48)";
      context!.lineWidth = 1;
      context!.stroke();
      context!.restore();

      const glow = context!.createRadialGradient(centerX, centerY, 1, centerX, centerY, radius * 0.55);
      glow.addColorStop(0, "rgba(96, 165, 250, 0.22)");
      glow.addColorStop(1, "rgba(96, 165, 250, 0)");
      context!.fillStyle = glow;
      context!.beginPath();
      context!.arc(centerX, centerY, radius * 0.55, 0, Math.PI * 2);
      context!.fill();
    }

    function animate() {
      if (!visible || document.hidden) {
        frame = 0;
        return;
      }
      pointerX += (targetX - pointerX) * 0.035;
      pointerY += (targetY - pointerY) * 0.035;
      if (!motionPreference.matches) rotation += 0.0025;
      draw();
      frame = window.requestAnimationFrame(animate);
    }

    function start() {
      if (!visible || document.hidden || frame || motionPreference.matches) return;
      frame = window.requestAnimationFrame(animate);
    }

    function onVisibilityChange() {
      if (document.hidden) {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
      } else {
        start();
      }
    }

    function onPointerMove(event: PointerEvent) {
      const bounds = canvas!.getBoundingClientRect();
      targetX = (event.clientX - bounds.left) / bounds.width - 0.5;
      targetY = (event.clientY - bounds.top) / bounds.height - 0.5;
    }

    function onPointerLeave() {
      targetX = 0;
      targetY = 0;
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        if (motionPreference.matches) draw();
        else start();
      } else if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    }, { threshold: 0.05 });

    observer.observe(canvas);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibilityChange);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    motionPreference.addEventListener("change", resize);
    resize();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      motionPreference.removeEventListener("change", resize);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="orbit-stage">
      <canvas ref={canvasRef} className="orbit-canvas" aria-hidden="true"/>
      <div className="orbit-halo orbit-halo-one" aria-hidden="true"/>
      <div className="orbit-halo orbit-halo-two" aria-hidden="true"/>
      <div className="orbit-label orbit-label-top"><span className="orbit-label-dot"/>PROJECT SIGNAL <b>01</b></div>
      <div className="orbit-label orbit-label-bottom"><span className="orbit-label-dot orbit-label-dot-violet"/>LEARNING IN MOTION <b>LIVE</b></div>
      <button
        type="button"
        className="orbit-core"
        onClick={() => setSignal((current) => !current)}
        aria-label="Toggle the ProjectHub orbit signal"
        aria-pressed={signal}
      >
        <span className="orbit-core-inner">{signal ? "NICE." : "BUILD"}</span>
      </button>
      <div className={`orbit-message${signal ? " orbit-message-visible" : ""}`} role="status" aria-live="polite">
        {signal ? "Signal received. Your next big idea is cleared for launch." : ""}
      </div>
      <div className="orbit-float orbit-float-one"><span>01</span> Explore</div>
      <div className="orbit-float orbit-float-two"><span>02</span> Build</div>
      <div className="orbit-float orbit-float-three"><span>03</span> Submit</div>
    </div>
  );
}
