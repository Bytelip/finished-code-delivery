/**
 * 18-crop groundwater & plant-health matcher.
 *
 * Pure function of the `AgroTelemetry` contract: the same field conditions always
 * produce the same ranking, so SSR and the browser agree. Each crop is scored on
 * four weighted pillars — water budget (30%), thermal/VPD (25%), soil chemistry &
 * texture (25%) and hazard resilience (20%).
 */
import type { AgroTelemetry, HazardType, Season, Severity, SoilChemistry } from "@/types/agroSpace";

export type CropGroupId = "cereals" | "pulses" | "oilseeds" | "commercial" | "horticulture";
export type CropClassId = "optimal" | "conditional" | "high-risk";
export type WaterDemand = "low" | "medium" | "high" | "very-high";

export interface CropProfile {
  id: string;
  /** Canonical English name; UI resolves `crop.<id>` for other languages. */
  name: string;
  group: CropGroupId;
  seasons: Season[];
  /** Crop duration, days */
  duration: number;
  /** Seasonal crop water requirement at field level, mm */
  etc: number;
  waterDemand: WaterDemand;
  /** Optimum seasonal growing degree days, base 10 °C */
  gdd: [number, number];
  /** Optimum mean air temperature, °C */
  temp: [number, number];
  /** Optimum relative humidity, % */
  rh: [number, number];
  /** Stomatal stress threshold, kPa */
  vpdMax: number;
  ph: [number, number];
  /** Soil organic carbon, g/kg */
  soc: [number, number];
  /** Available nitrogen, kg/ha */
  nitrogen: [number, number];
  /** Cation exchange capacity, cmol(+)/kg */
  cec: [number, number];
  clay: [number, number];
  sand: [number, number];
  /** 0 = lodges in wind, 1 = storm-proof */
  lodging: number;
  /** 0 = drowns, 1 = tolerates standing water */
  hypoxia: number;
  /** 0 = scorches, 1 = heat/UV proof */
  heat: number;
  yieldTPerHa: number;
  sowing: string;
  fertilizer: { n: number; p: number; k: number; note: string };
}

