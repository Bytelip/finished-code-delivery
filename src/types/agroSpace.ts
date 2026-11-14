/**
 * AgroSpace Nexus — single UI data contract.
 * Every panel renders from these types; swapping the mock generator for real
 * NASA services only requires producing an `AgroTelemetry` object.
 */

export const SEASONS = ["Kharif", "Rabi", "Zaid"] as const;
export type Season = (typeof SEASONS)[number];

export const IRRIGATION_TYPES = ["Rainfed", "Borewell", "Canal", "Drip"] as const;
export type Irrigation = (typeof IRRIGATION_TYPES)[number];

export const SCENARIOS = [
  "Nominal",
  "Cat-4 Cyclone",
  "M6.2 Earthquake",
  "G4 Solar Storm",
  "Solar Eclipse",
  "Flash Flood",
  "Severe Drought",
] as const;
export type Scenario = (typeof SCENARIOS)[number];

export const MAP_LAYERS = [
  "NDVI",
  "EVI",
  "LAI",
  "ECOSTRESS ESI",
  "SMAP Moisture",
  "GPM Rain",
  "FIRMS Fires",
  "Smoke AOD",
] as const;
export type MapLayer = (typeof MAP_LAYERS)[number];

export const SATELLITE_PASSES = ["MODIS Terra", "SMAP L4", "GPM IMERG", "ISS ECOSTRESS"] as const;
export type SatellitePass = (typeof SATELLITE_PASSES)[number];

export type DashboardTab = "overview" | "plant-health" | "groundwater" | "hazards" | "granules";

export const BOREWELL_DEPTH_RANGE = { min: 2, max: 150 } as const;

export type Severity = "nominal" | "watch" | "warning" | "critical";

