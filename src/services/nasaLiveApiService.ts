/**
 * Live parallel NASA Open API integrations for AgroSpace Nexus.
 * Connects directly to official keyless NASA, NOAA, USGS, USNO, Open-Meteo, and ISRIC endpoints
 * using Promise.allSettled. Transparently falls back to deterministic mockNasaTelemetry if
 * offline, rate-limited, or encountering CORS restrictions.
 */
import {
  BOREWELL_DEPTH_RANGE,
  MAP_LAYERS,
  type AgroTelemetry,
  type CropRecommendation,
  type HazardAlert,
  type HazardSignals,
  type LayerReading,
  type MapLayer,
  type NasaGranule,
  type PlantHealth,
  type PowerDailyPoint,
  type Severity,
  type SoilMoisturePoint,
  type TelemetryInput,
  type WaterBudgetStage,
} from "@/types/agroSpace";
import { buildHazardAlerts } from "@/services/hazardRules";
import { generateTelemetry, normalizeInput, borewellYieldLph } from "@/services/mockNasaTelemetry";

/** Standard timeout for keyless browser requests */
const FETCH_TIMEOUT_MS = 6000;

export interface LiveApiStatus {
  isLive: boolean;
  activeFeeds: string[];
  failedFeeds: string[];
  timestamp: string;
}

/** Haversine formula computing distance between two coordinates in km */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/** Helper to fetch with a strict timeout */
async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/** Format YYYYMMDD string */
function toYmd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** Format Day-Of-Year string: DDD */
function toDoy(date: Date): string {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return String(Math.floor(diff / oneDay)).padStart(3, "0");
}

