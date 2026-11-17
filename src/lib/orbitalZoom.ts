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
/** Camera altitude (km) at which the sphere has fully flattened into a 2D field map. */
export const GLOBE_FLAT_ALTITUDE_KM = 1;
/** Zoom where the exact altitude 35000 / 2^zoom equals GLOBE_FLAT_ALTITUDE_KM (≈ 15.1). */
export const GLOBE_FLAT_ZOOM = Math.log2(35000 / GLOBE_FLAT_ALTITUDE_KM);
/** The morph from sphere to flat map starts this many zoom levels above the 1 km line (~1.5 km). */
export const GLOBE_MORPH_SPAN = 0.6;
export const GLOBE_MORPH_START_ZOOM = GLOBE_FLAT_ZOOM - GLOBE_MORPH_SPAN;

/** globe = 3D sphere, morph = blending between the two, flat = 2D mercator field map. */
export type GlobeProjectionMode = "globe" | "morph" | "flat";

/** Projection mode for a zoom level; zooming back out reverses it at the same lines. */
export function projectionModeForZoom(zoom: number): GlobeProjectionMode {
  if (zoom >= GLOBE_FLAT_ZOOM) return "flat";
  if (zoom > GLOBE_MORPH_START_ZOOM) return "morph";
  return "globe";
}

/** 0 = fully spherical, 1 = fully flat. */
export function flatnessForZoom(zoom: number): number {
  if (zoom >= GLOBE_FLAT_ZOOM) return 1;
  const t = (zoom - GLOBE_MORPH_START_ZOOM) / GLOBE_MORPH_SPAN;
  return Math.min(1, Math.max(0, t));
}

/**
 * MapLibre projection that morphs continuously with zoom: spherical globe above
 * ~1.5 km, flat mercator at ≤ 1 km. Being a zoom expression, MapLibre blends every
 * frame, so there is no snap, reload, or flicker in either direction.
 */
export function globeProjectionExpression() {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    GLOBE_MORPH_START_ZOOM,
    "vertical-perspective",
    GLOBE_FLAT_ZOOM,
    "mercator",
  ] as const;
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

/** HUD altitude text: whole km from orbit, metres once below 10 km so field level never reads "0 km". */
export function formatAltitude(zoom: number): string {
  const km = 35000 / Math.pow(2, zoom);
  if (km >= 10) return `${altitudeKmForZoom(zoom).toLocaleString("en-US")} km`;
  if (km >= 1) return `${km.toFixed(1)} km`;
  return `${Math.round(km * 1000).toLocaleString("en-US")} m`;
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
