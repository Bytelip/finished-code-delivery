import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, Radio, Satellite, RefreshCw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { DashboardSidebar, TABS } from "@/components/agro/DashboardSidebar";
import { CommandBar } from "@/components/agro/CommandBar";
import { GlobeContainer } from "@/components/agro/GlobeContainer";
import {
  PlantHealthRadar,
  PowerChart,
  SoilMoistureChart,
  WaterBudgetChart,
} from "@/components/agro/TelemetryCharts";
import { HazardMatrixSlot } from "@/components/agro/HazardMatrixSlot";
import { CropEngineSlot } from "@/components/agro/CropEngineSlot";
import { GranuleInspector } from "@/components/agro/GranuleInspector";
import { PlantPillarList } from "@/components/agro/PlantPillarList";
import { SeverityChip } from "@/components/agro/hud";
import { generateTelemetry } from "@/services/mockNasaTelemetry";
import { fetchLiveTelemetry, type LiveApiStatus } from "@/services/nasaLiveApiService";
import {
  getStoredLocation,
  getUrlCoords,
  saveStoredLocation,
  syncUrlCoords,
} from "@/utils/preciseLocation";
import type {
  AgroTelemetry,
  DashboardTab,
  Irrigation,
  MapLayer,
  Scenario,
  Season,
} from "@/types/agroSpace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgroSpace Nexus — Precision Agriculture & Multi-Hazard HUD" },
      {
        name: "description",
        content:
          "Satellite-powered farm HUD: plant health, soil moisture, groundwater, crop water budgets and 8 hazard alerts for any field on Earth.",
      },
      { property: "og:title", content: "AgroSpace Nexus — Precision Agriculture HUD" },
      {
        property: "og:description",
        content:
          "NASA-style telemetry for plant health, groundwater, crops and multi-hazard alerts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgroSpaceDashboard,
});