// -----------------------------------------------------------------------------------------
// 1. NASA POWER Agroclimatology API
// -----------------------------------------------------------------------------------------
export async function fetchNasaPowerDaily(
  lat: number,
  lon: number,
  endDate = new Date(),
): Promise<PowerDailyPoint[]> {
  const startDate = new Date(endDate.getTime() - 29 * 24 * 60 * 60 * 1000);
  const startYmd = toYmd(startDate);
  const endYmd = toYmd(endDate);

  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,T2M_MAX,T2M_MIN,T2MDEW,TS,RH2M,PRECTOTCORR,WS2M,WD2M,ALLSKY_SFC_SW_DWN,ALLSKY_SFC_PAR_TOT,ALLSKY_SFC_UVA,ALLSKY_SFC_UVB,EVPTRNS,GWETTOP,GWETROOT,GWETPROF&community=AG&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}&start=${startYmd}&end=${endYmd}&format=JSON`;

  const res = await fetchWithTimeout(url, 7000);
  const json = await res.json();
  const p = json?.properties?.parameter;
  if (!p) throw new Error("Invalid POWER API payload");

  const parMap = p.ALLSKY_SFC_PAR_TOT || {};
  const t2mMap = p.T2M || {};
  const rhMap = p.RH2M || {};
  const etMap = p.EVPTRNS || {};
  const rainMap = p.PRECTOTCORR || {};

  const dates = Object.keys(parMap).sort();
  if (dates.length === 0) throw new Error("Empty POWER dates");

  const points: PowerDailyPoint[] = dates.slice(-30).map((dStr, idx, arr) => {
    const par = parMap[dStr];
    const t = t2mMap[dStr];
    const rh = rhMap[dStr];
    const et = etMap[dStr];
    const rain = rainMap[dStr];

    const safePar = par != null && par > -100 ? par : 110;
    const safeT = t != null && t > -100 ? t : 24;
    const safeRh = rh != null && rh > -100 ? Math.min(100, Math.max(5, rh)) : 65;
    const safeEt = et != null && et > -100 ? Math.max(0.1, et) : 3.5;
    const safeRain = rain != null && rain > -100 ? Math.max(0, rain) : 0;

    // Tetens formula for Vapor Pressure Deficit (kPa)
    const es = 0.61078 * Math.exp((17.27 * safeT) / (safeT + 237.3));
    const ea = es * (safeRh / 100);
    const vpd = Math.max(0.1, Math.round((es - ea) * 100) / 100);

    const isLast = idx === arr.length - 1;
    const dayLabel = isLast ? "D0" : `D-${arr.length - 1 - idx}`;

    return {
      day: dayLabel,
      PAR: Math.round(safePar * 10) / 10,
      VPD: vpd,
      EVPTRNS: Math.round(safeEt * 100) / 100,
      PRECTOTCORR: Math.round(safeRain * 10) / 10,
    };
  });

  return points;
}

// -----------------------------------------------------------------------------------------
// 2. NASA ORNL DAAC TESViS (MODIS/VIIRS Point Subset API)
// -----------------------------------------------------------------------------------------
export interface ModisSubsetResult {
  ndvi?: number;
  evi?: number;
  lai?: number;
  gpp?: number;
}

export async function fetchOrnlModisSubsets(
  lat: number,
  lon: number,
  date = new Date(),
): Promise<ModisSubsetResult> {
  const yyyy = date.getUTCFullYear();
  const doy = toDoy(date);
  const startDoy = String(Math.max(1, parseInt(doy, 10) - 32)).padStart(3, "0");

  const url = `https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&startDate=A${yyyy}${startDoy}&endDate=A${yyyy}${doy}&kmAboveBelow=0&kmLeftRight=0`;

  const res = await fetchWithTimeout(url, 5000);
  const json = await res.json();
  const subsets = json?.subset;
  if (!Array.isArray(subsets)) return {};

  let ndvi: number | undefined;
  let evi: number | undefined;

  for (const s of subsets) {
    if (s.band === "250m_16_days_NDVI" && Array.isArray(s.data) && s.data.length > 0) {
      const valid = s.data.filter((v: number) => v > -2000 && v <= 10000);
      if (valid.length > 0) {
        const raw = valid[valid.length - 1];
        ndvi = Math.round(raw * (s.scale || 0.0001) * 100) / 100;
      }
    } else if (s.band === "250m_16_days_EVI" && Array.isArray(s.data) && s.data.length > 0) {
      const valid = s.data.filter((v: number) => v > -2000 && v <= 10000);
      if (valid.length > 0) {
        const raw = valid[valid.length - 1];
        evi = Math.round(raw * (s.scale || 0.0001) * 100) / 100;
      }
    }
  }

  const out: ModisSubsetResult = {};
  if (ndvi != null) out.ndvi = ndvi;
  if (evi != null) out.evi = evi;
  return out;
}

// -----------------------------------------------------------------------------------------
// 3. NASA CMR Granule Search API
// -----------------------------------------------------------------------------------------
export async function fetchCmrGranules(lat: number, lon: number): Promise<NasaGranule[]> {
  const queryProduct = async (
    shortName: string,
    productLabel: string,
    instrument: string,
    resolution: string,
  ): Promise<NasaGranule | null> => {
    try {
      const url = `https://cmr.earthdata.nasa.gov/search/granules.json?short_name=${shortName}&point=${lon.toFixed(3)},${lat.toFixed(3)}&sort_key=-start_date&page_size=1`;
      const res = await fetchWithTimeout(url, 4000);
      const json = await res.json();
      const entry = json?.feed?.entry?.[0];
      if (!entry) return null;

      const acquired = entry.time_start || new Date().toISOString();
      const latencyH = Math.max(
        1,
        Math.round((Date.now() - new Date(acquired).getTime()) / (1000 * 3600)),
      );

      return {
        id: entry.title || entry.id,
        product: productLabel,
        instrument,
        acquired: `${acquired.slice(0, 10)} ${acquired.slice(11, 16)}Z`,
        resolution,
        latencyH: isNaN(latencyH) ? 12 : latencyH,
        status: latencyH > 168 ? "stale" : "ingested",
      };
    } catch {
      return null;
    }
  };

  const results = await Promise.all([
    queryProduct("GPM_3IMERGDE", "GPM IMERG Early Run", "GPM Constellation", "0.1°"),
    queryProduct("SPL3SMP_E", "SMAP L3 Soil Moisture", "SMAP L-band", "9 km"),
    queryProduct("MOD13Q1", "MOD13Q1 NDVI/EVI 16-day", "MODIS Terra", "250 m"),
    queryProduct("ECO2LSTE.001", "ISS ECOSTRESS Land Surface Temp", "ISS ECOSTRESS", "70 m"),
  ]);

  return results.filter((g): g is NasaGranule => g !== null);
}

