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
  /** Mean air temperature at 2 m, °C (POWER T2M) */
  T2M: number;
  /** Skin / canopy temperature, °C — TS − T2M is canopy fever */
  TS: number;
  /** Relative humidity at 2 m, % (POWER RH2M) */
  RH2M: number;
  /** Wind speed at 2 m, m/s (POWER WS2M) */
  WS2M: number;
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

/** ISRIC SoilGrids surface chemistry and texture (0–30 cm). */
export interface SoilChemistry {
  /** pH in 1:2.5 soil:water */
  pH: number;
  /** Soil organic carbon, g/kg */
  soc: number;
  /** Available nitrogen, kg/ha */
  nitrogen: number;
  /** Cation exchange capacity, cmol(+)/kg */
  cec: number;
  /** Clay fraction, % */
  clay: number;
  /** Sand fraction, % */
  sand: number;
  /** Silt fraction, % */
  silt: number;
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

export type HazardType =
  | "cyclone"
  | "earthquake"
  | "solar-storm"
  | "eclipse"
  | "wildfire"
  | "flood"
  | "thermal"
  | "wind-drift";

export interface HazardAlert {
  id: string;
  type: HazardType;
  title: string;
  source: string;
  severity: Severity;
  metric: string;
  detail: string;
  /** Farmer mitigation checklist — i18n keys resolved against `src/i18n/translations.ts` */
  actions: string[];
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
  soilChemistry: SoilChemistry;
  plantHealth: PlantHealth;
  waterBudget: WaterBudgetStage[];
  hazards: HazardAlert[];
  granules: NasaGranule[];
  layers: Record<MapLayer, LayerReading>;
  crop: CropRecommendation;
}
