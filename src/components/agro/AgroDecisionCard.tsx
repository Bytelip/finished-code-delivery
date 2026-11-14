import React, { useMemo, useState } from "react";
import {
  Sparkles,
  FileText,
  Activity,
  Droplets,
  Sun,
  CloudRain,
  Sprout,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgroTelemetry } from "@/types/agroSpace";
import {
  CROP_SUITABILITY_ATLAS,
  detectAgroClimaticZone,
  evaluateCropSuitability,
  type EvaluatedCropSuitability,
} from "@/data/cropSuitabilityAtlas";
import { cn } from "@/lib/utils";

interface AgroDecisionCardProps {
  telemetry: AgroTelemetry;
  onExportReport?: () => void;
  className?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  "cereals-millets": "🌾",
  pulses: "🫘",
  oilseeds: "🌻",
  "commercial-cash": "🌱",
  "horticulture-fruits": "🥭",
  "horticulture-vegetables": "🥬",
  "plantation-spices": "🌿",
};

export function AgroDecisionCard({
  telemetry,
  onExportReport,
  className = "",
}: AgroDecisionCardProps) {
  const { input, plantHealth, soil, waterBudget, meta } = telemetry;

  // ---------------- 1. TELEMETRY EXTRACTION (ZERO UNDEFINED GUARANTEE) ----------------
  const ndviValue =
    telemetry.layers?.NDVI?.value ??
    (plantHealth.pillars?.find((p) => p.key === "ndvi")?.score ?? 65) / 100;

  // Derive SMAP L4 Root Moisture %
  const rawSmap = telemetry.layers?.["SMAP Moisture"]?.value;
  let computedMoisture: number;
  if (typeof rawSmap === "number" && Number.isFinite(rawSmap) && rawSmap > 0) {
    computedMoisture =
      rawSmap <= 1 ? Math.round(rawSmap * 1000) / 10 : Math.round(rawSmap * 10) / 10;
  } else if (Array.isArray(soil) && soil.length > 0) {
    const latest = soil[soil.length - 1];
    const smVal = latest?.sm7_28 ?? latest?.sm28_100 ?? latest?.sm0_5 ?? latest?.GWETPROF;
    if (typeof smVal === "number" && Number.isFinite(smVal) && smVal > 0) {
      computedMoisture = smVal <= 1 ? Math.round(smVal * 1000) / 10 : Math.round(smVal * 10) / 10;
    } else {
      computedMoisture = 24.8;
    }
  } else {
    computedMoisture = 24.8;
  }
  const soilMoisturePct = Number.isFinite(computedMoisture) ? computedMoisture : 24.8;

  // Derive Monthly Rainfall in mm/mo
  let computedRain: number;
  const gpmRate = telemetry.layers?.["GPM Rain"]?.value;
  if (typeof gpmRate === "number" && Number.isFinite(gpmRate) && gpmRate > 0) {
    computedRain = Math.round(gpmRate * 24 * 30);
  } else if (Array.isArray(telemetry.power) && telemetry.power.length > 0) {
    const avgDaily =
      telemetry.power.reduce((acc, p) => acc + (p.PRECTOTCORR || 0), 0) / telemetry.power.length;
    computedRain = Math.round(avgDaily * 30);
  } else if (Array.isArray(waterBudget) && waterBudget.length > 0) {
    computedRain = Math.round(waterBudget.reduce((acc, s) => acc + (s.available || 0), 0));
  } else {
    computedRain = 68;
  }
  const rainMm = Number.isFinite(computedRain) && computedRain > 0 ? computedRain : 68;

  // Derive Evaporative Stress Index (ESI)
  const rawEsi = telemetry.layers?.["ECOSTRESS ESI"]?.value;
  const esiRatio =
    typeof rawEsi === "number" && Number.isFinite(rawEsi) ? Number(rawEsi.toFixed(2)) : 0.74;

  const healthScore = Math.min(100, Math.max(0, plantHealth.overall));

  // ---------------- 2. FIELD SHIFT 5-FACTOR ATLAS SUITABILITY ENGINE ----------------
  const zone = useMemo(() => detectAgroClimaticZone(input.lat, input.lon), [input.lat, input.lon]);

  const rankedCrops = useMemo(() => {
    return CROP_SUITABILITY_ATLAS.map((c) =>
      evaluateCropSuitability(c, zone, {
        smapMoisture: soilMoisturePct,
        ecostressESI: esiRatio,
        gpmRainMm: rainMm,
        borewellDepthM: input.borewellDepth,
        scenario: input.scenario,
        isDrought: input.scenario === "Severe Drought" || soilMoisturePct < 22,
      }),
    ).sort((a, b) => b.adjustedScore - a.adjustedScore);
  }, [zone, soilMoisturePct, esiRatio, rainMm, input.borewellDepth, input.scenario]);

  const top5Crops = useMemo(() => rankedCrops.slice(0, 5), [rankedCrops]);

  // Selected or #1 best-matched crop state
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);

  const activeCrop: EvaluatedCropSuitability = useMemo(() => {
    if (selectedCropId) {
      const match = rankedCrops.find((c) => c.id === selectedCropId);
      if (match) return match;
    }
    return rankedCrops[0];
  }, [selectedCropId, rankedCrops]);

  // Water savings vs baseline high-water crop (Paddy Rice requires 1250mm)
  const waterSavedVsPaddy = Math.max(
    0,
    Math.round(((1250 - activeCrop.waterRequirementMm) / 1250) * 100),
  );
  // Estimated target deficit for the selected crop
  const cropWaterDeficitMm = Math.max(
    0,
    Math.round(activeCrop.waterRequirementMm * (soilMoisturePct < 25 ? 0.12 : 0.05)),
  );

  // ---------------- 3. STRESS TIER & DYNAMIC ADVISORY TEXT ----------------
  const { statusLabel, statusColor, statusBorder, statusBg, recommendation } = useMemo(() => {
    const place = meta.regionLabel || "Target Field";
    if (healthScore >= 75) {
      return {
        statusLabel: "OPTIMAL BIOMASS & CROP HEALTH",
        statusColor: "text-emerald",
        statusBorder: "border-emerald/40",
        statusBg: "bg-emerald/10",
        recommendation: `MODIS vegetative density and SMAP L4 root-zone moisture (${soilMoisturePct}% vol) in ${place} are optimal. Top recommended rotation crop is ${activeCrop.name} (${activeCrop.adjustedScore}/100) under standard ${input.irrigation} irrigation. Expected savings: +${waterSavedVsPaddy}% water vs. paddy.`,
      };
    } else if (healthScore >= 50) {
      return {
        statusLabel: "MODERATE WATER & THERMAL STRESS",
        statusColor: "text-amber",
        statusBorder: "border-amber/40",
        statusBg: "bg-amber/10",
        recommendation: `In ${place}, SMAP L4 root-zone moisture (${soilMoisturePct}% vol) and ESI (${esiRatio}) signal water deficit. Conventional high-water crops like Paddy Rice face critical overdraft; shifting to drought-resilient ${activeCrop.name} (Suitability: ${activeCrop.adjustedScore}/100, Water factor: ${activeCrop.factors.water}/100) saves +${waterSavedVsPaddy}% water with just ${cropWaterDeficitMm}mm deficit. Schedule twilight ${input.irrigation}.`,
      };
    } else {
      return {
        statusLabel: "SEVERE DROUGHT / STRESS ALERT",
        statusColor: "text-crimson",
        statusBorder: "border-crimson/40",
        statusBg: "bg-crimson/10",
        recommendation: `CRITICAL ALERT for ${place}: Root-zone moisture (${soilMoisturePct}% vol) is critically depleted. High-water monocultures face total failure. Immediate shift to ultra-hardy ${activeCrop.name} (${activeCrop.adjustedScore}/100, saves +${waterSavedVsPaddy}% water) and micro-irrigation is essential to secure harvest.`,
      };
    }
  }, [
    healthScore,
    soilMoisturePct,
    esiRatio,
    meta.regionLabel,
    activeCrop,
    input.irrigation,
    waterSavedVsPaddy,
    cropWaterDeficitMm,
  ]);

  // Radial SVG Gauge calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-cyan-500/30 bg-[#070D1A]/90 p-5 backdrop-blur-xl shadow-[0_0_35px_rgba(6,182,212,0.12)] transition-all duration-300",
        className,
      )}
    >
      {/* Top accent lightline */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-cyan-400 via-emerald-400 to-transparent opacity-80" />

      {/* ---------------- HEADER BAR ---------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-500/15 text-cyan shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            <Sparkles className="size-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-300">
              AI Agronomic & Climate Decision Engine
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Deep Multi-Sensor Fusion • NASA POWER · GIBS · SMAP L4 · ECOSTRESS ESI · Field Shift
              Atlas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-0.5 font-mono text-[10px] text-cyan-300">
            <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
            {meta.regionLabel} • Zone {zone.zoneNumber}
          </span>
          <Button
            type="button"
            size="sm"
            onClick={onExportReport}
            className="h-7 px-3 text-xs font-semibold rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.25)] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="size-3.5 text-cyan-400" />
            <span>📄 Export NASA Field Report</span>
          </Button>
        </div>
      </div>

      {/* ---------------- MAIN DECISION METRICS GRID ---------------- */}
      <div className="mt-4 grid gap-5 md:grid-cols-12 items-center">
        {/* Left Column: Radial Agro-Health Gauge */}
        <div className="md:col-span-3 flex flex-col items-center justify-center p-3 rounded-lg border border-border/40 bg-background/40">
          <div className="relative size-28 flex items-center justify-center">
            <svg className="size-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-muted/30"
                strokeWidth="7"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-cyan-400 transition-all duration-1000 ease-out"
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                style={{
                  filter: "drop-shadow(0 0 8px rgba(34, 211, 238, 0.6))",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-mono text-2xl font-black text-cyan-300 tabular-nums">
                {healthScore}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                INDEX / 100
              </span>
            </div>
          </div>

          <div
            className={`mt-2 text-center rounded px-2 py-0.5 font-mono text-[10px] font-bold ${statusColor} ${statusBg} ${statusBorder} border`}
          >
            {statusLabel}
          </div>
        </div>

        {/* Center Column: 4 Satellite Metric Tiles (Zero-Undefined) */}
        <div className="md:col-span-4 grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-lg border border-border/40 bg-background/50 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[10px]">
              <Sprout className="size-3 text-emerald" />
              <span>NDVI Vigor</span>
            </div>
            <div className="mt-1 font-mono text-base font-bold text-foreground">
              {ndviValue.toFixed(2)}
              <span className="text-[10px] font-normal text-muted-foreground ml-1">index</span>
            </div>
            <div className="text-[9px] text-emerald truncate">MODIS Terra 250m</div>
          </div>

          <div className="p-2.5 rounded-lg border border-border/40 bg-background/50 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[10px]">
              <Droplets className="size-3 text-cyan" />
              <span>Root Moisture</span>
            </div>
            <div className="mt-1 font-mono text-base font-bold text-foreground">
              {soilMoisturePct}%
              <span className="text-[10px] font-normal text-muted-foreground ml-1">vol</span>
            </div>
            <div className="text-[9px] text-cyan truncate">SMAP L4 Polar</div>
          </div>

          <div className="p-2.5 rounded-lg border border-border/40 bg-background/50 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[10px]">
              <Sun className="size-3 text-amber" />
              <span>Evapo ESI</span>
            </div>
            <div className="mt-1 font-mono text-base font-bold text-foreground">
              {esiRatio}
              <span className="text-[10px] font-normal text-muted-foreground ml-1">ratio</span>
            </div>
            <div className="text-[9px] text-amber truncate">ISS ECOSTRESS 70m</div>
          </div>

          <div className="p-2.5 rounded-lg border border-border/40 bg-background/50 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[10px]">
              <CloudRain className="size-3 text-blue-400" />
              <span>Rainfall</span>
            </div>
            <div className="mt-1 font-mono text-base font-bold text-foreground">
              {rainMm}
              <span className="text-[10px] font-normal text-muted-foreground ml-1">mm/mo</span>
            </div>
            <div className="text-[9px] text-blue-400 truncate">GPM IMERG Core</div>
          </div>
        </div>

        {/* Right Column: Actionable Farmer Advisory with Dynamic Crop & Water Savings */}
        <div className="md:col-span-5 p-3.5 rounded-lg border border-cyan-500/25 bg-cyan-950/20 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="flex size-5 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300">
                <Activity className="size-3" />
              </div>
              <span className="font-mono text-xs font-bold text-cyan-200 uppercase tracking-wide">
                Actionable Farmer Advisory
              </span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {meta.regionLabel || "Active Field"}
            </span>
          </div>

          <p className="font-sans text-xs text-foreground/90 leading-relaxed">{recommendation}</p>

          {/* Dynamic Best Recommended Crop Footer Bar */}
          <div className="mt-3 pt-2.5 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-[10.5px] font-mono">
            <button
              type="button"
              onClick={() => setSelectedCropId(activeCrop.id)}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/25 transition-colors cursor-pointer"
              title={`Selected Crop: ${activeCrop.name} (${activeCrop.adjustedScore}/100)`}
            >
              <Sprout className="size-3 text-emerald-400" />
              <span className="font-bold">🌱 Best Crop Match:</span>
              <span className="text-white underline decoration-emerald-400/60">
                {activeCrop.name} ({activeCrop.adjustedScore}/100)
              </span>
            </button>

            <div className="flex items-center gap-2 text-cyan-300">
              <span className="text-emerald-400 font-semibold">
                Water Saved vs. Paddy: +{waterSavedVsPaddy}%
              </span>
              <span>•</span>
              <span className="text-muted-foreground">
                Target Deficit: <strong className="text-cyan-200">{cropWaterDeficitMm}mm</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- 4. SLEEK "TOP RECOMMENDED CROPS FOR [PLACE]" STRIP ---------------- */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-cyan-300">
            <span>🌾 Top Recommended Crops for {meta.regionLabel}</span>
            <span className="text-[10px] px-2 py-0.2 rounded-full border border-cyan-400/30 bg-cyan-950/40 text-cyan-400 font-normal">
              Zone {zone.zoneNumber}: {zone.name}
            </span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
            Click any crop to recalculate advisory & deficit
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {top5Crops.map((crop, idx) => {
            const isSelected = activeCrop.id === crop.id;
            const categoryIcon = CATEGORY_ICONS[crop.category] || "🌱";
            const isVeryHigh = crop.adjustedScore >= 85;

            return (
              <button
                key={crop.id}
                type="button"
                onClick={() => setSelectedCropId(crop.id)}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between gap-1.5 cursor-pointer relative",
                  isSelected
                    ? "bg-cyan-500/15 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400/70"
                    : "bg-card/60 border-border/60 hover:bg-card hover:border-cyan-500/40",
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5 font-medium text-xs text-foreground truncate">
                    <span className="text-sm">{categoryIcon}</span>
                    <span className="truncate font-semibold">
                      {idx + 1}. {crop.name.split("/")[0].trim()}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="size-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse flex-shrink-0" />
                  )}
                </div>

                {/* Score badge */}
                <div className="flex items-center justify-between w-full mt-0.5">
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border",
                      isVeryHigh
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/40"
                        : "bg-cyan-500/15 text-cyan-300 border-cyan-400/40",
                    )}
                  >
                    {crop.adjustedScore}/100 {crop.suitabilityTier.split(" ")[0]}
                  </span>

                  <span className="text-[10px] font-mono text-muted-foreground">{crop.season}</span>
                </div>

                {/* Mini Factors */}
                <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground pt-1 border-t border-border/30">
                  <span>Water: {crop.factors.water}/100</span>
                  <span>Soil: {crop.factors.soil}/100</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AgroDecisionCard;
