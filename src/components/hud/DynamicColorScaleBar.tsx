import React from "react";
import {
  type ZoomEarthLayerId,
  type SubLayerId,
  ZOOM_EARTH_LAYERS_META,
} from "@/types/zoomEarthLayers";
import { cn } from "@/lib/utils";

interface DynamicColorScaleBarProps {
  activeLayer: ZoomEarthLayerId;
  activeSubLayer?: SubLayerId;
  hoverValue?: number | string | null;
  className?: string;
}

export function DynamicColorScaleBar({
  activeLayer,
  activeSubLayer,
  hoverValue,
  className,
}: DynamicColorScaleBarProps) {
  const meta = ZOOM_EARTH_LAYERS_META[activeLayer] || ZOOM_EARTH_LAYERS_META["satellite"]!;
  const scale = meta.colorScale;

  // Custom adjustments for Wet-Bulb or Specific Sublayers
  const isWetBulb = activeLayer === "humidity" && activeSubLayer === "hum_wetbulb";
  const stops = isWetBulb
    ? [
        { value: "16", color: "#10b981", label: "16" },
        { value: "22", color: "#84cc16", label: "22" },
        { value: "26", color: "#eab308", label: "26" },
        { value: "30", color: "#f97316", label: "30" },
        { value: "34", color: "#ef4444", label: "34" },
        { value: "36+", color: "#831843", label: "36" },
      ]
    : scale.stops;

  const gradient = isWetBulb
    ? "linear-gradient(to right, #10b981, #84cc16, #eab308, #f97316, #ef4444, #831843)"
    : scale.gradientCss;

  const unit = isWetBulb ? "°C Wet-Bulb" : scale.unit;

  return (
    <div
      data-hud-overlay="dynamic-color-scale"
      className={cn(
        "pointer-events-auto box-border min-w-0 max-w-full overflow-hidden rounded-xl bg-[#181C24]/85 backdrop-blur-xl border border-white/12 shadow-[0_4px_24px_rgba(0,0,0,0.5)] px-3 py-1.5 text-white select-none transition-all duration-200",
        className,
      )}
    >
      {/* Title & Unit Header */}
      <div className="mb-1 flex min-w-0 items-center justify-between gap-2 text-[10px] font-mono text-slate-300">
        <span className="flex min-w-0 items-center gap-1 font-semibold text-slate-200">
          <span className="shrink-0">{meta.emoji}</span>
          <span className="truncate">{isWetBulb ? "Wet-Bulb Heat Stress" : scale.title}</span>
        </span>
        <span className="shrink-0 rounded border border-white/10 bg-white/10 px-1.5 py-0.2 font-bold text-cyan-400">
          {unit}
        </span>
      </div>

      {/* Gradient Bar */}
      <div className="relative h-2.5 w-[min(11rem,52vw)] overflow-hidden rounded-full border border-white/20 shadow-inner sm:w-52">
        <div className="h-full w-full" style={{ background: gradient }} />
      </div>

      {/* Stop Labels */}
      <div className="mt-1 flex w-[min(11rem,52vw)] justify-between px-0.5 text-[9px] font-mono text-slate-400 sm:w-52">
        {stops.map((stop, idx) => (
          <span
            key={idx}
            className={cn(
              "tracking-tighter",
              idx === 0 ? "text-left" : idx === stops.length - 1 ? "text-right" : "text-center",
            )}
          >
            {stop.label || stop.value}
          </span>
        ))}
      </div>

      {/* Optional Hover / Reticle Live Telemetry Tag */}
      {hoverValue !== undefined && hoverValue !== null && (
        <div className="mt-1 flex items-center justify-between gap-2 border-t border-white/10 pt-1 text-[10px] font-mono text-cyan-300">
          <span className="truncate">Target Field:</span>
          <span className="shrink-0 rounded border border-cyan-400/30 bg-cyan-500/20 px-1 font-bold text-white">
            {hoverValue} {unit}
          </span>
        </div>
      )}
    </div>
  );
}
