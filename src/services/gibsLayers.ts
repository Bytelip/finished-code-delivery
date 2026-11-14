import type { MapLayer } from "@/types/agroSpace";

export interface GibsLayerInfo {
  layerName: string;
  maxZoom: number;
  title: string;
  defaultDate: string;
}

export interface SatelliteLayerMeta {
  layerKey: MapLayer;
  gibsLayerName: string;
  title: string;
  sensorName: string;
  maxZoom: number;
  defaultDate: string;
  format: "png" | "jpg";
  primaryColor: string;
  colorRamp: {
    gradient: string;
    minLabel: string;
    maxLabel: string;
    units: string;
    colors: string[];
  };
  description: string;
  blendMode: "additive" | "normal";
}

/**
 * Centralized SATELLITE_LAYERS_CONFIG
 * Maps all 8 telemetry keys directly to official NASA GIBS WMTS layer identifiers,
 * scientific color ramps, and 3D globe overlay renderers.
 */
export const SATELLITE_LAYERS_CONFIG: Record<MapLayer, SatelliteLayerMeta> = {
  NDVI: {
    layerKey: "NDVI",
    gibsLayerName: "MODIS_Terra_NDVI_8Day",
    title: "MODIS Terra 8-Day NDVI Vegetation Index",
    sensorName: "MODIS Terra (250m)",
    maxZoom: 9,
    defaultDate: "2024-05-01",
    format: "png",
    primaryColor: "#10b981",
    colorRamp: {
      gradient: "linear-gradient(to right, #8a5a36, #d4b16a, #84cc16, #10b981, #065f46)",
      minLabel: "0.0 Barren Soil",
      maxLabel: "0.9 Dense Canopy",
      units: "NDVI (-0.1 to 1.0)",
      colors: ["#8a5a36", "#d4b16a", "#84cc16", "#10b981", "#065f46"],
    },
    description:
      "Normalized Difference Vegetation Index monitoring chlorophyll density and active photosynthetic biomass.",
    blendMode: "additive",
  },
  EVI: {
    layerKey: "EVI",
    gibsLayerName: "MODIS_Terra_EVI_8Day",
    title: "MODIS Terra 8-Day Enhanced Vegetation Index",
    sensorName: "MODIS Terra Enhanced (250m)",
    maxZoom: 9,
    defaultDate: "2024-05-01",
    format: "png",
    primaryColor: "#22c55e",
    colorRamp: {
      gradient: "linear-gradient(to right, #78350f, #ca8a04, #65a30d, #22c55e, #047857)",
      minLabel: "0.0 Sparse",
      maxLabel: "0.85 Closed Canopy",
      units: "EVI Index",
      colors: ["#78350f", "#ca8a04", "#65a30d", "#22c55e", "#047857"],
    },
    description:
      "Enhanced Vegetation Index mitigating atmospheric haze and canopy background noise for high-biomass crops.",
    blendMode: "additive",
  },
  LAI: {
    layerKey: "LAI",
    gibsLayerName: "MODIS_Combined_LAI_8Day",
    title: "MODIS Combined 8-Day Leaf Area Index",
    sensorName: "MODIS Terra/Aqua Combined",
    maxZoom: 9,
    defaultDate: "2024-05-01",
    format: "png",
    primaryColor: "#14b8a6",
    colorRamp: {
      gradient: "linear-gradient(to right, #fef08a, #a3e635, #2dd4bf, #0d9488, #115e59)",
      minLabel: "0.0 m²/m²",
      maxLabel: "6.0 m²/m² (Dense)",
      units: "Leaf Area (m²/m²)",
      colors: ["#fef08a", "#a3e635", "#2dd4bf", "#0d9488", "#115e59"],
    },
    description:
      "Leaf Area Index quantifying total one-sided green leaf area per unit ground surface area.",
    blendMode: "additive",
  },
  "ECOSTRESS ESI": {
    layerKey: "ECOSTRESS ESI",
    gibsLayerName: "MODIS_Terra_Land_Surface_Temp_Day",
    title: "Evaporative Stress & Thermal Drought Index",
    sensorName: "ISS ECOSTRESS / MODIS LST",
    maxZoom: 7,
    defaultDate: "2024-05-01",
    format: "png",
    primaryColor: "#f59e0b",
    colorRamp: {
      gradient: "linear-gradient(to right, #3b82f6, #06b6d4, #f59e0b, #ea580c, #dc2626)",
      minLabel: "Low Stress (<28°C)",
      maxLabel: "Severe Drought (>45°C)",
      units: "Canopy Fever (°C)",
      colors: ["#3b82f6", "#06b6d4", "#f59e0b", "#ea580c", "#dc2626"],
    },
    description:
      "Detects early crop transpiration shutdown and canopy heating before visible foliar wilting occurs.",
    blendMode: "additive",
  },
  "SMAP Moisture": {
    layerKey: "SMAP Moisture",
    gibsLayerName: "SMAP_L4_Analyzed_Root_Zone_Soil_Moisture",
    title: "SMAP L4 Analyzed Root-Zone Soil Moisture",
    sensorName: "NASA SMAP Radar/Radiometer",
    maxZoom: 6,
    defaultDate: "2024-05-01",
    format: "png",
    primaryColor: "#06b6d4",
    colorRamp: {
      gradient: "linear-gradient(to right, #ea580c, #eab308, #06b6d4, #2563eb, #1e3a8a)",
      minLabel: "5% Wilting Point",
      maxLabel: "55% Field Capacity",
      units: "% Volumetric (m³/m³)",
      colors: ["#ea580c", "#eab308", "#06b6d4", "#2563eb", "#1e3a8a"],
    },
    description:
      "Sub-surface 0–100 cm root-zone soil water content derived from L-band microwave radiometry.",
    blendMode: "additive",
  },
  "GPM Rain": {
    layerKey: "GPM Rain",
    gibsLayerName: "IMERG_Precipitation_Rate",
    title: "GPM IMERG Early Half-Hourly Precipitation",
    sensorName: "GPM Dual-Frequency Radar",
    maxZoom: 6,
    defaultDate: "2024-05-01",
    format: "png",
    primaryColor: "#3b82f6",
    colorRamp: {
      gradient:
        "linear-gradient(to right, rgba(6,182,212,0.1), #38bdf8, #3b82f6, #8b5cf6, #ec4899)",
      minLabel: "0.1 mm/hr (Drizzle)",
      maxLabel: ">25 mm/hr (Downpour)",
      units: "Precip Rate (mm/hr)",
      colors: ["#38bdf8", "#3b82f6", "#8b5cf6", "#ec4899"],
    },
    description:
      "Multi-satellite precipitation rate tracking active rain bands, storm cells, and monsoon fronts.",
    blendMode: "additive",
  },
  "FIRMS Fires": {
    layerKey: "FIRMS Fires",
    gibsLayerName: "MODIS_Combined_Thermal_Anomalies_All",
    title: "FIRMS Active Fire & Thermal Anomalies",
    sensorName: "VIIRS SNPP 375m / MODIS Terra",
    maxZoom: 8,
    defaultDate: "2024-05-01",
    format: "png",
    primaryColor: "#ef4444",
    colorRamp: {
      gradient: "linear-gradient(to right, #facc15, #f97316, #ef4444, #991b1b, #450a0a)",
      minLabel: "10 MW (Residue Burn)",
      maxLabel: ">250 MW (Wildfire)",
      units: "Fire Radiative Power (MW)",
      colors: ["#facc15", "#f97316", "#ef4444", "#991b1b"],
    },
    description:
      "Near real-time 375m thermal anomaly hotspots detecting agricultural residue fires and brush fires.",
    blendMode: "additive",
  },
  "Smoke AOD": {
    layerKey: "Smoke AOD",
    gibsLayerName: "MODIS_Combined_Value_Added_AOD",
    title: "MODIS Combined Value-Added Aerosol Optical Depth",
    sensorName: "MODIS MAIAC / Dark Target",
    maxZoom: 6,
    defaultDate: "2024-05-01",
    format: "png",
    primaryColor: "#f59e0b",
    colorRamp: {
      gradient:
        "linear-gradient(to right, rgba(245,158,11,0.1), #fbbf24, #f59e0b, #b45309, #78350f)",
      minLabel: "0.05 Clean Air",
      maxLabel: ">1.0 Dense Smoke / Haze",
      units: "Aerosol Optical Depth (τ)",
      colors: ["#fbbf24", "#f59e0b", "#b45309", "#78350f"],
    },
    description: "Atmospheric column aerosol loading blocking direct photosynthetic PAR sunlight.",
    blendMode: "additive",
  },
};

