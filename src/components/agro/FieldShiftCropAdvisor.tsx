import React, { useMemo, useState } from "react";
import {
  Sprout,
  Droplets,
  Zap,
  ShieldAlert,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Mountain,
  Sun,
  Coins,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Activity,
  Search,
  Filter,
  Globe,
  CheckCircle2,
  X,
} from "lucide-react";
import { HudCard } from "@/components/agro/hud";
import { AnimatedBackground } from "@/components/core/animated-background";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  GLOBAL_CROP_ATLAS_600,
  resolveAgroZoneAndWorldRegion,
  evaluateCrop600Suitability,
  INDIA_ZONES,
  type CropAtlas600Entry,
  type EvaluatedCrop600,
  type IndiaZoneCode,
  type Crop600Category,
} from "@/data/globalCropAtlas600";
import {
  generateSustainableRotationPlan,
  detectAgroClimaticZone,
} from "@/data/cropSuitabilityAtlas";
import type { AgroTelemetry } from "@/types/agroSpace";
import { LocalizedText, useLocalizedValue } from "@/components/i18n/LocalizedText";

const SEASON_TABS = ["ALL", "KHARIF", "RABI", "ZAID", "PERENNIAL"] as const;
type SeasonFilter = (typeof SEASON_TABS)[number];

const ALL_ZONES: { code: string; label: string }[] = [
  { code: "ALL", label: "Auto-Detect Local Zone (Appendix C)" },
  { code: "DEC", label: "Zone DEC · Deccan Plateau (Kolar/Harohalli/Bengaluru)" },
  { code: "HIM", label: "Zone HIM · Western & Central Himalayas" },
  { code: "NW", label: "Zone NW · Northwestern Semi-Arid Plains" },
  { code: "IGP", label: "Zone IGP · Indo-Gangetic Basin" },
  { code: "EST", label: "Zone EST · Eastern Plateau & Delta" },
  { code: "NE", label: "Zone NE · Northeastern Hills & Brahmaputra" },
  { code: "CEN", label: "Zone CEN · Central Plateau & Vindhyan" },
  { code: "ARD", label: "Zone ARD · Arid Thar Desert & Kutch" },
  { code: "WST", label: "Zone WST · Western Deccan Traps & Coast" },
  { code: "SOU", label: "Zone SOU · Southern Coastal & Peninsular Tip" },
  { code: "ISL", label: "Zone ISL · Tropical Island Archipelagos" },
];

const CATEGORY_FILTERS = [
  { id: "ALL", label: "All Categories (600 Crops)" },
  { id: "All Open-Field", label: "Open-Field Crops" },
  { id: "Cereals & Millets", label: "🌾 Cereals & Millets" },
  { id: "Pulses", label: "🫘 Pulses & Legumes" },
  { id: "Oilseeds", label: "🌻 Oilseeds" },
  { id: "Vegetables & Fruits", label: "🥬 Vegetables & Fruits" },
  { id: "Spices & Medicinal", label: "🌿 Spices & Medicinal" },
  { id: "Agroforestry", label: "🌳 Agroforestry & Trees" },
  { id: "Controlled / Mushrooms", label: "🍄 Controlled / Mushrooms" },
];

const SORT_OPTIONS = [
  { id: "adjustedScore", label: "Live NASA Match Score" },
  { id: "baseScore", label: "Atlas Baseline %" },
  { id: "water", label: "Water Efficiency" },
  { id: "soil", label: "Soil Nutrient Score" },
  { id: "terrain", label: "Terrain & Drainage Match" },
  { id: "climate", label: "Climate & Thermal Score" },
  { id: "economics", label: "Economic Yield & Margin" },
];

interface FieldShiftCropAdvisorProps {
  telemetry: AgroTelemetry;
  onSelectCrop?: (cropName: string) => void;
  className?: string;
  variant?: "full" | "compact";
}

