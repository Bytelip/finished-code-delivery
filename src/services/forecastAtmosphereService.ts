export type AtmosphereMetricId = "precipitation" | "wind" | "temperature" | "humidity" | "pressure";

export interface AtmosphereDay {
  date: string;
  precipitation?: number | undefined;
  windSpeed10m?: number | undefined;
  windDirection10m?: number | undefined;
  windSpeed2m?: number | undefined;
  temperature?: number | undefined;
  temperatureMax?: number | undefined;
  temperatureMin?: number | undefined;
  humidity?: number | undefined;
  specificHumidity?: number | undefined;
  pressureHpa?: number | undefined;
}

export interface AtmosphereMetric {
  value: number | null;
  baseline: number | null;
  min: number | null;
  max: number | null;
  average: number | null;
  date: string | null;
  source: "NASA POWER" | "Open-Meteo" | "Unavailable";
  cadence: "current" | "hourly" | "daily" | null;
}

export interface ForecastAtmosphere {
  coordinates: { lat: number; lon: number };
  metrics: Record<AtmosphereMetricId, AtmosphereMetric>;
  windSpeed2m: AtmosphereMetric;
  temperatureDaily: { min: number | null; max: number | null; average: number | null };
  windDirection: number | null;
  specificHumidity: number | null;
  timestamp: string | null;
  loadingSource: string;
}

const CACHE_TTL = 5 * 60_000;
const cache = new Map<string, { expires: number; data: Promise<ForecastAtmosphere> }>();
const POWER_PARAMETERS = "PRECTOTCORR,WS10M,WD10M,WS2M,T2M,T2M_MAX,T2M_MIN,RH2M,QV2M,PS";
const valid = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value !== -999 && value > -900;

function latestValue(
  days: AtmosphereDay[],
  key: keyof AtmosphereDay,
): { value: number | null; date: string | null } {
  for (let i = days.length - 1; i >= 0; i--) {
    const value = days[i]?.[key];
    if (valid(value)) return { value, date: days[i]!.date };
  }
  return { value: null, date: null };
}

function metric(
  days: AtmosphereDay[],
  key: keyof AtmosphereDay,
  current: number | null,
  currentSource: "Open-Meteo" | "Unavailable" = "Unavailable",
  hourlyValue: number | null = null,
): AtmosphereMetric {
  const points = days.map((day) => day[key]).filter(valid);
  const latest = latestValue(days, key);
  return {
    value: current ?? hourlyValue ?? latest.value,
    baseline: latest.value,
    min: points.length ? Math.min(...points) : null,
    max: points.length ? Math.max(...points) : null,
    average: points.length ? points.reduce((sum, value) => sum + value, 0) / points.length : null,
    date: latest.date,
    source:
      current != null
        ? currentSource
        : hourlyValue != null || latest.value != null
          ? "NASA POWER"
          : "Unavailable",
    cadence:
      current != null
        ? "current"
        : hourlyValue != null
          ? "hourly"
          : latest.value != null
            ? "daily"
            : null,
  };
}

