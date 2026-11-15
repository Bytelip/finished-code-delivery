/**
 * METEOROLOGICAL TELEMETRY & 4-DAY FORECAST SERVICE
 * Fetches real-time weather and 4-day forecasts from the 100% keyless Open-Meteo API
 * with deterministic offline/test fallbacks and Stull psychrometric wet-bulb calculation.
 */

export interface DailyForecastDay {
  date: string;
  label: string; // "Today", "+1d", "+2d", "+3d"
  tempMin: number;
  tempMax: number;
  feelsLikeMin: number;
  feelsLikeMax: number;
  windSpeedMax: number;
  windGustsMax: number;
  pressure: number;
  precipitationSum: number;
}

export interface CurrentMeteorologicalData {
  time: string;
  temperature: number;
  feelsLike: number;
  relativeHumidity: number;
  dewPoint: number;
  wetBulb: number;
  pressure: number;
  windSpeed: number;
  windGusts: number;
  precipitation: number;
}

export interface MeteorologicalForecast {
  lat: number;
  lon: number;
  current: CurrentMeteorologicalData;
  daily: DailyForecastDay[];
  source: "open-meteo" | "fallback";
}

/**
 * Calculates Wet-Bulb Temperature (°C) from dry-bulb temperature (°C) and relative humidity (%)
 * using the validated Stull (2011) psychrometric equation accurate to ±0.3°C.
 */
export function calculateWetBulbTemperature(T: number, RH: number): number {
  const clampedRH = Math.max(1, Math.min(100, RH));
  const tw =
    T * Math.atan(0.151977 * Math.pow(clampedRH + 8.313659, 0.5)) +
    Math.atan(T + clampedRH) -
    Math.atan(clampedRH - 1.676331) +
    0.00391838 * Math.pow(clampedRH, 1.5) * Math.atan(0.023101 * clampedRH) -
    4.686035;
  return Math.round(tw * 10) / 10;
}

/**
 * Generates deterministic fallback forecast when offline or running in test environments.
 * Seeded by coordinates to maintain identical SSR and client hydration output.
 */
export function generateDeterministicForecast(lat: number, lon: number): MeteorologicalForecast {
  const seed = Math.abs(Math.sin(lat * 12.9898 + lon * 78.233) * 43758.5453);
  const baseTemp = 24 + (seed % 10);
  const baseRH = 45 + (seed % 35);
  const baseWind = 10 + (seed % 16);
  const basePressure = 1010 + ((seed % 15) - 7);
  const wetBulb = calculateWetBulbTemperature(baseTemp, baseRH);

  const days: DailyForecastDay[] = [
    {
      date: "2026-11-15",
      label: "Today",
      tempMin: Math.round((baseTemp - 7) * 10) / 10,
      tempMax: Math.round(baseTemp * 10) / 10,
      feelsLikeMin: Math.round((baseTemp - 6) * 10) / 10,
      feelsLikeMax: Math.round((baseTemp + 1.5) * 10) / 10,
      windSpeedMax: Math.round(baseWind * 10) / 10,
      windGustsMax: Math.round((baseWind * 2.2) * 10) / 10,
      pressure: Math.round(basePressure),
      precipitationSum: 0.0,
    },
    {
      date: "2026-11-16",
      label: "+1d",
      tempMin: Math.round((baseTemp - 6.5) * 10) / 10,
      tempMax: Math.round((baseTemp + 1.2) * 10) / 10,
      feelsLikeMin: Math.round((baseTemp - 5.5) * 10) / 10,
      feelsLikeMax: Math.round((baseTemp + 2.5) * 10) / 10,
      windSpeedMax: Math.round((baseWind + 2) * 10) / 10,
      windGustsMax: Math.round((baseWind * 2.4) * 10) / 10,
      pressure: Math.round(basePressure - 1),
      precipitationSum: 0.2,
    },
    {
      date: "2026-11-17",
      label: "+2d",
      tempMin: Math.round((baseTemp - 7.2) * 10) / 10,
      tempMax: Math.round((baseTemp + 1.8) * 10) / 10,
      feelsLikeMin: Math.round((baseTemp - 6) * 10) / 10,
      feelsLikeMax: Math.round((baseTemp + 3.0) * 10) / 10,
      windSpeedMax: Math.round((baseWind + 1.5) * 10) / 10,
      windGustsMax: Math.round((baseWind * 2.3) * 10) / 10,
      pressure: Math.round(basePressure + 2),
      precipitationSum: 0.0,
    },
    {
      date: "2026-11-18",
      label: "+3d",
      tempMin: Math.round((baseTemp - 6.8) * 10) / 10,
      tempMax: Math.round((baseTemp + 2.2) * 10) / 10,
      feelsLikeMin: Math.round((baseTemp - 5) * 10) / 10,
      feelsLikeMax: Math.round((baseTemp + 3.5) * 10) / 10,
      windSpeedMax: Math.round((baseWind + 4) * 10) / 10,
      windGustsMax: Math.round((baseWind * 2.8) * 10) / 10,
      pressure: Math.round(basePressure + 1),
      precipitationSum: 1.5,
    },
  ];

  return {
    lat,
    lon,
    current: {
      time: "2026-11-15T11:00",
      temperature: Math.round(baseTemp * 10) / 10,
      feelsLike: Math.round((baseTemp + 1) * 10) / 10,
      relativeHumidity: Math.round(baseRH),
      dewPoint: Math.round((baseTemp - ((100 - baseRH) / 5)) * 10) / 10,
      wetBulb,
      pressure: Math.round(basePressure),
      windSpeed: Math.round(baseWind * 10) / 10,
      windGusts: Math.round((baseWind * 2.2) * 10) / 10,
      precipitation: 0.0,
    },
    daily: days,
    source: "fallback",
  };
}

