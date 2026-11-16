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
/** Zooming in past this level morphs the sphere into a flat mercator map. */
export const GLOBE_FLAT_ZOOM = 12;
/** Zooming back out above this level restores the spherical globe (hysteresis). */
export const GLOBE_SPHERE_ZOOM = 10;

export type GlobeProjectionId = "globe" | "mercator";

/** Keeps the current projection between thresholds so the view does not flicker. */
export function projectionForZoom(zoom: number, current: GlobeProjectionId): GlobeProjectionId {
  if (current === "globe" && zoom > GLOBE_FLAT_ZOOM) return "mercator";
  if (current === "mercator" && zoom < GLOBE_SPHERE_ZOOM) return "globe";
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
