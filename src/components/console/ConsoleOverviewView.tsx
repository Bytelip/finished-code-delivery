import React, { useState } from "react";
import {
  Activity,
  Check,
  Clock,
  Copy,
  Globe2,
  MapPin,
  Radio,
  Satellite,
  ShieldAlert,
  Sprout,
  ArrowUpRight,
  Table2,
  Droplets,
} from "lucide-react";
import { toast } from "sonner";
import type { AgroTelemetry } from "@/types/agroSpace";
import type { LiveApiStatus } from "@/services/nasaLiveApiService";
import { cn } from "@/lib/utils";
import type { ConsoleView } from "./consoleTypes";

export interface ConsoleOverviewViewProps {
  telemetry: AgroTelemetry;
  liveStatus: LiveApiStatus | null;
  isLoadingLive: boolean;
  activeHazards: number;
  onNavigateView: (view: ConsoleView) => void;
  onOpenConnect: () => void;
}

export const ConsoleOverviewView: React.FC<ConsoleOverviewViewProps> = ({
  telemetry,
  liveStatus,
  isLoadingLive,
  activeHazards,
  onNavigateView,
  onOpenConnect,
}) => {
  const [copiedKey, setCopiedKey] = useState<"coords" | "endpoint" | null>(null);

  const { lat, lon, scenario, borewellDepth, irrigation } = telemetry.input;
  const coordString = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  const powerEndpoint = `https://power.larc.nasa.gov/api/temporal/daily/point?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`;

  const handleCopy = (value: string, key: "coords" | "endpoint", label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(value);
    }
    setCopiedKey(key);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedKey(null), 1600);
  };

  const criticalCount = telemetry.hazards.filter((h) => h.severity === "critical").length;
  const isHealthy = criticalCount === 0 && activeHazards === 0;
  const statusLabel = criticalCount > 0 ? "Critical" : activeHazards > 0 ? "Degraded" : "Healthy";

  const lastPower = telemetry.power[telemetry.power.length - 1];
  const lastSoil = telemetry.soil[telemetry.soil.length - 1];
  const ndviVal = telemetry.layers.NDVI?.value ?? 0.65;

  const estTempC =
    Math.round(
      (telemetry.hazardSignals.minTempC + Math.max(2, telemetry.hazardSignals.canopyDeltaC + 4)) *
        10,
    ) / 10;
  const soilMoistPct =
    lastSoil?.sm0_5 != null
      ? (lastSoil.sm0_5 <= 1 ? lastSoil.sm0_5 * 100 : lastSoil.sm0_5).toFixed(1)
      : "34.2";
  const humidityPct = telemetry.hazardSignals.rh2m;
  const windMs = telemetry.hazardSignals.ws2m;
  const solarPar = lastPower?.PAR ?? 420;

  const syncTimeStr = liveStatus?.timestamp
    ? new Date(liveStatus.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Deterministic";

  const feedSummary = liveStatus?.isLive
    ? `${liveStatus.activeFeeds.length} Live APIs`
    : "Standby Baseline";

  return (
    <div className="space-y-5">
      {/* 2-Column Console Overview Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-stretch">
        {/* LEFT COLUMN: Active Project/Farm Header + Copyable Endpoint + 2x3 Metric Cards */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          {/* Active Field Header Card */}
          <div className="rounded-lg border border-white/[0.08] bg-[#1c1c1c] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#3ecf8e]" />
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[#8b8b8b]">
                    Active Field Node
                  </span>
                </div>
                <h2 className="mt-1 truncate text-lg font-semibold tracking-tight text-[#ededed]">
                  {telemetry.meta.regionLabel}
                </h2>
                <p className="mt-0.5 text-xs text-[#8b8b8b]">
                  {telemetry.meta.climateZone} · Elevation {telemetry.meta.elevationM}m ·{" "}
                  <span className="font-mono text-[#ededed]">{scenario}</span>
                </p>
              </div>

              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px] font-medium",
                  isHealthy
                    ? "border-[#3ecf8e]/30 bg-[#3ecf8e]/10 text-[#3ecf8e]"
                    : criticalCount > 0
                      ? "border-red-500/35 bg-red-500/10 text-red-400"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-400",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    isHealthy
                      ? "bg-[#3ecf8e]"
                      : criticalCount > 0
                        ? "bg-red-400 animate-pulse"
                        : "bg-amber-400 animate-pulse",
                  )}
                />
                {statusLabel}
              </span>
            </div>

            {/* Copyable Coordinates & Endpoint Badges */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-2 rounded-md border border-white/[0.08] bg-[#141414] px-2.5 py-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8b8b8b] shrink-0">
                    COORDS
                  </span>
                  <code className="truncate font-mono text-xs text-[#ededed]">{coordString}</code>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(coordString, "coords", "Coordinates")}
                  aria-label="Copy coordinates"
                  className="inline-flex h-6 items-center gap-1 rounded border border-white/[0.08] bg-[#1c1c1c] px-2 font-mono text-[11px] text-[#8b8b8b] hover:border-white/[0.18] hover:text-[#ededed] transition-colors cursor-pointer shrink-0"
                >
                  {copiedKey === "coords" ? (
                    <>
                      <Check className="size-3 text-[#3ecf8e]" />
                      <span className="text-[#3ecf8e]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-md border border-white/[0.08] bg-[#141414] px-2.5 py-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8b8b8b] shrink-0">
                    API
                  </span>
                  <code className="truncate font-mono text-[11px] text-[#8b8b8b]">
                    {powerEndpoint}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(powerEndpoint, "endpoint", "NASA POWER endpoint")}
                  aria-label="Copy NASA POWER endpoint"
                  className="inline-flex h-6 items-center gap-1 rounded border border-white/[0.08] bg-[#1c1c1c] px-2 font-mono text-[11px] text-[#8b8b8b] hover:border-white/[0.18] hover:text-[#ededed] transition-colors cursor-pointer shrink-0"
                >
                  {copiedKey === "endpoint" ? (
                    <>
                      <Check className="size-3 text-[#3ecf8e]" />
                      <span className="text-[#3ecf8e]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Compact 2x3 Metric Card Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* 1. System Status with Emerald Dot Grid */}
            <div className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-[#1c1c1c] p-3.5 hover:border-white/[0.14] transition-colors">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-[#141414] text-[#3ecf8e]">
                <Activity className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium uppercase tracking-wider text-[#8b8b8b]">
                  System Status
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isHealthy ? "text-[#3ecf8e]" : "text-amber-400",
                    )}
                  >
                    {statusLabel}
                  </span>
                  <span
                    aria-hidden="true"
                    className="grid grid-cols-3 gap-0.5"
                    title="Telemetry sub-nodes"
                  >
                    {[0, 1, 2, 3, 4, 5].map((dot) => (
                      <span
                        key={dot}
                        className={cn(
                          "size-1.5 rounded-[1px]",
                          isHealthy ? "bg-[#3ecf8e]" : dot < 4 ? "bg-[#3ecf8e]" : "bg-amber-400",
                        )}
                      />
                    ))}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Active Satellite Feed */}
            <button
              type="button"
              onClick={() => onNavigateView("services")}
              className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-[#1c1c1c] p-3.5 text-left hover:border-white/[0.16] transition-colors cursor-pointer"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-[#141414] text-[#ededed]">
                <Satellite className="size-4 text-[#3ecf8e]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium uppercase tracking-wider text-[#8b8b8b]">
                  Satellite Feed
                </div>
                <div className="mt-0.5 truncate text-sm font-semibold text-[#ededed]">
                  {telemetry.meta.satellitePass}
                </div>
                <div className="truncate font-mono text-[10px] text-[#8b8b8b]">{feedSummary}</div>
              </div>
            </button>

            {/* 3. Current Coordinates / Region */}
            <button
              type="button"
              onClick={onOpenConnect}
              className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-[#1c1c1c] p-3.5 text-left hover:border-white/[0.16] transition-colors cursor-pointer"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-[#141414] text-[#ededed]">
                <MapPin className="size-4 text-[#8b8b8b]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium uppercase tracking-wider text-[#8b8b8b]">
                  Coordinates
                </div>
                <div className="mt-0.5 truncate font-mono text-xs font-semibold text-[#ededed]">
                  {lat.toFixed(4)}°, {lon.toFixed(4)}°
                </div>
                <div className="truncate font-mono text-[10px] text-[#8b8b8b]">
                  {telemetry.meta.climateZone}
                </div>
              </div>
            </button>

            {/* 4. Last Sync */}
            <div className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-[#1c1c1c] p-3.5 hover:border-white/[0.14] transition-colors">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-[#141414] text-[#ededed]">
                <Clock className="size-4 text-[#8b8b8b]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium uppercase tracking-wider text-[#8b8b8b]">
                  Last Sync
                </div>
                <div className="mt-0.5 truncate font-mono text-xs font-semibold text-[#ededed]">
                  {isLoadingLive ? "Syncing…" : syncTimeStr}
                </div>
                <div className="truncate font-mono text-[10px] text-[#8b8b8b]">
                  Next pass in {telemetry.meta.nextPassMin}m
                </div>
              </div>
            </div>

            {/* 5. Active Hazards */}
            <button
              type="button"
              onClick={() => onNavigateView("hazards")}
              className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-[#1c1c1c] p-3.5 text-left hover:border-white/[0.16] transition-colors cursor-pointer"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-[#141414]">
                <ShieldAlert
                  className={cn(
                    "size-4",
                    criticalCount > 0
                      ? "text-red-400"
                      : activeHazards > 0
                        ? "text-amber-400"
                        : "text-[#3ecf8e]",
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium uppercase tracking-wider text-[#8b8b8b]">
                  Active Hazards
                </div>
                <div
                  className={cn(
                    "mt-0.5 text-sm font-semibold",
                    criticalCount > 0
                      ? "text-red-400"
                      : activeHazards > 0
                        ? "text-amber-400"
                        : "text-[#ededed]",
                  )}
                >
                  {activeHazards === 0 ? "0 Critical" : `${activeHazards} Active`}
                </div>
                <div className="truncate font-mono text-[10px] text-[#8b8b8b]">
                  8 feeds monitored
                </div>
              </div>
            </button>

            {/* 6. Crop Health Index */}
            <button
              type="button"
              onClick={() => onNavigateView("weather-soil")}
              className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-[#1c1c1c] p-3.5 text-left hover:border-white/[0.16] transition-colors cursor-pointer"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-[#141414]">
                <Sprout className="size-4 text-[#3ecf8e]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium uppercase tracking-wider text-[#8b8b8b]">
                  Crop Health Index
                </div>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="font-mono text-sm font-semibold text-[#ededed]">
                    {telemetry.plantHealth.overall}/100
                  </span>
                  <span className="truncate text-[11px] text-[#3ecf8e]">{telemetry.crop.crop}</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Dotted-Grid Canvas Framing Live Station Node + Bottom Monospace Bar */}
        <div className="flex flex-col justify-between overflow-hidden rounded-lg border border-white/[0.08] studio-dot-grid lg:col-span-7 min-h-[380px]">
          {/* Canvas Top Action Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-[#171717]/85 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Radio className="size-3.5 text-[#3ecf8e]" />
              <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[#8b8b8b]">
                Telemetry Topology · {telemetry.meta.regionLabel.split(",")[0]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateView("satellite-map")}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-white/[0.12] bg-[#1c1c1c] px-2.5 text-xs font-medium text-[#ededed] hover:border-[#3ecf8e]/50 hover:text-[#3ecf8e] transition-colors cursor-pointer"
              >
                <Globe2 className="size-3.5 text-[#3ecf8e]" />
                <span>Open NASA GIBS Map</span>
                <ArrowUpRight className="size-3" />
              </button>
            </div>
          </div>

          {/* Centered Live Node / Station Card */}
          <div className="relative flex flex-1 items-center justify-center p-5 sm:p-8">
            <div className="w-full max-w-md rounded-xl border border-white/[0.1] bg-[#1c1c1c]/95 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.65)]">
              <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#3ecf8e] shadow-[0_0_8px_#3ecf8e]" />
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#3ecf8e]">
                      Station Online · Primary Node
                    </span>
                  </div>
                  <h3 className="mt-1 truncate text-base font-semibold text-[#ededed]">
                    {telemetry.meta.regionLabel}
                  </h3>
                </div>
                <span className="rounded border border-white/[0.08] bg-[#141414] px-2 py-0.5 font-mono text-[11px] text-[#8b8b8b]">
                  {telemetry.input.season}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-md border border-white/[0.06] bg-[#141414] p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-[#8b8b8b]">
                    NDVI Vigor
                  </div>
                  <div className="mt-0.5 font-mono text-sm font-semibold text-[#3ecf8e]">
                    {ndviVal.toFixed(2)} idx
                  </div>
                </div>
                <div className="rounded-md border border-white/[0.06] bg-[#141414] p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-[#8b8b8b]">
                    Target Crop
                  </div>
                  <div className="mt-0.5 truncate text-sm font-semibold text-[#ededed]">
                    {telemetry.crop.crop}
                  </div>
                </div>
                <div className="rounded-md border border-white/[0.06] bg-[#141414] p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-[#8b8b8b]">
                    Borewell Depth
                  </div>
                  <div className="mt-0.5 font-mono text-sm font-semibold text-[#ededed]">
                    {borewellDepth}m · {irrigation}
                  </div>
                </div>
                <div className="rounded-md border border-white/[0.06] bg-[#141414] p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-[#8b8b8b]">
                    Yield Forecast
                  </div>
                  <div className="mt-0.5 font-mono text-sm font-semibold text-[#ededed]">
                    {telemetry.crop.yieldTPerHa} t/ha
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigateView("satellite-map")}
                  className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#3ecf8e] px-3 text-xs font-semibold text-[#121212] hover:bg-[#24b47e] transition-colors cursor-pointer"
                >
                  <Globe2 className="size-3.5" />
                  <span>Inspect Map View</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateView("data-explorer")}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-white/[0.12] bg-[#141414] px-3 text-xs font-medium text-[#ededed] hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <Table2 className="size-3.5 text-[#8b8b8b]" />
                  <span>Data Explorer</span>
                </button>
              </div>
            </div>
          </div>

          {/* Clean Bottom Monospace Telemetry Bar */}
          <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-white/[0.08] bg-[#141414]/95 px-4 py-2.5 font-mono text-xs">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[#8b8b8b]">TEMP</span>
                <span className="font-semibold text-[#ededed]">{estTempC}°C</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Droplets className="size-3 text-[#3ecf8e]" />
                <span className="text-[#8b8b8b]">SOIL</span>
                <span className="font-semibold text-[#3ecf8e]">{soilMoistPct}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#8b8b8b]">RH2M</span>
                <span className="font-semibold text-[#ededed]">{humidityPct}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#8b8b8b]">WIND</span>
                <span className="font-semibold text-[#ededed]">{windMs} m/s</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#8b8b8b]">PAR</span>
                <span className="font-semibold text-amber-400">{solarPar} W/m²</span>
              </div>
            </div>
            <span className="text-[11px] text-[#8b8b8b]">NASA POWER · GIBS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
