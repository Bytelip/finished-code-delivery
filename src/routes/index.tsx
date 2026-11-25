import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Globe2, MapPin, Plug, RefreshCw, Satellite, Sliders } from "lucide-react";
import { GlobeContainer } from "@/components/agro/GlobeContainer";
import { ForecastAtmospherePanel } from "@/components/hud/ZoomEarthSidebar";
import type { BasemapStyle } from "@/components/map/MapLayerSwitcher";
import type { ZoomEarthLayerId } from "@/types/zoomEarthLayers";
import { AuthGate } from "@/components/auth/AuthGate";
import { CosmicAuthPage } from "@/components/CosmicAuthPage";
import { UserProfileModal } from "@/components/UserProfileModal";
import type { UserProfile } from "@/types/userProfile";
import {
  PlantHealthRadar,
  PowerChart,
  SoilMoistureChart,
  WaterBudgetChart,
} from "@/components/agro/TelemetryCharts";
import { CropEngineSlot } from "@/components/agro/CropEngineSlot";
import { FieldShiftCropAdvisor } from "@/components/agro/FieldShiftCropAdvisor";
import { PlantPillarList } from "@/components/agro/PlantPillarList";
import { generateTelemetry } from "@/services/mockNasaTelemetry";
import { fetchLiveTelemetry, type LiveApiStatus } from "@/services/nasaLiveApiService";
import { AgroDecisionCard } from "@/components/agro/AgroDecisionCard";
import { NasaMissionBriefModal } from "@/components/NasaMissionBriefModal";
import { FarmerAdvisoryModal } from "@/components/HazardAlertCenter";
import { GuidedTourOverlay, TOUR_STORAGE_KEY } from "@/components/tutorial/GuidedTourOverlay";
import {
  ConsoleTopBar,
  ConsoleSidebarRail,
  ConsoleOverviewView,
  ConsoleHazardsView,
  ConsoleServicesView,
  ConsoleDataExplorerView,
  ConsoleSettingsView,
  CommandPaletteModal,
  ConnectEndpointModal,
  ConsoleHelpModal,
  CONSOLE_NAV_ITEMS,
  mapConsoleViewToDashboardTab,
  type ConsoleView,
} from "@/components/console";
import {
  computeKoppenClimateZone,
  getStoredLocation,
  getUrlCoords,
  reverseGeocodeAndElevation,
  saveStoredLocation,
  syncUrlCoords,
} from "@/utils/preciseLocation";
import {
  type AgroTelemetry,
  type Irrigation,
  type MapLayer,
  type Scenario,
  type Season,
} from "@/types/agroSpace";
import { toast } from "sonner";

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
  component: AgroSpaceAppRoot,
});

function AgroSpaceAppRoot() {
  const [liveFlyTarget, setLiveFlyTarget] = useState<{
    lat: number;
    lon: number;
    label: string;
  } | null>(null);

  return (
    <AuthGate
      onLiveLocationAcquired={(lat, lon, label) => {
        setLiveFlyTarget({ lat, lon, label });
      }}
    >
      {({ user, onSignOut, onUpdateUser }) => (
        <AgroSpaceDashboard
          user={user}
          onSignOut={onSignOut}
          onUpdateUser={onUpdateUser}
          liveTarget={liveFlyTarget}
        />
      )}
    </AuthGate>
  );
}

interface AgroSpaceDashboardProps {
  user?: UserProfile | null;
  onSignOut?: () => void;
  onUpdateUser?: (u: UserProfile) => void;
  liveTarget?: { lat: number; lon: number; label: string } | null;
}

