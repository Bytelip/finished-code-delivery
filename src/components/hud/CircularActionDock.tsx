import React from "react";
import { Search, Crosshair, Plus, Minus, Globe, Wind, Ruler, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CircularActionDockProps {
  viewMode: "3d" | "2d";
  onToggleViewMode: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocateGps: () => void;
  onSearchClick: () => void;
  windStreamlinesActive: boolean;
  onToggleWindStreamlines: () => void;
  measureToolActive: boolean;
  onToggleMeasureTool: () => void;
  className?: string;
}

export function CircularActionDock({
  viewMode,
  onToggleViewMode,
  onZoomIn,
  onZoomOut,
  onLocateGps,
  onSearchClick,
  windStreamlinesActive,
  onToggleWindStreamlines,
  measureToolActive,
  onToggleMeasureTool,
  className,
}: CircularActionDockProps) {
  return (
    <div
      data-hud-overlay="circular-action-dock"
      className={cn("pointer-events-auto flex flex-col items-center gap-2 select-none", className)}
    >
      {/* 1. Search Location */}
      <button
        type="button"
        onClick={onSearchClick}
        className="group relative size-10 rounded-full bg-[#181C24]/85 backdrop-blur-xl border border-white/15 hover:border-cyan-400/50 hover:bg-white/15 text-slate-200 hover:text-white flex items-center justify-center transition-all duration-200 shadow-xl cursor-pointer"
        title="Search Location / Coordinates"
        aria-label="Search Location"
      >
        <Search className="size-4 group-hover:scale-110 transition-transform text-cyan-400" />
      </button>

      {/* 2. My GPS Location */}
      <button
        type="button"
        onClick={onLocateGps}
        className="group relative size-10 rounded-full bg-[#181C24]/85 backdrop-blur-xl border border-white/15 hover:border-cyan-400/50 hover:bg-white/15 text-slate-200 hover:text-white flex items-center justify-center transition-all duration-200 shadow-xl cursor-pointer"
        title="Center on My GPS Location"
        aria-label="My GPS Location"
      >
        <Crosshair className="size-4 group-hover:scale-110 transition-transform text-emerald-400" />
      </button>

      <div className="w-5 h-px bg-white/10 my-0.5" />

      {/* 3. Zoom In */}
      <button
        type="button"
        onClick={onZoomIn}
        className="group relative size-10 rounded-full bg-[#181C24]/85 backdrop-blur-xl border border-white/15 hover:border-cyan-400/50 hover:bg-white/15 text-slate-200 hover:text-white flex items-center justify-center transition-all duration-200 shadow-xl cursor-pointer"
        title="Zoom In"
        aria-label="Zoom In"
      >
        <Plus className="size-4 group-hover:scale-110 transition-transform" />
      </button>

      {/* 4. Zoom Out */}
      <button
        type="button"
        onClick={onZoomOut}
        className="group relative size-10 rounded-full bg-[#181C24]/85 backdrop-blur-xl border border-white/15 hover:border-cyan-400/50 hover:bg-white/15 text-slate-200 hover:text-white flex items-center justify-center transition-all duration-200 shadow-xl cursor-pointer"
        title="Zoom Out"
        aria-label="Zoom Out"
      >
        <Minus className="size-4 group-hover:scale-110 transition-transform" />
      </button>

      <div className="w-5 h-px bg-white/10 my-0.5" />

      {/* 5. 3D Orbital / 2D Field Toggle */}
      <button
        type="button"
        onClick={onToggleViewMode}
        className={cn(
          "group relative size-10 rounded-full backdrop-blur-xl border transition-all duration-200 shadow-xl cursor-pointer flex items-center justify-center",
          viewMode === "3d"
            ? "bg-cyan-500/25 border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]"
            : "bg-[#181C24]/85 border-white/15 hover:bg-white/15 text-slate-200 hover:text-white",
        )}
        title={viewMode === "3d" ? "Switch to 2D Field GIS" : "Switch to 3D Orbital Globe"}
        aria-label="Toggle 3D/2D View"
      >
        {viewMode === "3d" ? (
          <Globe className="size-4 text-cyan-300 group-hover:rotate-45 transition-transform" />
        ) : (
          <MapIcon className="size-4 text-cyan-300 group-hover:scale-110 transition-transform" />
        )}
      </button>

      {/* 6. Wind Streamlines Animation Toggle */}
      <button
        type="button"
        onClick={onToggleWindStreamlines}
        className={cn(
          "group relative size-10 rounded-full backdrop-blur-xl border transition-all duration-200 shadow-xl cursor-pointer flex items-center justify-center",
          windStreamlinesActive
            ? "bg-teal-500/25 border-teal-400/60 text-teal-300 shadow-[0_0_12px_rgba(20,184,166,0.35)]"
            : "bg-[#181C24]/85 border-white/15 hover:bg-white/15 text-slate-300 hover:text-white",
        )}
        title={windStreamlinesActive ? "Hide Wind Streamlines" : "Show Animated Wind Streamlines"}
        aria-label="Toggle Wind Streamlines"
      >
        <Wind className={cn("size-4", windStreamlinesActive && "animate-pulse text-teal-300")} />
      </button>

      {/* 7. Measure Field Area / Distance */}
      <button
        type="button"
        onClick={onToggleMeasureTool}
        className={cn(
          "group relative size-10 rounded-full backdrop-blur-xl border transition-all duration-200 shadow-xl cursor-pointer flex items-center justify-center",
          measureToolActive
            ? "bg-amber-500/25 border-amber-400/60 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]"
            : "bg-[#181C24]/85 border-white/15 hover:bg-white/15 text-slate-300 hover:text-white",
        )}
        title={measureToolActive ? "Close Field Measuring Tool" : "Measure Field Distance & Area"}
        aria-label="Field Measurement Tool"
      >
        <Ruler className="size-4 group-hover:scale-110 transition-transform text-amber-400" />
      </button>
    </div>
  );
}
