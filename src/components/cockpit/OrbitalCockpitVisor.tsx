import React from "react";

export interface OrbitalCockpitVisorProps {
  active?: boolean;
  orbitalAltitudeKm?: number;
  velocityKmh?: number;
  inclinationDeg?: number;
  lat?: number;
  lon?: number;
}

/**
 * Permanently deactivated: Decorative visor overlays removed to keep
 * 3D/2D map viewports pristine, clean, and distraction-free.
 */
export function OrbitalCockpitVisor(_props: OrbitalCockpitVisorProps) {
  return null;
}

export default OrbitalCockpitVisor;
