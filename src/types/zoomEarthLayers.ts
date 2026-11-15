import type { MapLayer } from "@/types/agroSpace";

export type LiveMapLayerId = "satellite" | "radar";

export type AtmosphericLayerId = "precipitation" | "wind" | "temperature" | "humidity" | "pressure";

export type TerrainVectorLayerId = "terrain" | "default" | "dark";

export type ZoomEarthLayerId =
  LiveMapLayerId | AtmosphericLayerId | TerrainVectorLayerId | MapLayer;

export type SatelliteSubOption = "satellite_live" | "satellite_hd";
export type WindSubOption = "wind_speed" | "wind_gusts";
export type TempSubOption = "temp_actual" | "temp_feels";
export type HumiditySubOption = "hum_relative" | "hum_dewpoint" | "hum_wetbulb";

export type SubLayerId = SatelliteSubOption | WindSubOption | TempSubOption | HumiditySubOption;

export interface ColorScaleStop {
  value: number | string;
  color: string;
  label?: string;
}

export interface ColorScaleConfig {
  unit: string;
  title: string;
  stops: ColorScaleStop[];
  gradientCss: string;
  minLabel?: string;
  maxLabel?: string;
}

export interface LayerMetadata {
  id: ZoomEarthLayerId;
  name: string;
  category: "live" | "atmospheric" | "nasa_agro";
  iconName: string;
  emoji: string;
  title: string;
  description: string;
  colorScale: ColorScaleConfig;
  defaultSubOption?: SubLayerId;
  subOptions?: { id: SubLayerId; label: string; description: string }[];
}

