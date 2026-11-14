/**
 * Client service to call the Supabase Edge Function `nasa-proxy`
 * for token-protected NASA AppEEARS, FIRMS, and Meteomatics APIs.
 */

export interface NasaProxyResponse {
  success: boolean;
  location?: { lat: number; lon: number };
  date?: string;
  appeears?: {
    status: string;
    authenticated: boolean;
    esi?: number;
    wue?: number;
    note?: string;
  };
  firms?: {
    status: string;
    authenticated: boolean;
    activeHotspots?: number;
    source?: string;
    note?: string;
  };
  meteomatics?: {
    status: string;
    authenticated: boolean;
    evapotranspiration?: number;
    soilMoistureIndex?: number;
    note?: string;
  };
}

export async function fetchNasaProxy(
  lat: number,
  lon: number,
  vpd = 1.2,
  soilMoisturePct = 40,
): Promise<NasaProxyResponse | null> {
  const supabaseUrl =
    (typeof process !== "undefined" && process.env?.VITE_SUPABASE_URL) ||
    (typeof import.meta !== "undefined" &&
      (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL);

  if (!supabaseUrl) {
    // If Supabase is not deployed or configured locally, return the keyless fallback directly
    return {
      success: true,
      location: { lat, lon },
      appeears: {
        status: "fallback",
        authenticated: false,
        esi:
          Math.round(
            Math.min(1.2, Math.max(0.05, 1.15 - vpd * 0.22 + soilMoisturePct / 300)) * 100,
          ) / 100,
        wue: 2.4,
        note: "Direct keyless fallback (Supabase URL unconfigured)",
      },
      firms: {
        status: "fallback",
        authenticated: false,
        activeHotspots: 0,
        note: "Direct keyless fallback (Supabase URL unconfigured)",
      },
      meteomatics: {
        status: "fallback",
        authenticated: false,
        evapotranspiration: 3.5,
        note: "Direct keyless fallback (Supabase URL unconfigured)",
      },
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${supabaseUrl}/functions/v1/nasa-proxy`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lon, vpd, soilMoisturePct }),
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
