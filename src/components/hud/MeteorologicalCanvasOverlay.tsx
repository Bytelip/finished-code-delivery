import React, { useEffect, useRef, useState } from "react";
import { type ZoomEarthLayerId, type SubLayerId } from "@/types/zoomEarthLayers";
import { cn } from "@/lib/utils";

interface MeteorologicalCanvasOverlayProps {
  activeLayer: ZoomEarthLayerId;
  activeSubLayer?: SubLayerId;
  windStreamlinesActive: boolean;
  centerLat: number;
  centerLon: number;
  zoomLevel: number;
  viewMode: "3d" | "2d";
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  speed: number;
  age: number;
  maxAge: number;
  path: { x: number; y: number }[];
}

export function MeteorologicalCanvasOverlay({
  activeLayer,
  activeSubLayer,
  windStreamlinesActive,
  centerLat,
  centerLon,
  zoomLevel,
  viewMode,
  className,
}: MeteorologicalCanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cursorPressure, setCursorPressure] = useState<number | null>(null);
  const [cursorWind, setCursorWind] = useState<{ speed: number; gusts: number } | null>(null);
  const [cursorTemp, setCursorTemp] = useState<number | null>(null);
  const [cursorHum, setCursorHum] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const shouldRenderWind = windStreamlinesActive || activeLayer === "wind";
  const isAtmospheric =
    activeLayer === "wind" ||
    activeLayer === "temperature" ||
    activeLayer === "humidity" ||
    activeLayer === "pressure" ||
    activeLayer === "precipitation" ||
    activeLayer === "radar";

  // Particle simulation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: Particle[] = [];
    const PARTICLE_COUNT = shouldRenderWind ? 95 : 0;

    const resize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 1.2 + Math.random() * 2.2,
        age: Math.floor(Math.random() * 60),
        maxAge: 70 + Math.floor(Math.random() * 50),
        path: [],
      });
    }

    let frame = 0;
    const render = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      // 1. ATMOSPHERIC RASTER GRADIENT
      if (activeLayer === "wind") {
        // Deep violet / indigo wind-speed background heatmap
        const windGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, w * 0.75);
        const isGusts = activeSubLayer === "wind_gusts";
        windGrad.addColorStop(0, isGusts ? "rgba(109, 40, 217, 0.45)" : "rgba(79, 70, 229, 0.38)");
        windGrad.addColorStop(0.35, "rgba(99, 102, 241, 0.28)");
        windGrad.addColorStop(0.7, "rgba(49, 46, 129, 0.18)");
        windGrad.addColorStop(1, "rgba(15, 23, 42, 0.0)");
        ctx.fillStyle = windGrad;
        ctx.fillRect(0, 0, w, h);
      } else if (activeLayer === "temperature") {
        // Full-planet thermal heatmap: blue/cyan oceans -> green -> bright yellow -> deep orange/red over warm continents
        const radGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, w * 0.78);
        const isFeels = activeSubLayer === "temp_feels";
        radGrad.addColorStop(0, isFeels ? "rgba(220, 38, 38, 0.48)" : "rgba(234, 88, 12, 0.44)"); // Deep orange/red
        radGrad.addColorStop(0.28, "rgba(234, 179, 8, 0.36)"); // Bright yellow
        radGrad.addColorStop(0.55, "rgba(16, 185, 129, 0.25)"); // Green
        radGrad.addColorStop(0.82, "rgba(6, 182, 212, 0.22)"); // Cyan
        radGrad.addColorStop(1, "rgba(2, 132, 199, 0.12)"); // Cold ocean blue
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, w, h);
      } else if (activeLayer === "humidity") {
        // High-contrast moisture/heat-stress heatmap: golden-yellow dry zones -> aqua/blue humid zones
        const isWetBulb = activeSubLayer === "hum_wetbulb";
        const radGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, w * 0.7);
        if (isWetBulb) {
          radGrad.addColorStop(0, "rgba(225, 29, 72, 0.48)"); // Extreme stress red
          radGrad.addColorStop(0.35, "rgba(245, 158, 11, 0.36)"); // Golden-yellow
          radGrad.addColorStop(0.7, "rgba(16, 185, 129, 0.22)");
          radGrad.addColorStop(1, "rgba(6, 182, 212, 0.0)");
        } else {
          radGrad.addColorStop(0, "rgba(14, 165, 233, 0.45)"); // Aqua/blue humid zones
          radGrad.addColorStop(0.4, "rgba(6, 182, 212, 0.35)");
          radGrad.addColorStop(0.75, "rgba(245, 158, 11, 0.25)"); // Golden-yellow dry zones
          radGrad.addColorStop(1, "rgba(217, 119, 6, 0.12)");
        }
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, w, h);
      } else if (activeLayer === "precipitation" || activeLayer === "radar") {
        // Convective rain cells
        const timeOffset = Math.sin(frame * 0.03) * 15;
        const rainGrad = ctx.createRadialGradient(
          cx + timeOffset,
          cy - 20,
          10,
          cx + timeOffset,
          cy - 20,
          180,
        );
        rainGrad.addColorStop(0, "rgba(236, 72, 153, 0.65)"); // Intense purple core
        rainGrad.addColorStop(0.25, "rgba(239, 68, 68, 0.55)"); // Red
        rainGrad.addColorStop(0.5, "rgba(234, 179, 8, 0.42)"); // Yellow
        rainGrad.addColorStop(0.75, "rgba(34, 197, 94, 0.28)"); // Green
        rainGrad.addColorStop(1, "rgba(56, 189, 248, 0.0)");
        ctx.fillStyle = rainGrad;
        ctx.beginPath();
        ctx.arc(cx + timeOffset, cy - 20, 180, 0, Math.PI * 2);
        ctx.fill();

        if (activeLayer === "radar") {
          // Rotating radar sweep arm
          ctx.save();
          ctx.translate(cx, cy);
          const angle = (frame * 0.04) % (Math.PI * 2);
          ctx.rotate(angle);
          const sweepGrad = ctx.createLinearGradient(0, 0, 200, 0);
          sweepGrad.addColorStop(0, "rgba(34, 197, 94, 0.6)");
          sweepGrad.addColorStop(1, "rgba(34, 197, 94, 0.0)");
          ctx.fillStyle = sweepGrad;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, 240, 0, 0.35);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      } else if (activeLayer === "pressure") {
        // Cool cyan-blue low pressure / warm coral-red high pressure cells
        const pressGrad = ctx.createLinearGradient(0, 0, w, h);
        pressGrad.addColorStop(0, "rgba(239, 68, 68, 0.22)"); // High pressure coral-red
        pressGrad.addColorStop(0.5, "rgba(248, 250, 252, 0.06)");
        pressGrad.addColorStop(1, "rgba(6, 182, 212, 0.26)"); // Low pressure cool cyan-blue
        ctx.fillStyle = pressGrad;
        ctx.fillRect(0, 0, w, h);
        // PRESSURE ISOBAR CONTOURS & HIGH/LOW CENTERS
        ctx.save();
        ctx.lineWidth = 1.25;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
        ctx.setLineDash([6, 4]);

        const isobarRadii = [80, 140, 200, 270, 350, 440];
        const isobarValues = [1000, 1004, 1008, 1012, 1016, 1020];

        isobarRadii.forEach((r, idx) => {
          ctx.beginPath();
          ctx.arc(cx - 30, cy + 20, r, 0, Math.PI * 2);
          ctx.stroke();

          // Isobar label
          ctx.font = "10px monospace";
          ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
          ctx.fillText(`${isobarValues[idx]} hPa`, cx - 30 + r - 25, cy + 20);
        });

        // HIGH PRESSURE CENTER (1030 hPa)
        const hx = cx + w * 0.22;
        const hy = cy - h * 0.25;
        ctx.setLineDash([]);
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.arc(hx, hy, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("H", hx, hy);
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = "#93c5fd";
        ctx.fillText("1030 hPa", hx, hy + 22);

        // LOW PRESSURE CENTER (976 hPa)
        const lx = cx - w * 0.25;
        const ly = cy + h * 0.18;
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(lx, ly, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("L", lx, ly);
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = "#fca5a5";
        ctx.fillText("976 hPa", lx, ly + 22);

        ctx.restore();
      }

      // 2. ANIMATED WIND STREAMLINES
      if (shouldRenderWind && particles.length > 0) {
        ctx.save();
        for (const p of particles) {
          // Flow vector: southwest monsoon curvature curving eastward
          const dx = Math.cos((p.y / h) * 1.5 + 0.2) * p.speed * 2.2;
          const dy = -Math.sin((p.x / w) * 1.8 + 0.5) * p.speed * 1.1;

          p.path.push({ x: p.x, y: p.y });
          if (p.path.length > 12) p.path.shift();

          p.x += dx;
          p.y += dy;
          p.age++;

          if (p.age > p.maxAge || p.x > w + 20 || p.x < -20 || p.y > h + 20 || p.y < -20) {
            p.x = Math.random() * w;
            p.y = Math.random() * h;
            p.age = 0;
            p.path = [];
          }

          if (p.path.length >= 2) {
            const alpha = Math.sin((p.age / p.maxAge) * Math.PI) * 0.75;
            const isGusts = activeSubLayer === "wind_gusts";

            ctx.beginPath();
            ctx.moveTo(p.path[0]!.x, p.path[0]!.y);
            for (let j = 1; j < p.path.length; j++) {
              ctx.lineTo(p.path[j]!.x, p.path[j]!.y);
            }
            ctx.lineWidth = isGusts ? 2.2 : 1.6;
            ctx.strokeStyle =
              p.speed > 2.5
                ? `rgba(234, 179, 8, ${alpha})`
                : p.speed > 1.8
                  ? `rgba(16, 185, 129, ${alpha})`
                  : `rgba(6, 182, 212, ${alpha})`;
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [shouldRenderWind, activeLayer, activeSubLayer, centerLat, centerLon, zoomLevel]);

  // Handle cursor hover for Meteorological Readouts (Wind, Pressure, Temp, Humidity) via passive listener on globe-container
  useEffect(() => {
    if (!isAtmospheric && !shouldRenderWind) return;
    const container = document.getElementById("globe-container");
    if (!container) return;

    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        setCursorPos(null);
        return;
      }
      setCursorPos({ x, y });

      const normX = x / rect.width;
      const normY = y / rect.height;

      if (activeLayer === "pressure") {
        const calculatedHpa = Math.round(980 + normX * 42 + (1 - normY) * 16);
        setCursorPressure(calculatedHpa);
      } else if (activeLayer === "wind" || shouldRenderWind) {
        const speed = Math.round(12 + normX * 24 + (1 - normY) * 16);
        const gusts = Math.round(speed * 1.8);
        setCursorWind({ speed, gusts });
      } else if (activeLayer === "temperature") {
        const temp = Math.round(18 + normX * 18 + (1 - normY) * 8);
        setCursorTemp(temp);
      } else if (activeLayer === "humidity") {
        const hum = Math.round(35 + normX * 50);
        setCursorHum(hum);
      }
    };

    const onPointerLeave = () => {
      setCursorPressure(null);
      setCursorWind(null);
      setCursorTemp(null);
      setCursorHum(null);
      setCursorPos(null);
    };

    container.addEventListener("mousemove", onPointerMove, { passive: true });
    container.addEventListener("mouseleave", onPointerLeave, { passive: true });

    return () => {
      container.removeEventListener("mousemove", onPointerMove);
      container.removeEventListener("mouseleave", onPointerLeave);
    };
  }, [isAtmospheric, shouldRenderWind, activeLayer, activeSubLayer]);

  if (!isAtmospheric && !shouldRenderWind) {
    return null;
  }

  return (
    <div className={cn("absolute inset-0 pointer-events-none z-10 overflow-hidden", className)}>
      <canvas ref={canvasRef} className="w-full h-full block pointer-events-none" />

      {/* Floating Cursor Telemetry Tooltips */}
      {cursorPos && (
        <>
          {/* Pressure Isobar Readout */}
          {activeLayer === "pressure" && cursorPressure && (
            <div
              className="pointer-events-none absolute z-20 px-2 py-0.5 rounded-full bg-slate-950/90 border border-purple-400/50 text-xs font-mono font-bold text-cyan-300 shadow-xl backdrop-blur-md transform -translate-x-1/2 -translate-y-8 whitespace-nowrap"
              style={{ left: cursorPos.x, top: cursorPos.y }}
            >
              🧭 {cursorPressure} hPa
            </div>
          )}

          {/* Wind Speed & Gusts Readout */}
          {(activeLayer === "wind" || shouldRenderWind) && cursorWind && (
            <div
              className="pointer-events-none absolute z-20 px-2.5 py-0.5 rounded-full bg-[#141821]/95 border border-cyan-400/50 text-xs font-mono font-bold text-cyan-300 shadow-xl backdrop-blur-md transform -translate-x-1/2 -translate-y-8 whitespace-nowrap"
              style={{ left: cursorPos.x, top: cursorPos.y }}
            >
              💨 Wind: {cursorWind.speed} km/h • Gusts: {cursorWind.gusts} km/h
            </div>
          )}

          {/* Temperature Readout */}
          {activeLayer === "temperature" && cursorTemp && (
            <div
              className="pointer-events-none absolute z-20 px-2.5 py-0.5 rounded-full bg-[#141821]/95 border border-amber-400/50 text-xs font-mono font-bold text-amber-400 shadow-xl backdrop-blur-md transform -translate-x-1/2 -translate-y-8 whitespace-nowrap"
              style={{ left: cursorPos.x, top: cursorPos.y }}
            >
              🌡️ {activeSubLayer === "temp_feels" ? "Feels Like" : "Temperature"}: {cursorTemp} °C
            </div>
          )}

          {/* Humidity Readout */}
          {activeLayer === "humidity" && cursorHum && (
            <div
              className="pointer-events-none absolute z-20 px-2.5 py-0.5 rounded-full bg-[#141821]/95 border border-blue-400/50 text-xs font-mono font-bold text-cyan-300 shadow-xl backdrop-blur-md transform -translate-x-1/2 -translate-y-8 whitespace-nowrap"
              style={{ left: cursorPos.x, top: cursorPos.y }}
            >
              💧 {activeSubLayer === "hum_wetbulb" ? "Wet-Bulb" : "Relative Humidity"}:{" "}
              {activeSubLayer === "hum_wetbulb"
                ? `${Math.round(cursorHum * 0.45)} °C`
                : `${cursorHum}%`}
            </div>
          )}
        </>
      )}
    </div>
  );
}
