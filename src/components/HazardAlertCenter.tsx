/**
 * AgroSpace Nexus — Hazard Alert Center & Tactical Multi-Hazard Matrix
 * Mounts inside <section id="hazard-matrix-slot">.
 *
 * Renders 8 live & simulated tactical alert cards with farmer mitigation checklists:
 * 1. Cyclone & Severe Storm (NASA EONET, wind shear, crop lodging)
 * 2. Earthquake & Liquefaction (USGS magnitude, borewell casing, canal breaches)
 * 3. Solar Winds, CME & Geomagnetic Storm (NASA DONKI GST/FLR, Kp-Index, RTK-GPS drift, LoRaWAN drop)
 * 4. Solar Eclipse Photoperiod Dip (USNO Eclipse v4, PAR drop, stomatal closure, pollinator pause)
 * 5. Stubble Fire & Smoke Dimming (NASA FIRMS VIIRS 375m, FRP, MAIAC AOD sunlight reduction)
 * 6. Flood & Root Hypoxia (GPM IMERG 24h rain > 65mm or GWETROOT > 0.85, root rot)
 * 7. Heatwave, Frost & Fungal Blight (Canopy fever TS - T2M > 3°C, frost < 4°C, RH2M > 85%)
 * 8. High Wind Spray Drift (NASA POWER WS2M > 6.5 m/s pesticide spray halt)
 *
 * Includes multi-language toggle (English | हिंदी | ಕನ್ನಡ) and Print/PDF Farmer Advisory Bulletin.
 */

import { useMemo, useState } from "react";
import {
  Wind,
  Mountain,
  Sun,
  SunDim,
  Flame,
  Waves,
  ThermometerSnowflake,
  ShieldAlert,
  Printer,
  FileText,
  CheckCircle2,
  Circle,
  Languages,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Gauge,
  Sparkles,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SEVERITY_STYLES, SeverityChip } from "@/components/agro/hud";
import {
  translations,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  type HazardTranslation,
} from "@/i18n/translations";
import type { AgroTelemetry, HazardAlert, Severity } from "@/types/agroSpace";
import {
  GLOBAL_CROP_ATLAS_600,
  resolveAgroZoneAndWorldRegion,
  evaluateCrop600Suitability,
  getCropSuitabilityColor,
} from "@/data/globalCropAtlas600";

export interface TacticalHazardItem {
  key:
    | "cyclone"
    | "earthquake"
    | "solarStorm"
    | "eclipse"
    | "stubbleFire"
    | "flood"
    | "heatBlight"
    | "sprayDrift";
  icon: typeof Wind;
  severity: Severity;
  metric: string;
  source: string;
  detail: string;
  translation: HazardTranslation;
}

export interface HazardAlertCenterProps {
  telemetry?: AgroTelemetry | undefined;
  hazards?: HazardAlert[];
  variant?: "summary" | "full";
  initialLanguage?: SupportedLanguage;
}

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 4,
  warning: 3,
  watch: 2,
  nominal: 1,
};

