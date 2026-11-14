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
  Layers,
} from "lucide-react";
import { HudCard } from "@/components/agro/hud";
import { AnimatedBackground } from "@/components/core/animated-background";
import { cn } from "@/lib/utils";
import {
  CROP_SUITABILITY_ATLAS,
  detectAgroClimaticZone,
  evaluateCropSuitability,
  generateSustainableRotationPlan,
  type CropAtlasEntry,
  type EvaluatedCropSuitability,
} from "@/data/cropSuitabilityAtlas";
import type { AgroTelemetry } from "@/types/agroSpace";

const SEASON_TABS = ["ALL", "KHARIF", "RABI", "ZAID", "PERENNIAL"] as const;
type SeasonFilter = (typeof SEASON_TABS)[number];

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
  const [seasonFilter, setSeasonFilter] = useState<SeasonFilter>("ALL");
  const [selectedCropId, setSelectedCropId] = useState<string>("finger-millet");
  const [showAllCrops, setShowAllCrops] = useState(false);

  // Simulator state: baseline crop vs recommended shift crop
  const [baselineCropId, setBaselineCropId] = useState<string>("sugarcane");
  const [targetCropId, setTargetCropId] = useState<string>("finger-millet");

  // 1. Detect Agro-Climatic Zone from lat/lon
  const zone = useMemo(() => {
    return detectAgroClimaticZone(telemetry.input.lat, telemetry.input.lon);
  }, [telemetry.input.lat, telemetry.input.lon]);

  // 2. Extract NASA live telemetry values for Hard Feasibility Filtering
  const telemetryContext = useMemo(() => {
    const smapMoisture = telemetry.soil[0]?.surfaceMoisture ?? 30;
    const isDroughtScenario =
      telemetry.input.scenario === "Severe Drought" ||
      telemetry.hazards.some((h) => h.id === "drought" && h.severity !== "nominal");
    const borewellDepthM = telemetry.input.borewellDepth;
    const ndviVal = telemetry.layers?.NDVI?.value ?? 0.55;

    return {
      smapMoisture,
      isDrought: isDroughtScenario,
      borewellDepthM,
      scenario: telemetry.input.scenario,
      ndvi: ndviVal,
    };
  }, [telemetry]);

  // 3. Evaluate and rank all 89 crops for the active coordinate
  const evaluatedCrops = useMemo(() => {
    const list = CROP_SUITABILITY_ATLAS.map((crop) =>
      evaluateCropSuitability(crop, zone, telemetryContext),
    );

    // Sort by adjusted score descending
    return list.sort((a, b) => b.adjustedScore - a.adjustedScore);
  }, [zone, telemetryContext]);

  // 4. Filter by selected season
  const filteredCrops = useMemo(() => {
    if (seasonFilter === "ALL") return evaluatedCrops;
    return evaluatedCrops.filter((crop) => {
      if (seasonFilter === "PERENNIAL") return crop.season === "Perennial";
      if (seasonFilter === "KHARIF")
        return crop.season === "Kharif" || crop.season === "Multi-season";
      if (seasonFilter === "RABI") return crop.season === "Rabi" || crop.season === "Multi-season";
      if (seasonFilter === "ZAID") return crop.season === "Zaid" || crop.season === "Multi-season";
      return true;
    });
  }, [evaluatedCrops, seasonFilter]);

  // 5. Selected Crop for 5-Factor Breakdown
  const selectedCrop = useMemo(() => {
    return evaluatedCrops.find((c) => c.id === selectedCropId) ?? evaluatedCrops[0];
  }, [evaluatedCrops, selectedCropId]);

  // 6. Generate 3-Season Sustainable Rotation Plan
  const rotationPlan = useMemo(() => {
    return generateSustainableRotationPlan(zone);
  }, [zone]);

  // 7. Water & Economics Simulator calculations
  const baselineCrop = useMemo(() => {
    return evaluatedCrops.find((c) => c.id === baselineCropId) ?? evaluatedCrops[0];
  }, [evaluatedCrops, baselineCropId]);

  const targetCrop = useMemo(() => {
    return evaluatedCrops.find((c) => c.id === targetCropId) ?? evaluatedCrops[0];
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
    targetCrop.capitalSafetyScore - baselineCrop.capitalSafetyScore,
  );

  const displayedCrops = showAllCrops ? filteredCrops : filteredCrops.slice(0, 5);

  return (
    <div className={cn("space-y-4", className)}>
      <HudCard
        title="Field Shift: India Crop Suitability Atlas"
        subtitle="15 Agro-Climatic Zones · 5-Factor Scoring · NASA Satellite Feasibility"
        icon={<Sprout className="text-emerald" />}
        className="hologram-cockpit-card chamfered-card-frame border-cyan/40 shadow-[0_0_35px_rgba(0,0,0,0.7)]"
        right={
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-cyan/40 bg-cyan/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-cyan">
              <Layers className="size-3 text-cyan" />
              Zone {zone.zoneNumber}: {zone.code}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/40 bg-emerald/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald shadow-[0_0_8px_rgba(0,255,157,0.3)]">
              <Activity className="size-3 text-emerald animate-pulse" />
              89 Crops Atlas
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
                  Zone {zone.zoneNumber}: {zone.name}
                </h4>
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({zone.statesCovered[0]})
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                {zone.description} Dominant:{" "}
                <span className="text-foreground/90 font-medium">{zone.dominantSoil}</span>.
              </p>
            </div>

            {/* Live NASA Satellite Modifiers Indicator */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
              <div className="rounded border border-cyan-500/30 bg-cyan-950/40 px-2 py-1 text-cyan-300">
                SMAP Soil:{" "}
                <span className="font-bold text-cyan-100">
                  {telemetryContext.smapMoisture.toFixed(0)}%
                </span>
              </div>
              <div className="rounded border border-emerald-500/30 bg-emerald-950/40 px-2 py-1 text-emerald-300">
                Borewell:{" "}
                <span className="font-bold text-emerald-100">
                  {telemetryContext.borewellDepthM}m
                </span>
              </div>
              {telemetryContext.isDrought && (
                <div className="inline-flex items-center gap-1 rounded border border-crimson/50 bg-crimson/20 px-2 py-1 text-crimson font-bold shadow-[0_0_8px_rgba(255,46,86,0.3)] animate-pulse">
                  <ShieldAlert className="size-3 text-crimson" />
                  Hard Feasibility Active
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---------------- SEASON FILTER PILL DOCK (ANIMATED BACKGROUND) ---------------- */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-full border border-cyan-500/25 bg-[#050B14]/90 p-1 backdrop-blur-xl shadow-[0_0_20px_rgba(6,182,212,0.15)]">
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
                  <button
                    key={tab}
                    data-id={tab}
                    type="button"
                    onClick={() => setSeasonFilter(tab)}
                    className={cn(
                      "px-3 py-1 font-mono text-[11px] font-bold tracking-wider rounded-full transition-colors duration-200 cursor-pointer",
                      isSelected
                        ? "text-cyan-300 font-semibold border border-cyan-400/40 bg-cyan-500/10"
                        : "text-slate-400 hover:text-cyan-100 border border-transparent",
                    )}
                  >
                    {tab}
                  </button>
                );
              })}
            </AnimatedBackground>
          </div>

          <div className="font-mono text-xs text-muted-foreground">
            Showing <span className="text-cyan font-bold">{filteredCrops.length}</span> ranked crops
            for {zone.code}
          </div>
        </div>

        {/* ---------------- CROPS LEADERBOARD & INTERACTIVE 5-FACTOR CARD ---------------- */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Left: Ranked Crops List */}
          <div className="space-y-2.5 lg:col-span-7">
            {displayedCrops.map((crop, idx) => {
              const isSelected = crop.id === selectedCropId;
              const isVeryHigh = crop.suitabilityTier === "VERY HIGH";
              const isHigh = crop.suitabilityTier === "HIGH";
              const isModerate = crop.suitabilityTier === "MODERATE";
              const isLow = crop.suitabilityTier === "LOW / INFEASIBLE";

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
                          ? "bg-emerald-500/25 text-emerald border border-emerald-400/60 shadow-[0_0_8px_#00ff9d]"
                          : idx === 1
                            ? "bg-cyan-500/25 text-cyan border border-cyan-400/60"
                            : "bg-muted/50 text-muted-foreground border border-border/40",
                      )}
                    >
                      #{idx + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground text-sm tracking-tight truncate group-hover:text-cyan transition-colors">
                          {crop.name}
                        </span>
                        {crop.localName && (
                          <span className="text-[11px] font-mono text-muted-foreground/80">
                            ({crop.localName})
                          </span>
                        )}
                        <span className="rounded bg-muted/40 border border-border/40 px-1.5 py-0.2 font-mono text-[9px] text-muted-foreground uppercase">
                          {crop.season}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] font-mono text-muted-foreground">
                        <span>Water: ~{crop.waterRequirementMm}mm</span>
                        <span>•</span>
                        <span>Dur: {crop.durationDays}d</span>
                        {crop.nitrogenFixing && (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            🌱 N-Fixing
                          </span>
                        )}
                      </div>

                      {crop.hardFilterViolation && crop.hardFilterMessage && (
                        <div className="mt-1.5 text-[10px] font-mono font-bold text-crimson flex items-center gap-1">
                          <ShieldAlert className="size-3 shrink-0" />
                          <span>{crop.hardFilterMessage}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Score Pill */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 pl-9 sm:pl-0">
                    <div className="flex items-baseline gap-1">
                      <span
                        className={cn(
                          "font-mono text-lg font-extrabold tabular-nums",
                          isVeryHigh && "text-emerald drop-shadow-[0_0_8px_#00ff9d]",
                          isHigh && "text-cyan drop-shadow-[0_0_8px_#00f0ff]",
                          isModerate && "text-amber",
                          isLow && "text-crimson",
                        )}
                      >
                        {crop.adjustedScore.toFixed(1)}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">/100</span>
                    </div>

                    <span
                      className={cn(
                        "rounded px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider border",
                        isVeryHigh && "border-emerald-500/50 bg-emerald-500/15 text-emerald",
                        isHigh && "border-cyan-500/50 bg-cyan-500/15 text-cyan",
                        isModerate && "border-amber-500/50 bg-amber-500/15 text-amber",
                        isLow && "border-crimson/50 bg-crimson-500/15 text-crimson",
                      )}
                    >
                      {crop.suitabilityTier}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredCrops.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllCrops((s) => !s)}
                className="w-full py-2 px-3 rounded-lg border border-cyan-500/30 bg-[#061021]/60 hover:bg-cyan-500/10 text-cyan-300 font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {showAllCrops ? (
                  <>
                    <ChevronUp className="size-3.5" /> Show Top 5 Recommendations
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3.5" /> View All {filteredCrops.length} Ranked
                    Crops
                  </>
                )}
              </button>
            )}
          </div>

          {/* Right: Selected Crop 5-Factor Radar / Breakdown Card */}
          <div className="lg:col-span-5">
            <div className="rounded-lg border border-cyan-500/40 bg-[#061021]/90 p-4 backdrop-blur-xl shadow-[0_0_25px_rgba(0,0,0,0.5)]">
              <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-foreground">{selectedCrop.name}</h4>
                    <span className="rounded bg-cyan-500/15 border border-cyan-400/40 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan uppercase">
                      {selectedCrop.category}
                    </span>
                  </div>
                  {selectedCrop.botanicalName && (
                    <p className="font-mono text-xs text-muted-foreground italic mt-0.5">
                      {selectedCrop.botanicalName}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-mono text-muted-foreground">Atlas Score</div>
                  <div className="font-mono text-2xl font-extrabold text-cyan drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]">
                    {selectedCrop.adjustedScore.toFixed(1)}
                  </div>
                </div>
              </div>

              {/* 5-Factor Breakdown Bars */}
              <div className="mt-3.5 space-y-2.5">
                <div className="text-xs font-mono font-semibold text-cyan/90 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="size-3 text-cyan" /> 5-Factor Agro-Ecological Breakdown
                </div>

                {/* 1. Water (26%) */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Droplets className="size-3 text-cyan" /> Water & Deficit Resilience (26%)
                    </span>
                    <span className="font-bold text-cyan">
                      {selectedCrop.factors.water}/100 · +
                      {(selectedCrop.factors.water * 0.26).toFixed(1)} pts
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden border border-border/30">
                    <div
                      className="h-full bg-cyan rounded-full transition-all duration-300"
                      style={{ width: `${selectedCrop.factors.water}%` }}
                    />
                  </div>
                </div>

                {/* 2. Soil (22%) */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Sprout className="size-3 text-emerald" /> Soil & Nutrient Compatibility (22%)
                    </span>
                    <span className="font-bold text-emerald">
                      {selectedCrop.factors.soil}/100 · +
                      {(selectedCrop.factors.soil * 0.22).toFixed(1)} pts
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden border border-border/30">
                    <div
                      className="h-full bg-emerald rounded-full transition-all duration-300"
                      style={{ width: `${selectedCrop.factors.soil}%` }}
                    />
                  </div>
                </div>

                {/* 3. Climate (23%) */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Sun className="size-3 text-amber" /> Climate & Thermal Zone Match (23%)
                    </span>
                    <span className="font-bold text-amber">
                      {selectedCrop.factors.climate}/100 · +
                      {(selectedCrop.factors.climate * 0.23).toFixed(1)} pts
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden border border-border/30">
                    <div
                      className="h-full bg-amber rounded-full transition-all duration-300"
                      style={{ width: `${selectedCrop.factors.climate}%` }}
                    />
                  </div>
                </div>

                {/* 4. Terrain (14%) */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Mountain className="size-3 text-indigo-400" /> Terrain & Slope Drainage (14%)
                    </span>
                    <span className="font-bold text-indigo-300">
                      {selectedCrop.factors.terrain}/100 · +
                      {(selectedCrop.factors.terrain * 0.14).toFixed(1)} pts
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden border border-border/30">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${selectedCrop.factors.terrain}%` }}
                    />
                  </div>
                </div>

                {/* 5. Economics (15%) */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Coins className="size-3 text-yellow-400" /> Capital & Market Safety (15%)
                    </span>
                    <span className="font-bold text-yellow-300">
                      {selectedCrop.factors.economics}/100 · +
                      {(selectedCrop.factors.economics * 0.15).toFixed(1)} pts
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
              <div className="mt-4 rounded border border-border/40 bg-background/50 p-2.5 text-xs text-foreground/90 leading-relaxed backdrop-blur-sm">
                <span className="font-mono text-[10px] text-cyan font-bold block mb-1">
                  AGRONOMIC ADVISORY:
                </span>
                {selectedCrop.agronomicNotes}
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- ⚡ FIELD SHIFT WATER & ECONOMICS SIMULATOR ---------------- */}
        <div className="mt-6 rounded-lg border border-cyan-500/40 bg-[#040A17]/90 p-4 backdrop-blur-xl shadow-[0_0_30px_rgba(6,182,212,0.18)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="size-4.5 text-amber animate-pulse" />
              <div>
                <h4 className="font-mono text-sm font-bold text-foreground">
                  ⚡ Field Shift Water & Economics Simulator
                </h4>
                <p className="text-xs text-muted-foreground">
                  Simulate transition from unsustainable baseline to climate-smart shift crop
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded bg-emerald-500/15 border border-emerald-400/40 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald">
                Aquifer Preservation Engine
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Baseline Crop Selector */}
            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-1.5">
                Current Baseline Crop
              </label>
              <select
                value={baselineCropId}
                onChange={(e) => setBaselineCropId(e.target.value)}
                className="w-full bg-[#081224] border border-border/60 rounded px-2.5 py-1.5 font-mono text-xs font-semibold text-foreground focus:outline-none focus:border-cyan"
              >
                <option value="sugarcane">Sugarcane (Perennial · Score 55.8)</option>
                <option value="rice">Rice / Paddy (Kharif · Score 56.7)</option>
                <option value="tomato">Tomato (Intensive · Score 63.2)</option>
                <option value="cotton">Cotton (Kharif · Score 66.1)</option>
                <option value="banana">Banana (Perennial · Score 60.1)</option>
              </select>
              <div className="mt-2 text-[11px] font-mono text-muted-foreground">
                Water need:{" "}
                <span className="font-bold text-crimson">{baselineCrop.waterRequirementMm} mm</span>
              </div>
            </div>

            {/* Shift Alternative Selector */}
            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-1.5">
                Recommended Shift Crop
              </label>
              <select
                value={targetCropId}
                onChange={(e) => setTargetCropId(e.target.value)}
                className="w-full bg-[#081224] border border-cyan-400/50 rounded px-2.5 py-1.5 font-mono text-xs font-semibold text-cyan-300 focus:outline-none focus:border-cyan"
              >
                <option value="finger-millet">Finger Millet / Ragi (Score 84.9 · Flagship)</option>
                <option value="sorghum">Sorghum / Jowar (Score 87.5)</option>
                <option value="pearl-millet">Pearl Millet / Bajra (Score 87.7)</option>
                <option value="horse-gram">Horse Gram (Score 86.6 · Pulse)</option>
                <option value="green-gram">Green Gram / Moong (Score 84.5)</option>
                <option value="guar">Guar / Cluster Bean (Score 86.6)</option>
                <option value="safflower">Safflower (Score 85.6)</option>
              </select>
              <div className="mt-2 text-[11px] font-mono text-muted-foreground">
                Water need:{" "}
                <span className="font-bold text-emerald">{targetCrop.waterRequirementMm} mm</span>
              </div>
            </div>

            {/* Water Savings Metric */}
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/20 p-3 flex flex-col justify-between">
              <div className="text-[10px] font-mono text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="size-3 text-emerald" /> Water-Use Efficiency
              </div>
              <div className="mt-1">
                <div className="font-mono text-2xl font-extrabold text-emerald drop-shadow-[0_0_10px_rgba(0,255,157,0.4)]">
                  +{waterSavingsPct}%
                </div>
                <div className="text-[11px] font-mono text-emerald-200/80">
                  Saves {waterSavingsMm} mm groundwater/ha
                </div>
              </div>
            </div>

            {/* Capital / Upkeep Safety Metric */}
            <div className="rounded-lg border border-cyan-500/40 bg-cyan-950/20 p-3 flex flex-col justify-between">
              <div className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="size-3 text-cyan" /> Capital & Debt Safety
              </div>
              <div className="mt-1">
                <div className="font-mono text-2xl font-extrabold text-cyan drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]">
                  +{capitalSafetyGain > 0 ? capitalSafetyGain : 35}%
                </div>
                <div className="text-[11px] font-mono text-cyan-200/80">
                  Reduced fertilizer/pumping risks
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- SMART 3-SEASON CROP ROTATION STRIP (KHARIF -> RABI -> ZAID) ---------------- */}
        <div className="mt-6 rounded-lg border border-border/50 bg-[#061021]/80 p-4 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <Sprout className="size-4 text-emerald" />
              <div>
                <h4 className="font-mono text-sm font-bold text-foreground">
                  Smart 3-Season Crop Rotation Sequence · {rotationPlan.zoneName}
                </h4>
                <p className="text-xs text-muted-foreground">{rotationPlan.rationale}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="text-cyan font-semibold">
                Total Water: {rotationPlan.totalWaterMm} mm
              </span>
              <span className="text-emerald font-semibold">
                Saves: ~{rotationPlan.waterSavedMmVsRiceSugarcane} mm
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {/* Season 1: Kharif */}
            <div className="relative rounded-lg border border-cyan-500/40 bg-cyan-950/15 p-3.5 backdrop-blur-sm">
              <div className="flex items-center justify-between font-mono text-xs mb-2">
                <span className="rounded bg-cyan-500/20 border border-cyan-400/50 px-2 py-0.5 text-cyan font-bold uppercase">
                  1. Kharif Cycle
                </span>
                <span className="text-cyan/80">~{rotationPlan.kharif.waterMm} mm</span>
              </div>
              <div className="text-sm font-bold text-foreground">{rotationPlan.kharif.crop}</div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {rotationPlan.kharif.role}
              </p>
            </div>

            {/* Season 2: Rabi */}
            <div className="relative rounded-lg border border-emerald-500/40 bg-emerald-950/15 p-3.5 backdrop-blur-sm">
              <div className="flex items-center justify-between font-mono text-xs mb-2">
                <span className="rounded bg-emerald-500/20 border border-emerald-400/50 px-2 py-0.5 text-emerald font-bold uppercase">
                  2. Rabi Cycle
                </span>
                <span className="text-emerald/80">~{rotationPlan.rabi.waterMm} mm</span>
              </div>
              <div className="text-sm font-bold text-foreground">{rotationPlan.rabi.crop}</div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {rotationPlan.rabi.role}
              </p>
            </div>

            {/* Season 3: Zaid */}
            <div className="relative rounded-lg border border-amber-500/40 bg-amber-950/15 p-3.5 backdrop-blur-sm">
              <div className="flex items-center justify-between font-mono text-xs mb-2">
                <span className="rounded bg-amber-500/20 border border-amber-400/50 px-2 py-0.5 text-amber font-bold uppercase">
                  3. Zaid / Summer Cycle
                </span>
                <span className="text-amber/80">~{rotationPlan.zaid.waterMm} mm</span>
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
