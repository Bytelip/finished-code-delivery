import type { MapLayer } from "@/types/agroSpace";

export interface GibsLayerInfo {
  layerName: string;
  maxZoom: number;
  title: string;
  defaultDate: string;
}

/** Mapping of the 8 UI layers to official NASA GIBS WMTS layers and max zoom levels */
export const GIBS_LAYER_CONFIG: Record<MapLayer, GibsLayerInfo> = {
  NDVI: {
    layerName: "MODIS_Terra_NDVI_8Day",
    maxZoom: 9,
    title: "MODIS Terra 8-Day NDVI Composite",
    defaultDate: "2024-05-01",
  },
  EVI: {
    layerName: "MODIS_Terra_EVI_8Day",
    maxZoom: 9,
    title: "MODIS Terra 8-Day Enhanced Vegetation Index",
    defaultDate: "2024-05-01",
  },
  LAI: {
    layerName: "MODIS_Terra_LAI_8Day",
    maxZoom: 9,
    title: "MODIS Terra 8-Day Leaf Area Index",
    defaultDate: "2024-05-01",
  },
  "ECOSTRESS ESI": {
    layerName: "MODIS_Terra_Land_Surface_Temp_Day",
    maxZoom: 7,
    title: "MODIS Land Surface Temp / Evaporative Stress",
    defaultDate: "2024-05-01",
  },
  "SMAP Moisture": {
    layerName: "SMAP_L3_Passive_Day_Soil_Moisture",
    maxZoom: 6,
    title: "SMAP L3 Passive Soil Moisture (Day)",
    defaultDate: "2024-05-01",
  },
  "GPM Rain": {
    layerName: "IMERG_Precipitation_Rate",
    maxZoom: 6,
    title: "GPM IMERG Early Precipitation Rate",
    defaultDate: "2024-05-01",
  },
  "FIRMS Fires": {
    layerName: "VIIRS_SNPP_Thermal_Anomalies_375m_All",
    maxZoom: 8,
    title: "VIIRS SNPP 375m Active Thermal Anomalies",
    defaultDate: "2024-05-01",
  },
  "Smoke AOD": {
    layerName: "MODIS_Combined_Value_Added_AOD",
    maxZoom: 6,
    title: "MODIS Combined Value-Added Aerosol Optical Depth",
    defaultDate: "2024-05-01",
  },
};