export const CROP_PROFILES: CropProfile[] = [
  {
    id: "ragi",
    name: "Finger Millet (Ragi)",
    group: "cereals",
    seasons: ["Kharif", "Rabi"],
    duration: 110,
    etc: 350,
    waterDemand: "low",
    gdd: [1600, 2300],
    temp: [20, 31],
    rh: [45, 80],
    vpdMax: 2.1,
    ph: [5.0, 7.5],
    soc: [3, 9],
    nitrogen: [60, 140],
    cec: [8, 22],
    clay: [15, 32],
    sand: [40, 68],
    lodging: 0.55,
    hypoxia: 0.3,
    heat: 0.8,
    yieldTPerHa: 2.6,
    sowing: "Jun 15 – Jul 20",
    fertilizer: {
      n: 50,
      p: 25,
      k: 25,
      note: "Full P and K with 50% N as basal; top-dress 25 kg N at 30 days.",
    },
  },
  {
    id: "bajra",
    name: "Pearl Millet (Bajra)",
    group: "cereals",
    seasons: ["Kharif", "Zaid"],
    duration: 85,
    etc: 400,
    waterDemand: "low",
    gdd: [1400, 2000],
    temp: [25, 36],
    rh: [35, 65],
    vpdMax: 2.4,
    ph: [6.0, 8.2],
    soc: [2, 7],
    nitrogen: [50, 120],
    cec: [6, 18],
    clay: [8, 25],
    sand: [50, 80],
    lodging: 0.5,
    hypoxia: 0.35,
    heat: 0.92,
    yieldTPerHa: 2.2,
    sowing: "Jun 20 – Jul 15",
    fertilizer: {
      n: 60,
      p: 30,
      k: 20,
      note: "Split N into basal and 25 DAS; add 15 kg/ha ZnSO₄ on sandy soils.",
    },
  },
  {
    id: "jowar",
    name: "Sorghum (Jowar)",
    group: "cereals",
    seasons: ["Kharif", "Rabi"],
    duration: 110,
    etc: 450,
    waterDemand: "medium",
    gdd: [1600, 2400],
    temp: [24, 34],
    rh: [40, 70],
    vpdMax: 2.3,
    ph: [5.8, 8.2],
    soc: [3, 8],
    nitrogen: [70, 140],
    cec: [10, 26],
    clay: [15, 36],
    sand: [35, 62],
    lodging: 0.45,
    hypoxia: 0.4,
    heat: 0.87,
    yieldTPerHa: 3.0,
    sowing: "Jun 20 – Jul 10",
    fertilizer: {
      n: 80,
      p: 40,
      k: 40,
      note: "50% N basal, remainder at 30 and 50 days; K strengthens the stalk.",
    },
  },
  {
    id: "chickpea",
    name: "Chickpea (Gram)",
    group: "pulses",
    seasons: ["Rabi"],
    duration: 105,
    etc: 350,
    waterDemand: "low",
    gdd: [1100, 1700],
    temp: [14, 27],
    rh: [40, 68],
    vpdMax: 1.9,
    ph: [6.0, 8.2],
    soc: [3, 8],
    nitrogen: [25, 70],
    cec: [10, 26],
    clay: [20, 40],
    sand: [28, 52],
    lodging: 0.75,
    hypoxia: 0.2,
    heat: 0.45,
    yieldTPerHa: 1.9,
    sowing: "Oct 25 – Nov 20",
    fertilizer: {
      n: 20,
      p: 40,
      k: 20,
      note: "Rhizobium + PSB seed treatment; keep N as a 20 kg starter only.",
    },
  },
  {
    id: "pigeonpea",
    name: "Pigeon Pea (Tur)",
    group: "pulses",
    seasons: ["Kharif"],
    duration: 165,
    etc: 400,
    waterDemand: "low",
    gdd: [1900, 2700],
    temp: [22, 33],
    rh: [50, 80],
    vpdMax: 2.2,
    ph: [6.0, 8.0],
    soc: [3, 8],
    nitrogen: [25, 60],
    cec: [10, 28],
    clay: [18, 40],
    sand: [25, 52],
    lodging: 0.35,
    hypoxia: 0.25,
    heat: 0.82,
    yieldTPerHa: 1.6,
    sowing: "Jun 15 – Jul 10",
    fertilizer: {
      n: 25,
      p: 50,
      k: 25,
      note: "Single super phosphate basal; 20 kg/ha sulphur improves pod set.",
    },
  },
  {
    id: "groundnut",
    name: "Groundnut",
    group: "oilseeds",
    seasons: ["Kharif", "Zaid"],
    duration: 115,
    etc: 500,
    waterDemand: "medium",
    gdd: [1600, 2300],
    temp: [24, 33],
    rh: [45, 75],
    vpdMax: 2.2,
    ph: [6.0, 7.5],
    soc: [3, 9],
    nitrogen: [25, 60],
    cec: [8, 20],
    clay: [10, 30],
    sand: [45, 72],
    lodging: 0.6,
    hypoxia: 0.2,
    heat: 0.72,
    yieldTPerHa: 2.4,
    sowing: "Jun 15 – Jul 05",
    fertilizer: {
      n: 25,
      p: 50,
      k: 40,
      note: "Gypsum 250 kg/ha at pegging; avoid chloride-based fertilisers.",
    },
  },
  {
    id: "soybean",
    name: "Soybean",
    group: "oilseeds",
    seasons: ["Kharif"],
    duration: 100,
    etc: 520,
    waterDemand: "medium",
    gdd: [1700, 2400],
    temp: [22, 31],
    rh: [55, 85],
    vpdMax: 1.9,
    ph: [6.0, 7.5],
    soc: [4, 10],
    nitrogen: [30, 70],
    cec: [12, 30],
    clay: [20, 40],
    sand: [25, 48],
    lodging: 0.4,
    hypoxia: 0.3,
    heat: 0.6,
    yieldTPerHa: 2.6,
    sowing: "Jun 20 – Jul 10",
    fertilizer: {
      n: 30,
      p: 60,
      k: 40,
      note: "Seed inoculant is mandatory; 20 kg/ha sulphur; N top-dress only if nodules fail.",
    },
  },
  {
    id: "mustard",
    name: "Mustard",
    group: "oilseeds",
    seasons: ["Rabi"],
    duration: 110,
    etc: 320,
    waterDemand: "low",
    gdd: [1100, 1700],
    temp: [9, 23],
    rh: [45, 75],
    vpdMax: 1.7,
    ph: [6.0, 7.8],
    soc: [3, 8],
    nitrogen: [50, 110],
    cec: [10, 22],
    clay: [15, 35],
    sand: [35, 58],
    lodging: 0.6,
    hypoxia: 0.25,
    heat: 0.3,
    yieldTPerHa: 1.8,
    sowing: "Oct 10 – Nov 05",
    fertilizer: {
      n: 60,
      p: 30,
      k: 30,
      note: "30 kg/ha sulphur through gypsum; half N basal, half at first irrigation.",
    },
  },
  {
    id: "maize",
    name: "Maize",
    group: "cereals",
    seasons: ["Kharif", "Rabi"],
    duration: 100,
    etc: 550,
    waterDemand: "medium",
    gdd: [1700, 2400],
    temp: [21, 33],
    rh: [50, 82],
    vpdMax: 2.0,
    ph: [5.8, 7.8],
    soc: [4, 11],
    nitrogen: [110, 180],
    cec: [12, 30],
    clay: [18, 38],
    sand: [28, 52],
    lodging: 0.35,
    hypoxia: 0.25,
    heat: 0.7,
    yieldTPerHa: 7.5,
    sowing: "Jun 20 – Jul 15",
    fertilizer: {
      n: 120,
      p: 60,
      k: 40,
      note: "N split 30% basal, 35% knee-high, 35% tasselling; Zn 20 kg/ha.",
    },
  },
  {
    id: "wheat",
    name: "Wheat",
    group: "cereals",
    seasons: ["Rabi"],
    duration: 125,
    etc: 450,
    waterDemand: "medium",
    gdd: [1100, 1700],
    temp: [12, 26],
    rh: [45, 75],
    vpdMax: 1.8,
    ph: [6.0, 7.8],
    soc: [3, 9],
    nitrogen: [100, 170],
    cec: [10, 26],
    clay: [16, 36],
    sand: [32, 55],
    lodging: 0.4,
    hypoxia: 0.3,
    heat: 0.48,
    yieldTPerHa: 4.8,
    sowing: "Nov 01 – Nov 25",
    fertilizer: {
      n: 120,
      p: 60,
      k: 40,
      note: "Four N splits with crown-root irrigation; 1% KCl foliar at grain filling.",
    },
  },
  {
    id: "paddy",
    name: "Paddy (Rice)",
    group: "cereals",
    seasons: ["Kharif"],
    duration: 125,
    etc: 1200,
    waterDemand: "very-high",
    gdd: [1800, 2800],
    temp: [22, 35],
    rh: [65, 96],
    vpdMax: 1.6,
    ph: [5.5, 7.2],
    soc: [4, 12],
    nitrogen: [100, 160],
    cec: [15, 36],
    clay: [28, 55],
    sand: [10, 40],
    lodging: 0.25,
    hypoxia: 0.95,
    heat: 0.55,
    yieldTPerHa: 5.2,
    sowing: "Jun 10 – Jul 05",
    fertilizer: {
      n: 100,
      p: 50,
      k: 50,
      note: "N in three splits (basal, tillering, panicle initiation); ZnSO₄ 25 kg/ha.",
    },
  },
  {
    id: "sugarcane",
    name: "Sugarcane",
    group: "commercial",
    seasons: ["Kharif", "Zaid"],
    duration: 330,
    etc: 1800,
    waterDemand: "very-high",
    gdd: [3000, 5200],
    temp: [24, 36],
    rh: [60, 90],
    vpdMax: 2.0,
    ph: [6.0, 7.6],
    soc: [5, 13],
    nitrogen: [150, 250],
    cec: [15, 36],
    clay: [24, 46],
    sand: [18, 46],
    lodging: 0.2,
    hypoxia: 0.6,
    heat: 0.75,
    yieldTPerHa: 85,
    sowing: "Jan 15 – Mar 15",
    fertilizer: {
      n: 250,
      p: 100,
      k: 120,
      note: "Three N splits with irrigation; 5 t/ha trash mulch saves ~30% water.",
    },
  },
  {
    id: "cotton",
    name: "Cotton",
    group: "commercial",
    seasons: ["Kharif"],
    duration: 180,
    etc: 700,
    waterDemand: "high",
    gdd: [2000, 2800],
    temp: [24, 36],
    rh: [40, 72],
    vpdMax: 2.4,
    ph: [6.0, 8.4],
    soc: [3, 9],
    nitrogen: [80, 150],
    cec: [12, 32],
    clay: [24, 46],
    sand: [18, 46],
    lodging: 0.5,
    hypoxia: 0.3,
    heat: 0.88,
    yieldTPerHa: 2.2,
    sowing: "May 15 – Jun 20",
    fertilizer: {
      n: 120,
      p: 60,
      k: 60,
      note: "N in three splits; K at square formation; stop late N to limit shedding.",
    },
  },
  {
    id: "tomato",
    name: "Tomato",
    group: "horticulture",
    seasons: ["Rabi", "Zaid"],
    duration: 120,
    etc: 500,
    waterDemand: "medium",
    gdd: [1500, 2200],
    temp: [18, 31],
    rh: [50, 78],
    vpdMax: 1.9,
    ph: [6.0, 7.0],
    soc: [5, 12],
    nitrogen: [80, 140],
    cec: [15, 36],
    clay: [18, 36],
    sand: [30, 52],
    lodging: 0.4,
    hypoxia: 0.25,
    heat: 0.4,
    yieldTPerHa: 28,
    sowing: "Sep 20 – Nov 10",
    fertilizer: {
      n: 120,
      p: 60,
      k: 80,
      note: "Drip fertigation in four splits; 20 kg/ha Ca+Mg prevents blossom-end rot.",
    },
  },
  {
    id: "onion",
    name: "Onion",
    group: "horticulture",
    seasons: ["Rabi"],
    duration: 120,
    etc: 450,
    waterDemand: "medium",
    gdd: [1300, 2000],
    temp: [15, 29],
    rh: [45, 72],
    vpdMax: 1.9,
    ph: [6.0, 7.6],
    soc: [4, 10],
    nitrogen: [70, 125],
    cec: [12, 28],
    clay: [16, 36],
    sand: [35, 58],
    lodging: 0.6,
    hypoxia: 0.25,
    heat: 0.5,
    yieldTPerHa: 22,
    sowing: "Oct 20 – Nov 20",
    fertilizer: {
      n: 100,
      p: 50,
      k: 60,
      note: "Basal P and K; N in three splits, stop 30 days before harvest for curing.",
    },
  },
  {
    id: "chilli",
    name: "Chilli",
    group: "horticulture",
    seasons: ["Kharif", "Rabi"],
    duration: 150,
    etc: 550,
    waterDemand: "medium",
    gdd: [1700, 2400],
    temp: [20, 33],
    rh: [50, 78],
    vpdMax: 2.0,
    ph: [6.0, 7.2],
    soc: [4, 10],
    nitrogen: [80, 140],
    cec: [15, 32],
    clay: [18, 38],
    sand: [30, 52],
    lodging: 0.45,
    hypoxia: 0.2,
    heat: 0.6,
    yieldTPerHa: 12,
    sowing: "Jun 15 – Jul 20",
    fertilizer: {
      n: 100,
      p: 50,
      k: 50,
      note: "Boron + zinc mix at flowering; 50 kg/ha K improves pungency and colour.",
    },
  },
  {
    id: "turmeric",
    name: "Turmeric",
    group: "horticulture",
    seasons: ["Kharif"],
    duration: 240,
    etc: 900,
    waterDemand: "high",
    gdd: [2200, 3800],
    temp: [21, 33],
    rh: [65, 92],
    vpdMax: 1.7,
    ph: [5.5, 7.2],
    soc: [5, 13],
    nitrogen: [90, 160],
    cec: [15, 32],
    clay: [20, 42],
    sand: [22, 46],
    lodging: 0.4,
    hypoxia: 0.3,
    heat: 0.55,
    yieldTPerHa: 25,
    sowing: "May 20 – Jun 25",
    fertilizer: {
      n: 120,
      p: 60,
      k: 90,
      note: "N in three splits under mulch; heavy K for rhizome bulking.",
    },
  },
  {
    id: "moringa",
    name: "Moringa",
    group: "horticulture",
    seasons: ["Kharif", "Zaid"],
    duration: 300,
    etc: 600,
    waterDemand: "medium",
    gdd: [2600, 5000],
    temp: [22, 36],
    rh: [40, 75],
    vpdMax: 2.5,
    ph: [6.0, 8.0],
    soc: [2, 7],
    nitrogen: [40, 90],
    cec: [6, 18],
    clay: [10, 30],
    sand: [42, 72],
    lodging: 0.6,
    hypoxia: 0.2,
    heat: 0.95,
    yieldTPerHa: 30,
    sowing: "Jun – Jul pit planting",
    fertilizer: {
      n: 60,
      p: 30,
      k: 30,
      note: "5 t/ha vermicompost; split N after every harvest cut.",
    },
  },
];

