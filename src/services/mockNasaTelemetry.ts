/**
 * Deterministic mock of NASA telemetry (POWER, SMAP, MODIS, ECOSTRESS, GPM, FIRMS…).
 * Same input → same output, so SSR and the browser render identical numbers.
 * Replace with real services later by returning the same `AgroTelemetry` contract.
 */
import {
  BOREWELL_DEPTH_RANGE,
  SATELLITE_PASSES,
  type AgroTelemetry,
  type CropRecommendation,
  type HazardSignals,
  type LayerReading,
  type MapLayer,
  type NasaGranule,
  type PlantHealth,
  type PowerDailyPoint,
  type Scenario,
  type Season,
  type Severity,
  type SoilMoisturePoint,
  type TelemetryInput,
  type WaterBudgetStage,
} from "@/types/agroSpace";
import { buildHazardAlerts } from "@/services/hazardRules";

const DAYS = 30;
/** Fixed reference date keeps output deterministic (2026-11-13, DOY 317). */
const REF_DATE = "2026-11-13";
const REF_DOY = 317;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round = (v: number, d = 1) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeInput(input: TelemetryInput): TelemetryInput {
  return {
    ...input,
    lat: round(clamp(Number.isFinite(input.lat) ? input.lat : 0, -90, 90), 4),
    lon: round(clamp(Number.isFinite(input.lon) ? input.lon : 0, -180, 180), 4),
    borewellDepth: Math.round(
      clamp(
        Number.isFinite(input.borewellDepth) ? input.borewellDepth : BOREWELL_DEPTH_RANGE.min,
        BOREWELL_DEPTH_RANGE.min,
        BOREWELL_DEPTH_RANGE.max,
      ),
    ),
  };
}

const KNOWN_SITES = [
  {
    lat: 13.13,
    lon: 78.13,
    label: "Kolar Plateau, Karnataka",
    zone: "Tropical semi-arid (BSh)",
    elev: 849,
  },
  { lat: 30.9, lon: 75.85, label: "Ludhiana, Punjab", zone: "Humid subtropical (Cwa)", elev: 247 },
  {
    lat: 36.77,
    lon: -119.41,
    label: "Fresno, San Joaquin Valley",
    zone: "Hot semi-arid (BSk)",
    elev: 94,
  },
  {
    lat: 10.04,
    lon: 105.78,
    label: "Cần Thơ, Mekong Delta",
    zone: "Tropical monsoon (Am)",
    elev: 2,
  },
];

function describeLocation(lat: number, lon: number, aridity: number) {
  const site = KNOWN_SITES.find(
    (s) => Math.abs(s.lat - lat) < 0.05 && Math.abs(s.lon - lon) < 0.05,
  );
  if (site) return { label: site.label, zone: site.zone, elev: site.elev };
  const absLat = Math.abs(lat);
  const zone =
    absLat < 15
      ? aridity > 0.6
        ? "Tropical savanna (Aw)"
        : "Tropical monsoon (Am)"
      : absLat < 35
        ? aridity > 0.6
          ? "Hot semi-arid (BSh)"
          : "Humid subtropical (Cfa)"
        : absLat < 60
          ? "Temperate (Cfb)"
          : "Boreal (Dfc)";
  const elev = Math.round(
    clamp(
      350 + 520 * Math.sin(lat * 0.31) * Math.cos(lon * 0.17) + 180 * Math.sin(lon * 0.9),
      1,
      3400,
    ),
  );
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return {
    label: `Field ${Math.abs(lat).toFixed(2)}°${ns} ${Math.abs(lon).toFixed(2)}°${ew}`,
    zone,
    elev,
  };
}

interface Climate {
  wetness: number;
  heat: number;
  aridity: number;
  tropical: number;
}

function climateFor(lat: number, lon: number, season: Season): Climate {
  const absLat = Math.abs(lat);
  const tropical = clamp(1 - absLat / 38, 0, 1);
  const aridity = clamp(
    0.5 + 0.45 * Math.sin(lat * 0.21 + lon * 0.13) * Math.cos(lon * 0.05),
    0,
    1,
  );
  const north = lat >= 0;
  const seasonWet: Record<Season, number> = {
    Kharif: north ? 1 : 0.45,
    Rabi: north ? 0.25 : 0.8,
    Zaid: 0.35,
  };
  const seasonHeat: Record<Season, number> = { Kharif: 0.72, Rabi: 0.35, Zaid: 1 };
  return {
    tropical,
    aridity,
    wetness: clamp(seasonWet[season] * (0.45 + tropical * 0.7) * (1 - aridity * 0.55), 0.03, 1),
    heat: clamp(seasonHeat[season] * (0.55 + tropical * 0.45), 0.1, 1),
  };
}