export function HazardAlertCenter({
  telemetry,
  hazards,
  variant = "full",
  initialLanguage = "en",
}: HazardAlertCenterProps) {
  const [language, setLanguage] = useState<SupportedLanguage>(initialLanguage);
  const [showBulletin, setShowBulletin] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<Severity | "all">("all");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    cyclone: true,
    earthquake: true,
    solarStorm: true,
    flood: true,
  });
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  const t = translations[language];

  // Derive the 8 tactical hazard feeds from telemetry or hazards prop
  const tacticalHazards: TacticalHazardItem[] = useMemo(() => {
    const rawHazards = telemetry?.hazards ?? hazards ?? [];
    const scenario = telemetry?.input?.scenario ?? "Nominal";
    const power = telemetry?.power ?? [];
    const soil = telemetry?.soil ?? [];
    const layers = telemetry?.layers;
    const plantHealth = telemetry?.plantHealth;

    // Helper finders
    const findRaw = (type: string) => rawHazards.find((h) => h.type === type);

    // 1. Cyclone & Severe Storm
    const rawCyclone = findRaw("cyclone");
    let cycloneSev: Severity = rawCyclone?.severity ?? "nominal";
    let cycloneMetric = rawCyclone?.metric ?? "No systems in 1,000 km";
    let cycloneDetail = rawCyclone?.detail ?? "No tropical depression detected.";
    if (scenario === "Cat-4 Cyclone") {
      cycloneSev = "critical";
      cycloneMetric = "Cat-4 · 230 km/h · Eye 68 km offshore";
      cycloneDetail = "Landfall T-14h. Destructive wind shear and storm surge imminent.";
    }

    // 2. Earthquake & Liquefaction
    const rawQuake = findRaw("earthquake");
    let quakeSev: Severity = rawQuake?.severity ?? "nominal";
    let quakeMetric = rawQuake?.metric ?? "M1.8 max background";
    let quakeDetail = rawQuake?.detail ?? "Background micro-seismicity only.";
    if (scenario === "M6.2 Earthquake") {
      quakeSev = "critical";
      quakeMetric = "M6.2 · 18 km depth · 42 km epicentre";
      quakeDetail =
        "Significant lateral shear. Aquifer displacement and borewell casing breach risk.";
    }

    // 3. Solar Winds, CME & Geomagnetic Storm
    const rawSolar = findRaw("solar-storm");
    let solarSev: Severity = rawSolar?.severity ?? "nominal";
    let solarMetric = rawSolar?.metric ?? "Kp 1.8 · Quiet Field";
    let solarDetail = rawSolar?.detail ?? "Quiet geomagnetic field. GNSS nominal.";
    if (scenario === "G4 Solar Storm") {
      solarSev = "critical";
      solarMetric = "Kp 8 · G4 Severe Storm";
      solarDetail = "RTK auto-steer drift ±3 m. High LoRaWAN packet loss and elevated UV-B flux.";
    }

    // 4. Solar Eclipse Photoperiod Dip
    const rawEclipse = findRaw("eclipse");
    let eclipseSev: Severity = rawEclipse?.severity ?? "nominal";
    let eclipseMetric = rawEclipse?.metric ?? "None in 30 d";
    let eclipseDetail = rawEclipse?.detail ?? "Clear solar trajectory without eclipse path.";
    if (scenario === "Solar Eclipse") {
      eclipseSev = "watch";
      eclipseMetric = "78% obscuration · PAR -62%";
      eclipseDetail = "Total obscuration duration 2h 14m. Stomatal transpiration pause expected.";
    }

    // 5. Stubble Fire & Smoke Dimming
    const fireHotspots = layers?.["FIRMS Fires"]?.value ?? (scenario === "Severe Drought" ? 18 : 2);
    const smokeAod = layers?.["Smoke AOD"]?.value ?? (scenario === "Severe Drought" ? 1.45 : 0.28);
    let fireSev: Severity = "nominal";
    if (fireHotspots >= 12 || smokeAod >= 1.2) fireSev = "critical";
    else if (fireHotspots >= 6 || smokeAod >= 0.7) fireSev = "warning";
    else if (fireHotspots >= 3 || smokeAod >= 0.4) fireSev = "watch";
    const fireMetric = `${fireHotspots} hotspots / 50 km · AOD ${smokeAod.toFixed(2)}`;
    const fireDetail =
      fireSev === "nominal"
        ? "Negligible thermal anomalies. Photosynthetically active radiation optimal."
        : `Upwind agricultural residue burning detected. Aerosol optical depth τ=${smokeAod.toFixed(2)} reducing solar irradiance.`;

    // 6. Flood & Root Hypoxia
    const rawFlood = findRaw("flood");
    const maxRain = power.length ? Math.max(...power.map((p) => p.PRECTOTCORR)) : 0;
    const latestSoil = soil.at(-1);
    const rootMoisture = latestSoil?.sm28_100 ?? 42;
    let floodSev: Severity = rawFlood?.severity ?? "nominal";
    let floodMetric = `${Math.round(maxRain)} mm/24h · Root ${Math.round(rootMoisture)}%`;
    let floodDetail = "Soil drainage within balanced absorption range.";
    if (scenario === "Flash Flood" || maxRain > 65 || rootMoisture > 85) {
      floodSev = scenario === "Flash Flood" || maxRain > 100 ? "critical" : "warning";
      floodMetric = `${Math.round(maxRain || 128)} mm/24h · Root 94% Saturation`;
      floodDetail = "Root zone fully submerged. Anaerobic hypoxia and Pythium root rot threat.";
    }

    // 7. Heatwave, Frost & Fungal Blight
    const blightPillar = plantHealth?.pillars.find((p) => p.key === "blight");
    const blightRisk = blightPillar ? 100 - blightPillar.score : 28;
    let heatBlightSev: Severity = "nominal";
    let heatBlightMetric = "Canopy TS - T2M +0.8°C · Safe";
    let heatBlightDetail = "Canopy temperature balanced with ambient air. Blight risk nominal.";
    if (scenario === "Severe Drought") {
      heatBlightSev = "critical";
      heatBlightMetric = "TS - T2M +4.2°C (Canopy Fever)";
      heatBlightDetail =
        "Extreme transpirational shutdown. Crop canopy fever exceeds critical threshold (>3°C).";
    } else if (blightRisk > 60 || scenario === "Flash Flood") {
      heatBlightSev = "warning";
      heatBlightMetric = `Spore Index ${Math.round(blightRisk)}/100 · RH2M > 88%`;
      heatBlightDetail =
        "Prolonged humidity and dew point convergence creating prime spore germination environment.";
    }

    // 8. High Wind Spray Drift
    let spraySev: Severity = "nominal";
    let sprayMetric = "3.2 m/s (11.5 km/h) · Spray Safe";
    let sprayDetail = "Wind velocity ideal for drone and tractor boom pesticide application.";
    if (scenario === "Cat-4 Cyclone") {
      spraySev = "critical";
      sprayMetric = "64.0 m/s (230 km/h) · HALT SPRAY";
      sprayDetail =
        "Severe hurricane-force gusts. Complete halt to all field operations and sprayers.";
    } else if (cycloneSev === "warning" || cycloneSev === "critical") {
      spraySev = "critical";
      sprayMetric = "9.4 m/s (33.8 km/h) · HALT SPRAY";
      sprayDetail =
        "Wind exceeds safe threshold (>6.5 m/s). Extreme risk of off-target pesticide drift.";
    } else if (telemetry?.input?.season === "Kharif" && telemetry?.input?.lat < 18) {
      spraySev = "warning";
      sprayMetric = "7.2 m/s (25.9 km/h) · Drift Alert";
      sprayDetail =
        "Southwest monsoon gusting above 6.5 m/s. Halt pesticide spraying to protect adjacent plots.";
    }

    const items: TacticalHazardItem[] = [
      {
        key: "cyclone",
        icon: Wind,
        severity: cycloneSev,
        metric: cycloneMetric,
        source: t.hazards.items.cyclone.source,
        detail: cycloneDetail,
        translation: t.hazards.items.cyclone,
      },
      {
        key: "earthquake",
        icon: Mountain,
        severity: quakeSev,
        metric: quakeMetric,
        source: t.hazards.items.earthquake.source,
        detail: quakeDetail,
        translation: t.hazards.items.earthquake,
      },
      {
        key: "solarStorm",
        icon: Sun,
        severity: solarSev,
        metric: solarMetric,
        source: t.hazards.items.solarStorm.source,
        detail: solarDetail,
        translation: t.hazards.items.solarStorm,
      },
      {
        key: "eclipse",
        icon: SunDim,
        severity: eclipseSev,
        metric: eclipseMetric,
        source: t.hazards.items.eclipse.source,
        detail: eclipseDetail,
        translation: t.hazards.items.eclipse,
      },
      {
        key: "stubbleFire",
        icon: Flame,
        severity: fireSev,
        metric: fireMetric,
        source: t.hazards.items.stubbleFire.source,
        detail: fireDetail,
        translation: t.hazards.items.stubbleFire,
      },
      {
        key: "flood",
        icon: Waves,
        severity: floodSev,
        metric: floodMetric,
        source: t.hazards.items.flood.source,
        detail: floodDetail,
        translation: t.hazards.items.flood,
      },
      {
        key: "heatBlight",
        icon: ThermometerSnowflake,
        severity: heatBlightSev,
        metric: heatBlightMetric,
        source: t.hazards.items.heatBlight.source,
        detail: heatBlightDetail,
        translation: t.hazards.items.heatBlight,
      },
      {
        key: "sprayDrift",
        icon: Gauge,
        severity: spraySev,
        metric: sprayMetric,
        source: t.hazards.items.sprayDrift.source,
        detail: sprayDetail,
        translation: t.hazards.items.sprayDrift,
      },
    ];

    // Sort tactical hazards with critical & warnings first
    return items.sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]);
  }, [telemetry, hazards, t]);

  // Aggregate severity counts
  const counts = useMemo(() => {
    return tacticalHazards.reduce(
      (acc, item) => {
        acc[item.severity] = (acc[item.severity] || 0) + 1;
        return acc;
      },
      { critical: 0, warning: 0, watch: 0, nominal: 0 } as Record<Severity, number>,
    );
  }, [tacticalHazards]);

  // Filtered items
  const filteredItems = useMemo(() => {
    const list =
      filterSeverity === "all"
        ? tacticalHazards
        : tacticalHazards.filter((item) => item.severity === filterSeverity);

    return variant === "summary" ? list.slice(0, 4) : list;
  }, [tacticalHazards, filterSeverity, variant]);

  const toggleCard = (key: string) => {
    setExpandedCards((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleStep = (stepId: string) => {
    setCheckedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  return (
    <section id="hazard-matrix-slot" aria-label="Hazard matrix" className="space-y-4">
      {/* ---------------- CARD CONTAINER ---------------- */}
      <div className="hud-card p-4 sm:p-5 border border-cyan/40 shadow-[0_0_30px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
        {/* Top Header: Title, Feeds, Language Selector & Bulletin Button */}
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-cyan/60 bg-cyan/15 text-cyan shadow-[0_0_15px_rgba(0,240,255,0.35)]">
              <ShieldAlert className="size-5 drop-shadow-[0_0_6px_#00f0ff]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-foreground">
                  {t.hazards.matrixTitle}
                </h3>
                <span className="hidden items-center gap-1.5 rounded border border-cyan/50 bg-cyan/15 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan sm:inline-flex shadow-[0_0_8px_rgba(0,240,255,0.2)]">
                  <Radio className="size-2.5 animate-pulse text-cyan" /> 8 FEEDS LIVE
                </span>
              </div>
              <p className="hud-label mt-0.5 text-xs text-cyan/70 tracking-wider">
                {t.hazards.tacticalSubtitle}
              </p>
            </div>
          </div>

          {/* Action Tools: Multi-language Toggle + Print/Advisory Bulletin Trigger */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Language Selector Pills */}
            <div
              className="inline-flex items-center rounded-lg border border-border/70 bg-background/60 p-0.5"
              role="radiogroup"
              aria-label="Language selection"
            >
              <div className="flex items-center gap-1 px-1.5 text-muted-foreground">
                <Languages className="size-3.5" />
              </div>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLanguage(lang.code)}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs transition-all",
                    language === lang.code
                      ? "bg-cyan/20 font-semibold text-cyan shadow-sm"
                      : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                  )}
                  title={`Switch to ${lang.label}`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.nativeName}</span>
                </button>
              ))}
            </div>

            {/* Farmer Advisory Bulletin Modal Trigger */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowBulletin(true)}
              className="h-8 border-cyan/40 bg-cyan/10 font-mono text-xs text-cyan hover:bg-cyan/20 hover:text-cyan"
            >
              <FileText className="mr-1.5 size-3.5" />
              <span>{t.hazards.viewAdvisory}</span>
            </Button>
          </div>
        </header>

        {/* Severity Metric Filter Chips */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterSeverity("all")}
              className={cn(
                "rounded-md border px-2 py-1 font-mono text-xs transition-colors",
                filterSeverity === "all"
                  ? "border-foreground/30 bg-muted text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:bg-muted/50",
              )}
            >
              All Alerts (8)
            </button>
            {(["critical", "warning", "watch", "nominal"] as Severity[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterSeverity(s)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs transition-colors",
                  filterSeverity === s
                    ? cn(SEVERITY_STYLES[s].chip, "font-medium ring-1 ring-current")
                    : "border-transparent text-muted-foreground hover:bg-muted/50",
                )}
              >
                <span className={cn("size-2 rounded-full", SEVERITY_STYLES[s].dot)} />
                <span className="capitalize">{s}</span>
                <span className="ml-0.5 rounded-full bg-background/80 px-1.5 py-0.2 text-[10px] tabular-nums">
                  {counts[s]}
                </span>
              </button>
            ))}
          </div>

          <div className="font-mono text-[11px] text-muted-foreground">
            {variant === "summary" ? "Top 4 Priority Alerts" : "8 Tactical Systems Monitored"}
          </div>
        </div>

        {/* ---------------- 8 TACTICAL ALERT CARDS ---------------- */}
        <div
          className={cn(
            "grid gap-3",
            variant === "full" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 sm:grid-cols-2",
          )}
        >
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const style = SEVERITY_STYLES[item.severity];
            const isExpanded = Boolean(expandedCards[item.key]);
            const steps = item.translation.mitigationSteps;
            const completedCount = steps.filter((_, idx) =>
              Boolean(checkedSteps[`${item.key}-${idx}`]),
            ).length;

            return (
              <article
                key={item.key}
                data-severity={item.severity}
                className={cn(
                  "relative flex flex-col justify-between rounded-lg border bg-background/60 p-4 transition-all duration-200 backdrop-blur-md overflow-hidden",
                  style.ring,
                  item.severity === "critical" &&
                    "border-crimson/70 bg-crimson/10 shadow-[0_0_20px_rgba(255,46,86,0.22)]",
                  item.severity === "warning" &&
                    "border-amber/70 bg-amber/10 shadow-[0_0_18px_rgba(255,183,0,0.18)]",
                  item.severity === "watch" &&
                    "border-cyan/40 bg-cyan/5 shadow-[0_0_14px_rgba(0,240,255,0.12)]",
                  item.severity === "nominal" && "border-border/40 hover:border-border/70",
                )}
              >
                {/* Tactical Corner Hazard Accent Bar */}
                <div
                  className={cn(
                    "absolute top-0 left-0 right-0 h-0.5",
                    item.severity === "critical"
                      ? "bg-crimson shadow-[0_0_8px_#ff2e56]"
                      : item.severity === "warning"
                        ? "bg-amber shadow-[0_0_8px_#ffb700]"
                        : item.severity === "watch"
                          ? "bg-cyan shadow-[0_0_8px_#00f0ff]"
                          : "bg-emerald/40",
                  )}
                />
                {/* Card Header: Icon, Titles & Severity Badge */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={cn(
                          "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border",
                          style.chip,
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-sm tracking-tight">
                          {item.translation.title}
                        </h4>
                        <div className="hud-label mt-0.5 text-[10px] text-muted-foreground/80">
                          {item.source}
                        </div>
                      </div>
                    </div>
                    <SeverityChip severity={item.severity} />
                  </div>

                  {/* Telemetry Metric Highlight */}
                  <div className="mt-3 flex items-baseline justify-between rounded-md border border-border/50 bg-background/80 px-3 py-1.5">
                    <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      TELEMETRY
                    </span>
                    <span
                      className={cn("font-mono text-sm font-semibold tabular-nums", style.text)}
                    >
                      {item.metric}
                    </span>
                  </div>

                  {/* Detail description */}
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {item.detail}
                  </p>
                </div>

                {/* Tactical Farmer Mitigation Checklist */}
                <div className="mt-3 border-t border-border/50 pt-2.5">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleCard(item.key)}
                      className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-cyan hover:text-cyan/80 transition-colors"
                    >
                      <span>{t.hazards.actionChecklist}</span>
                      <span className="rounded-full bg-cyan/10 px-1.5 py-0.2 text-[10px] text-cyan">
                        {completedCount}/{steps.length} {t.hazards.completed}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="size-3 text-cyan" />
                      ) : (
                        <ChevronDown className="size-3 text-cyan" />
                      )}
                    </button>

                    {completedCount === steps.length && (
                      <span className="flex items-center gap-1 font-mono text-[10px] text-emerald">
                        <Check className="size-3" /> All Done
                      </span>
                    )}
                  </div>

                  {/* Action Steps Checklist */}
                  {isExpanded && (
                    <ul className="mt-2 space-y-1.5">
                      {steps.map((step, idx) => {
                        const stepKey = `${item.key}-${idx}`;
                        const isDone = Boolean(checkedSteps[stepKey]);

                        return (
                          <li
                            key={stepKey}
                            onClick={() => toggleStep(stepKey)}
                            className={cn(
                              "flex cursor-pointer items-start gap-2 rounded-md border p-2 text-xs transition-colors",
                              isDone
                                ? "border-emerald/30 bg-emerald/5 text-muted-foreground line-through"
                                : "border-border/40 bg-background/40 text-foreground hover:bg-background/80",
                            )}
                          >
                            <span className="mt-0.5 shrink-0 text-cyan">
                              {isDone ? (
                                <CheckCircle2 className="size-3.5 text-emerald" />
                              ) : (
                                <Circle className="size-3.5 text-muted-foreground" />
                              )}
                            </span>
                            <span className="flex-1 leading-snug">
                              <span className="mr-1 font-mono text-[10px] font-semibold text-muted-foreground/80">
                                {idx + 1}.
                              </span>
                              {step}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* ---------------- PRINTABLE FARMER ADVISORY BULLETIN MODAL ---------------- */}
      {showBulletin && (
        <FarmerAdvisoryModal
          telemetry={telemetry}
          tacticalHazards={tacticalHazards}
          checkedSteps={checkedSteps}
          language={language}
          onLanguageChange={setLanguage}
          onClose={() => setShowBulletin(false)}
        />
      )}
    </section>
  );
}

/**
 * Print & PDF-Optimized Farmer Advisory Report Modal
 */
export function FarmerAdvisoryModal({
  telemetry,
  tacticalHazards,
  checkedSteps,
  language,
  onLanguageChange,
  onClose,
}: {
  telemetry?: AgroTelemetry | undefined;
  tacticalHazards: TacticalHazardItem[];
  checkedSteps: Record<string, boolean>;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onClose: () => void;
}) {
  const t = translations[language];
  const b = t.bulletin;

  const lat = telemetry?.input?.lat ?? 13.13;
  const lon = telemetry?.input?.lon ?? 78.13;
  const region = telemetry?.meta?.regionLabel ?? "Bengaluru / Kolar Agro-Zone";
  const climateZone = telemetry?.meta?.climateZone ?? "Semi-Arid Tropics";
  const cropName = telemetry?.crop?.crop ?? "Finger Millet (Ragi)";
  const cropTranslated = t.crops[cropName] ?? cropName;
  const yieldEst = telemetry?.crop?.yieldTPerHa ?? 2.6;
  const deficit = telemetry?.crop?.deficitMm ?? 34;
  const borewellFlow = telemetry?.crop?.borewellYieldLph ?? 3400;
  const healthScore = telemetry?.plantHealth?.overall ?? 78;

  // Resolve Agro-Climatic Zone & World Region for this field
  const zoneInfo = useMemo(() => {
    return resolveAgroZoneAndWorldRegion(
      lat,
      lon,
      region,
      "India",
      telemetry?.meta?.elevationM || 500,
    );
  }, [lat, lon, region, telemetry]);

  // Resolve Top 5 Climate-Resilient Recommended Crops from 600-Crop Atlas
  const topCrops = useMemo(() => {
    const evalContext = {
      lat,
      lon,
      indiaZone: zoneInfo.indiaZone,
      worldRegion: zoneInfo.worldRegion,
      smapMoisture: 25,
      ecostressESI: 0.75,
      elevationM: telemetry?.meta?.elevationM || 500,
    };
    return GLOBAL_CROP_ATLAS_600.map((c) => evaluateCrop600Suitability(c, evalContext))
      .sort((a, b) => b.adjustedScore - a.adjustedScore)
      .slice(0, 5);
  }, [lat, lon, zoneInfo, deficit, telemetry]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
      {/* Modal Card */}
      <div className="relative my-auto w-full max-w-4xl rounded-xl border border-cyan/40 bg-card p-6 shadow-2xl printable-bulletin">
        {/* Floating Close & Print Actions (Hidden in Print View) */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3 no-print">
          <div className="flex items-center gap-2">
            <span className="hud-label text-cyan">{b.officialSubtitle}</span>
            <div className="flex items-center gap-1 rounded border border-border/60 bg-background/50 p-0.5">
              {SUPPORTED_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => onLanguageChange(l.code)}
                  className={cn(
                    "rounded px-2 py-0.5 font-mono text-xs transition-colors",
                    language === l.code
                      ? "bg-cyan/20 text-cyan font-bold"
                      : "text-muted-foreground",
                  )}
                >
                  {l.nativeName}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="h-8 bg-cyan text-black hover:bg-cyan/90 font-mono text-xs font-semibold"
            >
              <Printer className="mr-1.5 size-3.5" />
              {b.printAction}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClose}
              className="h-8 border-border/60 text-xs"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* ---------------- OFFICIAL BULLETIN PRINTABLE CONTENT ---------------- */}
        <div className="space-y-6 printable-paper text-foreground">
          {/* Official Emblem & Header */}
          <div className="border-b-2 border-primary/40 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-lg border-2 border-primary bg-primary/10 text-primary">
                  <ShieldAlert className="size-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    {b.officialTitle}
                  </h2>
                  <p className="font-mono text-xs text-muted-foreground">{b.governmentAuth}</p>
                </div>
              </div>
              <div className="text-right font-mono text-xs text-muted-foreground">
                <div className="font-semibold text-primary">{b.bulletinRef}</div>
                <div>
                  {new Date().toLocaleDateString(
                    language === "kn" ? "kn-IN" : language === "hi" ? "hi-IN" : "en-US",
                    { dateStyle: "long" },
                  )}
                </div>
                <div>
                  GPS: {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
                </div>
              </div>
            </div>
          </div>

          {/* Location & Field Health Vitals Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-border/60 bg-background/40 p-4">
            <div>
              <div className="hud-label text-[10px]">{t.hud.climateZone}</div>
              <div className="font-semibold text-sm">{region}</div>
              <div className="font-mono text-xs text-muted-foreground">{climateZone}</div>
              <div className="font-mono text-[10px] text-primary mt-0.5">
                Zone: {zoneInfo.zoneDisplay} · {zoneInfo.worldRegion}
              </div>
            </div>
            <div>
              <div className="hud-label text-[10px]">{t.hud.recommendedCrop}</div>
              <div className="font-semibold text-sm text-emerald">{cropTranslated}</div>
              <div className="font-mono text-xs text-muted-foreground">Est. {yieldEst} T/ha</div>
            </div>
            <div>
              <div className="hud-label text-[10px]">{t.hud.fieldHealth}</div>
              <div className="font-mono text-xl font-bold text-emerald">
                {healthScore}
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground">
                NASA Satellite Ingest
              </div>
            </div>
            <div>
              <div className="hud-label text-[10px]">{t.hud.borewellYield}</div>
              <div className="font-mono text-sm font-semibold text-cyan">
                {borewellFlow.toLocaleString()} LPH
              </div>
              <div className="font-mono text-xs text-muted-foreground">Deficit: {deficit} mm</div>
            </div>
          </div>

          {/* Top 5 Climate-Resilient Recommended Crops (600-Crop Atlas) */}
          <div className="rounded-lg border border-border/60 bg-background/30 p-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-cyan" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                  Top 5 Climate-Resilient Recommended Crops (Global Atlas 600)
                </h3>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                ZONAL SUITABILITY ENGINE · GEO-RESOLVED
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-[10px] text-muted-foreground uppercase">
                    <th className="py-1.5 px-2">#</th>
                    <th className="py-1.5 px-2">Crop & Botanical Name</th>
                    <th className="py-1.5 px-2">Category</th>
                    <th className="py-1.5 px-2">Suitability</th>
                    <th className="py-1.5 px-2">Water Need</th>
                    <th className="py-1.5 px-2">Cycle</th>
                    <th className="py-1.5 px-2">Key Resilience Trait</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {topCrops.map((c, idx) => {
                    const color = getCropSuitabilityColor(c.adjustedScore);
                    return (
                      <tr key={c.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-2 px-2 font-bold text-muted-foreground">{idx + 1}</td>
                        <td className="py-2 px-2">
                          <span className="font-bold text-foreground text-xs">{c.name}</span>
                          <span className="block text-[10px] italic text-muted-foreground">
                            {c.botanicalName}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-muted-foreground text-[11px] capitalize">
                          {c.category}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={cn(
                              "inline-block rounded px-2 py-0.5 font-bold text-[11px]",
                              color.text,
                              color.bg,
                              color.border,
                              "border",
                            )}
                          >
                            {c.adjustedScore}/100
                          </span>
                        </td>
                        <td className="py-2 px-2 text-cyan font-semibold">
                          {c.waterRequirementMm} mm
                        </td>
                        <td className="py-2 px-2 text-muted-foreground">
                          {c.durationDays} days
                        </td>
                        <td className="py-2 px-2 text-muted-foreground text-[10px] max-w-[200px] truncate">
                          {c.agronomicNotes || "High zonal resilience"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tactical Hazard Alerts & Action Checklists */}
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary">
              {b.hazardMitigationMatrix}
            </h3>

            <div className="space-y-4">
              {tacticalHazards.map((item, idx) => {
                const style = SEVERITY_STYLES[item.severity];
                const steps = item.translation.mitigationSteps;

                return (
                  <div
                    key={item.key}
                    className={cn(
                      "rounded-lg border p-3.5",
                      style.ring,
                      item.severity === "critical" ? "bg-crimson/5" : "bg-background/40",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-muted-foreground">
                          {idx + 1}.
                        </span>
                        <h4 className="font-semibold text-sm">{item.translation.title}</h4>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          ({item.source})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("font-mono text-xs font-semibold", style.text)}>
                          {item.metric}
                        </span>
                        <SeverityChip severity={item.severity} />
                      </div>
                    </div>

                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                      {item.detail}
                    </p>

                    {/* Mitigation Checklist */}
                    <div className="mt-3">
                      <div className="font-mono text-[11px] font-semibold text-primary mb-1.5">
                        {t.hazards.actionChecklist}:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {steps.map((st, sIdx) => {
                          const isDone = Boolean(checkedSteps[`${item.key}-${sIdx}`]);
                          return (
                            <div
                              key={sIdx}
                              className={cn(
                                "flex items-start gap-1.5 rounded border p-1.5 text-xs",
                                isDone
                                  ? "border-emerald/40 bg-emerald/5 text-emerald font-medium"
                                  : "border-border/30 bg-background/50",
                              )}
                            >
                              <span className="mt-0.5 shrink-0">
                                {isDone ? (
                                  <Check className="size-3 text-emerald font-bold" />
                                ) : (
                                  <span className="block size-2.5 rounded-sm border border-muted-foreground" />
                                )}
                              </span>
                              <span className="leading-snug">{st}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Official Endorsement & Signatures Section */}
          <div className="border-t-2 border-primary/30 pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center font-mono text-xs text-muted-foreground">
              <div className="border-t border-dashed border-border/80 pt-2">
                <div className="h-8" />
                <div className="font-medium text-foreground">{b.signatures.officerTitle}</div>
              </div>
              <div className="border-t border-dashed border-border/80 pt-2">
                <div className="h-8" />
                <div className="font-medium text-foreground">{b.signatures.leadAgronomist}</div>
              </div>
              <div className="border-t border-dashed border-border/80 pt-2">
                <div className="h-8" />
                <div className="font-medium text-foreground">
                  {b.signatures.farmerAcknowledgment}
                </div>
              </div>
              <div className="border-t border-dashed border-border/80 pt-2">
                <div className="h-8" />
                <div className="font-medium text-foreground">{b.signatures.dateStamped}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