/** Backwards-compatible GIBS_LAYER_CONFIG referencing SATELLITE_LAYERS_CONFIG */
export const GIBS_LAYER_CONFIG: Record<MapLayer, GibsLayerInfo> = {
  NDVI: {
    layerName: SATELLITE_LAYERS_CONFIG.NDVI.gibsLayerName,
    maxZoom: SATELLITE_LAYERS_CONFIG.NDVI.maxZoom,
    title: SATELLITE_LAYERS_CONFIG.NDVI.title,
    defaultDate: SATELLITE_LAYERS_CONFIG.NDVI.defaultDate,
  },
  EVI: {
    layerName: SATELLITE_LAYERS_CONFIG.EVI.gibsLayerName,
    maxZoom: SATELLITE_LAYERS_CONFIG.EVI.maxZoom,
    title: SATELLITE_LAYERS_CONFIG.EVI.title,
    defaultDate: SATELLITE_LAYERS_CONFIG.EVI.defaultDate,
  },
  LAI: {
    layerName: SATELLITE_LAYERS_CONFIG.LAI.gibsLayerName,
    maxZoom: SATELLITE_LAYERS_CONFIG.LAI.maxZoom,
    title: SATELLITE_LAYERS_CONFIG.LAI.title,
    defaultDate: SATELLITE_LAYERS_CONFIG.LAI.defaultDate,
  },
  "ECOSTRESS ESI": {
    layerName: SATELLITE_LAYERS_CONFIG["ECOSTRESS ESI"].gibsLayerName,
    maxZoom: SATELLITE_LAYERS_CONFIG["ECOSTRESS ESI"].maxZoom,
    title: SATELLITE_LAYERS_CONFIG["ECOSTRESS ESI"].title,
    defaultDate: SATELLITE_LAYERS_CONFIG["ECOSTRESS ESI"].defaultDate,
  },
  "SMAP Moisture": {
    layerName: SATELLITE_LAYERS_CONFIG["SMAP Moisture"].gibsLayerName,
    maxZoom: SATELLITE_LAYERS_CONFIG["SMAP Moisture"].maxZoom,
    title: SATELLITE_LAYERS_CONFIG["SMAP Moisture"].title,
    defaultDate: SATELLITE_LAYERS_CONFIG["SMAP Moisture"].defaultDate,
  },
  "GPM Rain": {
    layerName: SATELLITE_LAYERS_CONFIG["GPM Rain"].gibsLayerName,
    maxZoom: SATELLITE_LAYERS_CONFIG["GPM Rain"].maxZoom,
    title: SATELLITE_LAYERS_CONFIG["GPM Rain"].title,
    defaultDate: SATELLITE_LAYERS_CONFIG["GPM Rain"].defaultDate,
  },
  "FIRMS Fires": {
    layerName: SATELLITE_LAYERS_CONFIG["FIRMS Fires"].gibsLayerName,
    maxZoom: SATELLITE_LAYERS_CONFIG["FIRMS Fires"].maxZoom,
    title: SATELLITE_LAYERS_CONFIG["FIRMS Fires"].title,
    defaultDate: SATELLITE_LAYERS_CONFIG["FIRMS Fires"].defaultDate,
  },
  "Smoke AOD": {
    layerName: SATELLITE_LAYERS_CONFIG["Smoke AOD"].gibsLayerName,
    maxZoom: SATELLITE_LAYERS_CONFIG["Smoke AOD"].maxZoom,
    title: SATELLITE_LAYERS_CONFIG["Smoke AOD"].title,
    defaultDate: SATELLITE_LAYERS_CONFIG["Smoke AOD"].defaultDate,
  },
};
