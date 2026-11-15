import React, { useState } from "react";
import {
  Satellite,
  Radio,
  CloudRain,
  Wind,
  Thermometer,
  Droplets,
  Gauge,
  ChevronUp,
  ChevronDown,
  Check,
  Info,
  Sprout,
  Sparkles,
} from "lucide-react";
import {
  type ZoomEarthLayerId,
  type SubLayerId,
  ZOOM_EARTH_LAYERS_META,
} from "@/types/zoomEarthLayers";
import { MAP_LAYERS, type MapLayer } from "@/types/agroSpace";
import { cn } from "@/lib/utils";

interface ZoomEarthSidebarProps {
  activeLayer: ZoomEarthLayerId;
  onLayerChange: (layer: ZoomEarthLayerId) => void;
  activeSubLayer: SubLayerId;
  onSubLayerChange: (sub: SubLayerId) => void;
  onOpenInfoModal: (layerId: ZoomEarthLayerId) => void;
  className?: string;
}

export function ZoomEarthSidebar({
  activeLayer,
  onLayerChange,
  activeSubLayer,
  onSubLayerChange,
  onOpenInfoModal,
  className,
}: ZoomEarthSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isNasaSectionOpen, setIsNasaSectionOpen] = useState(false);

  const activeMeta = ZOOM_EARTH_LAYERS_META[activeLayer] || ZOOM_EARTH_LAYERS_META.satellite;

  const handleSelectParent = (id: ZoomEarthLayerId) => {
    onLayerChange(id);
    const meta = ZOOM_EARTH_LAYERS_META[id];
    if (meta?.defaultSubOption) {
      onSubLayerChange(meta.defaultSubOption);
    }
  };

  if (isCollapsed) {
    return (
      <div
        className={cn(
          "absolute left-3 top-16 md:top-14 z-40 flex items-center gap-1.5 rounded-full bg-[#181C24]/90 backdrop-blur-xl border border-white/15 px-3 py-1.5 text-white shadow-2xl transition-all duration-200 cursor-pointer hover:bg-[#181C24]",
          className,
        )}
        onClick={() => setIsCollapsed(false)}
        title="Expand Map Layers Dashbar"
      >
        <span className="text-sm">{activeMeta.emoji}</span>
        <span className="font-sans font-semibold text-xs tracking-wide">{activeMeta.name}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenInfoModal(activeLayer);
          }}
          className="p-0.5 rounded-full hover:bg-white/20 text-slate-300 hover:text-white"
          title="Layer Information"
        >
          <Info className="size-3 text-cyan-400" />
        </button>
        <ChevronDown className="size-3.5 text-slate-400" />
      </div>
    );
  }

  return (
    <div
      data-hud-overlay="zoom-earth-sidebar"
      className={cn(
        "absolute left-3 top-16 md:top-14 z-40 w-56 rounded-2xl bg-[#181C24]/92 backdrop-blur-2xl border border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.65)] p-2.5 text-white select-none transition-all duration-300 max-h-[82vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20",
        className,
      )}
    >
      {/* Dashbar Header */}
      <div className="flex items-center justify-between px-1.5 pb-2 border-b border-white/10 text-xs font-mono font-bold tracking-wider text-slate-300">
        <span className="flex items-center gap-1.5 uppercase text-[11px] text-cyan-400">
          <Sparkles className="size-3 text-cyan-400" /> MAP LAYERS
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onOpenInfoModal(activeLayer)}
            className="p-1 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
            title="Layer Scientific Description"
          >
            <Info className="size-3.5 text-cyan-400" />
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
            title="Collapse Dashbar"
          >
            <ChevronUp className="size-3.5" />
          </button>
        </div>
      </div>

      {/* SECTION 1: LIVE MAPS */}
      <div className="mt-2">
        <div className="px-1.5 text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-1">
          Live Maps
        </div>
        <div className="space-y-1">
          {/* Satellite */}
          <button
            type="button"
            onClick={() => handleSelectParent("satellite")}
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150",
              activeLayer === "satellite"
                ? "bg-white/15 border border-white/30 text-white font-semibold shadow-inner"
                : "text-slate-300 hover:bg-white/5 hover:text-white",
            )}
          >
            <span className="flex items-center gap-2">
              <Satellite className="size-3.5 text-cyan-400" /> Satellite
            </span>
            {activeLayer === "satellite" && (
              <span className="text-[10px] text-cyan-400">● LIVE</span>
            )}
          </button>

          {/* Radar */}
          <button
            type="button"
            onClick={() => handleSelectParent("radar")}
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150",
              activeLayer === "radar"
                ? "bg-white/15 border border-white/30 text-white font-semibold shadow-inner"
                : "text-slate-300 hover:bg-white/5 hover:text-white",
            )}
          >
            <span className="flex items-center gap-2">
              <Radio className="size-3.5 text-emerald-400" /> Radar
            </span>
            {activeLayer === "radar" && (
              <span className="text-[10px] text-emerald-400">● LIVE</span>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 2: FORECAST & ATMOSPHERIC MAPS */}
      <div className="mt-3">
        <div className="px-1.5 text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-1">
          Forecast & Atmospheric
        </div>
        <div className="space-y-1">
          {/* Precipitation */}
          <button
            type="button"
            onClick={() => handleSelectParent("precipitation")}
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150",
              activeLayer === "precipitation"
                ? "bg-white/15 border border-white/30 text-white font-semibold shadow-inner"
                : "text-slate-300 hover:bg-white/5 hover:text-white",
            )}
          >
            <span className="flex items-center gap-2">
              <CloudRain className="size-3.5 text-sky-400" /> Precipitation
            </span>
          </button>

          {/* Wind with Sub-Options */}
          <div className="rounded-xl overflow-hidden transition-all duration-200">
            <button
              type="button"
              onClick={() => handleSelectParent("wind")}
              className={cn(
                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150",
                activeLayer === "wind"
                  ? "bg-white/15 border border-white/30 text-white font-semibold shadow-inner"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <span className="flex items-center gap-2">
                <Wind className="size-3.5 text-teal-400" /> Wind
              </span>
              <span className="text-[10px] opacity-60 font-mono">Streamlines</span>
            </button>
            {activeLayer === "wind" && (
              <div className="pl-6 pr-2 py-1 space-y-0.5 bg-black/25 border-l-2 border-teal-400 my-1 ml-3 rounded-r-lg animate-in fade-in duration-200">
                <button
                  type="button"
                  onClick={() => onSubLayerChange("wind_speed")}
                  className={cn(
                    "w-full flex items-center justify-between py-1 px-1.5 rounded text-[11px] font-sans transition-colors",
                    activeSubLayer === "wind_speed"
                      ? "text-teal-300 font-semibold"
                      : "text-slate-400 hover:text-slate-200",
                  )}
                >
                  <span>Wind Speed</span>
                  {activeSubLayer === "wind_speed" && <Check className="size-3 text-teal-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => onSubLayerChange("wind_gusts")}
                  className={cn(
                    "w-full flex items-center justify-between py-1 px-1.5 rounded text-[11px] font-sans transition-colors",
                    activeSubLayer === "wind_gusts"
                      ? "text-teal-300 font-semibold"
                      : "text-slate-400 hover:text-slate-200",
                  )}
                >
                  <span>Wind Gusts</span>
                  {activeSubLayer === "wind_gusts" && <Check className="size-3 text-teal-400" />}
                </button>
              </div>
            )}
          </div>

          {/* Temperature with Sub-Options */}
          <div className="rounded-xl overflow-hidden transition-all duration-200">
            <button
              type="button"
              onClick={() => handleSelectParent("temperature")}
              className={cn(
                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150",
                activeLayer === "temperature"
                  ? "bg-white/15 border border-white/30 text-white font-semibold shadow-inner"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <span className="flex items-center gap-2">
                <Thermometer className="size-3.5 text-amber-400" /> Temperature
              </span>
              <span className="text-[10px] opacity-60 font-mono">°C</span>
            </button>
            {activeLayer === "temperature" && (
              <div className="pl-6 pr-2 py-1 space-y-0.5 bg-black/25 border-l-2 border-amber-400 my-1 ml-3 rounded-r-lg animate-in fade-in duration-200">
                <button
                  type="button"
                  onClick={() => onSubLayerChange("temp_actual")}
                  className={cn(
                    "w-full flex items-center justify-between py-1 px-1.5 rounded text-[11px] font-sans transition-colors",
                    activeSubLayer === "temp_actual"
                      ? "text-amber-300 font-semibold"
                      : "text-slate-400 hover:text-slate-200",
                  )}
                >
                  <span>Actual</span>
                  {activeSubLayer === "temp_actual" && <Check className="size-3 text-amber-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => onSubLayerChange("temp_feels")}
                  className={cn(
                    "w-full flex items-center justify-between py-1 px-1.5 rounded text-[11px] font-sans transition-colors",
                    activeSubLayer === "temp_feels"
                      ? "text-amber-300 font-semibold"
                      : "text-slate-400 hover:text-slate-200",
                  )}
                >
                  <span>Feels Like</span>
                  {activeSubLayer === "temp_feels" && <Check className="size-3 text-amber-400" />}
                </button>
              </div>
            )}
          </div>

          {/* Humidity with Sub-Options */}
          <div className="rounded-xl overflow-hidden transition-all duration-200">
            <button
              type="button"
              onClick={() => handleSelectParent("humidity")}
              className={cn(
                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150",
                activeLayer === "humidity"
                  ? "bg-white/15 border border-white/30 text-white font-semibold shadow-inner"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <span className="flex items-center gap-2">
                <Droplets className="size-3.5 text-blue-400" /> Humidity
              </span>
              <span className="text-[10px] opacity-60 font-mono">%</span>
            </button>
            {activeLayer === "humidity" && (
              <div className="pl-6 pr-2 py-1 space-y-0.5 bg-black/25 border-l-2 border-blue-400 my-1 ml-3 rounded-r-lg animate-in fade-in duration-200">
                <button
                  type="button"
                  onClick={() => onSubLayerChange("hum_relative")}
                  className={cn(
                    "w-full flex items-center justify-between py-1 px-1.5 rounded text-[11px] font-sans transition-colors",
                    activeSubLayer === "hum_relative"
                      ? "text-blue-300 font-semibold"
                      : "text-slate-400 hover:text-slate-200",
                  )}
                >
                  <span>Relative</span>
                  {activeSubLayer === "hum_relative" && <Check className="size-3 text-blue-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => onSubLayerChange("hum_dewpoint")}
                  className={cn(
                    "w-full flex items-center justify-between py-1 px-1.5 rounded text-[11px] font-sans transition-colors",
                    activeSubLayer === "hum_dewpoint"
                      ? "text-blue-300 font-semibold"
                      : "text-slate-400 hover:text-slate-200",
                  )}
                >
                  <span>Dew Point</span>
                  {activeSubLayer === "hum_dewpoint" && <Check className="size-3 text-blue-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => onSubLayerChange("hum_wetbulb")}
                  className={cn(
                    "w-full flex items-center justify-between py-1 px-1.5 rounded text-[11px] font-sans transition-colors",
                    activeSubLayer === "hum_wetbulb"
                      ? "text-blue-300 font-semibold"
                      : "text-slate-400 hover:text-slate-200",
                  )}
                >
                  <span>Wet-Bulb</span>
                  {activeSubLayer === "hum_wetbulb" && <Check className="size-3 text-blue-400" />}
                </button>
              </div>
            )}
          </div>

          {/* Pressure */}
          <button
            type="button"
            onClick={() => handleSelectParent("pressure")}
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150",
              activeLayer === "pressure"
                ? "bg-white/15 border border-white/30 text-white font-semibold shadow-inner"
                : "text-slate-300 hover:bg-white/5 hover:text-white",
            )}
          >
            <span className="flex items-center gap-2">
              <Gauge className="size-3.5 text-purple-400" /> Pressure
            </span>
            <span className="text-[10px] opacity-60 font-mono">MSLP</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: NASA AGRO & HAZARD LAYERS */}
      <div className="mt-3 pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={() => setIsNasaSectionOpen(!isNasaSectionOpen)}
          className="w-full flex items-center justify-between px-1.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-300 hover:text-white rounded-lg hover:bg-white/5"
        >
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <Sprout className="size-3" /> NASA AGRO ({MAP_LAYERS.length})
          </span>
          {isNasaSectionOpen ? (
            <ChevronUp className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          )}
        </button>

        {isNasaSectionOpen && (
          <div className="space-y-1 mt-1.5 animate-in fade-in duration-150">
            {MAP_LAYERS.map((layer: MapLayer) => {
              const meta = ZOOM_EARTH_LAYERS_META[layer];
              const isSelected = activeLayer === layer;
              return (
                <button
                  key={layer}
                  type="button"
                  onClick={() => handleSelectParent(layer)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1 rounded-lg text-[11px] font-sans transition-colors",
                    isSelected
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-semibold"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                  )}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span>{meta?.emoji || "🌱"}</span>
                    <span className="truncate">{meta?.name || layer}</span>
                  </span>
                  {isSelected && <Check className="size-3 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
