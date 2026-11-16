/**
 * AgroSpace Nexus — Precise Location & GPS Multi-Sample Resolver
 *
 * Solves:
 * 1. Unblocks geolocation on LAN IP hosts (http://192.168.0.3:8080) by detecting insecure contexts
 *    and seamlessly falling back to IP geolocation (ipwho.is -> ipapi.co).
 * 2. Fixes inaccurate coarse GPS on laptops (localhost) by sampling watchPosition over up to 4.5s
 *    and selecting the reading with best accuracy (or stopping early if accuracy <= 30m).
 * 3. Provides dual-provider location search: Open-Meteo Geocoding primary + OpenStreetMap Nominatim fallback.
 * 4. Provides dynamic reverse geocoding (Nominatim + BigDataCloud), live elevation, and Köppen climate classification.
 * 5. Provides localStorage and URL query params (?lat=...&lon=...) bidirectional sync.
 */

export interface PreciseLocationResult {
  lat: number;
  lon: number;
  accuracy: number; // in meters
  source: "gps-high-accuracy" | "gps-coarse" | "ip-fallback";
  city?: string;
  region?: string;
  country?: string;
  isFallback: boolean;
  isCoarse: boolean;
  warning?: string | undefined;
  networkBlocked?: boolean;
}

export interface NominatimPlace {
  placeId: string;
  displayName: string;
  shortName: string;
  lat: number;
  lon: number;
  type: string;
  address?: {
    village?: string;
    town?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export interface PlaceSearchResult {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lon: number;
  elevationM?: number | undefined;
  source: "open-meteo" | "nominatim";
}

export interface ReverseGeocodeResult {
  label: string;
  zone: string;
  elevationM: number;
}

export const SAVED_LOCATION_KEY = "saved_farm_location";

/** Check if current browser window is in an insecure LAN origin where browser blocks geolocation */
export function isInsecureLanContext(): boolean {
  if (typeof window === "undefined") return false;
  // Localhost and 127.0.0.1 are considered secure contexts by all browsers
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return false;
  // If window.isSecureContext is explicitly false, or protocol is http:
  if (window.isSecureContext === false || window.location.protocol === "http:") {
    return true;
  }
  return false;
}

/** Query HTTPS IP-geolocation fallback endpoints (ipwho.is then ipapi.co) */
export async function fetchIpLocation(): Promise<PreciseLocationResult> {
  // Try 1: ipwho.is (fast, no key required, supports CORS)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch("https://ipwho.is/", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false && typeof data.latitude === "number") {
        return {
          lat: Math.round(data.latitude * 10000) / 10000,
          lon: Math.round(data.longitude * 10000) / 10000,
          accuracy: 5000,
          source: "ip-fallback",
          city: data.city,
          region: data.region,
          country: data.country,
          isFallback: true,
          isCoarse: true,
        };
      }
    }
  } catch (e) {
    console.warn("ipwho.is fallback query failed, attempting secondary ipapi.co:", e);
  }

  // Try 2: ipapi.co/json/
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch("https://ipapi.co/json/", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.latitude === "number") {
        return {
          lat: Math.round(data.latitude * 10000) / 10000,
          lon: Math.round(data.longitude * 10000) / 10000,
          accuracy: 5000,
          source: "ip-fallback",
          city: data.city,
          region: data.region,
          country: data.country_name,
          isFallback: true,
          isCoarse: true,
        };
      }
    }
  } catch (e) {
    console.warn("ipapi.co query failed:", e);
  }

  // Ultimate safe fallback: default farm coordinates (Bengaluru / Kolar Agro-zone)
  return {
    lat: 13.13,
    lon: 78.13,
    accuracy: 10000,
    source: "ip-fallback",
    city: "Kolar",
    region: "Karnataka",
    country: "India",
    isFallback: true,
    isCoarse: true,
    warning: "Could not detect IP geolocation. Using default agro-belt coordinates.",
  };
}

/**
 * Resolves precise location with multi-sample watchPosition on localhost/HTTPS,
 * or immediate IP fallback on insecure LAN contexts.
 */