/** Scenario event window inside the 30-day series. */
const EVENT_START = 22;

function generatePower(c: Climate, scenario: Scenario, rng: () => number): PowerDailyPoint[] {
  const out: PowerDailyPoint[] = [];
  for (let i = 0; i < DAYS; i++) {
    const inEvent = i >= EVENT_START && i <= EVENT_START + 4;
    const noise = rng();
    let cloud = clamp(c.wetness * 0.7 + (noise - 0.5) * 0.35, 0, 0.95);
    let rain = noise < 0.25 + c.wetness * 0.55 ? Math.pow(rng(), 2) * 38 * c.wetness : 0;
    let par = (70 + c.heat * 70) * (1 - cloud * 0.55);
    let vpd = 0.35 + c.heat * 2.3 * (1 - c.wetness * 0.6) + (rng() - 0.5) * 0.4;

    if (inEvent) {
      switch (scenario) {
        case "Cat-4 Cyclone":
          rain = 85 + rng() * 140;
          cloud = 0.95;
          par *= 0.35;
          vpd *= 0.3;
          break;
        case "Flash Flood":
          if (i === EVENT_START + 1 || i === EVENT_START + 2) rain = 120 + rng() * 60;
          par *= 0.55;
          vpd *= 0.5;
          break;
        case "Solar Eclipse":
          if (i === EVENT_START + 2) par *= 0.38;
          break;
        case "G4 Solar Storm":
          par *= 1.04;
          break;
        default:
          break;
      }
    }
    if (scenario === "Severe Drought") {
      rain *= 0.08;
      vpd = vpd * 1.6 + 0.4;
      par *= 1.08;
    }
    vpd = clamp(vpd, 0.15, 5.5);
    const et = clamp(1 + par / 45 + vpd * 0.9 - (rain > 40 ? 1.2 : 0), 0.4, 9.5);
    out.push({
      day: `D-${DAYS - 1 - i}`,
      PAR: round(par, 1),
      VPD: round(vpd, 2),
      EVPTRNS: round(et, 2),
      PRECTOTCORR: round(rain, 1),
    });
  }
  const last = out[DAYS - 1];
  if (last) last.day = "D0";
  return out;
}