// -----------------------------------------------------------------------------------------
// 4. NASA EONET v3 Natural Hazard Tracker
// -----------------------------------------------------------------------------------------
export interface EonetHazardResult {
  cyclones: Array<{ title: string; distKm: number; id: string; lat: number; lon: number }>;
  floods: Array<{ title: string; distKm: number; id: string; lat: number; lon: number }>;
  wildfires: Array<{ title: string; distKm: number; id: string; lat: number; lon: number }>;
  droughts: Array<{ title: string; distKm: number; id: string }>;
  dustHaze: Array<{ title: string; distKm: number; id: string }>;
}

export async function fetchEonetHazards(lat: number, lon: number): Promise<EonetHazardResult> {
  const url = `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&categories=severeStorms,floods,drought,wildfires,dustHaze`;
  const res = await fetchWithTimeout(url, 5000);
  const json = await res.json();
  const events = json?.events || [];

  const out: EonetHazardResult = {
    cyclones: [],
    floods: [],
    wildfires: [],
    droughts: [],
    dustHaze: [],
  };

  for (const ev of events) {
    const cat = ev.categories?.[0]?.id;
    const geom = ev.geometry?.[ev.geometry.length - 1];
    if (!geom || !Array.isArray(geom.coordinates)) continue;

    const [eLon, eLat] = geom.coordinates;
    const dist = haversineKm(lat, lon, eLat, eLon);

    const item = { title: ev.title, distKm: dist, id: ev.id, lat: eLat, lon: eLon };

    if (cat === "severeStorms") out.cyclones.push(item);
    else if (cat === "floods") out.floods.push(item);
    else if (cat === "wildfires") out.wildfires.push(item);
    else if (cat === "drought") out.droughts.push(item);
    else if (cat === "dustHaze") out.dustHaze.push(item);
  }

  // Sort each by closest distance
  out.cyclones.sort((a, b) => a.distKm - b.distKm);
  out.floods.sort((a, b) => a.distKm - b.distKm);
  out.wildfires.sort((a, b) => a.distKm - b.distKm);
  out.droughts.sort((a, b) => a.distKm - b.distKm);
  out.dustHaze.sort((a, b) => a.distKm - b.distKm);

  return out;
}

// -----------------------------------------------------------------------------------------
// 5. NASA DONKI Space Weather + NOAA SWPC Planetary K-Index
// -----------------------------------------------------------------------------------------
export interface SpaceWeatherResult {
  kpIndex: number;
  status: Severity;
  solarStormActive: boolean;
  flareClass?: string;
  detail: string;
}

export async function fetchSpaceWeather(): Promise<SpaceWeatherResult> {
  let kp = 2.0;

  const noaaRes = await fetchWithTimeout(
    "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
    4000,
  );
  const noaaJson = await noaaRes.json();
  if (Array.isArray(noaaJson) && noaaJson.length > 1) {
    const latest = noaaJson[noaaJson.length - 1];
    const parsed = parseFloat(latest[1]);
    if (!isNaN(parsed)) kp = parsed;
  }

  const status: Severity =
    kp >= 8
      ? "critical"
      : kp >= 7
        ? "critical"
        : kp >= 5
          ? "warning"
          : kp >= 4
            ? "watch"
            : "nominal";

  const detail =
    kp >= 8
      ? `Kp ${kp} · G4 Severe Storm. GNSS drift ±3 m. Pause RTK auto-steer.`
      : kp >= 5
        ? `Kp ${kp} · G1/G2 Storm. Minor satellite communication degradation.`
        : `Kp ${kp.toFixed(1)} · Quiet geomagnetic field. GNSS nominal.`;

  return {
    kpIndex: Math.round(kp * 10) / 10,
    status,
    solarStormActive: kp >= 5,
    detail,
  };
}

