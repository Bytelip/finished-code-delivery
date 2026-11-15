import React, { useState } from "react";
import { X, CheckCircle2, Sparkles, HelpCircle } from "lucide-react";
import {
  type ZoomEarthLayerId,
  type SubLayerId,
  ZOOM_EARTH_LAYERS_META,
} from "@/types/zoomEarthLayers";
import { cn } from "@/lib/utils";

interface LayerInfoModalProps {
  layerId: ZoomEarthLayerId | null;
  subLayerId?: SubLayerId;
  open: boolean;
  onClose: () => void;
  dontShowAgain?: boolean;
  onToggleDontShowAgain?: (val: boolean) => void;
}

export function LayerInfoModal({
  layerId,
  subLayerId,
  open,
  onClose,
  dontShowAgain = false,
  onToggleDontShowAgain,
}: LayerInfoModalProps) {
  if (!open || !layerId) return null;

  const meta = ZOOM_EARTH_LAYERS_META[layerId] || ZOOM_EARTH_LAYERS_META.satellite;
  const activeSub = meta.subOptions?.find((s) => s.id === subLayerId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#1C212B]/95 backdrop-blur-2xl border border-white/15 p-6 text-center text-white shadow-2xl animate-in zoom-in-95 duration-200 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Icon Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="Close Dialog"
        >
          <X className="size-4" />
        </button>

        {/* Large Decorative Icon / Emoji */}
        <div className="mx-auto size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl shadow-[0_0_25px_rgba(255,255,255,0.06)] mb-3">
          {meta.emoji}
        </div>

        {/* Category Pill */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-[10px] font-mono text-cyan-300 uppercase tracking-widest mb-2">
          <Sparkles className="size-2.5" />
          {meta.category === "atmospheric"
            ? "Forecast & Atmospheric Map"
            : meta.category === "live"
              ? "Live Geospatial Observation"
              : "NASA Agro-Climatic Telemetry"}
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold tracking-tight text-white font-sans">
          {activeSub ? `${meta.name} • ${activeSub.label}` : meta.title}
        </h2>

        {/* Scientific Description */}
        <p className="mt-3 text-sm text-slate-300 leading-relaxed font-sans px-2">
          {meta.description}
        </p>

        {activeSub && (
          <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-cyan-200 font-mono inline-block">
            Mode: {activeSub.description}
          </div>
        )}

        {/* Model Resolution Badge */}
        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-mono text-slate-400">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Resolution: ICON 13 km • GFS 22 km • NASA GIBS</span>
        </div>

        {/* Blue Primary "OK" Button */}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full py-2.5 px-4 rounded-xl bg-[#1D74F5] hover:bg-[#3B82F6] active:bg-[#1E40AF] text-white font-semibold text-sm tracking-wide shadow-[0_4px_16px_rgba(29,116,245,0.35)] transition-all duration-150 cursor-pointer"
        >
          OK
        </button>

        {/* Don't show again toggle */}
        {onToggleDontShowAgain && (
          <label className="mt-3.5 flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => onToggleDontShowAgain(e.target.checked)}
              className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-0 size-3.5"
            />
            <span>Don't show automatically when switching layers</span>
          </label>
        )}
      </div>
    </div>
  );
}