export const ZOOM_EARTH_LAYERS_META: Record<string, LayerMetadata> = {
  satellite: {
    id: "satellite",
    name: "Satellite",
    category: "live",
    iconName: "Satellite",
    emoji: "🛰️",
    title: "Satellite Imagery",
    description:
      "High-resolution true-color Earth optical imagery seamlessly composited with real-time cloud cover and atmospheric water vapor layers.",
    defaultSubOption: "satellite_live",
    subOptions: [
      {
        id: "satellite_live",
        label: "Live",
        description: "Real-time satellite imagery + cloud cover overlay",
      },
      {
        id: "satellite_hd",
        label: "HD",
        description: "Ultra-crisp Esri World Imagery + place labels",
      },
    ],
    colorScale: {
      unit: "Reflectance",
      title: "Optical Albedo",
      stops: [
        { value: "0%", color: "#050b14", label: "Clear" },
        { value: "50%", color: "#64748b", label: "Haze" },
        { value: "100%", color: "#ffffff", label: "Clouds" },
      ],
      gradientCss: "linear-gradient(to right, #050b14, #334155, #94a3b8, #ffffff)",
    },
  },
  radar: {
    id: "radar",
    name: "Radar",
    category: "live",
    iconName: "Radio",
    emoji: "📡",
    title: "Radar Reflectivity",
    description:
      "Real-time precipitation radar reflectivity (dBZ) tracking active convective storm cells, hail cores, and incoming rainbands across India.",
    colorScale: {
      unit: "dBZ",
      title: "Rainfall Reflectivity",
      stops: [
        { value: "15", color: "#38bdf8", label: "Drizzle" },
        { value: "30", color: "#22c55e", label: "Light" },
        { value: "40", color: "#eab308", label: "Moderate" },
        { value: "50", color: "#ef4444", label: "Heavy" },
        { value: "65", color: "#ec4899", label: "Extreme" },
      ],
      gradientCss: "linear-gradient(to right, #38bdf8, #22c55e, #eab308, #ef4444, #ec4899)",
    },
  },
  precipitation: {
    id: "precipitation",
    name: "Precipitation",
    category: "atmospheric",
    iconName: "CloudRain",
    emoji: "🌧️",
    title: "Precipitation Forecast",
    description: "This map shows the forecast for rain, snow, and clouds in the coming days.",
    colorScale: {
      unit: "mm/h",
      title: "Rain Rate",
      stops: [
        { value: "0.1", color: "#38bdf8", label: "Light" },
        { value: "2.5", color: "#22c55e", label: "Moderate" },
        { value: "10", color: "#eab308", label: "Heavy" },
        { value: "30", color: "#ef4444", label: "Violent" },
        { value: "50+", color: "#ec4899", label: "Cloudburst" },
      ],
      gradientCss: "linear-gradient(to right, #38bdf8, #22c55e, #eab308, #ef4444, #ec4899)",
      minLabel: "Light",
      maxLabel: "Violent",
    },
  },
  wind: {
    id: "wind",
    name: "Wind",
    category: "atmospheric",
    iconName: "Wind",
    emoji: "💨",
    title: "Wind Speed & Streamlines Forecast",
    description:
      "This map shows surface wind velocities and dynamic airflow streamlines. High winds accelerate evapotranspiration and risk crop lodging.",
    defaultSubOption: "wind_speed",
    subOptions: [
      { id: "wind_speed", label: "Wind Speed", description: "10 m sustained surface wind speed" },
      { id: "wind_gusts", label: "Wind Gusts", description: "Peak instantaneous wind gusts" },
    ],
    colorScale: {
      unit: "km/h",
      title: "Surface Wind Speed",
      stops: [
        { value: "40", color: "#06b6d4", label: "40" },
        { value: "60", color: "#10b981", label: "60" },
        { value: "80", color: "#eab308", label: "80" },
        { value: "100", color: "#f97316", label: "100" },
        { value: "120+", color: "#d946ef", label: "120" },
      ],
      gradientCss:
        "linear-gradient(to right, #06b6d4, #10b981, #eab308, #f97316, #ef4444, #d946ef)",
    },
  },
  temperature: {
    id: "temperature",
    name: "Temperature",
    category: "atmospheric",
    iconName: "Thermometer",
    emoji: "🌡️",
    title: "Temperature Forecast",
    description: "This map shows the forecast for air temperature at 2 m above the ground.",
    defaultSubOption: "temp_actual",
    subOptions: [
      { id: "temp_actual", label: "Actual", description: "2 m air temperature (°C)" },
      { id: "temp_feels", label: "Feels Like", description: "Apparent temperature / Heat Index" },
    ],
    colorScale: {
      unit: "°C",
      title: "2m Air Temperature",
      stops: [
        { value: "-30", color: "#38bdf8", label: "-30" },
        { value: "0", color: "#06b6d4", label: "0" },
        { value: "20", color: "#10b981", label: "20" },
        { value: "30", color: "#eab308", label: "30" },
        { value: "40", color: "#f97316", label: "40" },
        { value: "50", color: "#ef4444", label: "50" },
      ],
      gradientCss:
        "linear-gradient(to right, #38bdf8, #06b6d4, #10b981, #eab308, #f97316, #ef4444)",
    },
  },
  humidity: {
    id: "humidity",
    name: "Humidity",
    category: "atmospheric",
    iconName: "Droplets",
    emoji: "💧",
    title: "Relative Humidity Forecast",
    description:
      "This map shows the forecast for relative humidity, which compares air moisture to temperature.",
    defaultSubOption: "hum_relative",
    subOptions: [
      { id: "hum_relative", label: "Relative", description: "Relative humidity ratio (%)" },
      { id: "hum_dewpoint", label: "Dew Point", description: "Condensation temperature (°C)" },
      {
        id: "hum_wetbulb",
        label: "Wet-Bulb",
        description: "Thermodynamic heat-stress threshold (°C)",
      },
    ],
    colorScale: {
      unit: "%",
      title: "Relative Humidity",
      stops: [
        { value: "0", color: "#d97706", label: "0" },
        { value: "25", color: "#f59e0b", label: "25" },
        { value: "50", color: "#06b6d4", label: "50" },
        { value: "75", color: "#0284c7", label: "75" },
        { value: "100", color: "#1d4ed8", label: "100" },
      ],
      gradientCss: "linear-gradient(to right, #d97706, #f59e0b, #06b6d4, #0284c7, #1d4ed8)",
    },
  },
  pressure: {
    id: "pressure",
    name: "Pressure",
    category: "atmospheric",
    iconName: "Gauge",
    emoji: "🧭",
    title: "Atmospheric Pressure Forecast",
    description:
      "This map shows the forecast for atmospheric pressure at sea level. Low pressure often brings clouds and wind. High pressure usually brings clearer skies and lighter winds.",
    colorScale: {
      unit: "hPa",
      title: "Mean Sea-Level Pressure (MSLP)",
      stops: [
        { value: "990", color: "#38bdf8", label: "990" },
        { value: "1005", color: "#06b6d4", label: "1005" },
        { value: "1015", color: "#f8fafc", label: "1015" },
        { value: "1025", color: "#f97316", label: "1025" },
        { value: "1040", color: "#ef4444", label: "1040" },
      ],
      gradientCss: "linear-gradient(to right, #38bdf8, #06b6d4, #f8fafc, #f97316, #ef4444)",
    },
  },
  terrain: {
    id: "terrain",
    name: "Terrain",
    category: "live",
    iconName: "Mountain",
    emoji: "⛰️",
    title: "Topographic & Elevation Relief",
    description:
      "Keyless Esri World Topographic relief contours combined with 3D elevation morphology for watershed and slope analysis.",
    colorScale: {
      unit: "m ASL",
      title: "Elevation Relief",
      stops: [
        { value: "0", color: "#1b281d", label: "0m" },
        { value: "500", color: "#2d5a37", label: "500m" },
        { value: "1500", color: "#d97706", label: "1500m" },
        { value: "3000+", color: "#f8fafc", label: "3000m+" },
      ],
      gradientCss: "linear-gradient(to right, #1b281d, #2d5a37, #d97706, #f8fafc)",
    },
  },
  default: {
    id: "default",
    name: "Default (Map)",
    category: "live",
    iconName: "Map",
    emoji: "🗺️",
    title: "Street & District Cartography",
    description:
      "Keyless Esri World Street cartography with high-contrast district boundaries, road networks, and agricultural mandals.",
    colorScale: {
      unit: "Infra",
      title: "Cartographic Layers",
      stops: [
        { value: "Rural", color: "#1f2937", label: "Rural" },
        { value: "Arterial", color: "#3b82f6", label: "Arterial" },
        { value: "Urban", color: "#f59e0b", label: "Urban" },
      ],
      gradientCss: "linear-gradient(to right, #1f2937, #3b82f6, #f59e0b)",
    },
  },
  dark: {
    id: "dark",
    name: "Dark Telemetry",
    category: "live",
    iconName: "Moon",
    emoji: "🌑",
    title: "Dark Telemetry Canvas",
    description:
      "Ultra-high contrast obsidian basemap engineered for NASA GIBS spectral overlay visibility and low-light operations.",
    colorScale: {
      unit: "Obsidian",
      title: "Telemetry Contrast",
      stops: [
        { value: "Void", color: "#05070c", label: "Void" },
        { value: "Grid", color: "#1e293b", label: "Grid" },
        { value: "Active", color: "#06b6d4", label: "Active" },
      ],
      gradientCss: "linear-gradient(to right, #05070c, #1e293b, #06b6d4)",
    },
  },
  NDVI: {
    id: "NDVI",
    name: "NDVI Vegetation",
    category: "nasa_agro",
    iconName: "Sprout",
    emoji: "🌱",
    title: "Normalized Difference Vegetation Index (NDVI)",
    description:
      "NASA MODIS / Terra 250m satellite radiometric index calculating photosynthetic chlorophyll vitality and vegetation density across field parcels.",
    colorScale: {
      unit: "Index",
      title: "Chlorophyll Vigor",
      stops: [
        { value: "0.0", color: "#a855f7", label: "Barren" },
        { value: "0.3", color: "#f59e0b", label: "Stressed" },
        { value: "0.5", color: "#84cc16", label: "Healthy" },
        { value: "0.8+", color: "#10b981", label: "Dense" },
      ],
      gradientCss: "linear-gradient(to right, #a855f7, #f59e0b, #84cc16, #10b981)",
    },
  },
  EVI: {
    id: "EVI",
    name: "EVI Enhanced Veg",
    category: "nasa_agro",
    iconName: "Leaf",
    emoji: "🌿",
    title: "Enhanced Vegetation Index (EVI)",
    description:
      "Atmospherically corrected canopy vigor index with heightened sensitivity in high biomass agricultural zones like sugarcane and paddy.",
    colorScale: {
      unit: "Index",
      title: "Canopy Density",
      stops: [
        { value: "0.0", color: "#64748b", label: "Sparse" },
        { value: "0.4", color: "#eab308", label: "Moderate" },
        { value: "0.7+", color: "#059669", label: "Canopy" },
      ],
      gradientCss: "linear-gradient(to right, #64748b, #eab308, #059669)",
    },
  },
  LAI: {
    id: "LAI",
    name: "LAI Leaf Area",
    category: "nasa_agro",
    iconName: "Layers",
    emoji: "🍃",
    title: "Leaf Area Index (LAI)",
    description:
      "Total one-sided green leaf area per unit ground surface area (m²/m²), quantifying crop transpiration surface and light interception capacity.",
    colorScale: {
      unit: "m²/m²",
      title: "Leaf Area Ratio",
      stops: [
        { value: "0.5", color: "#f59e0b", label: "0.5" },
        { value: "2.0", color: "#10b981", label: "2.0" },
        { value: "5.0+", color: "#047857", label: "5.0" },
      ],
      gradientCss: "linear-gradient(to right, #f59e0b, #10b981, #047857)",
    },
  },
  "ECOSTRESS ESI": {
    id: "ECOSTRESS ESI",
    name: "ECOSTRESS ESI",
    category: "nasa_agro",
    iconName: "Flame",
    emoji: "🔥",
    title: "Evaporative Stress Index (ESI)",
    description:
      "NASA ISS thermal radiometer 70m measurement tracking plant evapotranspiration anomalies and early-onset root water stress before visual wilting.",
    colorScale: {
      unit: "Ratio",
      title: "Evaporative Stress",
      stops: [
        { value: "0.2", color: "#ef4444", label: "Severe Deficit" },
        { value: "0.5", color: "#f59e0b", label: "Moderate" },
        { value: "0.8+", color: "#06b6d4", label: "Optimal Moisture" },
      ],
      gradientCss: "linear-gradient(to right, #ef4444, #f59e0b, #06b6d4)",
    },
  },
  "SMAP Moisture": {
    id: "SMAP Moisture",
    name: "SMAP Soil Moisture",
    category: "nasa_agro",
    iconName: "Waves",
    emoji: "🌊",
    title: "SMAP Root-Zone Soil Moisture",
    description:
      "NASA SMAP L-band radar radiometer measuring volumetric soil moisture (% vol) in the active 0-100cm root zone for precision irrigation scheduling.",
    colorScale: {
      unit: "% vol",
      title: "Volumetric Moisture",
      stops: [
        { value: "10%", color: "#f97316", label: "Dry (<12%)" },
        { value: "24%", color: "#06b6d4", label: "Nominal (24%)" },
        { value: "40%+", color: "#2563eb", label: "Saturated (>38%)" },
      ],
      gradientCss: "linear-gradient(to right, #f97316, #06b6d4, #2563eb)",
    },
  },
  "GPM Rain": {
    id: "GPM Rain",
    name: "GPM Precipitation",
    category: "nasa_agro",
    iconName: "CloudRain",
    emoji: "🌧️",
    title: "NASA GPM IMERG Precipitation",
    description:
      "Global Precipitation Measurement dual-frequency radar calibrated precipitation rate (mm/h) providing accurate agricultural water budget telemetry.",
    colorScale: {
      unit: "mm/h",
      title: "Precipitation Rate",
      stops: [
        { value: "0.5", color: "#38bdf8", label: "Drizzle" },
        { value: "5.0", color: "#06b6d4", label: "Moderate" },
        { value: "25+", color: "#ec4899", label: "Intense" },
      ],
      gradientCss: "linear-gradient(to right, #38bdf8, #06b6d4, #ec4899)",
    },
  },
  "FIRMS Fires": {
    id: "FIRMS Fires",
    name: "FIRMS Active Fires",
    category: "nasa_agro",
    iconName: "AlertTriangle",
    emoji: "🔥",
    title: "NASA FIRMS Thermal Anomalies",
    description:
      "NASA Fire Information for Resource Management System 375m thermal infrared detections of stubble burning, wildfire fronts, and crop residue fires.",
    colorScale: {
      unit: "MW",
      title: "Fire Radiative Power",
      stops: [
        { value: "10", color: "#f59e0b", label: "Low" },
        { value: "50", color: "#f97316", label: "Medium" },
        { value: "150+", color: "#ef4444", label: "Extreme" },
      ],
      gradientCss: "linear-gradient(to right, #f59e0b, #f97316, #ef4444)",
    },
  },
  "Smoke AOD": {
    id: "Smoke AOD",
    name: "Smoke AOD (Air Quality)",
    category: "nasa_agro",
    iconName: "Wind",
    emoji: "🌫️",
    title: "Aerosol Optical Depth (AOD)",
    description:
      "NASA MODIS / Terra atmospheric particulate turbidity measurement at 550nm tracking smoke dispersion, dust storms, and solar radiation dimming.",
    colorScale: {
      unit: "AOD",
      title: "Atmospheric Turbidity",
      stops: [
        { value: "0.1", color: "#10b981", label: "Clean" },
        { value: "0.4", color: "#eab308", label: "Moderate Haze" },
        { value: "1.0+", color: "#7f1d1d", label: "Dense Smoke" },
      ],
      gradientCss: "linear-gradient(to right, #10b981, #eab308, #7f1d1d)",
    },
  },
};
