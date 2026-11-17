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
import { LocalizedText } from "@/components/i18n/LocalizedText";

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

  const activeMeta = ZOOM_EARTH_LAYERS_META[activeLayer] || ZOOM_EARTH_LAYERS_META["satellite"]!;

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
          "absolute left-3 top-16 md:top-14 z-40 flex items-center gap-1.5 rounded-full bg-[#181C24]/90 backdrop-blur-xl border border-white/15 px-3 py-1.5 text-foreground shadow-2xl transition-all duration-200 cursor-pointer hover:bg-[#181C24]",
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
          className="p-0.5 rounded-full hover:bg-white/20 text-foreground hover:text-foreground"
          title="Layer Information"
        >
          <Info className="size-3 text-cyan-300" />
        </button>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      data-hud-overlay="zoom-earth-sidebar"
      className={cn(
        "absolute left-3 top-16 md:top-14 z-40 w-56 rounded-xl bg-[#181C24]/92 backdrop-blur-2xl border border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.65)] p-2.5 text-foreground select-none transition-all duration-300 max-h-[82vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20",
        className,
      )}
    >
      {/* Dashbar Header */}
      <div className="flex items-center justify-between px-1.5 pb-2 border-b border-white/10 text-xs font-mono font-bold tracking-wider text-foreground">
        <span className="flex items-center gap-1.5 uppercase text-xs text-cyan-300">
          <Sparkles className="size-3 text-cyan-300" /> {<LocalizedText text={" MAP LAYERS"} />}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onOpenInfoModal(activeLayer)}
            className="p-1 rounded-lg hover:bg-white/15 text-foreground hover:text-foreground transition-colors"
            title="Layer Scientific Description"
          >
            <Info className="size-3.5 text-cyan-300" />
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded-lg hover:bg-white/15 text-foreground hover:text-foreground transition-colors"
            title="Collapse Dashbar"
          >
            <ChevronUp className="size-3.5" />
          </button>
        </div>
      </div>

      {/* SECTION 1: LIVE MAPS */}
      <div className="mt-2">
        <div className="px-1.5 text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
          {<LocalizedText text={"Live Maps"} />}
        </div>
        <div className="space-y-1">
          {/* Satellite */}
          <button
            type="button"
            onClick={() => handleSelectParent("satellite")}
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150",
              activeLayer === "satellite"
                ? "bg-white/15 border border-white/30 text-foreground font-semibold shadow-inner"
                : "text-foreground hover:bg-white/5 hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              <Satellite className="size-3.5 text-cyan-300" />{" "}
              {<LocalizedText text={" Satellite"} />}
            </span>
            {activeLayer === "satellite" && (
              <span className="text-xs text-cyan-300">{<LocalizedText text={"● LIVE"} />}</span>
            )}
          </button>

          {/* Radar */}
          <button
            type="button"
            onClick={() => handleSelectParent("radar")}
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150",
              activeLayer === "radar"
                ? "bg-white/15 border border-white/30 text-foreground font-semibold shadow-inner"
                : "text-foreground hover:bg-white/5 hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              <Radio className="size-3.5 text-emerald-400" /> {<LocalizedText text={" Radar"} />}
            </span>
            {activeLayer === "radar" && (
              <span className="text-xs text-emerald-400">{<LocalizedText text={"● LIVE"} />}</span>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 2: FORECAST & ATMOSPHERIC MAPS */}
      <div className="mt-3">
        <div className="px-1.5 text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
          {<LocalizedText text={"Forecast & Atmospheric"} />}
        </div>
        <div className="space-y-1">
          {/* Precipitation */}
          <button
            type="button"
            onClick={() => handleSelectParent("precipitation")}
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150",
              activeLayer === "precipitation"
                ? "bg-white/15 border border-white/30 text-foreground font-semibold shadow-inner"
                : "text-foreground hover:bg-white/5 hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              <CloudRain className="size-3.5 text-cyan-300" />{" "}
              {<LocalizedText text={" Precipitation"} />}
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
                  ? "bg-white/15 border border-white/30 text-foreground font-semibold shadow-inner"
                  : "text-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-2">
                <Wind className="size-3.5 text-emerald-400" /> {<LocalizedText text={" Wind"} />}
              </span>
              <span className="text-xs opacity-60 font-mono">
                {<LocalizedText text={"Streamlines"} />}
              </span>
            </button>
            {activeLayer === "wind" && (
              <div className="pl-6 pr-2 py-1 space-y-0.5 bg-black/25 border-l-2 border-teal-400 my-1 ml-3 rounded-r-lg animate-in fade-in duration-200">
                <button
                  type="button"
                  onClick={() => onSubLayerChange("wind_speed")}
                  className={cn(
                    "w-full flex items-center justify-between py-1 px-1.5 rounded-md text-xs font-sans transition-colors",
                    activeSubLayer === "wind_speed"
                      ? "text-emerald-400 font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{<LocalizedText text={"Wind Speed"} />}</span>
                  {activeSubLayer === "wind_speed" && <Check className="size-3 text-emerald-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => onSubLayerChange("wind_gusts")}
                  className={cn(
                    "w-full flex items-center justify-between py-1 px-1.5 rounded-md text-xs font-sans transition-colors",
                    activeSubLayer === "wind_gusts"
                      ? "text-emerald-400 font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{<LocalizedText text={"Wind Gusts"} />}</span>
                  {activeSubLayer === "wind_gusts" && <Check className="size-3 text-emerald-400" />}
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
                  ? "bg-white/15 border border-white/30 text-foreground font-semibold shadow-inner"
                  : "text-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-2">
                <Thermometer className="size-3.5 text-amber-400" />{" "}
                {<LocalizedText text={" Temperature"} />}
              </span>
              <span className="text-xs opacity-60 font-mono">{<LocalizedText text={"°C"} />}</span>
            </button>
            {activeLayer === "temperature" && (
              <div className="pl-6 pr-2 py-1 space-y-0.5 bg-black/25 border-l-2 border-amber-400 my-1 ml-3 rounded-r-lg animate-in fade-in duration-200">
                <button
                  type="button"
                  onClick={() => onSubLayerChange("temp_actual")}
                  className={cn(
                    "w-full flex items-center justify-between py-1 px-1.5 rounded-md text-xs font-sans transition-colors",
                    activeSubLayer === "temp_actual"
                      ? "text-amber-400 font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{<LocalizedText text={"Actual"} />}</span>
                  {activeSubLayer === "temp_actual" && <Check className="size-3 text-amber-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => onSubLayerChange("temp_feels")}
                  className={cn(
                    "w-full flex items-center justify-between py-1 px-1.5 rounded-md text-xs font-sans transition-colors",
                    activeSubLayer === "temp_feels"
                      ? "text-amber-400 font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{<LocalizedText text={"Feels Like"} />}</span>
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
                  ? "bg-white/15 border border-white/30 text-foreground font-semibold shadow-inner"
                  : "text-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-2">
                <Droplets className="size-3.5 text-cyan-300" />{" "}
                {<LocalizedText text={" Humidity"} />}
              </span>
              <span className="text-xs opacity-60 font-mono">%</span>
            </button>
            {activeLayer === "humidity" && (
              <div className="pl-6 pr-2 py-1 space-y-0.5 bg-black/25 border-l-2 border-blue-400 my-1 ml-3 rounded-r-lg animate-in fade-in duration-200">
                <button
                  type="button"
                  onClick={() => onSubLayerChange("hum_relative")}
                  className={cn(
                    "w-full flex items-center justify-between py-1 px-1.5 rounded-md text-xs font-sans transition-colors",
                    activeSubLayer === "hum_relative"
                      ? "text-cyan-300 font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{<LocalizedText text={"Relative"} />}</span>
                  {activeSubLayer === "hum_relative" && <Check className="size-3 text-cyan-300" />}
                </button>
                <button
                  type="button"
                  onClick={() => onSubLayerChange("hum_dewpoint")}
                  className={cn(
                    "w-full flex items-center justify-between py-1 px-1.5 rounded-md text-xs font-sans transition-colors",
                    activeSubLayer === "hum_dewpoint"
                      ? "text-cyan-300 font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{<LocalizedText text={"Dew Point"} />}</span>
                  {activeSubLayer === "hum_dewpoint" && <Check className="size-3 text-cyan-300" />}
                </button>
                <button
                  type="button"
                  onClick={() => onSubLayerChange("hum_wetbulb")}
                  className={cn(
                    "w-full flex items-center justify-between py-1 px-1.5 rounded-md text-xs font-sans transition-colors",
                    activeSubLayer === "hum_wetbulb"
                      ? "text-cyan-300 font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{<LocalizedText text={"Wet-Bulb"} />}</span>
                  {activeSubLayer === "hum_wetbulb" && <Check className="size-3 text-cyan-300" />}
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
                ? "bg-white/15 border border-white/30 text-foreground font-semibold shadow-inner"
                : "text-foreground hover:bg-white/5 hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              <Gauge className="size-3.5 text-cyan-300" /> {<LocalizedText text={" Pressure"} />}
            </span>
            <span className="text-xs opacity-60 font-mono">{<LocalizedText text={"MSLP"} />}</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: NASA AGRO & HAZARD LAYERS */}
      <div className="mt-3 pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={() => setIsNasaSectionOpen(!isNasaSectionOpen)}
          className="w-full flex items-center justify-between px-1.5 py-1 text-xs font-mono uppercase tracking-wider text-foreground hover:text-foreground rounded-lg hover:bg-white/5"
        >
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <Sprout className="size-3" /> {<LocalizedText text={" NASA AGRO ("} />}
            {MAP_LAYERS.length})
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
                    "w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs font-sans transition-colors",
                    isSelected
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 font-semibold"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
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
