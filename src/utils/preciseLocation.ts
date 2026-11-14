/**
 * AgroSpace Nexus — Precise Location & GPS Multi-Sample Resolver
 *
 * Solves:
 * 1. Unblocks geolocation on LAN IP hosts (http://192.168.0.3:8080) by detecting insecure contexts
 *    and seamlessly falling back to IP geolocation (ipwho.is -> ipapi.co).
 * 2. Fixes inaccurate coarse GPS on laptops (localhost) by sampling watchPosition over up to 4.5s
 *    and selecting the reading with best accuracy (or stopping early if accuracy <= 30m).
 * 3. Provides OpenStreetMap Nominatim village/town/pincode search.
 * 4. Provides localStorage and URL query params (?lat=...&lon=...) bidirectional sync.
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
  warning?: string;
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

    // Start listening to watchPosition
    try {
      watchId = navigator.geolocation.watchPosition(onPosition, onError, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      });

      // Sample collection timer (up to 4.5 seconds)
      timerId = setTimeout(() => {
        finishWithBest();
      }, sampleDurationMs);
    } catch {
      finishWithBest();
    }
  });
}

/** Search OpenStreetMap Nominatim for villages, towns, cities, or pincodes */
export async function searchNominatimPlaces(query: string): Promise<NominatimPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "AgroSpace-Nexus-Precision-Agriculture/2.0",
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    interface RawNominatimItem {
      place_id: number | string;
      display_name: string;
      lat: string;
      lon: string;
      type?: string;
      address?: {
        village?: string;
        town?: string;
        city?: string;
        state?: string;
        postcode?: string;
        country?: string;
      };
    }

    const data: RawNominatimItem[] = await res.json();
    return data.map((item) => {
      const addr = item.address;
      const shortName =
        addr?.village || addr?.town || addr?.city || item.display_name.split(",")[0] || q;

      return {
        placeId: String(item.place_id),
        displayName: item.display_name,
        shortName,
        lat: Math.round(Number(item.lat) * 10000) / 10000,
        lon: Math.round(Number(item.lon) * 10000) / 10000,
        type: item.type || "place",
        address: addr,
      };
    });
  } catch (e) {
    console.warn("Nominatim search error:", e);
    return [];
  }
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