function generateSoil(
  power: PowerDailyPoint[],
  c: Climate,
  input: TelemetryInput,
  scenario: Scenario,
): SoilMoisturePoint[] {
  let s0 = 20 + c.wetness * 45;
  let s1 = 25 + c.wetness * 40;
  let s2 = 30 + c.wetness * 35;
  let gw = 35 + c.wetness * 40 - c.aridity * 12;
  if (scenario === "Severe Drought") {
    s0 *= 0.5;
    s1 *= 0.55;
    s2 *= 0.6;
    gw *= 0.6;
  }
  const depthReach =
    (input.borewellDepth - BOREWELL_DEPTH_RANGE.min) /
    (BOREWELL_DEPTH_RANGE.max - BOREWELL_DEPTH_RANGE.min);
  return power.map((p, i) => {
    const infil = p.PRECTOTCORR;
    s0 = clamp(s0 + infil * 0.9 - p.EVPTRNS * 1.6, 4, 100);
    s1 = clamp(s1 + (s0 - s1) * 0.22 - p.EVPTRNS * 0.35, 6, 100);
    s2 = clamp(s2 + (s1 - s2) * 0.09 - p.EVPTRNS * 0.08, 8, 100);
    gw = clamp(gw + (s2 - gw) * 0.035 + (infil > 60 ? 1.5 : 0), 5, 100);
    let access = gw * 0.55 + depthReach * 55 - c.aridity * 8;
    if (scenario === "M6.2 Earthquake" && i >= EVENT_START) access -= 18;
    return {
      day: p.day,
      sm0_5: round(s0),
      sm7_28: round(s1),
      sm28_100: round(s2),
      GWETPROF: round(gw),
      borewellAccess: round(clamp(access, 2, 100)),
    };
  });
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const severityFromScore = (score: number): Severity =>
  score >= 75 ? "nominal" : score >= 55 ? "watch" : score >= 35 ? "warning" : "critical";

function generateLayers(
  power: PowerDailyPoint[],
  soil: SoilMoisturePoint[],
  c: Climate,
  scenario: Scenario,
  rng: () => number,
): Record<MapLayer, LayerReading> {
  const recent = power.slice(-7);
  const recentSoil = soil.slice(-7);
  const vpd = avg(recent.map((p) => p.VPD));
  const rootM = avg(recentSoil.map((s) => s.sm28_100));
  const rain = avg(recent.map((p) => p.PRECTOTCORR));
  const ndvi = clamp(
    0.18 + rootM / 140 + c.wetness * 0.25 - vpd * 0.05 - (scenario === "Cat-4 Cyclone" ? 0.18 : 0),
    0.05,
    0.92,
  );
  const evi = clamp(ndvi * 0.68 + (rng() - 0.5) * 0.04, 0.03, 0.8);
  const lai = clamp(ndvi * 6.2 + (rng() - 0.5) * 0.4, 0.2, 6.5);
  const esi = clamp(1.15 - vpd * 0.22 + rootM / 300, 0.05, 1.2);
  const smap = clamp(avg(recentSoil.map((s) => s.sm0_5)) / 200, 0.02, 0.5);
  const fireRisk = clamp(
    vpd / 4 + (1 - rootM / 100) * 0.4 + (scenario === "Severe Drought" ? 0.3 : 0) - rain / 40,
    0,
    1,
  );
  const fires = Math.round(fireRisk * fireRisk * 24 + rng() * 2);
  const aod = clamp(
    0.12 + fireRisk * 0.9 + (scenario === "Severe Drought" ? 0.25 : 0) + rng() * 0.08,
    0.05,
    2.4,
  );
  const mk = (layer: MapLayer, value: number, unit: string, intensity: number): LayerReading => ({
    layer,
    value,
    unit,
    intensity: round(clamp(intensity, 0, 1), 3),
  });
  return {
    NDVI: mk("NDVI", round(ndvi, 2), "index", ndvi),
    EVI: mk("EVI", round(evi, 2), "index", evi / 0.8),
    LAI: mk("LAI", round(lai, 2), "m²/m²", lai / 6.5),
    "ECOSTRESS ESI": mk("ECOSTRESS ESI", round(esi, 2), "ratio", esi / 1.2),
    "SMAP Moisture": mk("SMAP Moisture", round(smap, 3), "m³/m³", smap / 0.5),
    "GPM Rain": mk("GPM Rain", round(rain / 24, 2), "mm/hr", rain / 60),
    "FIRMS Fires": mk("FIRMS Fires", fires, "hotspots", fires / 24),
    "Smoke AOD": mk("Smoke AOD", round(aod, 2), "τ 550nm", aod / 2.4),
  };
}

function generatePlantHealth(
  power: PowerDailyPoint[],
  soil: SoilMoisturePoint[],
  layers: Record<MapLayer, LayerReading>,
  input: TelemetryInput,
  siteRng: () => number,
): PlantHealth {
  const recent = power.slice(-10);
  const par = avg(recent.map((p) => p.PAR));
  const vpd = avg(recent.map((p) => p.VPD));
  const rain = avg(recent.map((p) => p.PRECTOTCORR));
  const root = avg(soil.slice(-10).map((s) => s.sm28_100));
  const ph = round(5.2 + siteRng() * 3.2, 1);
  const n = Math.round(140 + siteRng() * 260);

  let parUv = 100 - Math.abs(par - 115) * 0.9;
  if (input.scenario === "G4 Solar Storm") parUv -= 22;
  if (input.scenario === "Solar Eclipse") parUv -= 14;

  const humidityProxy = clamp(1.6 - vpd, 0, 1.6) / 1.6;
  const blightRisk = clamp(
    humidityProxy * 60 +
      rain * 0.9 +
      (input.scenario === "Flash Flood" ? 25 : 0) +
      (input.scenario === "Cat-4 Cyclone" ? 20 : 0),
    0,
    100,
  );

  const pillars: PlantHealth["pillars"] = [
    {
      key: "ndvi",
      label: "Chlorophyll NDVI",
      score: Math.round(clamp(layers.NDVI.value * 112, 0, 100)),
      source: "MODIS Terra MOD13Q1",
      note: `NDVI ${layers.NDVI.value.toFixed(2)} · EVI ${layers.EVI.value.toFixed(2)}`,
    },
    {
      key: "parUv",
      label: "PAR/UV Balance",
      score: Math.round(clamp(parUv, 0, 100)),
      source: "NASA POWER ALLSKY_SFC_PAR_TOT",
      note: `PAR ${par.toFixed(0)} W/m² (10-day mean)`,
    },
    {
      key: "hydration",
      label: "ECOSTRESS Hydration",
      score: Math.round(clamp((layers["ECOSTRESS ESI"].value / 1.1) * 100, 0, 100)),
      source: "ISS ECOSTRESS L4 ESI",
      note: `ESI ${layers["ECOSTRESS ESI"].value.toFixed(2)} · VPD ${vpd.toFixed(2)} kPa`,
    },
    {
      key: "rootMoisture",
      label: "Root Moisture",
      score: Math.round(clamp(root * 1.25, 0, 100)),
      source: "SMAP L4 Root Zone",
      note: `${root.toFixed(0)}% saturation, 28–100 cm`,
    },
    {
      key: "blight",
      label: "Blight Safety",
      score: Math.round(clamp(100 - blightRisk, 0, 100)),
      source: "POWER RH2M × GPM IMERG",
      note: `Fungal pressure ${blightRisk.toFixed(0)}/100`,
    },
    {
      key: "soil",
      label: "SoilGrids pH/NPK",
      score: Math.round(clamp(100 - Math.abs(ph - 6.6) * 26 - Math.abs(n - 280) * 0.08, 0, 100)),
      source: "ISRIC SoilGrids 250m",
      note: `pH ${ph} · N ${n} kg/ha`,
    },
  ];
  const overall = Math.round(avg(pillars.map((p) => p.score)));
  return { pillars, overall, status: severityFromScore(overall) };
}

type CropName =
  | "Paddy Rice"
  | "Finger Millet (Ragi)"
  | "Winter Wheat"
  | "Chickpea"
  | "Watermelon"
  | "Green Gram (Moong)";

const CROP_PROFILES: Record<CropName, { stages: [string, number, number][]; yield: number }> = {
  "Paddy Rice": {
    stages: [
      ["Initial", 25, 1.05],
      ["Development", 30, 1.15],
      ["Mid-season", 40, 1.2],
      ["Late", 25, 0.9],
    ],
    yield: 5.2,
  },
  "Finger Millet (Ragi)": {
    stages: [
      ["Initial", 20, 0.4],
      ["Development", 30, 0.8],
      ["Mid-season", 40, 1.05],
      ["Late", 25, 0.6],
    ],
    yield: 2.6,
  },
  "Winter Wheat": {
    stages: [
      ["Initial", 30, 0.4],
      ["Development", 35, 0.8],
      ["Mid-season", 45, 1.15],
      ["Late", 30, 0.4],
    ],
    yield: 4.8,
  },
  Chickpea: {
    stages: [
      ["Initial", 20, 0.4],
      ["Development", 30, 0.75],
      ["Mid-season", 40, 1.0],
      ["Late", 20, 0.35],
    ],
    yield: 1.9,
  },
  Watermelon: {
    stages: [
      ["Initial", 15, 0.4],
      ["Development", 25, 0.8],
      ["Mid-season", 35, 1.0],
      ["Late", 15, 0.75],
    ],
    yield: 28,
  },
  "Green Gram (Moong)": {
    stages: [
      ["Initial", 15, 0.4],
      ["Development", 20, 0.75],
      ["Mid-season", 25, 1.05],
      ["Late", 15, 0.6],
    ],
    yield: 1.1,
  },
};

const SOWING: Record<Season, string> = {
  Kharif: "Jun 15 – Jul 20",
  Rabi: "Oct 25 – Nov 30",
  Zaid: "Mar 01 – Apr 10",
};

function pickCrop(season: Season, c: Climate, lat: number): CropName {
  if (season === "Kharif") return c.wetness > 0.5 ? "Paddy Rice" : "Finger Millet (Ragi)";
  if (season === "Rabi") return Math.abs(lat) > 22 ? "Winter Wheat" : "Chickpea";
  return c.heat > 0.8 && c.wetness < 0.4 ? "Green Gram (Moong)" : "Watermelon";
}

/** Litres per hour a borewell yields at a given depth and groundwater state. */
export function borewellYieldLph(depthM: number, groundwaterPct: number): number {
  const d = clamp(depthM, BOREWELL_DEPTH_RANGE.min, BOREWELL_DEPTH_RANGE.max);
  return Math.round(clamp(400 + d * 42 * (0.35 + groundwaterPct / 130), 200, 9000));
}

function generateWaterBudget(
  power: PowerDailyPoint[],
  soil: SoilMoisturePoint[],
  c: Climate,
  input: TelemetryInput,
): { stages: WaterBudgetStage[]; crop: CropRecommendation } {
  const cropName = pickCrop(input.season, c, input.lat);
  const profile = CROP_PROFILES[cropName];
  const et0 = avg(power.map((p) => p.EVPTRNS)) * 1.1;
  const rainDaily = avg(power.map((p) => p.PRECTOTCORR));
  const gw = avg(soil.slice(-7).map((s) => s.GWETPROF));
  const access = avg(soil.slice(-7).map((s) => s.borewellAccess)) / 100;
  const yieldLph = borewellYieldLph(input.borewellDepth, gw);
  // Pump ~5 h/day over 1 ha (10,000 m²): L → mm = L / 10,000
  const borewellMmDay = ((yieldLph * 5) / 10000) * access;
  const irrigationMmDay: Record<TelemetryInput["irrigation"], number> = {
    Rainfed: 0,
    Borewell: borewellMmDay * 0.6,
    Canal: 3.2 * (input.scenario === "Severe Drought" ? 0.35 : 1) * 0.65,
    Drip: borewellMmDay * 0.9,
  };
  const stages = profile.stages.map(([stage, days, Kc]) => {
    const ETc = Kc * et0 * days;
    const available = (rainDaily * 0.72 + irrigationMmDay[input.irrigation]) * days;
    return { stage, days, Kc, ETc: Math.round(ETc), available: Math.round(available) };
  });
  const seasonalETc = stages.reduce((a, s) => a + s.ETc, 0);
  const seasonalAvailable = stages.reduce((a, s) => a + s.available, 0);
  const deficit = Math.max(0, seasonalETc - seasonalAvailable);
  const stress = round(clamp(deficit / Math.max(1, seasonalETc), 0, 1), 2);
  const yieldT = round(profile.yield * (1 - stress * 0.75), 1);
  const advisory =
    stress > 0.5
      ? `Severe deficit of ${deficit} mm. Switch to drip or shift to a short-duration variety.`
      : stress > 0.2
        ? `Moderate deficit of ${deficit} mm. Schedule irrigation around the mid-season stage.`
        : "Water budget covers crop demand. Maintain current schedule.";
  return {
    stages,
    crop: {
      crop: cropName,
      sowingWindow: SOWING[input.season],
      yieldTPerHa: yieldT,
      seasonalETc,
      seasonalAvailable,
      deficitMm: deficit,
      waterStressIndex: stress,
      borewellYieldLph: yieldLph,
      advisory,
    },
  };
}

function generateHazardSignals(
  power: PowerDailyPoint[],
  soil: SoilMoisturePoint[],
  layers: Record<MapLayer, LayerReading>,
  c: Climate,
  input: TelemetryInput,
  rng: () => number,
): HazardSignals {
  const s = input.scenario;
  const cyclone = s === "Cat-4 Cyclone";
  const flood = s === "Flash Flood";
  const drought = s === "Severe Drought";
  const recent = power.slice(-8);
  const vpd = avg(power.slice(-7).map((p) => p.VPD));
  const rootM = avg(soil.slice(-7).map((x) => x.sm28_100));
  const distKm = Math.round(40 + rng() * 90);
  const kpBase = round(1 + rng() * 2, 1);
  let gwetroot = clamp(Math.max(...soil.slice(-8).map((x) => x.sm28_100)) / 100, 0.05, 1);
  if (flood) gwetroot = Math.max(gwetroot, 0.91);
  if (cyclone) gwetroot = Math.max(gwetroot, 0.88);
  const hotspots = layers["FIRMS Fires"].value;
  const t2m = 14 + c.heat * 20 + (drought ? 3 : 0);
  return {
    stormDistKm: cyclone ? distKm : c.tropical > 0.6 && input.season === "Kharif" ? 950 : null,
    stormName: cyclone ? "Cat-4 Cyclone" : "Monsoon depression",
    windShearMs: round(cyclone ? 4.5 : 12 + rng() * 8, 1),
    gustKmh: cyclone ? 230 : Math.round(25 + rng() * 25),
    quakeMag: s === "M6.2 Earthquake" ? 6.2 : round(1.8 + rng(), 1),
    quakeDepthKm: s === "M6.2 Earthquake" ? 18 : Math.round(8 + rng() * 25),
    quakeDistKm: s === "M6.2 Earthquake" ? distKm : Math.round(180 + rng() * 300),
    kpIndex: s === "G4 Solar Storm" ? 8.3 : kpBase,
    flareClass: s === "G4 Solar Storm" ? "X2.1" : `C${round(1 + rng() * 8, 1)}`,
    geomagStorm: s === "G4 Solar Storm" ? "G4" : null,
    uvIndex: round(clamp(3 + c.heat * 6 + c.tropical * 2 + (s === "G4 Solar Storm" ? 2 : 0), 0, 14), 1),
    obscurationPct: s === "Solar Eclipse" ? 86 : 0,
    parDropPct: s === "Solar Eclipse" ? 69 : 0,
    firmsHotspots50km: hotspots,
    frpMw: Math.round(hotspots * (6 + rng() * 10)),
    aod: layers["Smoke AOD"].value,
    rain24hMm: round(Math.max(...recent.map((p) => p.PRECTOTCORR)), 1),
    gwetroot: round(gwetroot, 2),
    canopyDeltaC: round(clamp(0.4 + vpd * 0.9 + (drought ? 2.2 : 0) - (rootM > 60 ? 0.6 : 0), -1, 9), 1),
    minTempC: round(t2m - 7 - (1 - c.tropical) * 5 - (input.season === "Rabi" ? 2 : 0), 1),
    rh2m: Math.round(clamp(95 - vpd * 22 + c.wetness * 8 + (cyclone || flood ? 12 : 0), 15, 99)),
    ws2m: round(1.8 + rng() * 3.2 + c.aridity * 1.2 + (cyclone ? 15 : flood ? 4 : 0), 1),
    live: [],
  };
}

function generateGranules(input: TelemetryInput, rng: () => number): NasaGranule[] {
  const h = String(Math.floor((input.lon + 180) / 10)).padStart(2, "0");
  const v = String(Math.floor((90 - input.lat) / 10)).padStart(2, "0");
  const ymd = REF_DATE.replace(/-/g, "");
  const hh = () => String(Math.floor(rng() * 24)).padStart(2, "0");
  const mm = () => String(Math.floor(rng() * 60)).padStart(2, "0");
  const orbit = 30000 + Math.floor(rng() * 9000);
  const stale = input.scenario === "G4 Solar Storm";
  const t1 = `${hh()}${mm()}`;
  const t2 = `${hh()}${mm()}`;
  const t3 = `${hh()}${mm()}`;
  return [
    {
      id: `MOD13Q1.A${2026}${REF_DOY - 13}.h${h}v${v}.061.2026${REF_DOY - 1}`,
      product: "MOD13Q1 NDVI/EVI 16-day",
      instrument: "MODIS Terra",
      acquired: `${REF_DATE} ${t1.slice(0, 2)}:${t1.slice(2)}Z`,
      resolution: "250 m",
      latencyH: Math.round(20 + rng() * 30),
      status: "ingested",
    },
    {
      id: `SMAP_L4_SM_gph_${ymd}T${t2}00_Vv8010_001.h5`,
      product: "SMAP L4 Soil Moisture",
      instrument: "SMAP L-band",
      acquired: `${REF_DATE} ${t2.slice(0, 2)}:${t2.slice(2)}Z`,
      resolution: "9 km",
      latencyH: Math.round(48 + rng() * 40),
      status: "ingested",
    },
    {
      id: `3B-HHR-L.MS.MRG.3IMERG.${ymd}-S${t3}00-E${t3.slice(0, 2)}2959.V07B.HDF5`,
      product: "GPM IMERG Early Run",
      instrument: "GPM Constellation",
      acquired: `${REF_DATE} ${t3.slice(0, 2)}:${t3.slice(2)}Z`,
      resolution: "0.1°",
      latencyH: 4,
      status: stale ? "stale" : "ingested",
    },
    {
      id: `ECOv002_L4_ESI_PT-JPL_${orbit}_0${Math.floor(rng() * 90 + 10)}_${ymd}T0${Math.floor(rng() * 9)}1530_0713_01`,
      product: "ECOSTRESS L4 Evaporative Stress",
      instrument: "ISS ECOSTRESS",
      acquired: `${REF_DATE} 0${Math.floor(rng() * 9)}:15Z`,
      resolution: "70 m",
      latencyH: Math.round(60 + rng() * 48),
      status: "processing",
    },
    {
      id: `VNP14IMG_NRT.A2026${REF_DOY}.${hh()}${mm()}.002`,
      product: "FIRMS Active Fire 375m",
      instrument: "VIIRS S-NPP",
      acquired: `${REF_DATE} ${hh()}:${mm()}Z`,
      resolution: "375 m",
      latencyH: 3,
      status: stale ? "stale" : "ingested",
    },
    {
      id: `MCD19A2.A2026${REF_DOY - 1}.h${h}v${v}.061.2026${REF_DOY}`,
      product: "MAIAC Aerosol Optical Depth",
      instrument: "MODIS Terra+Aqua",
      acquired: `${REF_DATE} ${hh()}:${mm()}Z`,
      resolution: "1 km",
      latencyH: Math.round(18 + rng() * 20),
      status: "ingested",
    },
    {
      id: `POWER_Daily_${ymd}_${input.lat.toFixed(2)}_${input.lon.toFixed(2)}.json`,
      product: "NASA POWER Daily Ag",
      instrument: "MERRA-2 / CERES",
      acquired: `${REF_DATE} 00:00Z`,
      resolution: "0.5°",
      latencyH: 24,
      status: "ingested",
    },
  ];
}

export function generateTelemetry(raw: TelemetryInput): AgroTelemetry {
  const input = normalizeInput(raw);
  const key = `${input.lat.toFixed(2)}|${input.lon.toFixed(2)}|${input.borewellDepth}|${input.season}|${input.scenario}|${input.irrigation}`;
  const rng = mulberry32(hashString(key));
  // Site-only RNG: soil properties don't change with season or scenario.
  const siteRng = mulberry32(hashString(`${input.lat.toFixed(2)}|${input.lon.toFixed(2)}`));

  const c = climateFor(input.lat, input.lon, input.season);
  const loc = describeLocation(input.lat, input.lon, c.aridity);
  const power = generatePower(c, input.scenario, rng);
  const soil = generateSoil(power, c, input, input.scenario);
  const layers = generateLayers(power, soil, c, input.scenario, rng);
  const plantHealth = generatePlantHealth(power, soil, layers, input, siteRng);
  const { stages, crop } = generateWaterBudget(power, soil, c, input);
  const hazardSignals = generateHazardSignals(power, soil, layers, c, input, rng);
  const hazards = buildHazardAlerts(hazardSignals);
  const granules = generateGranules(input, rng);
  const passIdx =
    hashString(`${Math.round(input.lat)}|${Math.round(input.lon)}|${input.scenario}`) %
    SATELLITE_PASSES.length;

  return {
    input,
    meta: {
      lat: input.lat,
      lon: input.lon,
      regionLabel: loc.label,
      climateZone: loc.zone,
      elevationM: loc.elev,
      satellitePass: SATELLITE_PASSES[passIdx] ?? "MODIS Terra",
      nextPassMin: Math.round(3 + rng() * 92),
    },
    power,
    soil,
    plantHealth,
    waterBudget: stages,
    hazards,
    hazardSignals,
    granules,
    layers,
    crop,
  };
}
