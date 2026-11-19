import React, { useState, useRef, useEffect } from "react";
import {
  Layers,
  Check,
  Mountain,
  Map as MapIcon,
  Moon,
  Satellite,
  Radio,
  CloudRain,
  Wind,
  Thermometer,
  Droplets,
  Gauge,
  X,
  Eye,
  Box,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { LocalizedText, useLocalizedValue } from "@/components/i18n/LocalizedText";
import { ForecastAtmospherePanel } from "@/components/hud/ZoomEarthSidebar";

export type BasemapStyle =
  | "satellite"
  | "radar"
  | "precipitation"
  | "wind"
  | "temperature"
  | "humidity"
  | "pressure"
  | "terrain"
  | "default"
  | "dark";

export type SubOptionId =
  | "satellite_live"
  | "satellite_hd"
  | "wind_speed"
  | "wind_gusts"
  | "temp_actual"
  | "temp_feels"
  | "hum_relative"
  | "hum_dewpoint"
  | "hum_wetbulb";

export interface MapLayerSubOption {
  id: SubOptionId;
  label: string;
  description?: string;
}

export interface MapLayerOption {
  id: BasemapStyle;
  label: string;
  sublabel: string;
  tag: string;
  category: "live" | "atmospheric" | "terrain";
  icon: typeof Satellite;
  emoji: string;
  thumbnailBg: string;
  previewGradient: string;
  defaultSubOption?: SubOptionId;
  subOptions?: MapLayerSubOption[];
}

export const BASEMAP_OPTIONS: MapLayerOption[] = [
  // 1. LIVE MAPS
  {
    id: "satellite",
    label: "Satellite",
    sublabel: "High-Res Optical Earth",
    tag: "LIVE / HD",
    category: "live",
    icon: Satellite,
    emoji: "🛰️",
    thumbnailBg: "#0a192f",
    previewGradient: "radial-gradient(circle at center, #1e3a5f 0%, #0d1b2a 70%, #050b14 100%)",
    defaultSubOption: "satellite_live",
    subOptions: [
      {
        id: "satellite_live",
        label: "Live",
        description: "Real-time satellite imagery + cloud cover overlay",
      },
      {
        id: "satellite_hd",
        label: "HD",
        description: "Ultra-crisp Esri World Imagery + place labels",
      },
    ],
  },
  {
    id: "radar",
    label: "Radar",
    sublabel: "RainViewer & IMERG Reflectivity",
    tag: "RADAR",
    category: "live",
    icon: Radio,
    emoji: "📡",
    thumbnailBg: "#0c1f24",
    previewGradient: "radial-gradient(circle at center, #0284c7 0%, #0369a1 60%, #082f49 100%)",
  },

  // 2. ATMOSPHERIC & FORECAST BASEMAPS
  {
    id: "precipitation",
    label: "Precipitation",
    sublabel: "Rain & Cloud Intensity",
    tag: "RAIN RATE",
    category: "atmospheric",
    icon: CloudRain,
    emoji: "🌧️",
    thumbnailBg: "#052e16",
    previewGradient: "radial-gradient(circle at center, #16a34a 0%, #15803d 60%, #052e16 100%)",
  },
  {
    id: "wind",
    label: "Wind",
    sublabel: "Speed & Flow Streamlines",
    tag: "STREAMLINES",
    category: "atmospheric",
    icon: Wind,
    emoji: "💨",
    thumbnailBg: "#2e1065",
    previewGradient: "radial-gradient(circle at center, #7c3aed 0%, #5b21b6 60%, #2e1065 100%)",
    defaultSubOption: "wind_speed",
    subOptions: [
      { id: "wind_speed", label: "Wind Speed", description: "10m surface sustained wind speed" },
      { id: "wind_gusts", label: "Wind Gusts", description: "Peak instantaneous wind gusts" },
    ],
  },
  {
    id: "temperature",
    label: "Temperature",
    sublabel: "2m Air & Apparent Heat",
    tag: "THERMAL",
    category: "atmospheric",
    icon: Thermometer,
    emoji: "🌡️",
    thumbnailBg: "#451a03",
    previewGradient: "radial-gradient(circle at center, #ea580c 0%, #c2410c 60%, #451a03 100%)",
    defaultSubOption: "temp_actual",
    subOptions: [
      { id: "temp_actual", label: "Actual", description: "2m air temperature (°C)" },
      { id: "temp_feels", label: "Feels Like", description: "Apparent temperature / Heat Index" },
    ],
  },
  {
    id: "humidity",
    label: "Humidity",
    sublabel: "Relative, Dew & Wet-Bulb",
    tag: "MOISTURE",
    category: "atmospheric",
    icon: Droplets,
    emoji: "💧",
    thumbnailBg: "#083344",
    previewGradient: "radial-gradient(circle at center, #0284c7 0%, #0369a1 60%, #083344 100%)",
    defaultSubOption: "hum_relative",
    subOptions: [
      { id: "hum_relative", label: "Relative", description: "Relative humidity ratio (%)" },
      { id: "hum_dewpoint", label: "Dew Point", description: "Condensation temperature (°C)" },
      {
        id: "hum_wetbulb",
        label: "Wet-Bulb",
        description: "Thermodynamic heat-stress threshold (°C)",
      },
    ],
  },
  {
    id: "pressure",
    label: "Pressure",
    sublabel: "MSLP & Isobar Contours",
    tag: "ISOBARS",
    category: "atmospheric",
    icon: Gauge,
    emoji: "🧭",
    thumbnailBg: "#172554",
    previewGradient: "radial-gradient(circle at center, #2563eb 0%, #1d4ed8 60%, #172554 100%)",
  },

  // 3. TERRAIN & VECTOR
  {
    id: "terrain",
    label: "Terrain",
    sublabel: "Topographic & Relief",
    tag: "14% FACTOR",
    category: "terrain",
    icon: Mountain,
    emoji: "⛰️",
    thumbnailBg: "#1b281d",
    previewGradient: "radial-gradient(circle at center, #2d5a37 0%, #1a3320 60%, #0d1a10 100%)",
  },
  {
    id: "default",
    label: "Default (Map)",
    sublabel: "Street, Roads & Districts",
    tag: "STREETS",
    category: "terrain",
    icon: MapIcon,
    emoji: "🗺️",
    thumbnailBg: "#1f2937",
    previewGradient: "radial-gradient(circle at center, #374151 0%, #1f2937 60%, #111827 100%)",
  },
  {
    id: "dark",
    label: "Dark Telemetry",
    sublabel: "High-Contrast Obsidian",
    tag: "NASA CONTRAST",
    category: "terrain",
    icon: Moon,
    emoji: "🌑",
    thumbnailBg: "#05070c",
    previewGradient: "radial-gradient(circle at center, #111827 0%, #05070c 80%, #020306 100%)",
  },
];

export interface MapLayerSwitcherProps {
  currentStyle: BasemapStyle;
  onStyleChange: (style: BasemapStyle) => void;
  activeSubOption?: SubOptionId;
  onSubOptionChange?: (sub: SubOptionId) => void;
  onOpenInfoModal?: (style: BasemapStyle) => void;
  showLabels?: boolean;
  onToggleLabels?: (show: boolean) => void;
  enable3dTerrain?: boolean;
  onToggle3dTerrain?: (enable: boolean) => void;
  viewMode?: "3d" | "2d";
  coordinates?: { lat: number; lon: number };
  compact?: boolean;
  className?: string;
}

export function MapLayerSwitcher({
  currentStyle,
  onStyleChange,
  activeSubOption,
  onSubOptionChange,
  onOpenInfoModal,
  showLabels = true,
  onToggleLabels,
  enable3dTerrain = true,
  onToggle3dTerrain,
  viewMode = "3d",
  coordinates = { lat: 0, lon: 0 },
  compact = false,
  className,
}: MapLayerSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedOption, setExpandedOption] = useState<BasemapStyle | null>(currentStyle);
  const containerRef = useRef<HTMLDivElement>(null);
  const changeBasemapTitle = useLocalizedValue("Change Basemap & Terrain Layers");
  const closeMenuLabel = useLocalizedValue("Close basemap menu");
  const layerInfoLabel = useLocalizedValue("Layer info");

  // Sync expanded section with active selection
  useEffect(() => {
    setExpandedOption(currentStyle);
  }, [currentStyle]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const activeOption = BASEMAP_OPTIONS.find((o) => o.id === currentStyle) ?? BASEMAP_OPTIONS[0]!;

  const handleSelectOption = (opt: MapLayerOption) => {
    onStyleChange(opt.id);
    if (opt.subOptions && opt.subOptions.length > 0) {
      setExpandedOption((prev) => (prev === opt.id ? prev : opt.id));
      if (opt.defaultSubOption && onSubOptionChange) {
        onSubOptionChange(opt.defaultSubOption);
      }
    }
  };

  const liveMaps = BASEMAP_OPTIONS.filter((o) => o.category === "live");
  const terrainMaps = BASEMAP_OPTIONS.filter((o) => o.category === "terrain");

  return (
    <div
      ref={containerRef}
      className={cn("relative z-30 select-none pointer-events-auto", className)}
      data-hud-overlay="map-layer-switcher"
    >
      {/* ---------------- 1. COMPACT FLOATING LAYERS BUTTON (ZOOM EARTH / GOOGLE MAPS STYLE) ---------------- */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "group flex items-center gap-2 border text-xs font-mono font-semibold transition-all duration-300 shadow-2xl backdrop-blur-xl cursor-pointer",
          compact ? "h-8 justify-center rounded-full px-2.5" : "rounded-xl px-3 py-2",
          isOpen
            ? "border-cyan-400 bg-[#090D18]/95 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.35)]"
            : "border-cyan-500/40 bg-[#080D1A]/90 text-foreground hover:border-cyan-400 hover:text-cyan-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.25)]",
        )}
        title={changeBasemapTitle}
        aria-label={changeBasemapTitle}
      >
        {compact ? (
          <>
            <Layers className="size-4 shrink-0 text-cyan-300" />
            <span className="hidden max-w-24 truncate text-xs font-semibold text-foreground sm:inline">
              {currentStyle === "satellite" ? "Satellite" : activeOption.label}
            </span>
          </>
        ) : (
          <>
            <div className="relative flex size-6 shrink-0 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 group-hover:scale-105 transition-transform">
              <Layers className="size-3.5" />
              <span className="absolute -top-1 -right-1 size-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-cyan-300 transition-colors">
                {<LocalizedText text={"Basemap"} />}
              </span>
              <span className="text-xs font-bold text-foreground truncate max-w-28 flex items-center gap-1">
                <span>{activeOption.emoji}</span>
                <span><LocalizedText text={activeOption.label} /></span>
              </span>
            </div>
          </>
        )}
      </button>

      {/* ---------------- 2. EXPANDABLE ZOOM EARTH DARK-GLASS MAPS MENU ---------------- */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.25 }}
            className={cn(
              "absolute z-40 w-56 overflow-y-auto rounded-xl border border-white/15 bg-[#141821]/95 p-2 text-foreground shadow-2xl backdrop-blur-2xl scrollbar-thin select-none",
              compact
                ? "bottom-full right-0 left-auto mb-2 max-h-[min(440px,max(200px,calc(58dvh-6rem)))] sm:max-h-[min(440px,calc(100dvh-13rem))]"
                : "bottom-12 left-0 mb-1 max-h-[440px]",
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 px-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-3 text-cyan-300" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-300">
                  {<LocalizedText text={"Maps & Weather"} />}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="rounded-md bg-cyan-500/15 border border-cyan-400/30 px-1.5 py-0.2 font-mono text-xs font-bold text-cyan-300 uppercase">
                  {viewMode === "3d" ? "3D" : "2D"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors cursor-pointer"
                  aria-label={closeMenuLabel}
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>

            {/* SECTION 1: LIVE MAPS */}
            <div className="mb-2">
              <div className="px-1 text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1 flex items-center justify-between">
                <span>{<LocalizedText text={"Live Maps"} />}</span>
                <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <div className="space-y-1">{liveMaps.map((opt) => renderOptionItem(opt))}</div>
            </div>

            {/* SECTION 2: ATMOSPHERIC & FORECAST BASEMAPS */}
            <div className="mb-2 pt-1 border-t border-white/10">
              <div className="px-1 text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
                {<LocalizedText text={"Forecast & Atmosphere"} />}
              </div>
              <ForecastAtmospherePanel
                coordinates={coordinates}
                activeLayer={currentStyle as import("@/types/zoomEarthLayers").ZoomEarthLayerId}
                onLayerChange={(layer) => onStyleChange(layer as BasemapStyle)}
              />
            </div>

            {/* SECTION 3: TERRAIN & VECTOR */}
            <div className="mb-2 pt-1 border-t border-white/10">
              <div className="px-1 text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
                {<LocalizedText text={"Terrain & Vector"} />}
              </div>
              <div className="space-y-1">{terrainMaps.map((opt) => renderOptionItem(opt))}</div>
            </div>

            {/* ---------------- 3. TOGGLE CHECKBOXES ---------------- */}
            <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5 font-mono text-xs px-1">
              {/* Show Labels Toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-foreground hover:text-cyan-300 transition-colors">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => onToggleLabels?.(e.target.checked)}
                  className="size-3 rounded-md border-white/20 bg-slate-900 accent-cyan cursor-pointer"
                />
                <Eye className="size-3 text-cyan-300" />
                <span>{<LocalizedText text={"Place Labels & Borders"} />}</span>
              </label>

              {/* 3D Terrain Elevation Mesh Toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-foreground hover:text-emerald-400 transition-colors">
                <input
                  type="checkbox"
                  checked={enable3dTerrain}
                  onChange={(e) => onToggle3dTerrain?.(e.target.checked)}
                  className="size-3 rounded-md border-white/20 bg-slate-900 accent-emerald cursor-pointer"
                />
                <Box className="size-3 text-emerald-400" />
                <span>{<LocalizedText text={"3D Terrain Relief Mesh"} />}</span>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  function renderOptionItem(opt: MapLayerOption) {
    const isSelected = opt.id === currentStyle;
    const hasSub = !!(opt.subOptions && opt.subOptions.length > 0);
    const isExpanded = expandedOption === opt.id;

    return (
      <div key={opt.id} className="rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => handleSelectOption(opt)}
          className={cn(
            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all duration-150 cursor-pointer text-left",
            isSelected
              ? "bg-white/15 border border-white/35 text-foreground font-semibold shadow-inner"
              : "text-foreground hover:bg-white/5 hover:text-foreground border border-transparent",
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <span className="text-sm shrink-0">{opt.emoji}</span>
            <span className="truncate">
              <LocalizedText text={opt.label} />
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenInfoModal && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInfoModal(opt.id);
                }}
                className="p-0.5 rounded-md hover:bg-white/20 text-muted-foreground hover:text-cyan-300 transition-colors cursor-pointer"
                title={layerInfoLabel}
              >
                <Info className="size-3" />
              </span>
            )}
            {hasSub ? (
              isExpanded ? (
                <ChevronUp className="size-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-3 text-muted-foreground" />
              )
            ) : isSelected ? (
              <Check className="size-3 text-cyan-300 stroke-[3]" />
            ) : null}
          </div>
        </button>

        {/* Expandable Sub-Options */}
        {hasSub && isExpanded && (
          <div className="pl-6 pr-1 py-1 space-y-0.5 bg-black/25 rounded-lg my-0.5 border border-white/5">
            {opt.subOptions!.map((sub) => {
              const isSubSelected =
                isSelected &&
                (activeSubOption === sub.id ||
                  (!activeSubOption && opt.defaultSubOption === sub.id));

              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    onStyleChange(opt.id);
                    onSubOptionChange?.(sub.id);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1 rounded-md text-xs font-mono transition-all text-left cursor-pointer",
                    isSubSelected
                      ? "text-cyan-300 font-bold bg-white/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                  )}
                  title={sub.description}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    {isSubSelected ? (
                      <Check className="size-2.5 text-cyan-300 stroke-[3]" />
                    ) : (
                      <span className="size-2.5 inline-block" />
                    )}
                    <span className="truncate">
                      <LocalizedText text={sub.label} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}