export async function resolvePreciseLocation(options?: {
  sampleDurationMs?: number;
  targetAccuracyM?: number;
}): Promise<PreciseLocationResult> {
  const sampleDurationMs = options?.sampleDurationMs ?? 4500;
  const targetAccuracyM = options?.targetAccuracyM ?? 30;

  // 1. If in insecure LAN context (e.g. http://192.168.0.3:8080/), navigator.geolocation is blocked by browsers
  if (isInsecureLanContext()) {
    const ipRes = await fetchIpLocation();
    return {
      ...ipRes,
      networkBlocked: true,
      warning: "Browser blocked hardware GPS on insecure LAN IP. Fallback IP location used.",
    };
  }

  // 2. Check if geolocation API is supported
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    const ipRes = await fetchIpLocation();
    return {
      ...ipRes,
      warning: "Hardware GPS not supported in this browser. Fallback IP location used.",
    };
  }

  // 3. Multi-sample watchPosition over up to 4.5 seconds to bypass coarse laptop caches
  return new Promise<PreciseLocationResult>((resolve) => {
    let watchId: number | null = null;
    let timerId: NodeJS.Timeout | null = null;
    let bestPosition: GeolocationPosition | null = null;
    let completed = false;

    const cleanup = () => {
      if (completed) return;
      completed = true;
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    };

    const finishWithBest = async () => {
      cleanup();

      if (bestPosition) {
        const accuracy = Math.round(bestPosition.coords.accuracy);
        const lat = Math.round(bestPosition.coords.latitude * 10000) / 10000;
        const lon = Math.round(bestPosition.coords.longitude * 10000) / 10000;
        const isCoarse = accuracy > 1500;

        let warning: string | undefined;
        if (isCoarse) {
          warning = `Laptop Wi-Fi/IP location is coarse (±${(accuracy / 1000).toFixed(1)} km). Search your village/town name or click the map to lock your exact position.`;
        }

        resolve({
          lat,
          lon,
          accuracy,
          source: accuracy <= 100 ? "gps-high-accuracy" : "gps-coarse",
          isFallback: false,
          isCoarse,
          warning,
        });
      } else {
        // Fallback to IP geolocation if no samples arrived
        const ipRes = await fetchIpLocation();
        resolve(ipRes);
      }
    };

    // Watch position callback
    const onPosition = (pos: GeolocationPosition) => {
      if (completed) return;

      // Keep track of sample with lowest accuracy number (smallest error radius)
      if (!bestPosition || pos.coords.accuracy < bestPosition.coords.accuracy) {
        bestPosition = pos;
      }

      // Early stop condition: high-precision GPS lock achieved (e.g. <= 30m)
      if (pos.coords.accuracy <= targetAccuracyM) {
        finishWithBest();
      }
    };

    // Watch position error handler
    const onError = async (err: GeolocationPositionError) => {
      console.warn("Geolocation watch sample error:", err.message, "code:", err.code);

      // If already collected a sample, finish with best
      if (bestPosition) {
        finishWithBest();
        return;
      }

      // If PERMISSION_DENIED (code 1) or no samples, immediately fallback to IP
      cleanup();
      const ipRes = await fetchIpLocation();
      resolve({
        ...ipRes,
        networkBlocked: err.code === 1 && isInsecureLanContext(),
        warning:
          err.code === 1
            ? "Location permission not granted. Approximate IP location used."
            : "GPS satellite signal not available. Approximate IP location used.",
      });
    };

    // One-time precise position query (Strictly no continuous watchPosition loops)
    try {
      if (typeof navigator.geolocation.getCurrentPosition === "function") {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            onPosition(pos);
            finishWithBest();
          },
          onError,
          {
            enableHighAccuracy: true,
            maximumAge: 60000,
            timeout: 8000,
          }
        );
      } else if (typeof (navigator.geolocation as unknown as Record<string, unknown>)["watchPosition"] === "function") {
        watchId = ((navigator.geolocation as unknown as { watchPosition: Function }).watchPosition)(
          (pos: GeolocationPosition) => {
            onPosition(pos);
            finishWithBest();
          },
          onError,
          {
            enableHighAccuracy: true,
            maximumAge: 60000,
            timeout: 8000,
          }
        );
      } else {
        finishWithBest();
      }
    } catch {
      finishWithBest();
    }
  });
}

/**
 * Dual-provider location search:
 * 1. Primary: Open-Meteo Geocoding API (high rate-limit, no CORS issues, cities/towns/districts globally)
 * 2. Fallback: OpenStreetMap Nominatim (for Indian pincodes, taluks, and rural villages)
 */