// -----------------------------------------------------------------------------------------
// 6. USGS Earthquake Hazards GeoJSON API
// -----------------------------------------------------------------------------------------
export interface EarthquakeResult {
  maxMag: number;
  nearestDistKm: number;
  depthKm: number;
  place: string;
  count: number;
  rings: Array<{ lat: number; lon: number; mag: number; depth: number }>;
}

export async function fetchUsgsEarthquakes(lat: number, lon: number): Promise<EarthquakeResult> {
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&maxradiuskm=500&minmagnitude=2.5&orderby=time&limit=10`;
  const res = await fetchWithTimeout(url, 4500);
  const json = await res.json();
  const features = json?.features || [];

  if (features.length === 0) {
    return {
      maxMag: 0,
      nearestDistKm: 9999,
      depthKm: 10,
      place: "None in 500 km",
      count: 0,
      rings: [],
    };
  }

  let maxMag = 0;
  let nearestDistKm = 9999;
  let depthKm = 10;
  let place = "";
  const rings: Array<{ lat: number; lon: number; mag: number; depth: number }> = [];

  for (const f of features) {
    const mag = f.properties?.mag || 0;
    const [qLon, qLat, qDepth] = f.geometry?.coordinates || [0, 0, 10];
    const dist = haversineKm(lat, lon, qLat, qLon);

    rings.push({ lat: qLat, lon: qLon, mag, depth: qDepth });

    if (mag > maxMag) maxMag = mag;
    if (dist < nearestDistKm) {
      nearestDistKm = dist;
      depthKm = Math.round(qDepth);
      place = f.properties?.place || `${dist} km away`;
    }
  }

  return {
    maxMag: Math.round(maxMag * 10) / 10,
    nearestDistKm,
    depthKm,
    place,
    count: features.length,
    rings,
  };
}

// -----------------------------------------------------------------------------------------
// 7. USNO Solar Eclipse Calculator API v4
// -----------------------------------------------------------------------------------------
export interface EclipseResult {
  isEclipse: boolean;
  obscuration: number;
  detail: string;
}

export async function fetchUsnoEclipse(
  lat: number,
  lon: number,
  date = new Date(),
): Promise<EclipseResult> {
  const ymd = date.toISOString().slice(0, 10);
  const url = `https://aa.usno.navy.mil/api/eclipses/solar/date?date=${ymd}&coords=${lat.toFixed(4)},${lon.toFixed(4)}&height=500`;

  const res = await fetchWithTimeout(url, 4000);
  const json = await res.json();
  const props = json?.properties;
  const isEcl = props?.description && !props.description.toLowerCase().includes("no eclipse");
  const obsc = props?.obscuration ? Math.round(props.obscuration * 100) : 0;

  return {
    isEclipse: Boolean(isEcl),
    obscuration: obsc,
    detail: isEcl
      ? `Eclipse active: ${props.description || "obscuration observed"}`
      : "None in 30 d",
  };
}

// -----------------------------------------------------------------------------------------
// 8. Open-Meteo Multi-Depth Soil Moisture & Evapotranspiration
// -----------------------------------------------------------------------------------------
export interface OpenMeteoSoilResult {
  sm0_7: number;
  sm7_28: number;
  sm28_100: number;
  vpd: number;
  et0: number;
}

