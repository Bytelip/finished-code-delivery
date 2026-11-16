import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Radio, Satellite, RefreshCw, UserCheck } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { DashboardSidebar, TABS } from "@/components/agro/DashboardSidebar";
import { CommandBar } from "@/components/agro/CommandBar";
import { GlobeContainer } from "@/components/agro/GlobeContainer";
import { AuthGate } from "@/components/auth/AuthGate";
import { CosmicAuthPage, getStoredUser, saveStoredUser } from "@/components/CosmicAuthPage";
import { UserProfileModal } from "@/components/UserProfileModal";
import {
  clearStoredProfile,
  loadStoredProfile,
  saveStoredProfile,
  type UserProfile,
} from "@/types/userProfile";
import { processIncomingAuthCallback, signOutUser } from "@/services/authService";
import { toast } from "sonner";
import {
  PlantHealthRadar,
  PowerChart,
  SoilMoistureChart,
  WaterBudgetChart,
} from "@/components/agro/TelemetryCharts";
import { HazardMatrixSlot } from "@/components/agro/HazardMatrixSlot";
import { CropEngineSlot } from "@/components/agro/CropEngineSlot";
import { FieldShiftCropAdvisor } from "@/components/agro/FieldShiftCropAdvisor";
import { GranuleInspector } from "@/components/agro/GranuleInspector";
import { PlantPillarList } from "@/components/agro/PlantPillarList";
import { SeverityChip } from "@/components/agro/hud";
import { generateTelemetry } from "@/services/mockNasaTelemetry";
import { fetchLiveTelemetry, type LiveApiStatus } from "@/services/nasaLiveApiService";
import { AgroDecisionCard } from "@/components/agro/AgroDecisionCard";
import { NasaMissionBriefModal } from "@/components/NasaMissionBriefModal";
import { FarmerAdvisoryModal } from "@/components/HazardAlertCenter";
import { GuidedTourOverlay, TOUR_STORAGE_KEY } from "@/components/tutorial/GuidedTourOverlay";
import { VibeCosmicBackground } from "@/components/ui/VibeCosmicBackground";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import {
  computeKoppenClimateZone,
  getStoredLocation,
  getUrlCoords,
  reverseGeocodeAndElevation,
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
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [tab, setTab] = useState<DashboardTab>("overview");

  // Keyboard shortcut listener for Tab or H (Toggle Orbital Dock)
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Tab" || e.key.toLowerCase() === "h") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleMapInteraction = useCallback(() => {
    if (!isPinned) {
      setCollapsed(true);
    }
  }, [isPinned]);

  const [lat, setLat] = useState(13.13);
  const [lon, setLon] = useState(78.13);
  const [borewellDepth, setBorewellDepth] = useState(60);
  const [irrigation, setIrrigation] = useState<Irrigation>("Borewell");
  const [season, setSeason] = useState<Season>("Kharif");
  const [scenario, setScenario] = useState<Scenario>("Nominal");
  const [activeLayer, setActiveLayer] = useState<MapLayer>("NDVI");
  const [opacity, setOpacity] = useState(70);

  const [locationMeta, setLocationMeta] = useState<{
    label: string;
    zone: string;
    elevationM: number;
  } | null>(null);

  const [operator, setOperator] = useState<UserProfile | null>(
    () => user || getStoredUser() || loadStoredProfile(),
  );
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMissionBriefModal, setShowMissionBriefModal] = useState(false);
  const [showAdvisoryReportModal, setShowAdvisoryReportModal] = useState(false);
  const [advisoryLanguage, setAdvisoryLanguage] = useState<"en" | "hi" | "kn">("en");
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

  useEffect(() => {
    // Also process any returning OAuth redirect sessions
    processIncomingAuthCallback().then((u) => {
      if (u) {
        setOperator(u);
        saveStoredProfile(u);
      }
    });
  }, []);

  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile]);

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
    reverseGeocodeAndElevation(lat, lon).then((res) => {
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
    });
    return () => {
      active = false;
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
  const activeHazards = telemetry.hazards.filter(
    (h) => h.severity === "critical" || h.severity === "warning",
  ).length;
  const tabLabel = TABS.find((t) => t.id === tab)?.label;

  return (
    <div className="flex min-h-screen relative">
      {/* GitHub + Linear + DeepMind GPU-Accelerated Cosmic Background */}
      <VibeCosmicBackground />

      <DashboardSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        isPinned={isPinned}
        onTogglePin={() => setIsPinned((p) => !p)}
        tab={tab}
        onTab={setTab}
        lat={lat}
        lon={lon}
        onPreset={(p) => setLocation(p.lat, p.lon, p.name)}
        activeHazards={activeHazards}
        operator={operator}
        onOpenAuth={() => (operator ? setShowSettingsModal(true) : setShowAuthModal(true))}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      <main className="min-w-0 flex-1 overflow-x-hidden">
        <CommandBar
          lat={lat}
          lon={lon}
          borewellDepth={borewellDepth}
          irrigation={irrigation}
          season={season}
          scenario={scenario}
          locationLabel={telemetry.meta.regionLabel}
          onLocation={setLocation}
          onDepth={setBorewellDepth}
          onIrrigation={setIrrigation}
          onSeason={setSeason}
          onScenario={setScenario}
          profile={operator}
          onOpenAuth={() => setShowAuthModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenMissionBrief={() => setShowMissionBriefModal(true)}
          onNavigateHome={(hLat, hLon, hLabel) => setLocation(hLat, hLon, hLabel)}
          onUpdateUser={(updated) => {
            setOperator(updated);
            saveStoredUser(updated);
            saveStoredProfile(updated);
            onUpdateUser?.(updated);
          }}
          onSignOut={async () => {
            await signOutUser();
            setOperator(null);
            onSignOut?.();
          }}
          onToggleSidebar={() => setCollapsed((c) => !c)}
          sidebarCollapsed={collapsed}
          plantHealthOverall={telemetry.plantHealth.overall}
          elevationM={telemetry.meta.elevationM}
          onOpenTour={() => setShowTour(true)}
        />

        <div className="mx-auto w-full max-w-[2200px] space-y-2.5 p-2 sm:p-3 lg:p-4 pl-18 sm:pl-20 xl:pl-24">
          <GlobeContainer
            telemetry={telemetry}
            activeLayer={activeLayer}
            onLayer={setActiveLayer}
            opacity={opacity}
            onOpacity={setOpacity}
            onPick={setLocation}
            onInteraction={handleMapInteraction}
          />

          {/* AI Agronomic & Climate Decision Card */}
          <div className="antigravity-float-3" data-tour="crop-decision-engine">
            <AgroDecisionCard
              telemetry={telemetry}
              onExportReport={() => setShowAdvisoryReportModal(true)}
            />
          </div>

          {tab === "overview" && (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="antigravity-float-2">
                  <SpotlightCard className="p-0 border-white/10 bg-transparent">
                    <PowerChart data={telemetry.power} />
                  </SpotlightCard>
                </div>
                <div className="antigravity-float-3">
                  <SpotlightCard className="p-0 border-white/10 bg-transparent">
                    <SoilMoistureChart
                      data={telemetry.soil}
                      depth={telemetry.input.borewellDepth}
                    />
                  </SpotlightCard>
                </div>
                <div className="antigravity-float-1">
                  <SpotlightCard className="p-0 border-white/10 bg-transparent">
                    <PlantHealthRadar health={telemetry.plantHealth} />
                  </SpotlightCard>
                </div>
                <div className="antigravity-float-2">
                  <SpotlightCard className="p-0 border-white/10 bg-transparent">
                    <WaterBudgetChart data={telemetry.waterBudget} crop={telemetry.crop.crop} />
                  </SpotlightCard>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="antigravity-float-3">
                  <SpotlightCard className="p-0 border-white/10 bg-transparent">
                    <HazardMatrixSlot
                      hazards={telemetry.hazards}
                      telemetry={telemetry}
                      variant="summary"
                    />
                  </SpotlightCard>
                </div>
                <div className="antigravity-float-1">
                  <SpotlightCard className="p-0 border-white/10 bg-transparent">
                    <CropEngineSlot crop={telemetry.crop} />
                  </SpotlightCard>
                </div>
              </div>
              <div className="antigravity-float-2">
                <SpotlightCard className="p-0 border-white/10 bg-transparent">
                  <FieldShiftCropAdvisor telemetry={telemetry} />
                </SpotlightCard>
              </div>
            </>
          )}

          {tab === "crop-atlas" && (
            <div className="antigravity-float-1">
              <FieldShiftCropAdvisor telemetry={telemetry} />
            </div>
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
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <SoilMoistureChart data={telemetry.soil} depth={telemetry.input.borewellDepth} />
                <WaterBudgetChart data={telemetry.waterBudget} crop={telemetry.crop.crop} />
                <div className="lg:col-span-2">
                  <CropEngineSlot crop={telemetry.crop} />
                </div>
              </div>
              <div className="antigravity-float-2">
                <FieldShiftCropAdvisor telemetry={telemetry} />
              </div>
            </div>
          )}

          {tab === "hazards" && (
            <HazardMatrixSlot hazards={telemetry.hazards} telemetry={telemetry} variant="full" />
          )}

          {tab === "granules" && <GranuleInspector telemetry={telemetry} />}

          {/* Live Telemetry Bottom Mission Tape (Google Stitch) */}
          <div className="w-full rounded-xl bg-[#0b0f19]/75 border border-white/10 backdrop-blur-md p-3 flex flex-wrap items-center justify-between gap-3 text-muted-foreground font-mono text-[11px] mt-6 shadow-xl">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-cyan-400 font-bold uppercase tracking-wider">
                TELEMETRY STREAM:
              </span>
              <span className="text-foreground/90">SENTINEL-1 C-SAR PASS: 41.2° INCLINATION</span>
              <span className="hidden md:inline text-white/30">•</span>
              <span className="hidden md:inline text-foreground/80">
                LANDSAT-9 OLI-2 / TIRS-2 THERMAL CALIBRATION: NOMINAL [0.03K DELTA]
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
              <span className="text-white font-semibold">NASA-LANCE AG-INTEL READY</span>
            </div>
          </div>

          {/* Observatory Mission Footer (Google Stitch) */}
          <footer className="w-full rounded-2xl bg-[#0b0f19]/80 border border-white/5 backdrop-blur-xl p-4 mt-3 flex flex-col md:flex-row items-center justify-between gap-3 text-muted-foreground font-mono text-[10.5px]">
            <div>AGROSPACE NEXUS • NASA EARTH OBSERVATION MISSION SYSTEM • EO-OPS-CORE-V4.9</div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setTab("overview")}
                className="hover:text-cyan-400 transition-colors cursor-pointer"
              >
                GLOBAL OBSERVATORY
              </button>
              <button
                type="button"
                onClick={() => setTab("crop-atlas")}
                className="hover:text-cyan-400 transition-colors cursor-pointer"
              >
                CROP SHIFT
              </button>
              <button
                type="button"
                onClick={() => setShowMissionBriefModal(true)}
                className="hover:text-cyan-400 transition-colors cursor-pointer"
              >
                MISSION BRIEF
              </button>
              <span className="text-emerald-400 font-semibold">• ALL ORBITAL FEEDS NOMINAL</span>
            </div>
          </footer>
        </div>
      </main>

      {/* Cosmic Parallax Auth Modal Overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <CosmicAuthPage
            onSuccess={(u) => {
              setOperator(u);
              saveStoredProfile(u);
              setShowAuthModal(false);
              toast.success(`Welcome, ${u.fullName}`, {
                description: `Authenticated via ${u.provider}. Clearance Level: ${u.role}.`,
              });
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
            saveStoredProfile(updated);
            saveStoredUser(updated);
            onUpdateUser?.(updated);
          }}
          onSignOut={async () => {
            await signOutUser();
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
          language={advisoryLanguage}
          onLanguageChange={setAdvisoryLanguage}
          onClose={() => setShowAdvisoryReportModal(false)}
        />
      )}

      {/* Interactive Vision-OS Spotlight Guided Tour Overlay */}
      <GuidedTourOverlay
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        onRecenterGlobe={() => setLocation(lat, lon, telemetry.meta.regionLabel)}
      />
    </div>
  );
}