async function loadAtmosphere(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<ForecastAtmosphere> {
  const now = new Date();
  const end = now.toISOString().slice(0, 10).replaceAll("-", "");
  const start = new Date(now.getTime() - 6 * 86_400_000)
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");
  const powerUrl = new URL("https://power.larc.nasa.gov/api/temporal/daily/point");
  powerUrl.search = new URLSearchParams({
    parameters: POWER_PARAMETERS,
    community: "AG",
    longitude: String(lon),
    latitude: String(lat),
    start,
    end,
    format: "JSON",
    "time-standard": "UTC",
  }).toString();
  const hourlyUrl = new URL("https://power.larc.nasa.gov/api/temporal/hourly/point");
  hourlyUrl.search = new URLSearchParams({
    parameters: "PRECTOTCORR,WS10M,WD10M,WS2M,T2M,RH2M,QV2M,PS",
    community: "AG",
    longitude: String(lon),
    latitude: String(lat),
    start,
    end,
    format: "JSON",
    "time-standard": "UTC",
  }).toString();
  const meteoUrl = new URL("https://api.open-meteo.com/v1/gfs");
  meteoUrl.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,surface_pressure",
    hourly:
      "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,surface_pressure",
    wind_speed_unit: "ms",
    timezone: "UTC",
    forecast_days: "1",
  }).toString();
  const [powerResult, hourlyResult, meteoResult] = await Promise.allSettled([
    fetch(powerUrl, { signal: signal ?? null }).then((response) => {
      if (!response.ok) throw new Error(`POWER HTTP ${response.status}`);
      return response.json();
    }),
    fetch(hourlyUrl, { signal: signal ?? null }).then((response) => {
      if (!response.ok) throw new Error(`POWER hourly HTTP ${response.status}`);
      return response.json();
    }),
    fetch(meteoUrl, { signal: signal ?? null }).then((response) => {
      if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
      return response.json();
    }),
  ]);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const parameter =
    powerResult.status === "fulfilled" ? powerResult.value?.properties?.parameter : null;
  const hourlyParameter =
    hourlyResult.status === "fulfilled" ? hourlyResult.value?.properties?.parameter : null;
  const latestHourly = (name: string): { value: number | null; timestamp: string | null } => {
    const values = hourlyParameter?.[name] as Record<string, number> | undefined;
    if (!values) return { value: null, timestamp: null };
    const keys = Object.keys(values).sort();
    for (let index = keys.length - 1; index >= 0; index--) {
      const value = values[keys[index]!];
      if (valid(value)) {
        const stamp = keys[index]!;
        return {
          value,
          timestamp:
            stamp.length >= 10
              ? `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(8, 10)}:00Z`
              : stamp,
        };
      }
    }
    return { value: null, timestamp: null };
  };
  const allDates = new Set<string>();
  if (parameter && typeof parameter === "object") {
    for (const values of Object.values(parameter) as Record<string, number>[]) {
      Object.keys(values || {}).forEach((date) => allDates.add(date));
    }
  }
  const dates = [...allDates].sort();
  const get = (name: string, date: string): number | undefined => {
    const value = parameter?.[name]?.[date];
    return valid(value) ? value : undefined;
  };
  const days: AtmosphereDay[] = dates.map((date) => ({
    date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
    precipitation: get("PRECTOTCORR", date),
    windSpeed10m: get("WS10M", date),
    windDirection10m: get("WD10M", date),
    windSpeed2m: get("WS2M", date),
    temperature: get("T2M", date),
    temperatureMax: get("T2M_MAX", date),
    temperatureMin: get("T2M_MIN", date),
    humidity: get("RH2M", date),
    // POWER Agroclimatology responses express QV2M in g/kg.
    specificHumidity: get("QV2M", date),
    // POWER PS is kPa; convert to hPa.
    pressureHpa: get("PS", date) == null ? undefined : get("PS", date)! * 10,
  }));
  const current = meteoResult.status === "fulfilled" ? meteoResult.value?.current : null;
  const currentNumber = (key: string): number | null =>
    valid(current?.[key]) ? current[key] : null;
  const currentRain = currentNumber("precipitation");
  const currentWind = currentNumber("wind_speed_10m");
  const currentTemp = currentNumber("temperature_2m");
  const currentHumidity = currentNumber("relative_humidity_2m");
  const currentPressure = currentNumber("surface_pressure");
  const currentSource = (value: number | null): "Open-Meteo" | "Unavailable" =>
    value == null ? "Unavailable" : "Open-Meteo";
  const hourRain = latestHourly("PRECTOTCORR");
  const hourWind = latestHourly("WS10M");
  const hourWind2m = latestHourly("WS2M");
  const hourTemp = latestHourly("T2M");
  const hourHumidity = latestHourly("RH2M");
  const hourPressure = latestHourly("PS");
  const p = metric(days, "precipitation", currentRain, currentSource(currentRain), hourRain.value);
  const w = metric(days, "windSpeed10m", currentWind, currentSource(currentWind), hourWind.value);
  const w2 = metric(days, "windSpeed2m", null, "Unavailable", hourWind2m.value);
  const t = metric(days, "temperature", currentTemp, currentSource(currentTemp), hourTemp.value);
  const h = metric(
    days,
    "humidity",
    currentHumidity,
    currentSource(currentHumidity),
    hourHumidity.value,
  );
  const pressureCurrentHpa = currentPressure == null ? null : currentPressure;
  const pressureBase = latestValue(days, "pressureHpa");
  const pressurePoints = days.map((day) => day.pressureHpa).filter(valid);
  const pressure: AtmosphereMetric = {
    value:
      pressureCurrentHpa ??
      (hourPressure.value == null ? null : hourPressure.value * 10) ??
      pressureBase.value,
    baseline: pressureBase.value,
    min: pressurePoints.length ? Math.min(...pressurePoints) : null,
    max: pressurePoints.length ? Math.max(...pressurePoints) : null,
    average: pressurePoints.length
      ? pressurePoints.reduce((sum, value) => sum + value, 0) / pressurePoints.length
      : null,
    date: pressureBase.date,
    source:
      pressureCurrentHpa != null
        ? "Open-Meteo"
        : hourPressure.value != null || pressureBase.value != null
          ? "NASA POWER"
          : "Unavailable",
    cadence:
      pressureCurrentHpa != null
        ? "current"
        : hourPressure.value != null
          ? "hourly"
          : pressureBase.value != null
            ? "daily"
            : null,
  };
  const latestWindDirection =
    latestHourly("WD10M").value ?? latestValue(days, "windDirection10m").value;
  const latestSpecificHumidity =
    latestHourly("QV2M").value ?? latestValue(days, "specificHumidity").value;
  const minTemps = days.map((day) => day.temperatureMin).filter(valid);
  const maxTemps = days.map((day) => day.temperatureMax).filter(valid);
  return {
    coordinates: { lat, lon },
    metrics: { precipitation: p, wind: w, temperature: t, humidity: h, pressure },
    windSpeed2m: w2,
    temperatureDaily: {
      min: minTemps.length ? Math.min(...minTemps) : null,
      max: maxTemps.length ? Math.max(...maxTemps) : null,
      average: t.average,
    },
    windDirection: currentNumber("wind_direction_10m") ?? latestWindDirection,
    specificHumidity: latestSpecificHumidity,
    timestamp: current?.time || hourPressure.timestamp || pressureBase.date,
    loadingSource: `${powerResult.status === "fulfilled" ? "POWER daily baseline" : "POWER daily unavailable"} · ${hourlyResult.status === "fulfilled" ? "POWER hourly" : "POWER hourly unavailable"} · ${meteoResult.status === "fulfilled" ? "Open-Meteo GFS current" : "GFS current unavailable"}`,
  };
}