export async function fetchOpenMeteoSoil(lat: number, lon: number): Promise<OpenMeteoSoilResult> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&hourly=soil_moisture_0_to_7cm,soil_moisture_7_to_28cm,soil_moisture_28_to_100cm,soil_temperature_0_to_7cm,vapour_pressure_deficit,et0_fao_evapotranspiration&timezone=auto`;
  const res = await fetchWithTimeout(url, 4500);
  const json = await res.json();
  const h = json?.hourly;
  if (!h) throw new Error("Invalid Open-Meteo payload");

  // Take recent mean of past 24h
  const takeMean = (arr: number[] | undefined, scale = 100) => {
    if (!Array.isArray(arr) || arr.length === 0) return 30;
    const slice = arr.slice(0, 24).filter((v) => v != null && !isNaN(v));
    if (slice.length === 0) return 30;
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    return Math.round(avg * scale * 10) / 10;
  };

  return {
    sm0_7: takeMean(h.soil_moisture_0_to_7cm, 100),
    sm7_28: takeMean(h.soil_moisture_7_to_28cm, 100),
    sm28_100: takeMean(h.soil_moisture_28_to_100cm, 100),
    vpd: takeMean(h.vapour_pressure_deficit, 1),
    et0: takeMean(h.et0_fao_evapotranspiration, 1),
  };
}

// -----------------------------------------------------------------------------------------
// 9. ISRIC SoilGrids v2.0 Soil Chemistry & Texture API
// -----------------------------------------------------------------------------------------
export interface SoilGridsResult {
  ph: number;
  nitrogenKgHa: number;
  clayPct: number;
  sandPct: number;
  siltPct: number;
}

export async function fetchIsricSoilGrids(lat: number, lon: number): Promise<SoilGridsResult> {
  const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon.toFixed(4)}&lat=${lat.toFixed(4)}&property=phh2o&property=nitrogen&property=soc&property=clay&property=sand&property=silt&property=cec&depth=0-5cm&depth=15-30cm&value=mean`;
  const res = await fetchWithTimeout(url, 5000);
  const json = await res.json();
  const layers = json?.properties?.layers;
  if (!Array.isArray(layers)) throw new Error("Invalid SoilGrids response");

  let ph = 6.5;
  let nitrogen = 210;
  let clay = 24;
  let sand = 45;
  let silt = 31;

  for (const l of layers) {
    const meanVal = l.depths?.[0]?.values?.mean;
    if (meanVal == null) continue;

    if (l.name === "phh2o") {
      // phh2o is reported * 10, e.g. 65 => 6.5
      ph = Math.round((meanVal / 10) * 10) / 10;
    } else if (l.name === "nitrogen") {
      nitrogen = Math.round(meanVal / 10);
    } else if (l.name === "clay") {
      clay = Math.round(meanVal / 10);
    } else if (l.name === "sand") {
      sand = Math.round(meanVal / 10);
    } else if (l.name === "silt") {
      silt = Math.round(meanVal / 10);
    }
  }

  return { ph, nitrogenKgHa: nitrogen, clayPct: clay, sandPct: sand, siltPct: silt };
}

// -----------------------------------------------------------------------------------------
// Master Integrator: Promise.allSettled across all 9 endpoints
// -----------------------------------------------------------------------------------------