function AgroSpaceDashboard() {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<DashboardTab>("overview");

  const [lat, setLat] = useState(13.13);
  const [lon, setLon] = useState(78.13);
  const [borewellDepth, setBorewellDepth] = useState(60);
  const [irrigation, setIrrigation] = useState<Irrigation>("Borewell");
  const [season, setSeason] = useState<Season>("Kharif");
  const [scenario, setScenario] = useState<Scenario>("Nominal");
  const [activeLayer, setActiveLayer] = useState<MapLayer>("NDVI");
  const [opacity, setOpacity] = useState(70);

  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile]);

  // Synchronize initial location from URL query (?lat=...&lon=...) or localStorage
  useEffect(() => {
    const urlCoords = getUrlCoords();
    if (urlCoords) {
      setLat(urlCoords.lat);
      setLon(urlCoords.lon);
      saveStoredLocation(urlCoords.lat, urlCoords.lon);
    } else {
      const stored = getStoredLocation();
      if (stored) {
        setLat(stored.lat);
        setLon(stored.lon);
        syncUrlCoords(stored.lat, stored.lon);
      }
    }
  }, []);

  const fallbackTelemetry = useMemo(
    () => generateTelemetry({ lat, lon, borewellDepth, season, scenario, irrigation }),
    [lat, lon, borewellDepth, season, scenario, irrigation],
  );

  const [liveTelemetry, setLiveTelemetry] = useState<AgroTelemetry | null>(null);
  const [liveStatus, setLiveStatus] = useState<LiveApiStatus | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setIsLoadingLive(true);

    fetchLiveTelemetry(
      { lat, lon, borewellDepth, season, scenario, irrigation },
      { signal: controller.signal },
    )
      .then((res) => {
        if (!active) return;
        setLiveTelemetry(res.telemetry);
        setLiveStatus(res.status);
        setIsLoadingLive(false);
      })
      .catch(() => {
        if (!active) return;
        setLiveTelemetry(null);
        setIsLoadingLive(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [lat, lon, borewellDepth, season, scenario, irrigation]);

  const telemetry = liveTelemetry ?? fallbackTelemetry;

  const setLocation = (la: number, lo: number, label?: string) => {
    const fixedLat = Math.round(la * 10000) / 10000;
    const fixedLon = Math.round(lo * 10000) / 10000;
    setLat(fixedLat);
    setLon(fixedLon);
    saveStoredLocation(fixedLat, fixedLon, label);
    syncUrlCoords(fixedLat, fixedLon);
  };
  const activeHazards = telemetry.hazards.filter(
    (h) => h.severity === "critical" || h.severity === "warning",
  ).length;
  const tabLabel = TABS.find((t) => t.id === tab)?.label;

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        tab={tab}
        onTab={setTab}
        lat={lat}
        lon={lon}
        onPreset={(p) => setLocation(p.lat, p.lon, p.name)}
        activeHazards={activeHazards}
      />

      <main className="min-w-0 flex-1">
        <CommandBar
          lat={lat}
          lon={lon}
          borewellDepth={borewellDepth}
          irrigation={irrigation}
          season={season}
          scenario={scenario}
          onLocation={setLocation}
          onDepth={setBorewellDepth}
          onIrrigation={setIrrigation}
          onSeason={setSeason}
          onScenario={setScenario}
        />

        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="hud-label">{tabLabel}</div>
                {liveStatus?.isLive ? (
                  <span className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] text-emerald">
                    <Radio className="size-2.5 animate-pulse text-emerald" /> LIVE SATELLITE (
                    {liveStatus.activeFeeds.length}/9 FEEDS)
                  </span>
                ) : isLoadingLive ? (
                  <span className="inline-flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[9px] text-cyan">
                    <RefreshCw className="size-2.5 animate-spin text-cyan" /> SYNCING LIVE
                    TELEMETRY...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded border border-muted/50 bg-muted/30 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                    <Satellite className="size-2.5 text-muted-foreground" /> MOCK FALLBACK (OFFLINE)
                  </span>
                )}
              </div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">
                {telemetry.meta.regionLabel}
              </h1>
              <p className="font-mono text-[11px] text-muted-foreground">
                {telemetry.meta.climateZone} · {season} · {irrigation}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="hud-label">Field Health</div>
                <div className="font-mono text-2xl font-semibold tabular-nums text-emerald">
                  {telemetry.plantHealth.overall}
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
              </div>
              <SeverityChip severity={telemetry.plantHealth.status} />
              {scenario !== "Nominal" && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-crimson/50 bg-crimson/10 px-2.5 py-1 font-mono text-[11px] text-crimson">
                  <Activity className="size-3.5" /> SIM · {scenario}
                </span>
              )}
            </div>
          </div>

          <GlobeContainer
            telemetry={telemetry}
            activeLayer={activeLayer}
            onLayer={setActiveLayer}
            opacity={opacity}
            onOpacity={setOpacity}
            onPick={setLocation}
          />

          {tab === "overview" && (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <PowerChart data={telemetry.power} />
                <SoilMoistureChart data={telemetry.soil} depth={telemetry.input.borewellDepth} />
                <PlantHealthRadar health={telemetry.plantHealth} />
                <WaterBudgetChart data={telemetry.waterBudget} crop={telemetry.crop.crop} />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <HazardMatrixSlot
                  hazards={telemetry.hazards}
                  telemetry={telemetry}
                  variant="summary"
                />
                <CropEngineSlot crop={telemetry.crop} />
              </div>
            </>
          )}

          {tab === "plant-health" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <PlantHealthRadar health={telemetry.plantHealth} tall />
              <PlantPillarList health={telemetry.plantHealth} />
              <div className="lg:col-span-2">
                <PowerChart data={telemetry.power} />
              </div>
            </div>
          )}

          {tab === "groundwater" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <SoilMoistureChart data={telemetry.soil} depth={telemetry.input.borewellDepth} />
              <WaterBudgetChart data={telemetry.waterBudget} crop={telemetry.crop.crop} />
              <div className="lg:col-span-2">
                <CropEngineSlot crop={telemetry.crop} />
              </div>
            </div>
          )}

          {tab === "hazards" && (
            <HazardMatrixSlot hazards={telemetry.hazards} telemetry={telemetry} variant="full" />
          )}

          {tab === "granules" && <GranuleInspector telemetry={telemetry} />}
        </div>
      </main>
    </div>
  );
}
