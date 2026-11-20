/**
 * Zoom rules for the 3D Orbital satellite globe.
 * Pure helpers so the HUD readouts (ALT, Z.xx, STAGE pill) stay testable.
 */
export const GLOBE_MIN_ZOOM = 1.5;
export const GLOBE_MAX_ZOOM = 19;
/** Opening view: whole Earth visible like a satellite in orbit. */
export const GLOBE_DEFAULT_ZOOM = 2.6;
/** Clicking or searching a place flies in to at least this zoom. */
export const GLOBE_FLY_TO_MIN_ZOOM = 11;
/** Zoom +/- animation length in milliseconds. */
export const GLOBE_ZOOM_DURATION_MS = 300;
/** Cinematic fly-to length in milliseconds for location picks. */
export const GLOBE_FLY_DURATION_MS = 2200;
/** 1.0 km altitude threshold for automatic 2D flat map projection. */
export const ALTITUDE_TRANSITION_KM = 1.0;
/**
 * Zooming in to 1 km altitude (altitudeKmForZoom(15) = 1 km, or zoom >= 15)
 * smoothly morphs the 3D spherical globe into a flat 2D Mercator map.
 */
export const GLOBE_FLAT_ZOOM = 15;
/**
 * Zooming back out above 1 km altitude (e.g. into regional/continental view, zoom < 13.5, alt > 2 km)
 * smoothly restores the 3D spherical globe (hysteresis prevents flicker).
 */
export const GLOBE_SPHERE_ZOOM = 13.5;

export type GlobeProjectionId = "globe" | "mercator";

/**
 * Altitude-triggered auto-transition:
 * - When altitude <= 1.0 km (or zoom >= GLOBE_FLAT_ZOOM), switches from 3D globe to flat 2D mercator projection.
 * - When zooming back out past 1.0 km (altitude > 1.0 km and zoom < GLOBE_SPHERE_ZOOM), switches back to 3D globe.
 * - Keeps current projection in the hysteresis band so the view does not flicker or stutter.
 */
export function projectionForZoom(zoom: number, current: GlobeProjectionId): GlobeProjectionId {
  const alt = altitudeKmForZoom(zoom);
  if (current === "globe" && (alt <= ALTITUDE_TRANSITION_KM || zoom >= GLOBE_FLAT_ZOOM)) {
    return "mercator";
  }
  if (current === "mercator" && (alt > ALTITUDE_TRANSITION_KM && zoom < GLOBE_SPHERE_ZOOM)) {
    return "globe";
  }
  return current;
}

/** Direct altitude-based projection check for camera altitude in km. */
export function projectionForAltitude(altitudeKm: number, current: GlobeProjectionId): GlobeProjectionId {
  if (current === "globe" && altitudeKm <= ALTITUDE_TRANSITION_KM) {
    return "mercator";
  }
  if (current === "mercator" && altitudeKm > ALTITUDE_TRANSITION_KM) {
    return "globe";
  }
  return current;
}

/** Ease-in-out cubic: starts gently, cruises, and decelerates onto the target. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function clampGlobeZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return GLOBE_DEFAULT_ZOOM;
  return Math.min(GLOBE_MAX_ZOOM, Math.max(GLOBE_MIN_ZOOM, zoom));
}

/** Approximate camera altitude in km for a web-mercator zoom level. */
export function altitudeKmForZoom(zoom: number): number {
  return Math.round(35000 / Math.pow(2, zoom));
}

export type OrbitalStageId = "orbital" | "continental" | "regional" | "field";

export interface OrbitalStage {
  id: OrbitalStageId;
  stage: string;
  label: string;
}

/** z<4 orbital, 4–<7 continental, 7–10 state/regional, >10 district/field. */
export function orbitalStageForZoom(zoom: number): OrbitalStage {
  if (zoom < 4) return { id: "orbital", stage: "STAGE 1", label: "ORBITAL VIEW" };
  if (zoom < 7) return { id: "continental", stage: "STAGE 2", label: "CONTINENTAL" };
  if (zoom <= 10) return { id: "regional", stage: "STAGE 3", label: "STATE / REGIONAL" };
  return { id: "field", stage: "STAGE 4", label: "DISTRICT / FIELD" };
}

/** Zoom to fly to when the user picks a place: never zoom back out. */
export function flyToZoomFor(currentZoom: number): number {
  return clampGlobeZoom(Math.max(currentZoom, GLOBE_FLY_TO_MIN_ZOOM));
}