export async function fetchLiveTelemetry(
  rawInput: TelemetryInput,
  options?: { signal?: AbortSignal },
): Promise<{ telemetry: AgroTelemetry; status: LiveApiStatus }> {
  const input = normalizeInput(rawInput);
  // Always compute fallback baseline so any failed endpoint seamlessly uses deterministic numbers
  const fallback = generateTelemetry(input);

  const activeFeeds: string[] = [];
  const failedFeeds: string[] = [];

  // Execute all 9 in parallel with Promise.allSettled
  const [
    powerSettled,
    modisSettled,
    cmrSettled,
    eonetSettled,
    spaceSettled,
    quakeSettled,
    eclipseSettled,
    openMeteoSettled,
    soilGridsSettled,
  ] = await Promise.allSettled([
    fetchNasaPowerDaily(input.lat, input.lon),
    fetchOrnlModisSubsets(input.lat, input.lon),
    fetchCmrGranules(input.lat, input.lon),
    fetchEonetHazards(input.lat, input.lon),
    fetchSpaceWeather(),
    fetchUsgsEarthquakes(input.lat, input.lon),
    fetchUsnoEclipse(input.lat, input.lon),
    fetchOpenMeteoSoil(input.lat, input.lon),
    fetchIsricSoilGrids(input.lat, input.lon),
  ]);

  // 1. POWER daily points
  let power: PowerDailyPoint[] = fallback.power;
  if (powerSettled.status === "fulfilled" && powerSettled.value.length === 30) {
    power = powerSettled.value;
    activeFeeds.push("NASA POWER AG");
  } else {
    failedFeeds.push("NASA POWER AG");
  }

  // 2. MODIS / VIIRS subset values
  let liveNdvi = fallback.layers.NDVI.value;
  let liveEvi = fallback.layers.EVI.value;
  if (modisSettled.status === "fulfilled") {
    if (modisSettled.value.ndvi != null) {
      liveNdvi = modisSettled.value.ndvi;
      activeFeeds.push("ORNL DAAC MODIS");
    }
    if (modisSettled.value.evi != null) {
      liveEvi = modisSettled.value.evi;
    }
  } else {
    failedFeeds.push("ORNL DAAC MODIS");
  }

  // 3. NASA CMR Granules
  let granules: NasaGranule[] = fallback.granules;
  if (cmrSettled.status === "fulfilled" && cmrSettled.value.length > 0) {
    granules = cmrSettled.value;
    activeFeeds.push("NASA CMR");
  } else {
    failedFeeds.push("NASA CMR");
  }

  // 4. EONET natural hazards
  let eonetData: EonetHazardResult | null = null;
  if (eonetSettled.status === "fulfilled") {
    eonetData = eonetSettled.value;
    activeFeeds.push("NASA EONET v3");
  } else {
    failedFeeds.push("NASA EONET v3");
  }

  // 5. Space weather
  let spaceData: SpaceWeatherResult | null = null;
  if (spaceSettled.status === "fulfilled") {
    spaceData = spaceSettled.value;
    activeFeeds.push("NOAA/NASA SWPC");
  } else {
    failedFeeds.push("NOAA/NASA SWPC");
  }

  // 6. USGS Earthquakes
  let quakeData: EarthquakeResult | null = null;
  if (quakeSettled.status === "fulfilled") {
    quakeData = quakeSettled.value;
    activeFeeds.push("USGS ComCat");
  } else {
    failedFeeds.push("USGS ComCat");
  }

  // 7. USNO Solar Eclipse
  let eclipseData: EclipseResult | null = null;
  if (eclipseSettled.status === "fulfilled") {
    eclipseData = eclipseSettled.value;
    activeFeeds.push("USNO Eclipse");
  } else {
    failedFeeds.push("USNO Eclipse");
  }

  // 8. Open-Meteo Multi-Depth Soil
  let soil: SoilMoisturePoint[] = fallback.soil;
  if (openMeteoSettled.status === "fulfilled") {
    const s = openMeteoSettled.value;
    activeFeeds.push("Open-Meteo Soil");
    soil = fallback.soil.map((pt, idx, arr) => {
      const isLast = idx === arr.length - 1;
      return {
        ...pt,
        sm0_5: isLast ? s.sm0_7 : pt.sm0_5,
        sm7_28: isLast ? s.sm7_28 : pt.sm7_28,
        sm28_100: isLast ? s.sm28_100 : pt.sm28_100,
      };
    });
  } else {
    failedFeeds.push("Open-Meteo Soil");
  }

  // 9. ISRIC SoilGrids
  let isricData: SoilGridsResult | null = null;
  if (soilGridsSettled.status === "fulfilled") {
    isricData = soilGridsSettled.value;
    activeFeeds.push("ISRIC SoilGrids");
  } else {
    failedFeeds.push("ISRIC SoilGrids");
  }

  // Assemble Layers Record
  const layers: Record<MapLayer, LayerReading> = {
    ...fallback.layers,
    NDVI: {
      layer: "NDVI",
      value: liveNdvi,
      unit: "index",
      intensity: Math.min(1, Math.max(0, liveNdvi)),
    },
    EVI: {
      layer: "EVI",
      value: liveEvi,
      unit: "index",
      intensity: Math.min(1, Math.max(0, liveEvi / 0.8)),
    },
  };

  // Reconcile hazard signals with real feeds; a chosen scenario stays fully simulated.
  const hazardSignals: HazardSignals = { ...fallback.hazardSignals, live: [] };
  if (input.scenario === "Nominal") {
    const storm = eonetData?.cyclones[0];
    if (eonetData) {
      hazardSignals.stormDistKm = storm ? storm.distKm : null;
      hazardSignals.stormName = storm?.title?.slice(0, 32) || "Storm system";
      hazardSignals.live.push("cyclone");
      const fires = eonetData.wildfires.filter((f) => f.distKm <= 50).length;
      hazardSignals.firmsHotspots50km = Math.max(hazardSignals.firmsHotspots50km, fires);
      hazardSignals.live.push("fire-smoke");
    }
    if (quakeData) {
      hazardSignals.quakeMag = quakeData.count > 0 ? quakeData.maxMag : 0;
      hazardSignals.quakeDepthKm = quakeData.depthKm;
      hazardSignals.quakeDistKm = quakeData.count > 0 ? quakeData.nearestDistKm : null;
      hazardSignals.live.push("earthquake");
    }
    if (spaceData) {
      hazardSignals.kpIndex = spaceData.kpIndex;
      hazardSignals.geomagStorm = spaceData.solarStormActive ? `Kp ${spaceData.kpIndex}` : null;
      if (spaceData.flareClass) hazardSignals.flareClass = spaceData.flareClass;
      hazardSignals.live.push("solar-storm");
    }
    if (eclipseData) {
      hazardSignals.obscurationPct = eclipseData.isEclipse ? eclipseData.obscuration : 0;
      hazardSignals.parDropPct = Math.round(hazardSignals.obscurationPct * 0.8);
      hazardSignals.live.push("eclipse");
    }
    if (power !== fallback.power) {
      hazardSignals.rain24hMm = power[power.length - 1]?.PRECTOTCORR ?? hazardSignals.rain24hMm;
      hazardSignals.live.push("flood");
    }
  }
  const hazards: HazardAlert[] = buildHazardAlerts(hazardSignals);

  // Reconcile Plant Health Pillars
  const pillars = fallback.plantHealth.pillars.map((pillar) => {
    if (pillar.key === "ndvi") {
      const score = Math.round(Math.min(100, Math.max(0, liveNdvi * 112)));
      return {
        ...pillar,
        score,
        note: `NDVI ${liveNdvi.toFixed(2)} · EVI ${liveEvi.toFixed(2)}`,
      };
    }
    if (pillar.key === "soil" && isricData) {
      const phDiff = Math.abs(isricData.ph - 6.6) * 26;
      const nDiff = Math.abs(isricData.nitrogenKgHa - 280) * 0.08;
      const score = Math.round(Math.min(100, Math.max(0, 100 - phDiff - nDiff)));
      return {
        ...pillar,
        score,
        note: `pH ${isricData.ph} · N ${isricData.nitrogenKgHa} kg/ha (SoilGrids)`,
      };
    }
    return pillar;
  });

  const overall = Math.round(
    pillars.reduce((acc, p) => acc + p.score, 0) / Math.max(1, pillars.length),
  );
  const healthStatus: Severity =
    overall >= 75 ? "nominal" : overall >= 55 ? "watch" : overall >= 35 ? "warning" : "critical";

  const plantHealth: PlantHealth = {
    pillars,
    overall,
    status: healthStatus,
  };

  const status: LiveApiStatus = {
    isLive: activeFeeds.length > 0,
    activeFeeds,
    failedFeeds,
    timestamp: new Date().toISOString(),
  };

  const telemetry: AgroTelemetry = {
    input,
    meta: fallback.meta,
    power,
    soil,
    plantHealth,
    waterBudget: fallback.waterBudget,
    hazards,
    hazardSignals,
    granules,
    layers,
    crop: fallback.crop,
  };

  return { telemetry, status };
}
