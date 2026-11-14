/**
 * Hazard rules for the 8 tactical alert cards.
 * Mock and live services both feed `HazardSignals` through `buildHazardAlerts`,
 * so thresholds live in exactly one place.
 */
import type {
  HazardActionId,
  HazardAlert,
  HazardReading,
  HazardSignals,
  HazardType,
  Severity,
} from "@/types/agroSpace";

export const HAZARD_THRESHOLDS = {
  /** GPM IMERG 24 h rain that waterlogs fields, mm */
  floodRain24hMm: 65,
  /** NASA POWER GWETROOT saturation fraction that starves roots of oxygen */
  floodGwetroot: 0.85,
  /** Canopy fever: surface skin temp minus 2 m air temp, °C */
  canopyFeverC: 3,
  /** Radiative frost risk: night minimum below, °C */
  frostC: 4,
  /** Fungal spore infection: relative humidity above, % */
  blightRh: 85,
  /** Spray drift: 2 m wind speed above, m/s */
  sprayDriftWs2m: 6.5,
  /** FIRMS hotspot search radius around the field, km */
  firmsRadiusKm: 50,
} as const;

const T = HAZARD_THRESHOLDS;
const RANK: Record<Severity, number> = { nominal: 0, watch: 1, warning: 2, critical: 3 };
const atLeast = (a: Severity, b: Severity): Severity => (RANK[a] >= RANK[b] ? a : b);
const isActive = (s: Severity) => RANK[s] >= RANK.warning;

const fmt = (v: number, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);

function alert(
  type: HazardType,
  s: HazardSignals,
  data: {
    title: string;
    source: string;
    severity: Severity;
    metric: string;
    detail: string;
    readings: HazardReading[];
    actions: HazardActionId[];
  },
): HazardAlert {
  return { id: `hz-${type}`, type, origin: s.live.includes(type) ? "live" : "simulated", ...data };
}

function cyclone(s: HazardSignals): HazardAlert {
  const d = s.stormDistKm;
  let severity: Severity =
    d == null
      ? "nominal"
      : d < 200
        ? "critical"
        : d < 600
          ? "warning"
          : d < 1200
            ? "watch"
            : "nominal";
  if (s.gustKmh >= 90) severity = atLeast(severity, "warning");
  const near = d != null && d < 600;
  return alert("cyclone", s, {
    title: "Cyclone & Severe Storm",
    source: "NASA EONET v3 · GPM IMERG",
    severity,
    metric: d == null ? "No systems" : `${d} km · ${s.stormName}`,
    detail: isActive(severity)
      ? `${s.stormName} ${d ?? "?"} km from field. Prevent lodging, secure pumps.`
      : "No severe storm within 600 km.",
    readings: [
      { id: "stormDistance", value: d == null ? "—" : `${d} km`, breached: near },
      { id: "windShear", value: `${fmt(s.windShearMs)} m/s`, breached: near && s.windShearMs < 10 },
      { id: "gust", value: `${Math.round(s.gustKmh)} km/h`, breached: s.gustKmh >= 60 },
    ],
    actions: ["cyclone.harvest", "cyclone.stake", "cyclone.drain", "cyclone.secure"],
  });
}

function earthquake(s: HazardSignals): HazardAlert {
  const inRange = s.quakeDistKm != null && s.quakeDistKm <= 500 && s.quakeMag > 0;
  const m = s.quakeMag;
  const severity: Severity = !inRange
    ? "nominal"
    : m >= 6
      ? "critical"
      : m >= 5
        ? "warning"
        : m >= 4
          ? "watch"
          : "nominal";
  return alert("earthquake", s, {
    title: "Earthquake & Liquefaction",
    source: "USGS ComCat",
    severity,
    metric: inRange ? `M${fmt(m)} · ${Math.round(s.quakeDepthKm)} km depth` : "None in 500 km",
    detail: isActive(severity)
      ? `Epicentre ${s.quakeDistKm} km away. Check borewell casing and canal bunds.`
      : "Background micro-seismicity only.",
    readings: [
      { id: "quakeMagnitude", value: inRange ? `M${fmt(m)}` : "—", breached: inRange && m >= 5 },
      {
        id: "quakeDepth",
        value: inRange ? `${Math.round(s.quakeDepthKm)} km` : "—",
        breached: inRange && m >= 5 && s.quakeDepthKm < 70,
      },
      {
        id: "quakeDistance",
        value: s.quakeDistKm == null ? "—" : `${s.quakeDistKm} km`,
        breached: inRange && (s.quakeDistKm ?? 999) < 100 && m >= 4,
      },
    ],
    actions: ["quake.casing", "quake.canal", "quake.pipes", "quake.structures"],
  });
}

