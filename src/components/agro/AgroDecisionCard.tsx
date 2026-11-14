import React, { useMemo } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgroTelemetry } from "@/types/agroSpace";

interface AgroDecisionCardProps {
  telemetry: AgroTelemetry;
  onExportReport?: () => void;
  className?: string;
}

export function AgroDecisionCard({
  telemetry,
  onExportReport,
  className = "",
}: AgroDecisionCardProps) {
  const { input, plantHealth, soil, waterBudget, crop, meta } = telemetry;

  // Extract key satellite telemetry values
  const ndviValue =
    telemetry.layers?.NDVI?.value ??
    (plantHealth.pillars?.find((p) => p.key === "ndvi")?.score ?? 65) / 100;
  const soilMoisturePct = soil.currentMoisture;
  const rainMm = waterBudget.rainfall;
  const healthScore = Math.min(100, Math.max(0, plantHealth.overall));

  // Determine stress tier
  const { statusLabel, statusColor, statusBorder, statusBg, recommendation } = useMemo(() => {
    if (healthScore >= 75) {
      return {
        statusLabel: "OPTIMAL BIOMASS & CROP HEALTH",
        statusColor: "text-emerald",
        statusBorder: "border-emerald/40",
        statusBg: "bg-emerald/10",
        recommendation: `Photosynthetic vigor and vegetative density for ${crop.crop} are within prime NASA MODIS benchmarks. Maintain standard ${input.irrigation} scheduling. Projected yield: ${crop.yieldTPerHa} t/ha.`,
      };
    } else if (healthScore >= 50) {
      return {
        statusLabel: "MODERATE WATER & THERMAL STRESS",
        statusColor: "text-amber",
        statusBorder: "border-amber/40",
        statusBg: "bg-amber/10",
        recommendation: `SMAP L4 root-zone moisture (${soilMoisturePct}%) indicates a ${crop.deficitMm}mm deficit for ${crop.crop}. Schedule supplemental ${input.irrigation} during early morning or twilight hours to reduce solar evapotranspiration loss.`,
      };
    } else {
      return {
        statusLabel: "SEVERE DROUGHT / STRESS ALERT",
        statusColor: "text-crimson",
        statusBorder: "border-crimson/40",
        statusBg: "bg-crimson/10",
        recommendation: `CRITICAL ALERT: Root-zone moisture and canopy transpiration are critically depleted (${crop.deficitMm}mm water deficit). Immediate deep irrigation required to prevent permanent wilting of ${crop.crop}.`,
      };
    }
  }, [healthScore, crop, input.irrigation, soilMoisturePct]);

  // SVG Gauge calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-cyan-500/30 bg-[#070D1A]/90 p-5 backdrop-blur-xl shadow-[0_0_35px_rgba(6,182,212,0.12)] ${className}`}
    >
      {/* Top accent lightline */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-cyan-400 via-emerald-400 to-transparent opacity-80" />

      {/* Header Bar */}
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
              Deep Multi-Sensor Fusion • NASA POWER · GIBS · SMAP L4 · ECOSTRESS ESI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-0.5 font-mono text-[10px] text-cyan-300">
            <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
            {meta.regionLabel}
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

      {/* Main Decision Grid */}
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

        {/* Center Column: 4 Satellite Metric Tiles */}
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
              0.74
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

        {/* Right Column: Farmer Actionable Advisory */}
        <div className="md:col-span-5 p-3.5 rounded-lg border border-cyan-500/20 bg-cyan-950/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex size-5 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300">
              <Activity className="size-3" />
            </div>
            <span className="font-mono text-xs font-bold text-cyan-200 uppercase tracking-wide">
              Actionable Farmer Advisory
            </span>
          </div>

          <p className="font-sans text-xs text-foreground/90 leading-relaxed">{recommendation}</p>

          <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald" />
              Field: {crop.crop}
            </span>
            <span className="text-cyan-300">Target Deficit: {crop.deficitMm}mm</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgroDecisionCard;
