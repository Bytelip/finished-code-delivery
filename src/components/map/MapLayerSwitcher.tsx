import React, { useState, useRef, useEffect } from "react";
import {
  Layers,
  Check,
  Mountain,
  Map as MapIcon,
  Moon,
  Satellite,
  X,
  Eye,
  Box,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type BasemapStyle = "satellite" | "terrain" | "default" | "dark";

export interface MapLayerOption {
  id: BasemapStyle;
  label: string;
  sublabel: string;
  tag: string;
  icon: typeof Satellite;
  thumbnailBg: string;
  previewGradient: string;
}

export const BASEMAP_OPTIONS: MapLayerOption[] = [
  {
    id: "satellite",
    label: "Satellite",
    sublabel: "High-Res Optical Earth",
    tag: "DEFAULT",
    icon: Satellite,
    thumbnailBg: "#0a192f",
    previewGradient: "radial-gradient(circle at center, #1e3a5f 0%, #0d1b2a 70%, #050b14 100%)",
  },
  {
    id: "terrain",
    label: "Terrain",
    sublabel: "Topographic & Relief",
    tag: "14% FACTOR",
    icon: Mountain,
    thumbnailBg: "#1b281d",
    previewGradient: "radial-gradient(circle at center, #2d5a37 0%, #1a3320 60%, #0d1a10 100%)",
  },
  {
    id: "default",
    label: "Default (Map)",
    sublabel: "Street, Roads & Districts",
    tag: "STREETS",
    icon: MapIcon,
    thumbnailBg: "#1f2937",
    previewGradient: "radial-gradient(circle at center, #374151 0%, #1f2937 60%, #111827 100%)",
  },
  {
    id: "dark",
    label: "Dark Telemetry",
    sublabel: "High-Contrast Obsidian",
    tag: "NASA CONTRAST",
    icon: Moon,
    thumbnailBg: "#05070c",
    previewGradient: "radial-gradient(circle at center, #111827 0%, #05070c 80%, #020306 100%)",
  },
];

export interface MapLayerSwitcherProps {
  currentStyle: BasemapStyle;
  onStyleChange: (style: BasemapStyle) => void;
  showLabels?: boolean;
  onToggleLabels?: (show: boolean) => void;
  enable3dTerrain?: boolean;
  onToggle3dTerrain?: (enable: boolean) => void;
  viewMode?: "3d" | "2d";
  className?: string;
}

export function MapLayerSwitcher({
  currentStyle,
  onStyleChange,
  showLabels = true,
  onToggleLabels,
  enable3dTerrain = true,
  onToggle3dTerrain,
  viewMode = "3d",
  className,
}: MapLayerSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const activeOption = BASEMAP_OPTIONS.find((o) => o.id === currentStyle) ?? BASEMAP_OPTIONS[0];

  return (
    <div
      ref={containerRef}
      className={cn("relative z-[35] select-none pointer-events-auto", className)}
      data-hud-overlay="map-layer-switcher"
    >
      {/* ---------------- 1. COMPACT FLOATING LAYERS BUTTON (GOOGLE MAPS STYLE) ---------------- */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "group flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-mono font-semibold transition-all duration-300 shadow-2xl backdrop-blur-xl cursor-pointer",
          isOpen
            ? "border-cyan-400 bg-[#090D18]/95 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.35)]"
            : "border-cyan-500/40 bg-[#080D1A]/90 text-slate-300 hover:border-cyan-400 hover:text-cyan-200 hover:shadow-[0_0_15px_rgba(6,182,212,0.25)]",
        )}
        title="Change Basemap & Terrain Layers"
      >
        <div className="relative flex size-6 shrink-0 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 group-hover:scale-105 transition-transform">
          <Layers className="size-3.5" />
          <span className="absolute -top-1 -right-1 size-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-cyan-400 transition-colors">
            Basemap
          </span>
          <span className="text-xs font-bold text-foreground truncate max-w-24">
            {activeOption.label}
          </span>
        </div>
      </button>

      {/* ---------------- 2. EXPANDABLE POPOVER DOCK (4 MAP THUMBNAIL TILES) ---------------- */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.25 }}
            className="absolute left-0 bottom-14 sm:bottom-12 w-[340px] sm:w-[420px] rounded-2xl border border-cyan-500/40 bg-[#060B16]/95 p-3.5 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_30px_rgba(6,182,212,0.2)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-cyan-400" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-300">
                  Select Basemap View
                </span>
                <span className="rounded bg-cyan-500/15 border border-cyan-400/30 px-1.5 py-0.2 font-mono text-[9px] font-bold text-cyan uppercase">
                  {viewMode === "3d" ? "3D Orbital" : "2D Field GIS"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                aria-label="Close basemap menu"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* 4 Basemap Thumbnail Grid */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {BASEMAP_OPTIONS.map((opt) => {
                const isSelected = opt.id === currentStyle;
                const IconComponent = opt.icon;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onStyleChange(opt.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "group relative flex flex-col items-center rounded-xl border p-2 text-center transition-all duration-200 cursor-pointer overflow-hidden",
                      isSelected
                        ? "border-cyan-400 bg-cyan-500/15 shadow-[0_0_18px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400"
                        : "border-border/50 bg-[#091122]/70 hover:border-cyan-500/40 hover:bg-[#0c1830]",
                    )}
                  >
                    {/* Visual Preview Thumbnail Box */}
                    <div
                      className="relative mb-2 flex h-14 w-full items-center justify-center rounded-lg border border-white/10 overflow-hidden shadow-inner"
                      style={{ background: opt.previewGradient }}
                    >
                      <IconComponent
                        className={cn(
                          "size-6 transition-transform group-hover:scale-110",
                          isSelected ? "text-cyan-300" : "text-slate-400",
                        )}
                      />

                      {/* Top mini-tag */}
                      <span className="absolute top-1 right-1 rounded bg-black/60 px-1 py-0.2 font-mono text-[7.5px] font-bold text-slate-300 uppercase">
                        {opt.tag}
                      </span>

                      {/* Selected Checkmark Badge */}
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-cyan-950/40 backdrop-blur-[1px]">
                          <div className="flex size-5 items-center justify-center rounded-full bg-cyan-400 text-black shadow-[0_0_8px_#22d3ee]">
                            <Check className="size-3 stroke-[3]" />
                          </div>
                        </div>
                      )}
                    </div>

                    <span
                      className={cn(
                        "font-mono text-xs font-bold tracking-tight truncate w-full",
                        isSelected ? "text-cyan-300" : "text-foreground",
                      )}
                    >
                      {opt.label}
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground truncate w-full mt-0.5">
                      {opt.sublabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ---------------- 3. TOGGLE CHECKBOXES ---------------- */}
            <div className="mt-3 pt-2.5 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-[11px]">
              {/* Show Labels Toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-cyan-200 transition-colors">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => onToggleLabels?.(e.target.checked)}
                  className="size-3.5 rounded border-border bg-slate-900 accent-cyan cursor-pointer"
                />
                <Eye className="size-3 text-cyan-400" />
                <span>Place Labels & Borders</span>
              </label>

              {/* 3D Terrain Elevation Mesh Toggle (Active in 3D Mode) */}
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-emerald-200 transition-colors">
                <input
                  type="checkbox"
                  checked={enable3dTerrain}
                  onChange={(e) => onToggle3dTerrain?.(e.target.checked)}
                  className="size-3.5 rounded border-border bg-slate-900 accent-emerald cursor-pointer"
                />
                <Box className="size-3 text-emerald-400" />
                <span>3D Terrain Relief Mesh</span>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