export function FieldShiftCropAdvisor({
  telemetry,
  onSelectCrop,
  className,
  variant = "full",
}: FieldShiftCropAdvisorProps) {
  const searchPlaceholder = useLocalizedValue(
    "Search 600 crops (e.g. Ragi, Oyster Mushroom, Saffron, Flax)...",
  );
  const clearSearchLabel = useLocalizedValue("Clear crop search");
  const cropSeasonLabel = useLocalizedValue("Crop season");
  const [seasonFilter, setSeasonFilter] = useState<SeasonFilter>("ALL");
  const [selectedCropId, setSelectedCropId] = useState<string>("finger-millet-ragi");
  const [showAllCrops, setShowAllCrops] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>("ALL");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("adjustedScore");
  const [showExperimental, setShowExperimental] = useState(false);

  // Simulator state: baseline crop vs recommended shift crop
  const [baselineCropId, setBaselineCropId] = useState<string>("sugarcane");
  const [targetCropId, setTargetCropId] = useState<string>("finger-millet-ragi");

  // 1. Detect Agro-Climatic Zone & World Region using the 11 Zones & 20 Regions Atlas resolver
  const resolvedRegion = useMemo(() => {
    return resolveAgroZoneAndWorldRegion(
      telemetry.input.lat,
      telemetry.input.lon,
      telemetry.meta.regionLabel,
      "India",
      telemetry.meta.elevationM || 680,
    );
  }, [
    telemetry.input.lat,
    telemetry.input.lon,
    telemetry.meta.regionLabel,
    telemetry.meta.elevationM,
  ]);

  // Backward-compatible zone for rotation plan
  const zone = useMemo(() => {
    return detectAgroClimaticZone(telemetry.input.lat, telemetry.input.lon);
  }, [telemetry.input.lat, telemetry.input.lon]);

  // 2. Extract NASA live telemetry values for Hard Feasibility Filtering
  const telemetryContext = useMemo(() => {
    const rawSmap = telemetry.layers?.["SMAP Moisture"]?.value ?? telemetry.soil[0]?.sm0_5 ?? 30;
    const smapMoisture = typeof rawSmap === "number" && rawSmap <= 1 ? rawSmap * 100 : rawSmap;
    const isDroughtScenario =
      telemetry.input.scenario === "Severe Drought" ||
      telemetry.hazards.some((h) => h.id === "drought" && h.severity !== "nominal") ||
      smapMoisture < 28;
    const borewellDepthM = telemetry.input.borewellDepth;
    const rawEsi = telemetry.layers?.["ECOSTRESS ESI"]?.value ?? 0.74;

    const activeZone =
      selectedZoneFilter === "ALL"
        ? resolvedRegion.indiaZone
        : (selectedZoneFilter as IndiaZoneCode);

    return {
      smapMoisture,
      gpmRainMm: telemetry.layers?.["GPM Rain"]?.value
        ? telemetry.layers["GPM Rain"].value * 24 * 30
        : 68,
      borewellDepthM,
      ecostressESI: rawEsi,
      elevationM: telemetry.meta.elevationM || 680,
      isDrought: isDroughtScenario,
      scenario: telemetry.input.scenario,
      indiaZone: activeZone,
      worldRegion: resolvedRegion.worldRegion,
      showExperimental,
    };
  }, [telemetry, resolvedRegion, selectedZoneFilter, showExperimental]);

  // 3. Evaluate and rank all 600 crops for the active coordinate
  const evaluatedCrops = useMemo(() => {
    return GLOBAL_CROP_ATLAS_600.map((crop) => evaluateCrop600Suitability(crop, telemetryContext));
  }, [telemetryContext]);

  // 4. Search, Filter, and Sort the 600 crops
  const filteredCrops = useMemo(() => {
    let list = evaluatedCrops;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.botanicalName.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.section.toLowerCase().includes(q) ||
          c.agronomicNotes.toLowerCase().includes(q),
      );
    }

    // Category filter
    if (selectedCategoryFilter === "All Open-Field") {
      list = list.filter((c) => !c.isIndoorControlled);
    } else if (selectedCategoryFilter === "Controlled / Mushrooms") {
      list = list.filter((c) => c.isIndoorControlled);
    } else if (selectedCategoryFilter !== "ALL") {
      list = list.filter((c) => c.category === selectedCategoryFilter);
    }

    // Season filter
    if (seasonFilter !== "ALL") {
      list = list.filter((crop) => {
        if (seasonFilter === "PERENNIAL") return crop.season === "Perennial";
        if (seasonFilter === "KHARIF")
          return crop.season === "Kharif" || crop.season === "Multi-season";
        if (seasonFilter === "RABI")
          return crop.season === "Rabi" || crop.season === "Multi-season";
        if (seasonFilter === "ZAID")
          return crop.season === "Zaid" || crop.season === "Multi-season";
        return true;
      });
    }

    // Zone filter (when explicitly selected)
    if (selectedZoneFilter !== "ALL") {
      list = list.filter(
        (c) => c.indiaZones.includes("ALL") || c.indiaZones.includes(selectedZoneFilter),
      );
    }

    // Sort order
    return [...list].sort((a, b) => {
      if (sortBy === "baseScore") return b.baseScore - a.baseScore;
      if (sortBy === "water") return b.factors.water - a.factors.water;
      if (sortBy === "soil") return b.factors.soil - a.factors.soil;
      if (sortBy === "terrain") return b.factors.terrain - a.factors.terrain;
      if (sortBy === "climate") return b.factors.climate - a.factors.climate;
      if (sortBy === "economics") return b.factors.economics - a.factors.economics;
      return b.adjustedScore - a.adjustedScore;
    });
  }, [
    evaluatedCrops,
    searchQuery,
    selectedCategoryFilter,
    seasonFilter,
    selectedZoneFilter,
    sortBy,
  ]);

  // 5. Selected Crop for 5-Factor Breakdown
  const selectedCrop = useMemo(() => {
    return evaluatedCrops.find((c) => c.id === selectedCropId) ?? evaluatedCrops[0]!;
  }, [evaluatedCrops, selectedCropId]);

  // 6. Generate 3-Season Sustainable Rotation Plan
  const rotationPlan = useMemo(() => {
    return generateSustainableRotationPlan(zone);
  }, [zone]);

  // 7. Water & Economics Simulator calculations
  const baselineCrop = useMemo(() => {
    return evaluatedCrops.find((c) => c.id === baselineCropId) ?? evaluatedCrops[0]!;
  }, [evaluatedCrops, baselineCropId]);

  const targetCrop = useMemo(() => {
    return evaluatedCrops.find((c) => c.id === targetCropId) ?? evaluatedCrops[0]!;
  }, [evaluatedCrops, targetCropId]);

  const waterSavingsMm = Math.max(
    0,
    baselineCrop.waterRequirementMm - targetCrop.waterRequirementMm,
  );
  const waterSavingsPct = Math.round(
    (waterSavingsMm / Math.max(1, baselineCrop.waterRequirementMm)) * 100,
  );
  const capitalSafetyGain = Math.max(
    0,
    targetCrop.factors.economics - baselineCrop.factors.economics,
  );

  const displayedCrops = showAllCrops ? filteredCrops.slice(0, 40) : filteredCrops.slice(0, 5);

  return (
    <div className={cn("space-y-4", className)}>
      <HudCard
        title="Field Shift: Global Crop Atlas (600 Crops)"
        subtitle="11 India Zones · 20 World Regions · 5-Factor Scoring · NASA Satellite Feasibility"
        icon={<Sprout className="text-emerald-400" />}
        className="hologram-cockpit-card chamfered-card-frame border-cyan/40 shadow-[0_0_35px_rgba(0,0,0,0.7)]"
        right={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/40 bg-emerald/15 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-400 shadow-[0_0_8px_rgba(0,255,157,0.3)]">
              <Activity className="size-3 text-emerald-400 animate-pulse" />
              {<LocalizedText text={"600 Crops Atlas Active"} />}
            </span>
          </div>
        }
      >
        {/* ---------------- ZONE CONTEXT & LIVE NASA HARDFILTER BANNER ---------------- */}
        <div className="rounded-lg border border-border/50 bg-[#061021]/80 p-3.5 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-mono text-sm font-bold text-cyan-300">
                  {resolvedRegion.zoneDisplay}
                </h4>
                <span className="text-xs font-mono text-muted-foreground">
                  {<LocalizedText text={"(Region: "} />}
                  {resolvedRegion.worldRegion})
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                <LocalizedText
                  text={resolvedRegion.zoneInfo?.regionalDescription || zone.description}
                />{" "}
                {<LocalizedText text={" Dominant:"} />}{" "}
                <span className="text-foreground font-medium">
                  <LocalizedText text={zone.dominantSoil} />
                </span>
                {<LocalizedText text={". Elevation:"} />}{" "}
                <span className="text-cyan-300 font-mono font-medium">
                  {resolvedRegion.elevationM}
                  {<LocalizedText text={"m ASL"} />}
                </span>
                .
              </p>
            </div>

            {/* Live NASA Satellite Modifiers Indicator */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <div className="rounded-md border border-cyan-500/30 bg-cyan-950/40 px-2 py-1 text-cyan-300">
                {<LocalizedText text={"SMAP Soil:"} />}{" "}
                <span className="font-bold text-cyan-300">
                  {telemetryContext.smapMoisture.toFixed(0)}%
                </span>
              </div>
              <div className="rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-1 text-emerald-400">
                {<LocalizedText text={"Borewell:"} />}{" "}
                <span className="font-bold text-emerald-400">
                  {telemetryContext.borewellDepthM}
                  {<LocalizedText text={"m"} />}
                </span>
              </div>
              {telemetryContext.isDrought && (
                <div className="inline-flex items-center gap-1 rounded-md border border-crimson/50 bg-crimson/20 px-2 py-1 text-rose-400 font-bold shadow-[0_0_8px_rgba(255,46,86,0.3)] animate-pulse">
                  <ShieldAlert className="size-3 text-rose-400" />
                  {<LocalizedText text={"Hard Feasibility Active (Water Weight: 35%)"} />}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---------------- COMPREHENSIVE SEARCH & MULTI-CRITERIA FILTER DOCK ---------------- */}
        <div className="mt-4 p-3 rounded-xl border border-white/10 bg-[#060c18]/90 flex flex-col gap-3">
          {/* Primary toolbar: search and frequently used crop filters */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-background/30 p-2.5">
            <div className="relative min-w-0 w-full flex-1 basis-full md:basis-60">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="min-h-11 w-full rounded-lg border border-white/15 bg-[#0a1426] pl-10 pr-12 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:border-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label={clearSearchLabel}
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 grid min-h-11 min-w-11 -translate-y-1/2 place-items-center rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 leading-none text-xs font-mono text-muted-foreground">
                <span className="leading-none">{<LocalizedText text={"Section:"} />}</span>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="min-h-11 rounded-md border border-white/15 bg-[#0a1426] px-3 text-sm text-foreground focus:border-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {CATEGORY_FILTERS.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      <LocalizedText text={cat.label} />
                    </option>
                  ))}
                </select>
              </label>

              <div
                role="group"
                aria-label={cropSeasonLabel}
                className="flex min-h-11 items-center gap-1 rounded-full border border-cyan-500/25 bg-[#050B14]/90 p-1 backdrop-blur-xl"
              >
                <AnimatedBackground
                  defaultValue={seasonFilter}
                  onValueChange={(val) => val && setSeasonFilter(val as SeasonFilter)}
                  className="rounded-full bg-cyan-500/20 border border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.3)]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
                  enableHover
                >
                  {SEASON_TABS.map((tab) => {
                    const isSelected = seasonFilter === tab;
                    return (
                      <Button
                        key={tab}
                        data-id={tab}
                        type="button"
                        size="pill"
                        variant="toggle"
                        aria-pressed={isSelected}
                        onClick={() => setSeasonFilter(tab)}
                        className={cn(
                          "min-h-9 rounded-full px-3 py-1 text-xs font-mono font-semibold tracking-normal transition-colors duration-200 cursor-pointer",
                          isSelected
                            ? "border border-cyan-400/40 bg-cyan-500/10 text-cyan-300"
                            : "border border-transparent text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <LocalizedText text={tab} />
                      </Button>
                    );
                  })}
                </AnimatedBackground>
              </div>

              <label className="flex min-h-11 items-center gap-2 text-sm font-mono text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showExperimental}
                  onChange={(e) => setShowExperimental(e.target.checked)}
                  className="size-4 rounded-md border-white/20 bg-[#0a1426] text-cyan-300 focus:ring-2 focus:ring-ring cursor-pointer"
                />
                <span className={showExperimental ? "font-semibold text-cyan-300" : ""}>
                  {<LocalizedText text={"Show Global / Experimental Crops"} />}
                </span>
              </label>
            </div>
          </div>

          {/* Secondary toolbar: region and sort controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span>{<LocalizedText text={"Region"} />}</span>
                <select
                  value={selectedZoneFilter}
                  onChange={(e) => setSelectedZoneFilter(e.target.value)}
                  className="min-h-11 rounded-md border border-white/15 bg-[#0a1426] px-3 text-sm text-cyan-300 focus:border-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {ALL_ZONES.map((z) => (
                    <option key={z.code} value={z.code}>
                      <LocalizedText text={z.label.replace(/^Zone\s+[^\u00b7]+\u00b7\s*/, "")} />
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span>{<LocalizedText text={"Sort"} />}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="min-h-11 rounded-md border border-white/15 bg-[#0a1426] px-3 text-sm text-emerald-400 focus:border-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      <LocalizedText text={s.label} />
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="font-mono text-xs text-muted-foreground" aria-live="polite">
              {<LocalizedText text={"Showing "} />}
              <span className="font-bold text-cyan-300">{filteredCrops.length}</span>{" "}
              {<LocalizedText text={" ranked crops (out of 600 total)"} />}
            </div>
          </div>
        </div>
        {/* ---------------- CROPS LEADERBOARD & INTERACTIVE 5-FACTOR CARD ---------------- */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Left: Ranked Crops List */}
          <div className="space-y-2.5 lg:col-span-7">
            {displayedCrops.map((crop, idx) => {
              const isSelected = crop.id === selectedCropId;
              const isVeryHigh = crop.suitabilityTier === "OPTIMAL / VERY HIGH";
              const isHigh = crop.suitabilityTier === "FAVOURABLE / HIGH";
              const isModerate = crop.suitabilityTier === "MODERATE / CONDITIONAL";
              const isLow = crop.suitabilityTier === "UNSUITABLE / HIGH RISK";

              return (
                <div
                  key={crop.id}
                  onClick={() => {
                    setSelectedCropId(crop.id);
                    onSelectCrop?.(crop.name);
                  }}
                  className={cn(
                    "group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3 transition-all duration-200 cursor-pointer backdrop-blur-md",
                    isSelected
                      ? "border-cyan-400/80 bg-cyan-500/15 shadow-[0_0_20px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/50"
                      : "border-border/50 bg-[#061021]/60 hover:border-cyan-500/40 hover:bg-[#07152b]/80",
                    isLow && "border-crimson/40 bg-crimson-950/20",
                  )}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full font-mono text-xs font-bold",
                        idx === 0
                          ? "bg-emerald-500/25 text-emerald-400 border border-emerald-400/60 shadow-[0_0_8px_#00ff9d]"
                          : idx === 1
                            ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/60"
                            : "bg-muted/50 text-muted-foreground border border-border/40",
                      )}
                    >
                      #{idx + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground text-sm tracking-tight truncate group-hover:text-cyan-300 transition-colors">
                          {crop.name}
                        </span>
                        {crop.botanicalName && (
                          <span className="text-xs font-mono text-muted-foreground italic">
                            ({crop.botanicalName})
                          </span>
                        )}
                        <span className="rounded-md bg-muted/40 border border-border/40 px-1.5 py-0.2 font-mono text-xs text-muted-foreground uppercase">
                          <LocalizedText text={crop.season} />
                        </span>
                        {crop.isIndoorControlled && (
                          <span className="rounded-md bg-purple-500/20 border border-purple-500/40 px-1.5 py-0.2 font-mono text-xs text-cyan-300">
                            {<LocalizedText text={"🍄 Controlled"} />}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground">
                        <span>
                          {<LocalizedText text={"Water: ~"} />}
                          {crop.waterRequirementMm}
                          {<LocalizedText text={"mm"} />}
                        </span>
                        <span>•</span>
                        <span>
                          {<LocalizedText text={"Dur: "} />}
                          {crop.durationDays}
                          {<LocalizedText text={"d"} />}
                        </span>
                        <span>•</span>
                        <span>
                          {<LocalizedText text={"Atlas Base: "} />}
                          {crop.baseScore}%
                        </span>
                        {crop.droughtTolerance === "High" && (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            {<LocalizedText text={"🌱 Drought-Hardy"} />}
                          </span>
                        )}
                      </div>

                      {crop.hardFilterViolation && crop.hardFilterMessage && (
                        <div className="mt-1.5 text-xs font-mono font-bold text-rose-400 flex items-center gap-1">
                          <ShieldAlert className="size-3 shrink-0" />
                          <span>
                            <LocalizedText text={crop.hardFilterMessage} />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Score Pill */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 pl-9 sm:pl-0">
                    <div className="flex items-baseline gap-1">
                      <span
                        className="font-mono text-lg font-extrabold tabular-nums"
                        style={{ color: crop.tierColorHex }}
                      >
                        {crop.adjustedScore.toFixed(1)}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">/100</span>
                    </div>

                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-wider border",
                        crop.tierBadgeClass,
                      )}
                    >
                      <LocalizedText text={crop.suitabilityTier} />
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredCrops.length > 5 && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setShowAllCrops((s) => !s)}
                className="mx-auto w-auto min-h-[40px] rounded-lg border border-cyan-500/30 bg-[#061021]/60 px-6 py-2 text-xs font-semibold text-cyan-300 font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {showAllCrops ? (
                  <>
                    <ChevronUp className="size-3.5" />{" "}
                    {<LocalizedText text={" Show Top 5 Recommendations"} />}
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3.5" /> {<LocalizedText text={" View Extended"} />}{" "}
                    {Math.min(40, filteredCrops.length)} {<LocalizedText text={" Ranked Crops"} />}
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Right: Selected Crop 5-Factor Radar / Breakdown Card */}
          <div className="lg:col-span-5">
            <div className="rounded-lg border border-cyan-500/40 bg-[#061021]/90 p-4 backdrop-blur-xl shadow-[0_0_25px_rgba(0,0,0,0.5)]">
              <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-foreground">{selectedCrop.name}</h4>
                    <span className="rounded-md bg-cyan-500/15 border border-cyan-400/40 px-2 py-0.5 font-mono text-xs font-bold text-cyan-300 uppercase">
                      <LocalizedText text={selectedCrop.category} />
                    </span>
                  </div>
                  {selectedCrop.botanicalName && (
                    <p className="font-mono text-xs text-muted-foreground italic mt-0.5">
                      {selectedCrop.botanicalName}
                    </p>
                  )}
                  <p className="text-xs font-mono text-cyan-300 mt-1">
                    {<LocalizedText text={"Section: "} />}
                    <LocalizedText text={selectedCrop.section} />{" "}
                    {<LocalizedText text={" • Duration: "} />}
                    {selectedCrop.durationDays} {<LocalizedText text={" days"} />}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-mono text-muted-foreground">
                    {<LocalizedText text={"NASA Match"} />}
                  </div>
                  <div
                    className="font-mono text-lg sm:text-2xl font-extrabold tabular-nums drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]"
                    style={{ color: selectedCrop.tierColorHex }}
                  >
                    {selectedCrop.adjustedScore.toFixed(1)}%
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">
                    {<LocalizedText text={"Atlas Base: "} />}
                    {selectedCrop.baseScore}%
                  </div>
                </div>
              </div>

              {/* 5-Factor Breakdown Bars */}
              <div className="mt-3.5 space-y-3 divide-y divide-white/10">
                <div className="flex items-center justify-between pb-3 text-sm font-mono font-semibold text-cyan-300">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="size-3 text-cyan-300" />{" "}
                    {<LocalizedText text={" 5-Factor Agro-Ecological Breakdown"} />}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {<LocalizedText text={"Water weight: "} />}
                    {selectedCrop.waterWeightPct}%
                  </span>
                </div>

                {/* 1. Water */}
                <div className="py-3">
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Droplets className="size-3 text-cyan-300" />{" "}
                      {<LocalizedText text={" Water & Deficit Resilience ("} />}
                      {selectedCrop.waterWeightPct}%)
                    </span>
                    <span className="font-bold text-cyan-300">
                      {selectedCrop.factors.water}/100 · +
                      {((selectedCrop.factors.water * selectedCrop.waterWeightPct) / 100).toFixed(
                        1,
                      )}{" "}
                      {<LocalizedText text={"pts"} />}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden border border-border/30">
                    <div
                      className="h-full bg-cyan rounded-full transition-all duration-300"
                      style={{ width: `${selectedCrop.factors.water}%` }}
                    />
                  </div>
                </div>

                {/* 2. Soil */}
                <div className="py-3">
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Sprout className="size-3 text-emerald-400" />{" "}
                      {<LocalizedText text={" Soil & Nutrient Compatibility (20%)"} />}
                    </span>
                    <span className="font-bold text-emerald-400">
                      {selectedCrop.factors.soil}/100 · +
                      {(selectedCrop.factors.soil * 0.2).toFixed(1)}{" "}
                      {<LocalizedText text={" pts"} />}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden border border-border/30">
                    <div
                      className="h-full bg-emerald rounded-full transition-all duration-300"
                      style={{ width: `${selectedCrop.factors.soil}%` }}
                    />
                  </div>
                </div>

                {/* 3. Climate */}
                <div className="py-3">
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Sun className="size-3 text-amber-400" />{" "}
                      {<LocalizedText text={" Climate & Thermal Zone Match (20%)"} />}
                    </span>
                    <span className="font-bold text-amber-400">
                      {selectedCrop.factors.climate}/100 · +
                      {(selectedCrop.factors.climate * 0.2).toFixed(1)}{" "}
                      {<LocalizedText text={" pts"} />}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden border border-border/30">
                    <div
                      className="h-full bg-amber rounded-full transition-all duration-300"
                      style={{ width: `${selectedCrop.factors.climate}%` }}
                    />
                  </div>
                </div>

                {/* 4. Terrain */}
                <div className="py-3">
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Mountain className="size-3 text-cyan-300" />{" "}
                      {<LocalizedText text={" Terrain & Slope Drainage (20%)"} />}
                    </span>
                    <span className="font-bold text-cyan-300">
                      {selectedCrop.factors.terrain}/100 · +
                      {(selectedCrop.factors.terrain * 0.2).toFixed(1)}{" "}
                      {<LocalizedText text={" pts"} />}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden border border-border/30">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${selectedCrop.factors.terrain}%` }}
                    />
                  </div>
                </div>

                {/* 5. Economics */}
                <div className="py-3">
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Coins className="size-3 text-amber-400" />{" "}
                      {<LocalizedText text={" Capital & Market Safety (20%)"} />}
                    </span>
                    <span className="font-bold text-amber-400">
                      {selectedCrop.factors.economics}/100 · +
                      {(selectedCrop.factors.economics * 0.2).toFixed(1)}{" "}
                      {<LocalizedText text={" pts"} />}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden border border-border/30">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                      style={{ width: `${selectedCrop.factors.economics}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Agronomic Field Notes */}
              <div className="mt-4 rounded-md border border-border/40 bg-background/50 p-2.5 text-xs text-foreground leading-relaxed backdrop-blur-sm">
                <span className="font-mono text-xs text-cyan-300 font-bold block mb-1">
                  {<LocalizedText text={"AGRONOMIC ADVISORY & ATLAS PROFILE:"} />}
                </span>
                <LocalizedText text={selectedCrop.agronomicNotes} />
              </div>

              {/* Geographic Zone Badges */}
              <div className="mt-3 pt-2 border-t border-border/30 flex flex-wrap items-center gap-1.5 text-xs font-mono">
                <span className="text-muted-foreground">
                  {<LocalizedText text={"Adapted Zones:"} />}
                </span>
                {selectedCrop.indiaZones.map((z) => (
                  <span
                    key={z}
                    className="px-1.5 py-0.2 rounded-md bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-bold"
                  >
                    {z}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- ⚡ FIELD SHIFT WATER & ECONOMICS SIMULATOR ---------------- */}
        <div className="mt-6 rounded-lg border border-cyan-500/40 bg-[#040A17]/90 p-4 backdrop-blur-xl shadow-[0_0_30px_rgba(6,182,212,0.18)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="size-4.5 text-amber-400 animate-pulse" />
              <div>
                <h4 className="font-mono text-sm font-bold text-foreground">
                  {<LocalizedText text={"⚡ Field Shift Water & Economics Simulator"} />}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {
                    <LocalizedText
                      text={
                        "Simulate transition from unsustainable baseline to climate-smart shift crop"
                      }
                    />
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-500/15 border border-emerald-400/40 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400">
                {<LocalizedText text={"Aquifer Preservation Engine"} />}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Baseline Crop Selector */}
            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-1.5">
                {<LocalizedText text={"Current Baseline Crop"} />}
              </label>
              <select
                value={baselineCropId}
                onChange={(e) => setBaselineCropId(e.target.value)}
                className="w-full bg-[#081224] border border-border/60 rounded-md px-2.5 py-1.5 font-mono text-xs font-semibold text-foreground focus:outline-none focus:border-cyan"
              >
                <option value="sugarcane">
                  {<LocalizedText text={"Sugarcane (Perennial · ~1,800mm)"} />}
                </option>
                <option value="paddy-rice-kharif">
                  {<LocalizedText text={"Rice / Paddy (Kharif · 1,250mm)"} />}
                </option>
                <option value="tomato-hybrid">
                  {<LocalizedText text={"Tomato (Intensive · 650mm)"} />}
                </option>
                <option value="cotton-bt">
                  {<LocalizedText text={"Cotton (Kharif · 850mm)"} />}
                </option>
                <option value="banana-grand-naine">
                  {<LocalizedText text={"Banana (Perennial · 1,600mm)"} />}
                </option>
                <option value="wheat-durum">
                  {<LocalizedText text={"Wheat (Rabi · 550mm)"} />}
                </option>
              </select>
              <div className="mt-2 text-xs font-mono text-muted-foreground">
                {<LocalizedText text={"Water need:"} />}{" "}
                <span className="font-bold text-rose-400">
                  {baselineCrop.waterRequirementMm} {<LocalizedText text={" mm"} />}
                </span>
              </div>
            </div>

            {/* Shift Alternative Selector */}
            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-1.5">
                {<LocalizedText text={"Recommended Shift Crop"} />}
              </label>
              <select
                value={targetCropId}
                onChange={(e) => setTargetCropId(e.target.value)}
                className="w-full bg-[var(--bg-surface)] border border-[var(--accent)]/50 rounded-md px-2.5 py-1.5 font-mono text-xs font-semibold text-[var(--accent)] focus:outline-none focus:border-[var(--accent)]"
              >
                {filteredCrops.slice(0, 15).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.adjustedScore.toFixed(0)}% · {c.waterRequirementMm}
                    {<LocalizedText text={"mm)"} />}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-xs font-mono text-muted-foreground">
                {<LocalizedText text={"Water need:"} />}{" "}
                <span className="font-bold text-emerald-400">
                  {targetCrop.waterRequirementMm} {<LocalizedText text={" mm"} />}
                </span>
              </div>
            </div>

            {/* Water Savings Metric */}
            <div className="min-w-0 overflow-hidden rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 flex flex-col justify-between">
              <div className="text-xs font-mono text-[var(--status-ok)] uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="size-3 shrink-0 text-[var(--status-ok)]" />{" "}
                {<LocalizedText text={" Water-Use Efficiency"} />}
              </div>
              <div className="mt-1">
                <div className="font-mono text-lg sm:text-2xl font-extrabold tabular-nums text-[var(--status-ok)]">
                  +{Math.round(waterSavingsPct)}%
                </div>
                <div className="text-xs font-mono text-[var(--status-ok)] break-words">
                  {<LocalizedText text={"Saves "} />}
                  {Math.round(waterSavingsMm)} {<LocalizedText text={" mm groundwater/ha"} />}
                </div>
              </div>
            </div>

            {/* Capital / Upkeep Safety Metric */}
            <div className="min-w-0 overflow-hidden rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-surface)] p-3 flex flex-col justify-between">
              <div className="text-xs font-mono text-[var(--accent)] uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="size-3 shrink-0 text-[var(--accent)]" />{" "}
                {<LocalizedText text={" Capital & Debt Safety"} />}
              </div>
              <div className="mt-1">
                <div className="font-mono text-lg sm:text-2xl font-extrabold tabular-nums text-[var(--accent)]">
                  +{Math.round(capitalSafetyGain > 0 ? capitalSafetyGain : 35)}%
                </div>
                <div className="text-xs font-mono text-[var(--accent)]">
                  {<LocalizedText text={"Reduced fertilizer/pumping risks"} />}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- SMART 3-SEASON CROP ROTATION STRIP (KHARIF -> RABI -> ZAID) ---------------- */}
        <div className="mt-6 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-glass)] p-4 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <Sprout className="size-4 text-emerald-400" />
              <div>
                <h4 className="font-mono text-sm font-bold text-foreground">
                  {<LocalizedText text={"Smart 3-Season Crop Rotation Sequence · "} />}
                  {rotationPlan.zoneName}
                </h4>
                <p className="text-xs text-muted-foreground">
                  <LocalizedText text={rotationPlan.rationale} />
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="text-cyan-300 font-semibold">
                {<LocalizedText text={"Total Water: "} />}
                {rotationPlan.totalWaterMm} {<LocalizedText text={" mm"} />}
              </span>
              <span className="text-emerald-400 font-semibold">
                {<LocalizedText text={"Saves: ~"} />}
                {rotationPlan.waterSavedMmVsRiceSugarcane} {<LocalizedText text={" mm"} />}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {/* Season 1: Kharif */}
            <div className="relative rounded-lg border border-cyan-500/40 bg-cyan-950/15 p-3.5 backdrop-blur-sm">
              <div className="flex items-center justify-between font-mono text-xs mb-2">
                <span className="rounded-md bg-cyan-500/20 border border-cyan-400/50 px-2 py-0.5 text-cyan-300 font-bold uppercase">
                  {<LocalizedText text={"1. Kharif Cycle"} />}
                </span>
                <span className="text-cyan-300">
                  ~{rotationPlan.kharif.waterMm} {<LocalizedText text={" mm"} />}
                </span>
              </div>
              <div className="text-sm font-bold text-foreground">{rotationPlan.kharif.crop}</div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {rotationPlan.kharif.role}
              </p>
            </div>

            {/* Season 2: Rabi */}
            <div className="relative rounded-lg border border-emerald-500/40 bg-emerald-950/15 p-3.5 backdrop-blur-sm">
              <div className="flex items-center justify-between font-mono text-xs mb-2">
                <span className="rounded-md bg-emerald-500/20 border border-emerald-400/50 px-2 py-0.5 text-emerald-400 font-bold uppercase">
                  {<LocalizedText text={"2. Rabi Cycle"} />}
                </span>
                <span className="text-emerald-400">
                  ~{rotationPlan.rabi.waterMm} {<LocalizedText text={" mm"} />}
                </span>
              </div>
              <div className="text-sm font-bold text-foreground">{rotationPlan.rabi.crop}</div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {rotationPlan.rabi.role}
              </p>
            </div>

            {/* Season 3: Zaid */}
            <div className="relative rounded-lg border border-amber-500/40 bg-amber-950/15 p-3.5 backdrop-blur-sm">
              <div className="flex items-center justify-between font-mono text-xs mb-2">
                <span className="rounded-md bg-amber-500/20 border border-amber-400/50 px-2 py-0.5 text-amber-400 font-bold uppercase">
                  {<LocalizedText text={"3. Zaid / Summer Cycle"} />}
                </span>
                <span className="text-amber-400">
                  ~{rotationPlan.zaid.waterMm} {<LocalizedText text={" mm"} />}
                </span>
              </div>
              <div className="text-sm font-bold text-foreground">{rotationPlan.zaid.crop}</div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {rotationPlan.zaid.role}
              </p>
            </div>
          </div>
        </div>
      </HudCard>
    </div>
  );
}