export function fetchForecastAtmosphere(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<ForecastAtmosphere> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;
  const data = loadAtmosphere(lat, lon, signal);
  cache.set(key, { expires: Date.now() + CACHE_TTL, data });
  signal?.addEventListener(
    "abort",
    () => {
      if (cache.get(key)?.data === data) cache.delete(key);
    },
    { once: true },
  );
  if (cache.size > 100) cache.delete(cache.keys().next().value!);
  void data.catch(() => {
    if (cache.get(key)?.data === data) cache.delete(key);
  });
  return data;
}

export const FORECAST_INFO: Record<
  AtmosphereMetricId,
  { parameter: string; dataset: string; resolution: string }
> = {
  precipitation: {
    parameter: "PRECTOTCORR",
    dataset: "NASA POWER · MERRA-2 / GPM bias-corrected",
    resolution: "0.5° × 0.625° nominal POWER grid",
  },
  wind: {
    parameter: "WS10M · WD10M · WS2M",
    dataset: "NASA POWER · MERRA-2",
    resolution: "0.5° × 0.625° nominal grid",
  },
  temperature: {
    parameter: "T2M · T2M_MAX · T2M_MIN",
    dataset: "NASA POWER · MERRA-2",
    resolution: "0.5° × 0.625° nominal grid",
  },
  humidity: {
    parameter: "RH2M · QV2M",
    dataset: "NASA POWER · MERRA-2",
    resolution: "0.5° × 0.625° nominal grid",
  },
  pressure: {
    parameter: "PS",
    dataset: "NASA POWER · MERRA-2",
    resolution: "0.5° × 0.625° nominal grid",
  },
};
