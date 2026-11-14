import React, { useEffect, useState } from "react";

interface OrbitalCockpitVisorProps {
  active?: boolean;
  orbitalAltitudeKm?: number;
  velocityKmh?: number;
  inclinationDeg?: number;
  lat?: number;
  lon?: number;
}

export function OrbitalCockpitVisor({
  active = true,
  orbitalAltitudeKm = 408,
  velocityKmh = 27600,
  inclinationDeg = 51.6,
  lat = 13.175,
  lon = 78.4192,
}: OrbitalCockpitVisorProps) {
  const [metSeconds, setMetSeconds] = useState(142 * 3600 + 18 * 60 + 22);

  useEffect(() => {
    const timer = setInterval(() => {
      setMetSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = Math.floor(metSeconds / 3600);
  const minutes = Math.floor((metSeconds % 3600) / 60);
  const seconds = metSeconds % 60;
  const metStr = `T+ ${String(hours).padStart(3, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden select-none"
    >
      {/* ---------------- 1. ASTRONAUT HELMET / SPACECRAFT VISOR CURVATURE VIGNETTE ---------------- */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 65%, rgba(3, 7, 18, 0.35) 85%, rgba(2, 4, 10, 0.75) 100%)",
          boxShadow: "inset 0 0 100px rgba(6, 182, 212, 0.08)",
        }}
      />

      {/* ---------------- 2. AMBIENT SHOOTING STAR STREAKS ---------------- */}
      <div className="absolute top-1/4 left-1/3 w-32 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shooting-star-1 opacity-0" />
      <div className="absolute top-1/2 right-1/4 w-40 h-0.5 bg-gradient-to-r from-transparent via-purple-300 to-transparent shooting-star-2 opacity-0" />

      {/* ---------------- 3. FOUR SCI-FI TARGETING CORNER BRACKETS ---------------- */}
      {/* Top-Left Bracket */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[10px] tracking-widest font-bold">
          <span className="text-cyan-300 text-sm">┌</span>
          <span>SPACEX DRAGON // ORION COCKPIT</span>
        </div>
        <div className="h-4 border-l border-cyan-500/40 ml-1 flex flex-col justify-between pl-1.5 text-[8.5px] font-mono text-cyan-300/60">
          <span>ORB.INC {inclinationDeg}°</span>
          <span>SYS.VER 2.4.0</span>
        </div>
      </div>

      {/* Top-Right Bracket */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[10px] tracking-widest font-bold">
          <span>MET {metStr}</span>
          <span className="text-cyan-300 text-sm">┐</span>
        </div>
        <div className="h-4 border-r border-cyan-500/40 mr-1 flex flex-col justify-between items-end pr-1.5 text-[8.5px] font-mono text-cyan-300/60">
          <span>ZERO-G HUD: LOCKED</span>
          <span>ANTIGRAVITY TELEMETRY</span>
        </div>
      </div>

      {/* Bottom-Left Bracket */}
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 flex flex-col gap-1">
        <div className="h-4 border-l border-cyan-500/40 ml-1 flex flex-col justify-between pl-1.5 text-[8.5px] font-mono text-cyan-300/60">
          <span>RADAR LOCK // NOMINAL</span>
          <span>
            {Math.abs(lat).toFixed(4)}°{lat >= 0 ? "N" : "S"}, {Math.abs(lon).toFixed(4)}°
            {lon >= 0 ? "E" : "W"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[10px] tracking-widest font-bold">
          <span className="text-cyan-300 text-sm">└</span>
          <span>TELEMETRY LINK: 99.8% (NASA GIBS)</span>
        </div>
      </div>

      {/* Bottom-Right Bracket */}
      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 flex flex-col items-end gap-1">
        <div className="h-4 border-r border-cyan-500/40 mr-1 flex flex-col justify-between items-end pr-1.5 text-[8.5px] font-mono text-cyan-300/60">
          <span>ALT {orbitalAltitudeKm} KM</span>
          <span>VEL {velocityKmh.toLocaleString()} KM/H</span>
        </div>
        <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[10px] tracking-widest font-bold">
          <span>ANTIGRAVITY COCKPIT VISOR</span>
          <span className="text-cyan-300 text-sm">┘</span>
        </div>
      </div>

      {/* ---------------- 4. VERTICAL DEGREE RULER (LEFT EDGE) ---------------- */}
      <div className="hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 flex-col items-start gap-3 font-mono text-[8px] text-cyan-400/40">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-px bg-cyan-400/60" />
          <span>+90°</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-px bg-cyan-400/30" />
          <span>+60°</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-px bg-cyan-400/30" />
          <span>+30°</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-cyan-400" />
          <span className="text-cyan-300 font-bold">0° ORB</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-px bg-cyan-400/30" />
          <span>-30°</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-px bg-cyan-400/30" />
          <span>-60°</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-px bg-cyan-400/60" />
          <span>-90°</span>
        </div>
      </div>

      {/* ---------------- 5. ALTITUDE LADDER (RIGHT EDGE) ---------------- */}
      <div className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 flex-col items-end gap-3 font-mono text-[8px] text-cyan-400/40">
        <div className="flex items-center gap-1">
          <span>GEO 35,786K</span>
          <span className="w-2.5 h-px bg-cyan-400/60" />
        </div>
        <div className="flex items-center gap-1">
          <span>MEO 20,200K</span>
          <span className="w-1.5 h-px bg-cyan-400/30" />
        </div>
        <div className="flex items-center gap-1">
          <span>SUN-SYNC 705K</span>
          <span className="w-1.5 h-px bg-cyan-400/30" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-cyan-300 font-bold">LEO 408K</span>
          <span className="w-3 h-0.5 bg-cyan-400" />
        </div>
        <div className="flex items-center gap-1">
          <span>KARMAN 100K</span>
          <span className="w-1.5 h-px bg-cyan-400/30" />
        </div>
        <div className="flex items-center gap-1">
          <span>STRATO 50K</span>
          <span className="w-1.5 h-px bg-cyan-400/30" />
        </div>
      </div>
    </div>
  );
}

export default OrbitalCockpitVisor;