function AgroSpaceDashboard({
  user,
  onSignOut,
  onUpdateUser,
  liveTarget,
}: AgroSpaceDashboardProps) {
  const [activeView, setActiveView] = useState<ConsoleView>("overview");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const dashboardTab = mapConsoleViewToDashboardTab(activeView);

  // Global keyboard shortcuts: Ctrl/Cmd+K (Command Palette) & G -> <key> view navigation
  useEffect(() => {
    let awaitingChord = false;
    let chordTimer: number | undefined;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
        return;
      }

      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (awaitingChord) {
        awaitingChord = false;
        if (chordTimer) window.clearTimeout(chordTimer);
        const matched = CONSOLE_NAV_ITEMS.find((item) => item.chordKey === key);
        if (matched) {
          e.preventDefault();
          setActiveView(matched.id);
        }
        return;
      }

      if (key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        awaitingChord = true;
        chordTimer = window.setTimeout(() => {
          awaitingChord = false;
        }, 1200);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      if (chordTimer) window.clearTimeout(chordTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleMapInteraction = useCallback(() => {
    setMobileDrawerOpen(false);
  }, []);

  const handleRefreshTelemetry = useCallback(() => {
    setRefreshTick((t) => t + 1);
    toast.success("Syncing NASA POWER & GIBS streams…");
  }, []);

  const [lat, setLat] = useState(12.6622);
  const [lon, setLon] = useState(77.4503);
  const [borewellDepth, setBorewellDepth] = useState(60);
  const [irrigation, setIrrigation] = useState<Irrigation>("Borewell");
  const [season, setSeason] = useState<Season>("Kharif");
  const [scenario, setScenario] = useState<Scenario>("Nominal");
  const [activeLayer, setActiveLayer] = useState<MapLayer>("NDVI");
  const [mapBasemap, setMapBasemap] = useState<BasemapStyle>("satellite");
  const [opacity, setOpacity] = useState(70);

  const [locationMeta, setLocationMeta] = useState<{
    label: string;
    zone: string;
    elevationM: number;
  } | null>(null);

  const [operator, setOperator] = useState<UserProfile | null>(user ?? null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMissionBriefModal, setShowMissionBriefModal] = useState(false);
  const [showAdvisoryReportModal, setShowAdvisoryReportModal] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Auto-launch guided tutorial tour for first-time visitors / hackathon judges after 1200ms
  useEffect(() => {
    if (typeof window === "undefined") return;
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (user) {
      setOperator(user);
    }
  }, [user]);

  useEffect(() => {
    if (liveTarget) {
      setLocation(liveTarget.lat, liveTarget.lon, liveTarget.label);
    }
  }, [liveTarget]);

  // Synchronize initial location from URL query (?lat=...&lon=...) or localStorage
  useEffect(() => {
    const urlCoords = getUrlCoords();
    if (urlCoords) {
      setLat(urlCoords.lat);
      setLon(urlCoords.lon);
      const synZone = computeKoppenClimateZone(urlCoords.lat, urlCoords.lon);
      const stored = getStoredLocation();
      const existingFriendly =
        stored &&
        stored.label &&
        !stored.label.startsWith("Field ") &&
        Math.abs(stored.lat - urlCoords.lat) < 0.05 &&
        Math.abs(stored.lon - urlCoords.lon) < 0.05
          ? stored.label
          : null;
      setLocationMeta({
        label:
          existingFriendly ||
          `Field ${Math.abs(urlCoords.lat).toFixed(4)}°${urlCoords.lat >= 0 ? "N" : "S"}, ${Math.abs(urlCoords.lon).toFixed(4)}°${urlCoords.lon >= 0 ? "E" : "W"}`,
        zone: synZone,
        elevationM: 500,
      });
      saveStoredLocation(urlCoords.lat, urlCoords.lon, existingFriendly || undefined);
    } else {
      const stored = getStoredLocation();
      if (stored) {
        setLat(stored.lat);
        setLon(stored.lon);
        const synZone = computeKoppenClimateZone(stored.lat, stored.lon);
        setLocationMeta({
          label:
            stored.label ||
            `Field ${Math.abs(stored.lat).toFixed(4)}°${stored.lat >= 0 ? "N" : "S"}, ${Math.abs(stored.lon).toFixed(4)}°${stored.lon >= 0 ? "E" : "W"}`,
          zone: synZone,
          elevationM: 500,
        });
        syncUrlCoords(stored.lat, stored.lon);
      }
    }
  }, []);

  // Dynamic reverse-geocoding, elevation, and Köppen climate zone calculation on lat/lon changes
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      reverseGeocodeAndElevation(lat, lon, controller.signal)
        .then((res) => {
          if (!active) return;
          setLocationMeta((prev) => {
            // If reverseGeocodeAndElevation returned a raw "Field ..." fallback but we already have a friendly name, keep the friendly name
            if (prev?.label && !prev.label.startsWith("Field ") && res.label.startsWith("Field ")) {
              return {
                ...res,
                label: prev.label,
              };
            }
            return res;
          });
        })
        .catch(() => undefined);
    }, 400);
    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [lat, lon]);

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
    setLiveTelemetry(null);

    const timer = window.setTimeout(() => {
      fetchLiveTelemetry(
        { lat, lon, borewellDepth, season, scenario, irrigation },
        { signal: controller.signal, activeLayer, activeView: dashboardTab, lazyLayerOnly: true },
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
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    lat,
    lon,
    borewellDepth,
    season,
    scenario,
    irrigation,
    activeLayer,
    dashboardTab,
    refreshTick,
  ]);

  const baseTelemetry = liveTelemetry ?? fallbackTelemetry;

  // Augment telemetry with dynamic reverse-geocoded location, climate zone, and elevation
  const telemetry = useMemo(() => {
    if (!locationMeta) return baseTelemetry;
    return {
      ...baseTelemetry,
      meta: {
        ...baseTelemetry.meta,
        regionLabel: locationMeta.label || baseTelemetry.meta.regionLabel,
        climateZone: locationMeta.zone || baseTelemetry.meta.climateZone,
        elevationM: locationMeta.elevationM || baseTelemetry.meta.elevationM,
      },
    };
  }, [baseTelemetry, locationMeta]);

  const setLocation = (la: number, lo: number, label?: string) => {
    const fixedLat = Math.round(la * 10000) / 10000;
    const fixedLon = Math.round(lo * 10000) / 10000;
    const dLat = Math.abs(fixedLat - lat);
    const dLon = Math.abs(fixedLon - lon);
    const isSignificantMove = dLat > 0.05 || dLon > 0.05;

    setLat(fixedLat);
    setLon(fixedLon);
    const synZone = computeKoppenClimateZone(fixedLat, fixedLon);
    const rawCoordsFallback = `Field ${Math.abs(fixedLat).toFixed(4)}°${fixedLat >= 0 ? "N" : "S"}, ${Math.abs(fixedLon).toFixed(4)}°${fixedLon >= 0 ? "E" : "W"}`;

    setLocationMeta((prev) => {
      // 1. If explicit friendly label is passed (not starting with "Field "), always use it
      const isExplicitFriendly = Boolean(label && !label.startsWith("Field "));
      if (isExplicitFriendly && label) {
        return {
          label,
          zone: synZone,
          elevationM: prev?.elevationM ?? 500,
        };
      }
      // 2. If we already have a resolved friendly place name (not starting with "Field ")
      // and the coordinate shift is minor (<= 0.05 degrees ~ 5.5km), strictly keep the friendly name to prevent flickering!
      if (prev?.label && !prev.label.startsWith("Field ") && !isSignificantMove) {
        return {
          label: prev.label,
          zone: synZone,
          elevationM: prev?.elevationM ?? 500,
        };
      }
      return {
        label: label || rawCoordsFallback,
        zone: synZone,
        elevationM: prev?.elevationM ?? 500,
      };
    });
    saveStoredLocation(fixedLat, fixedLon, label);
    syncUrlCoords(fixedLat, fixedLon);
  };
  const handleSetConsoleLocation = (
    nextLat: number,
    nextLon: number,
    meta?: {
      name?: string | undefined;
      subtitle?: string | undefined;
      elevationM?: number | undefined;
      climateZone?: string | undefined;
    },
  ) => {
    setLocation(nextLat, nextLon, meta?.name);
    if (meta?.elevationM !== undefined || meta?.climateZone) {
      setLocationMeta((prev) => ({
        label:
          meta?.name ||
          prev?.label ||
          `Field ${Math.abs(nextLat).toFixed(4)}°${nextLat >= 0 ? "N" : "S"}, ${Math.abs(nextLon).toFixed(4)}°${nextLon >= 0 ? "E" : "W"}`,
        zone: meta?.climateZone ?? prev?.zone ?? computeKoppenClimateZone(nextLat, nextLon),
        elevationM: meta?.elevationM ?? prev?.elevationM ?? 500,
      }));
    }
  };

  const activeHazards = telemetry.hazards.filter(
    (h) => h.severity === "critical" || h.severity === "warning",
  ).length;

  return (
    <div className="studio-shell flex min-h-[100dvh] w-full max-w-full flex-col overflow-x-hidden bg-[#121212] text-[#ededed]">
      <h1 className="sr-only">
        AgroSpace Nexus — Precision Agriculture & Multi-Hazard Telemetry Console
      </h1>

      <ConsoleTopBar
        regionLabel={telemetry.meta.regionLabel}
        lat={lat}
        lon={lon}
        scenario={scenario}
        isLive={Boolean(liveStatus?.isLive)}
        isLoadingLive={isLoadingLive}
        activeHazards={activeHazards}
        user={operator}
        onToggleMobileDrawer={() => setMobileDrawerOpen((open) => !open)}
        onSelectPreset={(preset) => setLocation(preset.lat, preset.lon, preset.name)}
        onNavigateView={setActiveView}
        onOpenConnect={() => setConnectModalOpen(true)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenHelp={() => setHelpModalOpen(true)}
        onRefreshTelemetry={handleRefreshTelemetry}
        onOpenAccountSettings={() => {
          if (operator) setShowSettingsModal(true);
          else setShowAuthModal(true);
        }}
        onNavigateHome={(hLat, hLon, hLabel) => setLocation(hLat, hLon, hLabel)}
        onSignOut={() => {
          setOperator(null);
          onSignOut?.();
        }}
      />

      <div className="relative flex flex-1 min-h-0">
        <ConsoleSidebarRail
          activeView={activeView}
          onSelectView={setActiveView}
          activeHazards={activeHazards}
          isLive={Boolean(liveStatus?.isLive)}
          mobileOpen={mobileDrawerOpen}
          onCloseMobile={() => setMobileDrawerOpen(false)}
          onOpenConnect={() => setConnectModalOpen(true)}
          onRefreshTelemetry={handleRefreshTelemetry}
        />

        <main className="flex flex-1 min-w-0 flex-col pl-0 md:pl-[52px]">
          <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
            {activeView === "overview" && (
              <ConsoleOverviewView
                telemetry={telemetry}
                liveStatus={liveStatus}
                isLoadingLive={isLoadingLive}
                activeHazards={activeHazards}
                onNavigateView={setActiveView}
                onOpenConnect={() => setConnectModalOpen(true)}
              />
            )}

            {activeView === "satellite-map" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Globe2 className="size-4 text-[#3ecf8e]" />
                      <h2 className="text-lg font-semibold tracking-tight text-[#ededed]">
                        Satellite Map & Orbital Layers
                      </h2>
                      <span className="rounded border border-white/[0.1] bg-[#1c1c1c] px-2 py-0.5 font-mono text-[10px] text-[#3ecf8e]">
                        {activeLayer}
                      </span>
                    </div>
                    <p className="text-xs text-[#8b8b8b] mt-0.5">
                      Interactive MapLibre 3D orbital globe / flat map projection with NASA GIBS
                      WMTS overlays ({telemetry.meta.regionLabel}).
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-[#1c1c1c] px-2.5 py-1.5 font-mono text-[11px] text-[#8b8b8b]">
                      <MapPin className="size-3 text-[#3ecf8e]" />
                      {lat.toFixed(4)}, {lon.toFixed(4)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setConnectModalOpen(true)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.1] bg-[#1c1c1c] px-3 text-xs font-medium text-[#ededed] hover:bg-white/[0.06] cursor-pointer"
                    >
                      <Plug className="size-3.5 text-[#3ecf8e]" />
                      <span>Set Target</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRefreshTelemetry}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#3ecf8e] px-3 text-xs font-semibold text-[#121212] hover:bg-[#24b47e] cursor-pointer"
                    >
                      <RefreshCw className={isLoadingLive ? "size-3.5 animate-spin" : "size-3.5"} />
                      <span>Sync Layer</span>
                    </button>
                  </div>
                </div>

                <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.85fr)] xl:items-start">
                  <div className="min-w-0 rounded-lg border border-white/[0.08] bg-[#171717] overflow-hidden">
                    <GlobeContainer
                      telemetry={telemetry}
                      activeLayer={activeLayer}
                      onLayer={setActiveLayer}
                      opacity={opacity}
                      onOpacity={setOpacity}
                      onPick={setLocation}
                      onInteraction={handleMapInteraction}
                      activeBasemapStyle={mapBasemap}
                      onBasemapStyleChange={setMapBasemap}
                    />
                  </div>

                  <div className="grid min-w-0 content-start gap-4 xl:max-h-[min(820px,calc(100dvh-10rem))] xl:overflow-y-auto xl:pr-1 studio-scrollbar">
                    <div className="min-w-0 rounded-lg border border-white/[0.08] bg-[#1c1c1c] overflow-hidden">
                      <ForecastAtmospherePanel
                        coordinates={{ lat, lon }}
                        activeLayer={mapBasemap as ZoomEarthLayerId}
                        onLayerChange={(layer) => setMapBasemap(layer as BasemapStyle)}
                      />
                    </div>
                    <div className="min-w-0" data-tour="crop-decision-engine">
                      <AgroDecisionCard
                        telemetry={telemetry}
                        onExportReport={() => setShowAdvisoryReportModal(true)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeView === "weather-soil" && (
              <div className="space-y-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-4">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-[#ededed]">
                      Weather, Soil & Crop Hydrology
                    </h2>
                    <p className="text-xs text-[#8b8b8b]">
                      NASA POWER climatology, multi-depth SMAP soil moisture ({borewellDepth}m
                      borewell reach), and crop rotation intelligence.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveView("settings")}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.1] bg-[#1c1c1c] px-3 text-xs font-medium text-[#ededed] hover:bg-white/[0.06] cursor-pointer"
                    >
                      <Sliders className="size-3.5 text-[#3ecf8e]" />
                      <span>Simulation Inputs</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAdvisoryReportModal(true)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#3ecf8e] px-3 text-xs font-semibold text-[#121212] hover:bg-[#24b47e] cursor-pointer"
                    >
                      <span>Export Bulletin</span>
                    </button>
                  </div>
                </div>

                <div className="grid min-w-0 gap-4 md:grid-cols-2">
                  <PowerChart data={telemetry.power} />
                  <SoilMoistureChart data={telemetry.soil} depth={telemetry.input.borewellDepth} />
                  <WaterBudgetChart data={telemetry.waterBudget} crop={telemetry.crop.crop} />
                  <PlantHealthRadar health={telemetry.plantHealth} />
                </div>

                <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                  <PlantPillarList health={telemetry.plantHealth} />
                  <AgroDecisionCard
                    telemetry={telemetry}
                    onExportReport={() => setShowAdvisoryReportModal(true)}
                  />
                </div>

                <CropEngineSlot crop={telemetry.crop} />
                <FieldShiftCropAdvisor telemetry={telemetry} />
              </div>
            )}

            {activeView === "hazards" && (
              <ConsoleHazardsView
                telemetry={telemetry}
                isLoadingLive={isLoadingLive}
                onRefresh={handleRefreshTelemetry}
                onExportAdvisory={() => setShowAdvisoryReportModal(true)}
              />
            )}

            {activeView === "data-explorer" && (
              <ConsoleDataExplorerView
                telemetry={telemetry}
                liveStatus={liveStatus}
                onRefresh={handleRefreshTelemetry}
              />
            )}

            {activeView === "services" && (
              <ConsoleServicesView
                telemetry={telemetry}
                liveStatus={liveStatus}
                isLoadingLive={isLoadingLive}
                onRefresh={handleRefreshTelemetry}
                onOpenConnect={() => setConnectModalOpen(true)}
              />
            )}

            {activeView === "settings" && (
              <ConsoleSettingsView
                lat={lat}
                lon={lon}
                regionLabel={telemetry.meta.regionLabel}
                elevationM={telemetry.meta.elevationM}
                climateZone={telemetry.meta.climateZone}
                borewellDepth={borewellDepth}
                irrigation={irrigation}
                season={season}
                scenario={scenario}
                user={operator}
                onSetLocation={handleSetConsoleLocation}
                onBorewellDepthChange={setBorewellDepth}
                onIrrigationChange={setIrrigation}
                onSeasonChange={setSeason}
                onScenarioChange={setScenario}
                onOpenProfileModal={() => {
                  if (operator) setShowSettingsModal(true);
                  else setShowAuthModal(true);
                }}
                onOpenMissionBrief={() => setShowMissionBriefModal(true)}
                onOpenTour={() => setShowTour(true)}
                onSignOut={() => {
                  setOperator(null);
                  onSignOut?.();
                }}
              />
            )}
          </div>

          {/* Slim Console Status Footer */}
          <footer className="mt-auto border-t border-white/[0.08] bg-[#171717] px-4 py-3 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start justify-between gap-2 text-[11px] font-mono text-[#8b8b8b] sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 text-[#ededed]">
                  <span className="size-1.5 rounded-full bg-[#3ecf8e]" />
                  AGROSPACE NEXUS CONSOLE
                </span>
                <span className="text-white/20">•</span>
                <span>NASA POWER + GIBS EO-OPS</span>
                <span className="text-white/20">•</span>
                <span>
                  {lat.toFixed(4)}, {lon.toFixed(4)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => setActiveView("overview")}
                  className="hover:text-[#ededed] transition-colors cursor-pointer"
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("satellite-map")}
                  className="hover:text-[#ededed] transition-colors cursor-pointer"
                >
                  Satellite Map
                </button>
                <button
                  type="button"
                  onClick={() => setShowMissionBriefModal(true)}
                  className="inline-flex items-center gap-1 hover:text-[#3ecf8e] transition-colors cursor-pointer"
                >
                  <Satellite className="size-3" />
                  <span>Mission Brief</span>
                </button>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Console Command Palette, Endpoint Connect & Shortcuts Help */}
      <CommandPaletteModal
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigateView={setActiveView}
        onSelectPreset={(preset) => setLocation(preset.lat, preset.lon, preset.name)}
        onSelectPlace={handleSetConsoleLocation}
        onRefreshTelemetry={handleRefreshTelemetry}
        onOpenConnect={() => setConnectModalOpen(true)}
        onOpenMissionBrief={() => setShowMissionBriefModal(true)}
      />

      <ConnectEndpointModal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        lat={lat}
        lon={lon}
        borewellDepth={borewellDepth}
        irrigation={irrigation}
        season={season}
        scenario={scenario}
        onSetLocation={handleSetConsoleLocation}
        onBorewellDepthChange={setBorewellDepth}
        onIrrigationChange={setIrrigation}
        onSeasonChange={setSeason}
        onScenarioChange={setScenario}
      />

      <ConsoleHelpModal
        open={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        onOpenMissionBrief={() => setShowMissionBriefModal(true)}
        onStartTour={() => setShowTour(true)}
      />

      {/* Auth Modal Overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <CosmicAuthPage
            onSuccess={(u) => {
              setOperator(u);
              setShowAuthModal(false);
            }}
            onClose={() => setShowAuthModal(false)}
          />
        </div>
      )}

      {/* User Profile & Account Settings Modal */}
      {showSettingsModal && operator && (
        <UserProfileModal
          profile={operator}
          currentLat={lat}
          currentLon={lon}
          onSave={(updated) => {
            setOperator(updated);
            onUpdateUser?.(updated);
          }}
          onSignOut={() => {
            setOperator(null);
            setShowSettingsModal(false);
            onSignOut?.();
          }}
          onNavigateHome={(hLat, hLon, hLabel) => {
            setLocation(hLat, hLon, hLabel);
          }}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* NASA Space Apps Mission Brief Modal */}
      <NasaMissionBriefModal
        isOpen={showMissionBriefModal}
        onClose={() => setShowMissionBriefModal(false)}
        onStartTour={() => setShowTour(true)}
      />

      {/* 1-Click Printable NASA Field Report / Farmer Advisory Modal */}
      {showAdvisoryReportModal && (
        <FarmerAdvisoryModal
          telemetry={telemetry}
          tacticalHazards={[]}
          checkedSteps={{}}
          onClose={() => setShowAdvisoryReportModal(false)}
        />
      )}

      {/* Interactive Spotlight Guided Tour Overlay */}
      <GuidedTourOverlay
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        onRecenterGlobe={() => setLocation(lat, lon, telemetry.meta.regionLabel)}
      />
    </div>
  );
}
