/**
 * Keyless raster tile endpoints for the 3D Orbital globe (browser-safe, no map library imports).
 */
const ESRI = "https://services.arcgisonline.com/ArcGIS/rest/services";

const DARK_STYLES = new Set(["dark", "wind", "humidity", "temperature", "precipitation", "radar"]);

export function globeBasemapTileUrl(style: string): string {
  if (DARK_STYLES.has(style)) return `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`;
  if (style === "pressure") return `${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`;
  if (style === "terrain") return `${ESRI}/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`;
  if (style === "default") return `${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`;
  return `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`;
}

/** Country → state → district → town labels and borders drawn over the imagery. */
export function globeLabelsTileUrl(style: string): string {
  if (DARK_STYLES.has(style)) return `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`;
  return `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`;
}

/** Street / road names layered on top for the field-level view. */
export function globeTransportationTileUrl(): string {
  return `${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`;
}

export const GLOBE_ATTRIBUTION =
  'Imagery © Esri, Maxar, Earthstar Geographics · Labels © Esri · <a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noreferrer">NASA GIBS</a>';