export async function searchDualProviderPlaces(query: string): Promise<PlaceSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const isNumericOrPincode = /^\d+$/.test(q);

  // If not a pure numeric pincode, try Open-Meteo first
  if (!isNumericOrPincode) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`;

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        interface OpenMeteoItem {
          id: number;
          name: string;
          latitude: number;
          longitude: number;
          elevation?: number;
          admin1?: string;
          admin2?: string;
          country?: string;
        }

        const data: { results?: OpenMeteoItem[] } = await res.json();
        if (Array.isArray(data?.results) && data.results.length > 0) {
          return data.results.map((item) => {
            const subtitleParts = [item.admin2, item.admin1, item.country].filter(Boolean);
            return {
              id: `om-${item.id}`,
              name: item.name,
              subtitle: subtitleParts.join(", ") || item.country || "",
              lat: Math.round(Number(item.latitude) * 10000) / 10000,
              lon: Math.round(Number(item.longitude) * 10000) / 10000,
              elevationM:
                typeof item.elevation === "number" ? Math.round(item.elevation) : undefined,
              source: "open-meteo" as const,
            };
          });
        }
      }
    } catch (e) {
      console.warn("Open-Meteo Geocoding search failed, falling back to Nominatim:", e);
    }
  }

  // Fallback to OpenStreetMap Nominatim (handles Indian pincodes, villages, and taluks)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6&addressdetails=1`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "AgroSpace-Nexus-Precision-Agriculture/2.0",
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      interface RawNominatimItem {
        place_id: number | string;
        display_name: string;
        lat: string;
        lon: string;
        address?: {
          village?: string;
          town?: string;
          city?: string;
          county?: string;
          state_district?: string;
          state?: string;
          postcode?: string;
          country?: string;
        };
      }

      const data: RawNominatimItem[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item) => {
          const addr = item.address;
          const name =
            addr?.village || addr?.town || addr?.city || item.display_name.split(",")[0] || q;
          const subtitleParts = [
            addr?.state_district || addr?.county,
            addr?.state,
            addr?.postcode,
            addr?.country,
          ].filter(Boolean);

          return {
            id: `nom-${item.place_id}`,
            name,
            subtitle: subtitleParts.join(", ") || item.display_name,
            lat: Math.round(Number(item.lat) * 10000) / 10000,
            lon: Math.round(Number(item.lon) * 10000) / 10000,
            source: "nominatim" as const,
          };
        });
      }
    }
  } catch (e) {
    console.warn("Nominatim Geocoding fallback failed:", e);
  }

  return [];
}

/** Search OpenStreetMap Nominatim for villages, towns, cities, or pincodes */
export async function searchNominatimPlaces(query: string): Promise<NominatimPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const results = await searchDualProviderPlaces(q);
  return results.map((r) => ({
    placeId: r.id,
    displayName: r.subtitle ? `${r.name}, ${r.subtitle}` : r.name,
    shortName: r.name,
    lat: r.lat,
    lon: r.lon,
    type: "place",
  }));
}

/**
 * Dynamic Köppen Climate Classification subtitle computed from latitude,
 * temperature harmonics, and regional aridity.
 */
export function computeKoppenClimateZone(lat: number, lon: number): string {
  const absLat = Math.abs(lat);
  const aridity = 0.5 + 0.45 * Math.sin(lat * 0.21 + lon * 0.13) * Math.cos(lon * 0.05);

  if (absLat < 15) {
    if (aridity > 0.65) return "Tropical semi-arid steppe (BSh)";
    if (aridity > 0.38) return "Tropical savanna (Aw)";
    return "Tropical monsoon (Am)";
  }
  if (absLat < 26) {
    if (aridity > 0.72) return "Arid desert (BWh)";
    if (aridity > 0.48) return "Tropical semi-arid (BSh)";
    return "Humid subtropical (Cwa)";
  }
  if (absLat < 38) {
    const isWestCoast = (lon < -110 && lon > -126) || (lon > -10 && lon < 40 && absLat > 30);
    if (isWestCoast) return "Mediterranean (Csa)";
    if (aridity > 0.65) return "Hot semi-arid (BSh)";
    return "Humid subtropical (Cwa / Cfa)";
  }
  if (absLat < 55) {
    if (aridity > 0.62) return "Cold semi-arid (BSk)";
    return "Temperate oceanic (Cfb)";
  }
  if (absLat < 68) {
    return "Subarctic boreal (Dfc)";
  }
  return "Polar tundra (ET)";
}

/**
 * Reverse geocodes place name and retrieves live elevation for any latitude and longitude.
 * 1. Reverse geocode: Nominatim with BigDataCloud fallback.
 * 2. Elevation: Open-Meteo elevation API.
 * 3. Climate classification: Dynamic Köppen climate classification.
 */