// In-memory cache for Open-Meteo responses
const forecastCache = new Map<string, { timestamp: number; data: MeteorologicalForecast }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches real-time live & 4-day forecast data from Open-Meteo with fallback.
 */
export async function fetchMeteorologicalForecast(
  lat: number,
  lon: number,
): Promise<MeteorologicalForecast> {
  const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const cached = forecastCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,surface_pressure,wind_speed_10m,wind_gusts_10m,precipitation&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,surface_pressure_max,surface_pressure_min&timezone=auto&forecast_days=4`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP error: ${res.status}`);
    }

    const data = await res.json();
    const cur = data.current || {};
    const d = data.daily || {};

    const temp = typeof cur.temperature_2m === "number" ? cur.temperature_2m : 25.0;
    const rh = typeof cur.relative_humidity_2m === "number" ? cur.relative_humidity_2m : 55;
    const wetBulb = calculateWetBulbTemperature(temp, rh);

    const labels = ["Today", "+1d", "+2d", "+3d"];
    const dailyDays: DailyForecastDay[] = (d.time || []).slice(0, 4).map((timeStr: string, idx: number) => ({
      date: timeStr,
      label: labels[idx] || `+${idx}d`,
      tempMin: typeof d.temperature_2m_min?.[idx] === "number" ? d.temperature_2m_min[idx] : 18,
      tempMax: typeof d.temperature_2m_max?.[idx] === "number" ? d.temperature_2m_max[idx] : 28,
      feelsLikeMin: typeof d.apparent_temperature_min?.[idx] === "number" ? d.apparent_temperature_min[idx] : 18,
      feelsLikeMax: typeof d.apparent_temperature_max?.[idx] === "number" ? d.apparent_temperature_max[idx] : 30,
      windSpeedMax: typeof d.wind_speed_10m_max?.[idx] === "number" ? d.wind_speed_10m_max[idx] : 14,
      windGustsMax: typeof d.wind_gusts_10m_max?.[idx] === "number" ? d.wind_gusts_10m_max[idx] : 28,
      pressure: typeof d.surface_pressure_max?.[idx] === "number" ? Math.round(d.surface_pressure_max[idx]) : 1013,
      precipitationSum: typeof d.precipitation_sum?.[idx] === "number" ? d.precipitation_sum[idx] : 0,
    }));

    const result: MeteorologicalForecast = {
      lat,
      lon,
      current: {
        time: cur.time || "2026-11-15T11:00",
        temperature: temp,
        feelsLike: typeof cur.apparent_temperature === "number" ? cur.apparent_temperature : temp + 1,
        relativeHumidity: rh,
        dewPoint: typeof cur.dew_point_2m === "number" ? cur.dew_point_2m : 15,
        wetBulb,
        pressure: typeof cur.surface_pressure === "number" ? Math.round(cur.surface_pressure) : 1012,
        windSpeed: typeof cur.wind_speed_10m === "number" ? cur.wind_speed_10m : 12,
        windGusts: typeof cur.wind_gusts_10m === "number" ? cur.wind_gusts_10m : 25,
        precipitation: typeof cur.precipitation === "number" ? cur.precipitation : 0,
      },
      daily: dailyDays.length >= 4 ? dailyDays : generateDeterministicForecast(lat, lon).daily,
      source: "open-meteo",
    };

    forecastCache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
  } catch (_e) {
    // Return deterministic fallback
    return generateDeterministicForecast(lat, lon);
  }
}
