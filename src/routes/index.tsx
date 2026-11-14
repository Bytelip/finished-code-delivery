import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, Radio, Satellite, RefreshCw, UserCheck } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { DashboardSidebar, TABS } from "@/components/agro/DashboardSidebar";
import { CommandBar } from "@/components/agro/CommandBar";
import { GlobeContainer } from "@/components/agro/GlobeContainer";
import { OrbitalCockpitVisor } from "@/components/cockpit/OrbitalCockpitVisor";
import {
  CosmicAuthPage,
  UserProfileNavbarWidget,
  getStoredUser,
  saveStoredUser,
} from "@/components/CosmicAuthPage";
import { UserProfileModal } from "@/components/UserProfileModal";
import { OperatorProfileDropdown } from "@/components/OperatorProfileDropdown";
import {
  clearStoredProfile,
  loadStoredProfile,
  saveStoredProfile,
  type UserProfile,
} from "@/types/userProfile";
import { processIncomingAuthCallback } from "@/services/authService";
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

  const [locationMeta, setLocationMeta] = useState<{
    label: string;
    zone: string;
    elevationM: number;
  } | null>(null);

  const [operator, setOperator] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMissionBriefModal, setShowMissionBriefModal] = useState(false);
  const [showAdvisoryReportModal, setShowAdvisoryReportModal] = useState(false);
  const [advisoryLanguage, setAdvisoryLanguage] = useState<"en" | "hi" | "kn">("en");

  const [cockpitHudActive, setCockpitHudActive] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("agro_cockpit_hud") !== "false";
  });

  const toggleCockpitHud = () => {
    setCockpitHudActive((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("agro_cockpit_hud", String(next));
      }
      toast.info(next ? "Cockpit HUD Visor Online" : "Cockpit HUD Visor Offline", {
        description: next
          ? "Zero-G orbital frame, telemetry reticles, and targeting active."
          : "Minimal clean view active.",
      });
      return next;
    });
  };

  useEffect(() => {
    const stored = getStoredUser() || loadStoredProfile();
    if (stored) setOperator(stored);

    // Also process any returning OAuth redirect sessions
    processIncomingAuthCallback().then((user) => {
      if (user) {
        setOperator(user);
        saveStoredProfile(user);
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
      setLocationMeta({
        label: `Field ${Math.abs(urlCoords.lat).toFixed(4)}°${urlCoords.lat >= 0 ? "N" : "S"}, ${Math.abs(urlCoords.lon).toFixed(4)}°${urlCoords.lon >= 0 ? "E" : "W"}`,
        zone: synZone,
        elevationM: 500,
      });
      saveStoredLocation(urlCoords.lat, urlCoords.lon);
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
      setLocationMeta(res);
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
    setLat(fixedLat);
    setLon(fixedLon);
    const synZone = computeKoppenClimateZone(fixedLat, fixedLon);
    const initialName =
      label ||
      `Field ${Math.abs(fixedLat).toFixed(4)}°${fixedLat >= 0 ? "N" : "S"}, ${Math.abs(fixedLon).toFixed(4)}°${fixedLon >= 0 ? "E" : "W"}`;
    setLocationMeta((prev) => ({
      label: initialName,
      zone: synZone,
      elevationM: prev?.elevationM ?? 500,
    }));
    saveStoredLocation(fixedLat, fixedLon, label);
    syncUrlCoords(fixedLat, fixedLon);
  };
  const activeHazards = telemetry.hazards.filter(
    (h) => h.severity === "critical" || h.severity === "warning",
  ).length;
  const tabLabel = TABS.find((t) => t.id === tab)?.label;

  return (
    <div className="flex min-h-screen relative overflow-x-hidden">
      {/* SpaceX Dragon / NASA Orion Zero-G Orbital Cockpit HUD Visor */}
      <OrbitalCockpitVisor active={cockpitHudActive} lat={lat} lon={lon} />

      <DashboardSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
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

      <main className="min-w-0 flex-1">
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
          cockpitHudActive={cockpitHudActive}
          onToggleCockpitHud={toggleCockpitHud}
          onNavigateHome={(hLat, hLon, hLabel) => setLocation(hLat, hLon, hLabel)}
          onUpdateUser={(updated) => {
            setOperator(updated);
            saveStoredUser(updated);
          }}
          onSignOut={() => {
            clearStoredProfile();
            setOperator(null);
            toast.info("Operator Signed Out", {
              description: "Mission Control session terminated.",
            });
          }}
        />

        <div className="space-y-4 p-4 lg:p-5">
          {/* Orbital Telemetry Top Deck */}
          <div className="relative overflow-hidden rounded-lg border border-border/60 bg-card/75 p-4 backdrop-blur-xl shadow-[0_0_25px_rgba(0,0,0,0.5)] antigravity-float-1 hologram-cockpit-card laser-scanline-panel chamfered-card-frame">
            {/* Top Tactical Lightline */}
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-cyan via-emerald to-transparent opacity-80" />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-cyan/15 border border-cyan/40 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan uppercase tracking-widest">
                    {tabLabel}
                  </span>
                  {liveStatus?.isLive ? (
                    <span className="inline-flex items-center gap-1.5 rounded border border-emerald-500/60 bg-emerald-500/15 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald shadow-[0_0_10px_rgba(0,255,157,0.25)]">
                      <Radio className="size-2.5 animate-pulse text-emerald" /> LIVE SATELLITE (
                      {liveStatus.activeFeeds.length}/9 FEEDS ACTIVE)
                    </span>
                  ) : isLoadingLive ? (
                    <span className="inline-flex items-center gap-1.5 rounded border border-cyan-500/50 bg-cyan-500/15 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan animate-pulse shadow-[0_0_10px_rgba(0,240,255,0.25)]">
                      <RefreshCw className="size-2.5 animate-spin text-cyan" /> SYNCING NASA
                      TELEMETRY FOR {(telemetry.meta.regionLabel || "FIELD").toUpperCase()}...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded border border-muted/70 bg-muted/40 px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
                      <Satellite className="size-2.5 text-muted-foreground" /> MOCK ORBITAL
                      TELEMETRY (DETERMINISTIC)
                    </span>
                  )}
                  <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] text-cyan/70">
                    <span className="inline-block size-1.5 rounded-full bg-cyan shadow-[0_0_6px_#00f0ff]" />
                    {lat.toFixed(4)}° {lat >= 0 ? "N" : "S"}, {lon.toFixed(4)}°{" "}
                    {lon >= 0 ? "E" : "W"}
                  </span>
                </div>

                <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                  <span>{telemetry.meta.regionLabel}</span>
                  <span className="text-xs font-mono font-normal text-cyan/80 bg-cyan/10 border border-cyan/30 px-2 py-0.5 rounded">
                    ELEV {telemetry.meta.elevationM}m
                  </span>
                </h1>

                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  <span className="text-foreground/80">{telemetry.meta.climateZone}</span> ·{" "}
                  {season} Cycle · {irrigation} Irrigation
                </p>
              </div>

              {/* Tactical Readout & Mission Control Auth */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap items-center gap-3.5 rounded-lg border border-border/50 bg-background/50 px-4 py-2.5 backdrop-blur-md">
                  <div className="text-right">
                    <div className="hud-label text-[10px] text-cyan/80">Field Health Index</div>
                    <div className="font-mono text-3xl font-extrabold tabular-nums text-emerald drop-shadow-[0_0_10px_rgba(0,255,157,0.5)]">
                      {telemetry.plantHealth.overall}
                      <span className="text-sm font-normal text-muted-foreground/70">/100</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <SeverityChip severity={telemetry.plantHealth.status} />
                    {scenario !== "Nominal" && (
                      <span className="inline-flex items-center gap-1 rounded border border-crimson/60 bg-crimson/20 px-2 py-0.5 font-mono text-[10px] font-bold text-crimson shadow-[0_0_10px_rgba(255,46,86,0.3)] animate-pulse">
                        <Activity className="size-3" /> SIM · {scenario}
                      </span>
                    )}
                  </div>
                </div>

                {/* Operator Profile Widget in Top Deck */}
                {operator ? (
                  <UserProfileNavbarWidget
                    user={operator}
                    onUpdateUser={(updated) => {
                      setOperator(updated);
                      saveStoredUser(updated);
                      toast.success("Profile Updated", {
                        description:
                          "Mission preferences and operator credentials saved successfully.",
                      });
                    }}
                    onLogout={() => {
                      saveStoredUser(null);
                      setOperator(null);
                      toast.info("Operator Signed Out", {
                        description: "Mission Control session terminated.",
                      });
                    }}
                    onNavigateHome={(locStr) => {
                      toast.info("Radar Lock", {
                        description: `Base Station: ${locStr}`,
                      });
                      setLocation(13.1367, 78.1292, locStr);
                    }}
                  />
                ) : (
                  <OperatorProfileDropdown
                    profile={null}
                    onOpenAuth={() => setShowAuthModal(true)}
                    onOpenSettings={() => setShowSettingsModal(true)}
                    onNavigateHome={(hLat, hLon, hLabel) => setLocation(hLat, hLon, hLabel)}
                    onSignOut={() => {}}
                  />
                )}
              </div>
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

          {/* AI Agronomic & Climate Decision Card */}
          <div className="antigravity-float-3">
            <AgroDecisionCard
              telemetry={telemetry}
              onExportReport={() => setShowAdvisoryReportModal(true)}
            />
          </div>

          {tab === "overview" && (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="antigravity-float-2">
                  <PowerChart data={telemetry.power} />
                </div>
                <div className="antigravity-float-3">
                  <SoilMoistureChart data={telemetry.soil} depth={telemetry.input.borewellDepth} />
                </div>
                <div className="antigravity-float-1">
                  <PlantHealthRadar health={telemetry.plantHealth} />
                </div>
                <div className="antigravity-float-2">
                  <WaterBudgetChart data={telemetry.waterBudget} crop={telemetry.crop.crop} />
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="antigravity-float-3">
                  <HazardMatrixSlot
                    hazards={telemetry.hazards}
                    telemetry={telemetry}
                    variant="summary"
                  />
                </div>
                <div className="antigravity-float-1">
                  <CropEngineSlot crop={telemetry.crop} />
                </div>
              </div>
              <div className="antigravity-float-2">
                <FieldShiftCropAdvisor telemetry={telemetry} />
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
          }}
          onSignOut={() => {
            clearStoredProfile();
            setOperator(null);
            setShowSettingsModal(false);
            toast.info("Operator Signed Out", {
              description: "Mission Control session terminated.",
            });
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
    </div>
  );
}