export interface CropPillarScores {
  /** Groundwater & water budget fit, 0–100 */
  water: number;
  /** Thermal, humidity & VPD fit, 0–100 */
  thermal: number;
  /** SoilGrids chemistry & texture fit, 0–100 */
  soil: number;
  /** Hazard resilience fit, 0–100 */
  hazard: number;
}

export interface CropMatch {
  id: string;
  name: string;
  group: CropGroupId;
  profile: CropProfile;
  /** Weighted 0–100 match */
  score: number;
  classification: CropClassId;
  pillars: CropPillarScores;
  seasonalETc: number;
  seasonalSupply: number;
  deficitMm: number;
  gddSeason: number;
  inSeason: boolean;
  /** Why the crop is constrained — short English diagnostics (telemetry data, not UI copy). */
  reasons: string[];
  fertilizer: string;
  irrigation: string;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round = (v: number, d = 0) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

/** 100 inside the optimum band, falling linearly to 0 across `tolerance` beyond it. */
function rangeFit(value: number, [min, max]: [number, number], tolerance: number): number {
  if (value >= min && value <= max) return 100;
  const distance = value < min ? min - value : value - max;
  return clamp(100 - (distance / Math.max(tolerance, 0.001)) * 100, 0, 100);
}

const SEVERITY_PRESSURE: Record<Severity, number> = {
  nominal: 0,
  watch: 0.18,
  warning: 0.5,
  critical: 0.85,
};

interface FieldContext {
  input: AgroTelemetry["input"];
  rain30: number;
  gwFraction: number;
  rootPct: number;
  meanT2M: number;
  meanRH: number;
  meanVPD: number;
  maxWind: number;
  gddDaily: number;
  canopyFever: number;
  minT2M: number;
  /** Effective irrigation depth the farm can deliver, mm/day */
  irrigationMmDay: number;
  hazard: Partial<Record<HazardType, Severity>>;
}

function buildContext(telemetry: AgroTelemetry): FieldContext {
  const power = telemetry.power;
  const recentSoil = telemetry.soil.slice(-7);
  const gwFraction = mean(recentSoil.map((s) => s.GWETPROF)) / 100;
  const access = mean(recentSoil.map((s) => s.borewellAccess)) / 100;
  // Pump ~5 h/day over 1 ha: L → mm = L / 10,000
  const borewellMmDay = ((telemetry.crop.borewellYieldLph * 5) / 10000) * access;
  const irrigationMmDay =
    telemetry.input.irrigation === "Rainfed"
      ? 0
      : telemetry.input.irrigation === "Drip"
        ? borewellMmDay * 0.9
        : telemetry.input.irrigation === "Borewell"
          ? borewellMmDay * 0.6
          : telemetry.input.scenario === "Severe Drought"
            ? 0.8
            : 2.1;

  const hazard: Partial<Record<HazardType, Severity>> = {};
  for (const h of telemetry.hazards) hazard[h.type] = h.severity;

  return {
    input: telemetry.input,
    rain30: power.reduce((a, p) => a + p.PRECTOTCORR, 0),
    gwFraction,
    rootPct: mean(recentSoil.map((s) => s.sm28_100)),
    meanT2M: mean(power.map((p) => p.T2M)),
    meanRH: mean(power.map((p) => p.RH2M)),
    meanVPD: mean(power.map((p) => p.VPD)),
    maxWind: Math.max(...power.map((p) => p.WS2M)),
    gddDaily: mean(power.map((p) => Math.max(0, p.T2M - 10))),
    canopyFever: mean(power.map((p) => p.TS - p.T2M)),
    minT2M: Math.min(...power.map((p) => p.T2M)),
    irrigationMmDay,
    hazard,
  };
}

/** Water budget: rain share + deliverable irrigation against the crop's seasonal ETc. */
function scoreWater(profile: CropProfile, ctx: FieldContext) {
  const rainShare = ctx.rain30 * (profile.duration / 30) * 0.72;
  const supply = rainShare + ctx.irrigationMmDay * profile.duration;
  let score = clamp(supply / profile.etc, 0, 1) * 100;
  const deepBorewell = ctx.input.borewellDepth > 35;
  const lowAquifer = ctx.gwFraction < 0.4;
  if (profile.etc >= 600 && deepBorewell) score *= 0.45;
  if (profile.etc >= 500 && lowAquifer) score *= 0.5;
  if (profile.etc >= 900 && ctx.input.irrigation === "Rainfed") score *= 0.5;
  return {
    score: clamp(score, 0, 100),
    supply: Math.round(supply),
    deficit: Math.max(0, Math.round(profile.etc - supply)),
  };
}

function scoreHazard(profile: CropProfile, ctx: FieldContext) {
  const pressure = (type: HazardType) => SEVERITY_PRESSURE[ctx.hazard[type] ?? "nominal"];
  const windPressure = Math.max(
    pressure("cyclone"),
    pressure("wind-drift"),
    clamp((ctx.maxWind - 5) / 12, 0, 0.9),
  );
  const floodPressure = Math.max(pressure("flood"), clamp((ctx.gwFraction - 0.68) / 0.3, 0, 1));
  const heatPressure = Math.max(
    pressure("thermal"),
    pressure("solar-storm") * 0.7,
    pressure("eclipse") * 0.35,
  );
  const wind = 100 * (1 - windPressure * (1 - profile.lodging));
  const flood = 100 * (1 - floodPressure * (1 - profile.hypoxia));
  const heat = 100 * (1 - heatPressure * (1 - profile.heat));
  return clamp(0.35 * wind + 0.35 * flood + 0.3 * heat, 0, 100);
}

function irrigationPrescription(profile: CropProfile, ctx: FieldContext, deficit: number): string {
  if (deficit <= 0) {
    return `No deficit: rain + ${ctx.input.irrigation.toLowerCase()} cover the ${profile.etc} mm demand. Irrigate only at critical stages.`;
  }
  const perEvent =
    ctx.input.irrigation === "Drip"
      ? 12
      : ctx.input.irrigation === "Borewell"
        ? 28
        : ctx.input.irrigation === "Canal"
          ? 40
          : 30;
  const events = Math.max(1, Math.ceil(deficit / perEvent));
  const interval = Math.max(2, Math.round(profile.duration / events));
  const source = ctx.input.irrigation === "Rainfed" ? " Rainfed plot — needs a water source." : "";
  return `Bridge ${deficit} mm with ${events} × ${perEvent} mm events, every ${interval} days (${ctx.input.irrigation.toLowerCase()}).${source}`;
}

function soilReasons(profile: CropProfile, chem: SoilChemistry): string[] {
  const out: string[] = [];
  if (chem.pH < profile.ph[0] - 0.4 || chem.pH > profile.ph[1] + 0.4) {
    out.push(`pH ${chem.pH} outside the ${profile.ph[0]}–${profile.ph[1]} band`);
  }
  if (chem.nitrogen < profile.nitrogen[0] - 20) {
    out.push(`Available N ${chem.nitrogen} kg/ha below ${profile.nitrogen[0]} kg/ha`);
  }
  if (chem.clay < profile.clay[0] - 6 || chem.clay > profile.clay[1] + 6) {
    out.push(`Clay ${chem.clay}% vs ${profile.clay[0]}–${profile.clay[1]}% target texture`);
  }
  return out;
}

function evaluateCrop(profile: CropProfile, ctx: FieldContext, chem: SoilChemistry): CropMatch {
  // 1 — water budget (30%)
  const water = scoreWater(profile, ctx);

  // 2 — thermal, humidity & VPD (25%)
  const tempFit = rangeFit(ctx.meanT2M, profile.temp, 8);
  const rhFit = rangeFit(ctx.meanRH, profile.rh, 22);
  const vpdFit =
    ctx.meanVPD <= profile.vpdMax ? 100 : clamp(100 - (ctx.meanVPD - profile.vpdMax) * 55, 0, 100);
  const gddSeason = Math.round(ctx.gddDaily * profile.duration);
  const gddSpan = Math.max(1, profile.gdd[1] - profile.gdd[0]);
  const gddFit = rangeFit(gddSeason, profile.gdd, gddSpan * 0.7);
  const thermal = 0.35 * tempFit + 0.2 * rhFit + 0.25 * vpdFit + 0.2 * gddFit;

  // 3 — soil chemistry & texture (25%)
  const soil =
    0.25 * rangeFit(chem.pH, profile.ph, 0.9) +
    0.15 * rangeFit(chem.soc, profile.soc, 2.5) +
    0.2 * rangeFit(chem.nitrogen, profile.nitrogen, 40) +
    0.15 * rangeFit(chem.cec, profile.cec, 6) +
    0.15 * rangeFit(chem.clay, profile.clay, 12) +
    0.1 * rangeFit(chem.sand, profile.sand, 15);

  // 4 — hazard resilience (20%)
  const hazard = scoreHazard(profile, ctx);

  const pillars: CropPillarScores = {
    water: Math.round(water.score),
    thermal: Math.round(thermal),
    soil: Math.round(soil),
    hazard: Math.round(hazard),
  };
  const score = Math.round(0.3 * water.score + 0.25 * thermal + 0.25 * soil + 0.2 * hazard);

  const inSeason = profile.seasons.includes(ctx.input.season);
  const constrained =
    water.score < 45 ||
    (profile.etc >= 600 && (ctx.input.borewellDepth > 35 || ctx.gwFraction < 0.4));
  const classification: CropClassId = constrained
    ? "high-risk"
    : score >= 68 && water.score >= 65 && inSeason
      ? "optimal"
      : "conditional";

  const reasons: string[] = [];
  if (water.deficit > 0) {
    reasons.push(`${water.deficit} mm seasonal deficit against ${profile.etc} mm demand`);
  }
  if (profile.etc >= 600 && ctx.input.borewellDepth > 35) {
    reasons.push(`Borewell at ${ctx.input.borewellDepth} m cannot sustain ${profile.etc} mm`);
  }
  if (profile.etc >= 500 && ctx.gwFraction < 0.4) {
    reasons.push(`GWETPROF ${Math.round(ctx.gwFraction * 100)}% — below the 40% aquifer line`);
  }
  if (vpdFit < 70) {
    reasons.push(`VPD ${round(ctx.meanVPD, 2)} kPa above the ${profile.vpdMax} kPa threshold`);
  }
  if (gddFit < 65) {
    reasons.push(`Seasonal GDD ${gddSeason} vs ${profile.gdd[0]}–${profile.gdd[1]} required`);
  }
  if (!inSeason) {
    reasons.push(`Off-season for ${ctx.input.season}`);
  }
  reasons.push(...soilReasons(profile, chem));

  return {
    id: profile.id,
    name: profile.name,
    group: profile.group,
    profile,
    score: clamp(score, 0, 100),
    classification,
    pillars,
    seasonalETc: profile.etc,
    seasonalSupply: water.supply,
    deficitMm: water.deficit,
    gddSeason,
    inSeason,
    reasons: reasons.slice(0, 4),
    fertilizer: `${profile.fertilizer.n}:${profile.fertilizer.p}:${profile.fertilizer.k} kg/ha N–P₂O₅–K₂O · ${profile.fertilizer.note}`,
    irrigation: irrigationPrescription(profile, ctx, water.deficit),
  };
}

/** Score every crop in the dataset against the field, best match first. */
export function evaluateCropSuitability(telemetry: AgroTelemetry): CropMatch[] {
  const ctx = buildContext(telemetry);
  return CROP_PROFILES.map((profile) => evaluateCrop(profile, ctx, telemetry.soilChemistry)).sort(
    (a, b) => b.score - a.score,
  );
}

export const CROP_CLASS_ORDER: CropClassId[] = ["optimal", "conditional", "high-risk"];

export interface CropClassGroup {
  id: CropClassId;
  matches: CropMatch[];
}

/** Group scored crops into the three agronomic buckets, best first inside each. */
export function groupCropMatches(matches: CropMatch[]): CropClassGroup[] {
  return CROP_CLASS_ORDER.map((id) => ({
    id,
    matches: matches.filter((m) => m.classification === id),
  }));
}

export const isHighWaterDemand = (match: CropMatch) =>
  match.profile.waterDemand === "high" || match.profile.waterDemand === "very-high";