function solarStorm(s: HazardSignals): HazardAlert {
  const kp = s.kpIndex;
  let severity: Severity = kp >= 7 ? "critical" : kp >= 5 ? "warning" : kp >= 4 ? "watch" : "nominal";
  const flare = s.flareClass?.toUpperCase() ?? "";
  if (flare.startsWith("X")) severity = atLeast(severity, "warning");
  else if (flare.startsWith("M")) severity = atLeast(severity, "watch");
  const gScale = kp >= 9 ? "G5" : kp >= 8 ? "G4" : kp >= 7 ? "G3" : kp >= 6 ? "G2" : kp >= 5 ? "G1" : "";
  return alert("solar-storm", s, {
    title: "Solar Winds, CME & Geomagnetic Storm",
    source: "NASA DONKI GST/FLR · NOAA SWPC Kp",
    severity,
    metric: `Kp ${fmt(kp)}${gScale ? ` · ${gScale}` : ""}`,
    detail: isActive(severity)
      ? "GNSS drift ±3 m. Pause RTK auto-steer; expect LoRaWAN packet loss."
      : "Quiet geomagnetic field. GNSS nominal.",
    readings: [
      { id: "kpIndex", value: fmt(kp), breached: kp >= 5 },
      { id: "solarFlare", value: s.flareClass ?? "—", breached: /^[MX]/i.test(flare) },
      { id: "geomagStorm", value: s.geomagStorm ?? "—", breached: s.geomagStorm != null },
      { id: "uvIndex", value: fmt(s.uvIndex), breached: s.uvIndex >= 8 },
    ],
    actions: ["solar.rtk", "solar.lora", "solar.uvb", "solar.drones"],
  });
}

function eclipse(s: HazardSignals): HazardAlert {
  const o = s.obscurationPct;
  const severity: Severity = o >= 80 ? "warning" : o > 0 ? "watch" : "nominal";
  return alert("eclipse", s, {
    title: "Solar Eclipse Photoperiod Dip",
    source: "USNO Eclipse API · NASA POWER PAR",
    severity,
    metric: o > 0 ? `${Math.round(o)}% obscuration` : "None in 30 d",
    detail:
      o > 0
        ? `PAR drops ${Math.round(s.parDropPct)}%. Expect stomatal closure and a pollinator pause.`
        : "No eclipse path over this field.",
    readings: [
      { id: "obscuration", value: `${Math.round(o)}%`, breached: o >= 50 },
      { id: "parDrop", value: `${Math.round(s.parDropPct)}%`, breached: s.parDropPct >= 40 },
    ],
    actions: ["eclipse.irrigation", "eclipse.spray", "eclipse.pollinators", "eclipse.livestock"],
  });
}

function fireSmoke(s: HazardSignals): HazardAlert {
  const n = s.firmsHotspots50km;
  const aod = s.aod;
  const severity: Severity =
    n >= 10 || aod >= 1.2
      ? "critical"
      : n >= 4 || aod >= 0.7
        ? "warning"
        : n >= 1 || aod >= 0.4
          ? "watch"
          : "nominal";
  return alert("fire-smoke", s, {
    title: "Stubble Fire & Smoke Dimming",
    source: "NASA FIRMS VIIRS 375m · MODIS MAIAC AOD",
    severity,
    metric: `${n} hotspots / ${T.firmsRadiusKm} km · AOD ${fmt(aod, 2)}`,
    detail: isActive(severity)
      ? "Fires upwind and smoke aerosols are blocking crop sunlight."
      : "No significant thermal anomalies.",
    readings: [
      { id: "firmsHotspots", value: String(n), breached: n >= 4 },
      { id: "frp", value: `${Math.round(s.frpMw)} MW`, breached: s.frpMw >= 100 },
      { id: "aod", value: fmt(aod, 2), breached: aod >= 0.7 },
    ],
    actions: ["fire.noburn", "fire.firebreak", "fire.mask", "fire.light"],
  });
}