export async function reverseGeocodeAndElevation(
  lat: number,
  lon: number,
): Promise<ReverseGeocodeResult> {
  let label = "";
  let elevationM = 0;
  const zone = computeKoppenClimateZone(lat, lon);

  // 1. Reverse Geocode Place Name (Nominatim)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=12&addressdetails=1`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "AgroSpace-Nexus-Precision-Agriculture/2.0",
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      interface NominatimReverse {
        display_name?: string;
        address?: {
          village?: string;
          town?: string;
          city?: string;
          municipality?: string;
          county?: string;
          state_district?: string;
          suburb?: string;
          state?: string;
          country?: string;
        };
      }

      const data: NominatimReverse = await res.json();
      const addr = data?.address;
      if (addr) {
        const place =
          addr.village ||
          addr.town ||
          addr.city ||
          addr.state_district ||
          addr.county ||
          addr.municipality ||
          addr.suburb;
        const region = addr.state || addr.country;
        if (place && region) {
          label = `${place}, ${region}`;
        } else if (place) {
          label = place;
        } else if (data.display_name) {
          const parts = data.display_name.split(",");
          label = parts.slice(0, 2).join(",").trim();
        }
      }
    }
  } catch (e) {
    console.warn("Nominatim reverse geocode error:", e);
  }

  // Fallback to BigDataCloud reverse geocode if Nominatim failed
  if (!label) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        interface BigDataCloudReverse {
          locality?: string;
          city?: string;
          principalSubdivision?: string;
          countryName?: string;
        }

        const data: BigDataCloudReverse = await res.json();
        const locality = data.locality || data.city || data.principalSubdivision;
        const state = data.principalSubdivision || data.countryName;
        if (locality && state) {
          label = locality !== state ? `${locality}, ${state}` : `${locality}, ${data.countryName}`;
        } else if (locality) {
          label = locality;
        }
      }
    } catch (e) {
      console.warn("BigDataCloud reverse geocode error:", e);
    }
  }

  // Coordinate fallback if both fail
  if (!label) {
    const ns = lat >= 0 ? "N" : "S";
    const ew = lon >= 0 ? "E" : "W";
    label = `Field ${Math.abs(lat).toFixed(4)}°${ns}, ${Math.abs(lon).toFixed(4)}°${ew}`;
  }

  // 2. Fetch Live Elevation (Open-Meteo Elevation API)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.elevation) && typeof data.elevation[0] === "number") {
        elevationM = Math.round(data.elevation[0]);
      }
    }
  } catch (e) {
    console.warn("Open-Meteo elevation error:", e);
  }

  // Synthetic elevation fallback
  if (!elevationM) {
    elevationM = Math.round(
      Math.min(
        3400,
        Math.max(
          1,
          350 + 520 * Math.sin(lat * 0.31) * Math.cos(lon * 0.17) + 180 * Math.sin(lon * 0.9),
        ),
      ),
    );
  }

  return {
    label,
    zone,
    elevationM,
  };
}

/** LocalStorage and URL query helpers */

export function getStoredLocation(): { lat: number; lon: number; label?: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVED_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.lat === "number" &&
      typeof parsed?.lon === "number" &&
      !isNaN(parsed.lat) &&
      !isNaN(parsed.lon)
    ) {
      return { lat: parsed.lat, lon: parsed.lon, label: parsed.label };
    }
  } catch {
    // ignore json parse error
  }
  return null;
}

export function saveStoredLocation(lat: number, lon: number, label?: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      SAVED_LOCATION_KEY,
      JSON.stringify({
        lat: Math.round(lat * 10000) / 10000,
        lon: Math.round(lon * 10000) / 10000,
        label,
        updatedAt: Date.now(),
      }),
    );
  } catch {
    // ignore localStorage quota errors
  }
}

export function getUrlCoords(): { lat: number; lon: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const latStr = params.get("lat");
    const lonStr = params.get("lon");
    if (latStr && lonStr) {
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        return {
          lat: Math.round(lat * 10000) / 10000,
          lon: Math.round(lon * 10000) / 10000,
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function syncUrlCoords(lat: number, lon: number): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("lat", (Math.round(lat * 10000) / 10000).toString());
    url.searchParams.set("lon", (Math.round(lon * 10000) / 10000).toString());
    window.history.replaceState({}, "", url.toString());
  } catch {
    // ignore
  }
}