export interface FarmPreset {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export const FARM_PRESETS: FarmPreset[] = [
  { id: "kolar", name: "Bengaluru/Kolar", lat: 13.13, lon: 78.13 },
  { id: "punjab", name: "Punjab Wheat Belt", lat: 30.9, lon: 75.85 },
  { id: "central-valley", name: "Central Valley CA", lat: 36.77, lon: -119.41 },
  { id: "mekong", name: "Mekong Delta", lat: 10.04, lon: 105.78 },
];

/** Everything the telemetry depends on. */
export interface TelemetryInput {
  lat: number;
  lon: number;
  borewellDepth: number;
  season: Season;
  scenario: Scenario;
  irrigation: Irrigation;
}

export interface LocationMeta {
  lat: number;
  lon: number;
  regionLabel: string;
  climateZone: string;
  elevationM: number;
  satellitePass: SatellitePass;
  nextPassMin: number;
}

/** NASA POWER daily point (30-day window). */
export interface PowerDailyPoint {
  day: string;
  /** Photosynthetically active radiation, W/m² */
  PAR: number;
  /** Vapour pressure deficit, kPa */
  VPD: number;
  /** Evapotranspiration, mm/day */
  EVPTRNS: number;
  /** Bias-corrected precipitation, mm/day */
  PRECTOTCORR: number;
}

/** Multi-depth soil moisture, % saturation. */
export interface SoilMoisturePoint {
  day: string;
  sm0_5: number;
  sm7_28: number;
  sm28_100: number;
  GWETPROF: number;
  /** Share of aquifer reachable by the borewell, % */
  borewellAccess: number;
}

export type PlantPillarKey = "ndvi" | "parUv" | "hydration" | "rootMoisture" | "blight" | "soil";

export interface PlantHealthPillar {
  key: PlantPillarKey;
  label: string;
  score: number;
  source: string;
  note: string;
}

export interface PlantHealth {
  pillars: PlantHealthPillar[];
  overall: number;
  status: Severity;
}

export interface WaterBudgetStage {
  stage: string;
  days: number;
  Kc: number;
  /** Crop water requirement for the stage, mm */
  ETc: number;
  /** Rain + irrigation available for the stage, mm */
  available: number;
}

/** The 8 tactical hazard feeds, in display order. */
export const HAZARD_TYPES = [
  "cyclone",
  "earthquake",
  "solar-storm",
  "eclipse",
  "fire-smoke",
  "flood",
  "thermal-blight",
  "spray-drift",
] as const;
export type HazardType = (typeof HAZARD_TYPES)[number];

/** Measured values shown on a hazard card; ids double as translation keys. */
export const HAZARD_READINGS = [
  "stormDistance",
  "windShear",
  "gust",
  "quakeMagnitude",
  "quakeDepth",
  "quakeDistance",
  "kpIndex",
  "solarFlare",
  "geomagStorm",
  "uvIndex",
  "obscuration",
  "parDrop",
  "firmsHotspots",
  "frp",
  "aod",
  "rain24h",
  "gwetroot",
  "canopyDelta",
  "minTemp",
  "humidity",
  "windSpeed",
] as const;
export type HazardReadingId = (typeof HAZARD_READINGS)[number];

/** Farmer mitigation steps; ids double as translation keys. */
export const HAZARD_ACTIONS = [
  "cyclone.harvest",
  "cyclone.stake",
  "cyclone.drain",
  "cyclone.secure",
  "quake.casing",
  "quake.canal",
  "quake.pipes",
  "quake.structures",
  "solar.rtk",
  "solar.lora",
  "solar.uvb",
  "solar.drones",
  "eclipse.irrigation",
  "eclipse.spray",
  "eclipse.pollinators",
  "eclipse.livestock",
  "fire.noburn",
  "fire.firebreak",
  "fire.mask",
  "fire.light",
  "flood.drain",
  "flood.fertilizer",
  "flood.rootrot",
  "flood.electric",
  "thermal.heatIrrigate",
  "thermal.heatSpray",
  "thermal.frostIrrigate",
  "thermal.frostCover",
  "thermal.blightScout",
  "thermal.blightSpray",
  "spray.halt",
  "spray.window",
  "spray.nozzle",
  "spray.buffer",
] as const;
export type HazardActionId = (typeof HAZARD_ACTIONS)[number];

export interface HazardReading {
  id: HazardReadingId;
  /** Pre-formatted value with unit, language-neutral (numbers, units, codes). */
  value: string;
  /** True when this value crosses its alert threshold. */
  breached: boolean;
}

export interface HazardAlert {
  id: string;
  type: HazardType;
  title: string;
  source: string;
  severity: Severity;
  metric: string;
  detail: string;
  readings: HazardReading[];
  actions: HazardActionId[];
  /** "live" when at least one input came from a real feed. */
  origin: "live" | "simulated";
}

/** Raw numbers the hazard rules evaluate. Mock and live services both produce this. */
export interface HazardSignals {
  stormDistKm: number | null;
  stormName: string;
  windShearMs: number;
  gustKmh: number;
  quakeMag: number;
  quakeDepthKm: number;
  quakeDistKm: number | null;
  kpIndex: number;
  flareClass: string | null;
  geomagStorm: string | null;
  uvIndex: number;
  obscurationPct: number;
  parDropPct: number;
  firmsHotspots50km: number;
  frpMw: number;
  aod: number;
  rain24hMm: number;
  gwetroot: number;
  canopyDeltaC: number;
  minTempC: number;
  rh2m: number;
  ws2m: number;
  /** Hazards whose inputs came from a live feed. */
  live: HazardType[];
}

export interface NasaGranule {
  id: string;
  product: string;
  instrument: string;
  acquired: string;
  resolution: string;
  latencyH: number;
  status: "ingested" | "processing" | "stale";
}

export interface LayerReading {
  layer: MapLayer;
  value: number;
  unit: string;
  /** 0–1 intensity used for map tinting */
  intensity: number;
}

export interface CropRecommendation {
  crop: string;
  sowingWindow: string;
  yieldTPerHa: number;
  seasonalETc: number;
  seasonalAvailable: number;
  deficitMm: number;
  waterStressIndex: number;
  borewellYieldLph: number;
  advisory: string;
}

export interface AgroTelemetry {
  input: TelemetryInput;
  meta: LocationMeta;
  power: PowerDailyPoint[];
  soil: SoilMoisturePoint[];
  plantHealth: PlantHealth;
  waterBudget: WaterBudgetStage[];
  hazards: HazardAlert[];
  hazardSignals: HazardSignals;
  granules: NasaGranule[];
  layers: Record<MapLayer, LayerReading>;
  crop: CropRecommendation;
}