function flood(s: HazardSignals): HazardAlert {
  const rainHit = s.rain24hMm > T.floodRain24hMm;
  const soilHit = s.gwetroot > T.floodGwetroot;
  const severity: Severity =
    (rainHit && soilHit) || s.rain24hMm > 120
      ? "critical"
      : rainHit || soilHit
        ? "warning"
        : s.rain24hMm > 40 || s.gwetroot > 0.75
          ? "watch"
          : "nominal";
  return alert("flood", s, {
    title: "Flood & Root Hypoxia",
    source: "GPM IMERG · NASA POWER GWETROOT",
    severity,
    metric: `${Math.round(s.rain24hMm)} mm/24h · GWETROOT ${fmt(s.gwetroot, 2)}`,
    detail: isActive(severity)
      ? "Waterlogged root zone: nitrogen leaching and root-rot risk."
      : "Rainfall within absorbable range.",
    readings: [
      { id: "rain24h", value: `${Math.round(s.rain24hMm)} mm`, breached: rainHit },
      { id: "gwetroot", value: fmt(s.gwetroot, 2), breached: soilHit },
    ],
    actions: ["flood.drain", "flood.fertilizer", "flood.rootrot", "flood.electric"],
  });
}

function thermalBlight(s: HazardSignals): HazardAlert {
  const heat = s.canopyDeltaC > T.canopyFeverC;
  const frost = s.minTempC < T.frostC;
  const blight = s.rh2m > T.blightRh;
  const hits = [heat, frost, blight].filter(Boolean).length;
  const severity: Severity =
    s.canopyDeltaC > 5 || s.minTempC < 0 || hits >= 2
      ? "critical"
      : hits === 1
        ? "warning"
        : s.canopyDeltaC > 2 || s.minTempC < 7 || s.rh2m > 75
          ? "watch"
          : "nominal";
  const actions: HazardActionId[] = [];
  if (heat || s.canopyDeltaC > 2) actions.push("thermal.heatIrrigate", "thermal.heatSpray");
  if (frost || s.minTempC < 7) actions.push("thermal.frostIrrigate", "thermal.frostCover");
  if (blight || s.rh2m > 75) actions.push("thermal.blightScout", "thermal.blightSpray");
  if (actions.length === 0) actions.push("thermal.blightScout", "thermal.heatIrrigate");
  const causes = [heat && "canopy fever", frost && "frost", blight && "spore infection"].filter(
    Boolean,
  );
  return alert("thermal-blight", s, {
    title: "Heatwave, Frost & Fungal Blight",
    source: "NASA POWER TS · T2M · RH2M",
    severity,
    metric: `ΔT ${fmt(s.canopyDeltaC)}°C · Tmin ${fmt(s.minTempC)}°C · RH ${Math.round(s.rh2m)}%`,
    detail: causes.length ? `Active: ${causes.join(", ")}.` : "Temperature and humidity safe.",
    readings: [
      { id: "canopyDelta", value: `${s.canopyDeltaC >= 0 ? "+" : ""}${fmt(s.canopyDeltaC)} °C`, breached: heat },
      { id: "minTemp", value: `${fmt(s.minTempC)} °C`, breached: frost },
      { id: "humidity", value: `${Math.round(s.rh2m)}%`, breached: blight },
    ],
    actions,
  });
}

function sprayDrift(s: HazardSignals): HazardAlert {
  const w = s.ws2m;
  const severity: Severity =
    w > 10 ? "critical" : w > T.sprayDriftWs2m ? "warning" : w > 4.5 ? "watch" : "nominal";
  return alert("spray-drift", s, {
    title: "High Wind Spray Drift",
    source: "NASA POWER WS2M",
    severity,
    metric: `WS2M ${fmt(w)} m/s`,
    detail: isActive(severity) ? "Halt pesticide spraying: drift risk." : "Wind calm enough to spray.",
    readings: [{ id: "windSpeed", value: `${fmt(w)} m/s`, breached: w > T.sprayDriftWs2m }],
    actions: ["spray.halt", "spray.window", "spray.nozzle", "spray.buffer"],
  });
}

/** Evaluate all 8 hazards, always in the fixed display order. */
export function buildHazardAlerts(s: HazardSignals): HazardAlert[] {
  return [
    cyclone(s),
    earthquake(s),
    solarStorm(s),
    eclipse(s),
    fireSmoke(s),
    flood(s),
    thermalBlight(s),
    sprayDrift(s),
  ];
}

export const isActiveSeverity = isActive;
