/**
 * GlobeViewport.tsx
 * Interactive Dual 3D Orbital WebGL Globe & High-Zoom 2D NASA GIBS Field GIS Map.
 * Renders inside `#globe-container`.
 *
 * Capabilities:
 * - 3D Orbital Globe: Three.js / react-globe.gl with multi-resolution slippy tile engine
 *   connected directly to NASA GIBS WMTS endpoints for all 8 layers, plus dynamic
 *   semi-transparent spherical overlay mesh (AdditiveBlending), 3D regional telemetry grid
 *   points, pulsing telemetry scan rings, orbit arcs (Terra, SMAP, GPM, ISS), and Auto-LOD.
 * - Floating Tactical HUD Zoom Control Bar: Zoom In (+), Zoom Out (-), interactive
 *   vertical range slider with live Z / ALT / FIELD readout badge, Target Farm (Z:15)
 *   and Full Orbit (Z:3) quick actions.
 * - Floating HUD Color-Scale Legend: Active satellite sensor name, continuous color
 *   gradient bar with min/max scientific units, and layer glow/opacity slider (20%-100%).
 * - 2D Field GIS: Leaflet / react-leaflet high-zoom satellite imagery overlaid with live
 *   NASA GIBS WMTS raster tiles (maxNativeZoom + maxZoom 18 for crisp upscaling), reference
 *   boundaries, and 5 interactive warning/hazard markers + impact radius circles + polyline tracks.
 * - Map Hazard Legend & Filter Bar: Toggle hazards, filter by category, and "Fit All Hazards".
 */
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ErrorInfo,
  type MouseEvent,
  type ReactNode,
} from "react";
import * as THREE from "three";
import {
  Globe as GlobeIcon,
  Map as MapIcon,
  Layers,
  Radar,
  Radio,
  Plus,
  Minus,
  Crosshair,
  Flame,
  Wind,
  Activity,
  AlertTriangle,
  Eye,
  EyeOff,
  Compass,
  Play,
  Pause,
  Satellite,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatCoord } from "@/components/agro/hud";
import { cn } from "@/lib/utils";
import { MAP_LAYERS, type AgroTelemetry, type MapLayer } from "@/types/agroSpace";
import {
  GIBS_LAYER_CONFIG,
  SATELLITE_LAYERS_CONFIG,
  type SatelliteLayerMeta,
} from "@/services/gibsLayers";
import { toast } from "sonner";
import { AnimatedBackground } from "@/components/core/animated-background";
import { MapLayerSwitcher, type BasemapStyle } from "@/components/map/MapLayerSwitcher";

export { GIBS_LAYER_CONFIG, SATELLITE_LAYERS_CONFIG };
export const TELEMETRY_TABS = MAP_LAYERS;

interface GlobeMethods {
  pointOfView: (
    pov?: { lat?: number; lng?: number; altitude?: number },
    ms?: number,
  ) => { lat: number; lng: number; altitude: number } | void;
  controls?: () => {
    addEventListener?: (event: string, cb: () => void) => void;
    removeEventListener?: (event: string, cb: () => void) => void;
  };
}

interface LeafletMapInstance {
  panTo: (coords: [number, number], options?: { animate?: boolean }) => void;
  flyTo?: (
    coords: [number, number],
    zoom?: number,
    options?: { animate?: boolean; duration?: number },
  ) => void;
  zoomIn?: (delta?: number, options?: { animate?: boolean }) => void;
  zoomOut?: (delta?: number, options?: { animate?: boolean }) => void;
  setZoom?: (zoom: number, options?: { animate?: boolean }) => void;
  getZoom?: () => number;
  fitBounds?: (
    bounds: [[number, number], [number, number]] | [number, number][],
    options?: { padding?: [number, number]; maxZoom?: number },
  ) => void;
}

interface LeafletBundle {
  MapContainer: ComponentType<{
    center: [number, number];
    zoom: number;
    scrollWheelZoom?: boolean;
    style?: React.CSSProperties;
    children: ReactNode;
  }>;
  TileLayer: ComponentType<{
    url: string;
    maxZoom?: number;
    maxNativeZoom?: number;
    opacity?: number;
    zIndex?: number;
    attribution?: string;
  }>;
  Marker: ComponentType<{
    position: [number, number];
    icon?: unknown;
    draggable?: boolean;
    eventHandlers?: {
      dragend?: (e: { target: { getLatLng: () => { lat: number; lng: number } } }) => void;
    };
    children?: ReactNode;
  }>;
  Circle: ComponentType<{
    center: [number, number];
    radius: number;
    pathOptions?: {
      color?: string;
      fillColor?: string;
      fillOpacity?: number;
      weight?: number;
      dashArray?: string;
    };
    children?: ReactNode;
  }>;
  Polyline: ComponentType<{
    positions: [number, number][];
    pathOptions?: {
      color?: string;
      weight?: number;
      dashArray?: string;
      opacity?: number;
    };
    children?: ReactNode;
  }>;
  Popup: ComponentType<{
    className?: string;
    children?: ReactNode;
  }>;
  useMap: () => LeafletMapInstance;
  useMapEvents: (handlers: {
    click?: (e: { latlng?: { lat: number; lng: number } }) => void;
    zoomend?: (e: { target: { getZoom: () => number } }) => void;
  }) => void;
  L: {
    DivIcon: new (options: {
      className?: string;
      html?: string;
      iconSize?: [number, number];
      iconAnchor?: [number, number];
    }) => unknown;
  };
}

/** Check if WebGL context can be created in current browser environment */
function hasWebGLSupport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
    );
  } catch {
    return false;
  }
}

/** Safe Error Boundary for 3D WebGL Globe to catch GPU context creation errors */
class SafeGlobeErrorBoundary extends Component<
  {
    fallback: ReactNode;
    children: ReactNode;
    onFailure?: () => void;
  },
  { hasError: boolean }
> {
  constructor(props: { fallback: ReactNode; children: ReactNode; onFailure?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.warn(
      "3D WebGL Globe failed to render, auto-reverting to 2D GIS map:",
      error,
      errorInfo,
    );
    this.props.onFailure?.();
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const LAYER_TONE: Record<MapLayer, string> = {
  NDVI: "var(--emerald)",
  EVI: "var(--emerald)",
  LAI: "var(--emerald)",
  "ECOSTRESS ESI": "var(--amber)",
  "SMAP Moisture": "var(--cyan)",
  "GPM Rain": "var(--cyan)",
  "FIRMS Fires": "var(--crimson)",
  "Smoke AOD": "var(--amber)",
};

const LON_TICKS = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
const LAT_TICKS = [60, 30, 0, -30, -60];
const toX = (lon: number) => ((lon + 180) / 360) * 100;
const toY = (lat: number) => ((90 - lat) / 180) * 100;

interface PlaceLabelEntry {
  id: string;
  lat: number;
  lng: number;
  text: string;
}

// Stage 1 Major Non-overlapping Countries & Oceans (Alt > 1.4)
const STAGE1_MAJOR_COUNTRIES: PlaceLabelEntry[] = [
  { id: "cnt-ind", lat: 22.5, lng: 79.5, text: "INDIA" },
  { id: "cnt-usa", lat: 38.0, lng: -97.0, text: "UNITED STATES" },
  { id: "cnt-can", lat: 56.0, lng: -106.0, text: "CANADA" },
  { id: "cnt-bra", lat: -12.0, lng: -52.0, text: "BRAZIL" },
  { id: "cnt-afr", lat: 4.0, lng: 21.0, text: "AFRICA" },
  { id: "cnt-rus", lat: 60.0, lng: 100.0, text: "RUSSIA" },
  { id: "cnt-aus", lat: -25.0, lng: 134.0, text: "AUSTRALIA" },
];

const STAGE1_MAJOR_OCEANS: PlaceLabelEntry[] = [
  { id: "oc-ind", lat: -12.0, lng: 78.0, text: "INDIAN OCEAN" },
  { id: "oc-atl", lat: 12.0, lng: -35.0, text: "ATLANTIC OCEAN" },
  { id: "oc-pac", lat: 8.0, lng: 160.0, text: "PACIFIC OCEAN" },
];

const GLOBAL_COUNTRIES: PlaceLabelEntry[] = [
  { id: "cnt-ind", lat: 22.5, lng: 79.5, text: "INDIA" },
  { id: "cnt-aus", lat: -25.0, lng: 134.0, text: "AUSTRALIA" },
  { id: "cnt-afr", lat: 4.0, lng: 21.0, text: "AFRICA" },
  { id: "cnt-chn", lat: 35.0, lng: 104.0, text: "CHINA" },
  { id: "cnt-usa", lat: 38.0, lng: -97.0, text: "UNITED STATES" },
  { id: "cnt-rus", lat: 60.0, lng: 100.0, text: "RUSSIA" },
  { id: "cnt-bra", lat: -12.0, lng: -52.0, text: "BRAZIL" },
  { id: "cnt-eur", lat: 50.0, lng: 15.0, text: "EUROPE" },
  { id: "cnt-gbr", lat: 54.0, lng: -2.0, text: "UNITED KINGDOM" },
  { id: "cnt-jpn", lat: 36.0, lng: 138.0, text: "JAPAN" },
  { id: "cnt-can", lat: 56.0, lng: -106.0, text: "CANADA" },
];

const GLOBAL_OCEANS: PlaceLabelEntry[] = [
  { id: "oc-ind", lat: -12.0, lng: 78.0, text: "INDIAN OCEAN" },
  { id: "oc-bob", lat: 14.5, lng: 88.0, text: "BAY OF BENGAL" },
  { id: "oc-arb", lat: 15.5, lng: 65.0, text: "ARABIAN SEA" },
  { id: "oc-pac", lat: 8.0, lng: 160.0, text: "PACIFIC OCEAN" },
  { id: "oc-atl", lat: 12.0, lng: -35.0, text: "ATLANTIC OCEAN" },
  { id: "oc-sou", lat: -60.0, lng: 70.0, text: "SOUTHERN OCEAN" },
];

const REGIONAL_STATES: PlaceLabelEntry[] = [
  { id: "st-pb", lat: 31.1, lng: 75.3, text: "Punjab" },
  { id: "st-rj", lat: 26.5, lng: 73.8, text: "Rajasthan" },
  { id: "st-up", lat: 27.2, lng: 80.9, text: "Uttar Pradesh" },
  { id: "st-wb", lat: 23.8, lng: 87.8, text: "West Bengal" },
  { id: "st-mh", lat: 19.5, lng: 75.8, text: "Maharashtra" },
  { id: "st-ka", lat: 14.5, lng: 75.8, text: "Karnataka" },
  { id: "st-ap", lat: 15.9, lng: 79.7, text: "Andhra Pradesh" },
  { id: "st-tn", lat: 11.1, lng: 78.6, text: "Tamil Nadu" },
  { id: "st-kl", lat: 10.5, lng: 76.5, text: "Kerala" },
  { id: "st-tg", lat: 17.8, lng: 79.1, text: "Telangana" },
  { id: "st-gj", lat: 22.3, lng: 71.8, text: "Gujarat" },
  { id: "st-mp", lat: 23.5, lng: 77.5, text: "Madhya Pradesh" },
];

const MEGA_CAPITALS: PlaceLabelEntry[] = [
  { id: "ct-del", lat: 28.6139, lng: 77.209, text: "New Delhi" },
  { id: "ct-bom", lat: 19.076, lng: 72.8777, text: "Mumbai" },
  { id: "ct-blr", lat: 12.9716, lng: 77.5946, text: "Bengaluru" },
  { id: "ct-ccu", lat: 22.5726, lng: 88.3639, text: "Kolkata" },
];

const REGIONAL_WATER_BODIES: PlaceLabelEntry[] = [
  { id: "rw-bob", lat: 14.5, lng: 88.0, text: "BAY OF BENGAL" },
  { id: "rw-arb", lat: 15.5, lng: 65.0, text: "ARABIAN SEA" },
  { id: "rw-ind", lat: -10.0, lng: 78.0, text: "INDIAN OCEAN" },
];

const ALL_CITIES_AND_TOWNS: PlaceLabelEntry[] = [
  { id: "ct-hyd", lat: 17.385, lng: 78.4867, text: "Hyderabad" },
  { id: "ct-maa", lat: 13.0827, lng: 80.2707, text: "Chennai" },
  { id: "ct-pnq", lat: 18.5204, lng: 73.8567, text: "Pune" },
  { id: "ct-myq", lat: 12.2958, lng: 76.6394, text: "Mysuru" },
  { id: "ct-ixe", lat: 12.9141, lng: 74.856, text: "Mangaluru" },
  { id: "ct-cjb", lat: 11.0168, lng: 76.9558, text: "Coimbatore" },
  { id: "ct-hbl", lat: 15.3647, lng: 75.124, text: "Hubballi" },
  { id: "ct-vja", lat: 16.5062, lng: 80.648, text: "Vijayawada" },
  { id: "ct-mdu", lat: 9.9252, lng: 78.1198, text: "Madurai" },
  { id: "tn-klr", lat: 13.1367, lng: 78.1292, text: "Kolar" },
  { id: "tn-ckb", lat: 13.4325, lng: 77.7275, text: "Chikkaballapur" },
  { id: "tn-hsk", lat: 13.07, lng: 77.7981, text: "Hoskote" },
  { id: "tn-mlr", lat: 13.0044, lng: 77.9392, text: "Malur" },
  { id: "tn-bpt", lat: 12.9961, lng: 78.1994, text: "Bangarapet" },
  { id: "tn-mbl", lat: 13.1718, lng: 78.4416, text: "Mulabagilu" },
  { id: "tn-snp", lat: 13.3378, lng: 78.2167, text: "Srinivaspur" },
  { id: "tn-kgf", lat: 12.9583, lng: 78.2711, text: "KGF" },
  { id: "tn-dvh", lat: 13.2483, lng: 77.7128, text: "Devenahalli" },
  { id: "tn-wtf", lat: 12.9698, lng: 77.75, text: "Whitefield" },
  { id: "tn-tmk", lat: 13.3409, lng: 77.101, text: "Tumakuru" },
  { id: "tn-ank", lat: 12.71, lng: 77.6978, text: "Anekal" },
  { id: "tn-nh75", lat: 13.11, lng: 78.02, text: "NH 75 Corridor" },
];

const TERRAIN_FEATURES: PlaceLabelEntry[] = [
  { id: "tr-dcn", lat: 16.5, lng: 76.8, text: "Deccan Plateau" },
  { id: "tr-vtg", lat: 13.8, lng: 75.3, text: "Western Ghats" },
  { id: "tr-klp", lat: 13.13, lng: 78.13, text: "Kolar Plateau" },
  { id: "tr-plr", lat: 13.05, lng: 78.25, text: "Palar River Basin" },
];

interface GlobeHtmlMarkerItem {
  id: string;
  lat: number;
  lng: number;
  priority: number;
  html: string;
}

function renderCountryHtml(text: string, isLight = false): string {
  const color = isLight ? "#0F172A" : "#F8FAFC";
  const shadow = isLight
    ? "text-shadow: 0 1px 3px #FFFFFF, 0 0 6px #FFFFFF, 0 0 10px rgba(255,255,255,0.95);"
    : "text-shadow: 0 1px 4px #000000, 0 0 8px rgba(0,0,0,0.95);";
  return `<div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.18em;${shadow}white-space:nowrap;pointer-events:none;transform:translate(-50%,-50%);">${text}</div>`;
}

function renderOceanHtml(text: string, isLight = false): string {
  const color = isLight ? "#0369A1" : "#94A3B8";
  const shadow = isLight
    ? "text-shadow: 0 1px 3px #FFFFFF, 0 0 6px rgba(255,255,255,0.95);"
    : "text-shadow: 0 0 2px #020617, 0 1px 3px #020617;";
  return `<div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;font-style:italic;font-weight:600;color:${color};text-transform:uppercase;letter-spacing:0.15em;${shadow}white-space:nowrap;pointer-events:none;transform:translate(-50%,-50%);">${text}</div>`;
}

function renderStateHtml(text: string, isLight = false): string {
  const dotBg = isLight ? "#0F172A" : "#94A3B8";
  const dotBorder = isLight ? "border:0.75px solid #FFFFFF;" : "";
  const dotShadow = isLight
    ? "box-shadow:0 0 3px rgba(255,255,255,0.9);"
    : "box-shadow:0 0 2px rgba(0,0,0,0.8);";
  const textColor = isLight ? "#0F172A" : "#F8FAFC";
  const textShadow = isLight
    ? "text-shadow: 0 1px 3px #FFFFFF, 0 0 6px #FFFFFF, 0 0 8px rgba(255,255,255,0.95);"
    : "text-shadow: 0 1px 4px #000000, 0 0 8px rgba(0,0,0,0.95);";
  return `<div style="display:flex;align-items:center;gap:3.5px;pointer-events:none;white-space:nowrap;transform:translate(-50%,-50%);">
    <div style="width:2.5px;height:2.5px;border-radius:50%;background:${dotBg};${dotBorder}${dotShadow}flex-shrink:0;"></div>
    <span style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:9.5px;font-weight:${isLight ? "700" : "600"};color:${textColor};${textShadow}letter-spacing:0.04em;">${text}</span>
  </div>`;
}

function renderMegaCapitalHtml(text: string, isLight = false): string {
  const dotBg = isLight ? "#020617" : "#FFFFFF";
  const dotBorder = isLight ? "border:0.75px solid #FFFFFF;" : "border:0.75px solid #020617;";
  const dotShadow = isLight
    ? "box-shadow:0 0 3px rgba(255,255,255,0.9);"
    : "box-shadow:0 0 2px rgba(0,0,0,0.8);";
  const textColor = isLight ? "#020617" : "#F8FAFC";
  const textShadow = isLight
    ? "text-shadow: 0 1px 3px #FFFFFF, 0 0 6px #FFFFFF, 0 0 8px rgba(255,255,255,0.95);"
    : "text-shadow: 0 1px 4px #000000, 0 0 8px rgba(0,0,0,0.95);";
  return `<div style="display:flex;align-items:center;gap:3.5px;pointer-events:none;white-space:nowrap;transform:translate(-50%,-50%);">
    <div style="width:3px;height:3px;border-radius:50%;background:${dotBg};${dotBorder}${dotShadow}flex-shrink:0;"></div>
    <span style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:9.5px;font-weight:700;color:${textColor};${textShadow}">${text}</span>
  </div>`;
}

function renderCityTownHtml(text: string, isLight = false): string {
  const dotBg = isLight ? "#1E293B" : "#FFFFFF";
  const dotBorder = isLight ? "border:0.5px solid #FFFFFF;" : "border:0.5px solid #020617;";
  const dotShadow = isLight
    ? "box-shadow:0 0 3px rgba(255,255,255,0.9);"
    : "box-shadow:0 0 3px rgba(255,255,255,0.8);";
  const textColor = isLight ? "#0F172A" : "#F8FAFC";
  const textShadow = isLight
    ? "text-shadow: 0 1px 3px #FFFFFF, 0 0 6px #FFFFFF, 0 0 8px rgba(255,255,255,0.95);"
    : "text-shadow: 0 1px 4px #000000, 0 0 8px rgba(0,0,0,0.95);";
  return `<div style="display:flex;align-items:center;gap:3px;pointer-events:none;white-space:nowrap;transform:translate(-50%,-50%);">
    <div style="width:2.5px;height:2.5px;border-radius:50%;background:${dotBg};${dotBorder}${dotShadow}flex-shrink:0;"></div>
    <span style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:9px;font-weight:${isLight ? "600" : "500"};color:${textColor};${textShadow}letter-spacing:0.02em;">${text}</span>
  </div>`;
}

function renderTerrainHtml(text: string, isLight = false): string {
  const color = isLight ? "#334155" : "#CBD5E1";
  const shadow = isLight
    ? "text-shadow: 0 1px 3px #FFFFFF, 0 0 6px #FFFFFF;"
    : "text-shadow: 0 0 2px #020617, 0 1px 2px #020617;";
  return `<div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:8.5px;font-style:italic;font-weight:600;color:${color};letter-spacing:0.06em;${shadow}white-space:nowrap;pointer-events:none;transform:translate(-50%,-50%);">${text}</div>`;
}

/* ---------------- 3D SLEEK CIRCULAR HAZARD MARKERS WITH INTERACTIVE HOVER TOOLTIPS ---------------- */
function renderCyclone3DMarker(metricText = "CYCLONE TRACK • 115 km/h"): string {
  return `
    <div class="group relative flex items-center justify-center cursor-pointer select-none" style="transform:translate(-50%,-50%); width:46px; height:46px;">
      <div style="position:absolute; inset:2px; border-radius:50%; border:1.5px dashed rgba(239,68,68,0.75); box-shadow:0 0 12px rgba(239,68,68,0.3); pointer-events:none;"></div>
      <div style="position:absolute; inset:5px; border-radius:50%; border:1.5px solid #ef4444; animation:radarPulse 2.4s cubic-bezier(0.2,0.8,0.4,1) infinite; pointer-events:none;"></div>
      <div style="position:relative; width:28px; height:28px; border-radius:50%; background:#090D16; border:2px solid #EF4444; box-shadow:0 0 16px rgba(239,68,68,0.7), inset 0 0 6px rgba(239,68,68,0.4); display:flex; align-items:center; justify-content:center;">
        <svg class="animate-spin-slow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="url(#cycloneGrad3D)" stroke-width="2.2" stroke-linecap="round">
          <defs>
            <linearGradient id="cycloneGrad3D" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#C084FC"/>
              <stop offset="100%" stop-color="#38BDF8"/>
            </linearGradient>
          </defs>
          <path d="M12 2a10 10 0 0 1 7.07 17.07M12 22a10 10 0 0 1-7.07-17.07M12 6a6 6 0 0 1 4.24 10.24M12 18a6 6 0 0 1-4.24-10.24M12 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
        </svg>
      </div>
      <div class="hazard-tooltip pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200" style="position:absolute; bottom:calc(100% + 4px); left:50%; transform:translateX(-50%); white-space:nowrap; z-index:70;">
        <div style="display:flex; align-items:center; gap:5px; padding:3px 8px; border-radius:7px; background:rgba(9,13,22,0.95); border:1px solid #EF4444; color:#F8FAFC; font-family:monospace; font-size:9.5px; font-weight:700; box-shadow:0 0 16px rgba(239,68,68,0.6), 0 4px 14px rgba(0,0,0,0.9); backdrop-filter:blur(8px);">
          <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#EF4444; box-shadow:0 0 6px #EF4444;"></span>
          <span>${metricText}</span>
        </div>
      </div>
    </div>
  `;
}

function renderFire3DMarker(metricText = "FIRMS FIRE • 42 MW"): string {
  return `
    <div class="group relative flex items-center justify-center cursor-pointer select-none" style="transform:translate(-50%,-50%); width:44px; height:44px;">
      <div style="position:absolute; inset:2px; border-radius:50%; border:1.5px dashed rgba(245,158,11,0.75); box-shadow:0 0 12px rgba(245,158,11,0.3); pointer-events:none;"></div>
      <div style="position:absolute; inset:5px; border-radius:50%; border:1.5px solid #F59E0B; animation:radarPulse 2.4s cubic-bezier(0.2,0.8,0.4,1) infinite; pointer-events:none;"></div>
      <div style="position:relative; width:26px; height:26px; border-radius:50%; background:#090D16; border:2px solid #F59E0B; box-shadow:0 0 14px rgba(245,158,11,0.7), inset 0 0 6px rgba(245,158,11,0.4); display:flex; align-items:center; justify-content:center;">
        <svg class="animate-flame-flicker" viewBox="0 0 24 24" width="15" height="15" fill="url(#fireGrad3D)">
          <defs>
            <linearGradient id="fireGrad3D" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#FDE047"/>
              <stop offset="50%" stop-color="#F59E0B"/>
              <stop offset="100%" stop-color="#EF4444"/>
            </linearGradient>
          </defs>
          <path d="M12 2c.5 2.5 2 4.5 3.5 6 1.8 1.8 2.5 3.6 2.5 5.5A7.5 7.5 0 0 1 10.5 21a7.5 7.5 0 0 1-7.5-7.5c0-3.3 2.5-6.2 5-8 0 2.5 1.5 4 3 5 0-3 1-6.5 1-8.5z"/>
        </svg>
      </div>
      <div class="hazard-tooltip pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200" style="position:absolute; bottom:calc(100% + 4px); left:50%; transform:translateX(-50%); white-space:nowrap; z-index:70;">
        <div style="display:flex; align-items:center; gap:5px; padding:3px 8px; border-radius:7px; background:rgba(9,13,22,0.95); border:1px solid #F59E0B; color:#F8FAFC; font-family:monospace; font-size:9.5px; font-weight:700; box-shadow:0 0 16px rgba(245,158,11,0.6), 0 4px 14px rgba(0,0,0,0.9); backdrop-filter:blur(8px);">
          <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#F59E0B; box-shadow:0 0 6px #F59E0B;"></span>
          <span>${metricText}</span>
        </div>
      </div>
    </div>
  `;
}

function renderSeismic3DMarker(metricText = "USGS EPICENTER • M4.6"): string {
  return `
    <div class="group relative flex items-center justify-center cursor-pointer select-none" style="transform:translate(-50%,-50%); width:44px; height:44px;">
      <div style="position:absolute; inset:4px; border-radius:50%; border:1.5px solid #10B981; animation:sonarRipple 2s ease-out infinite; pointer-events:none;"></div>
      <div style="position:relative; width:26px; height:26px; border-radius:50%; background:#090D16; border:2px solid #10B981; box-shadow:0 0 14px rgba(16,185,129,0.7), inset 0 0 6px rgba(16,185,129,0.4); display:flex; align-items:center; justify-content:center;">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="#F59E0B" stroke="#F59E0B" stroke-width="0.5">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      </div>
      <div class="hazard-tooltip pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200" style="position:absolute; bottom:calc(100% + 4px); left:50%; transform:translateX(-50%); white-space:nowrap; z-index:70;">
        <div style="display:flex; align-items:center; gap:5px; padding:3px 8px; border-radius:7px; background:rgba(9,13,22,0.95); border:1px solid #10B981; color:#F8FAFC; font-family:monospace; font-size:9.5px; font-weight:700; box-shadow:0 0 16px rgba(16,185,129,0.6), 0 4px 14px rgba(0,0,0,0.9); backdrop-filter:blur(8px);">
          <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10B981; box-shadow:0 0 6px #10B981;"></span>
          <span>${metricText}</span>
        </div>
      </div>
    </div>
  `;
}

function renderFarmReticle3DMarker(
  layerName: string,
  value: string | number,
  unit: string,
  regionLabel: string,
): string {
  return `
    <div class="group relative flex items-center justify-center cursor-pointer select-none" style="transform:translate(-50%,-50%); width:38px; height:38px;">
      <div style="position:absolute; inset:3px; border-radius:50%; border:1.5px solid #00F0FF; animation:radarPulse 2.2s cubic-bezier(0.2,0.8,0.4,1) infinite; pointer-events:none;"></div>
      <div style="position:relative; width:24px; height:24px; border-radius:50%; background:#090D16; border:2px solid #00F0FF; box-shadow:0 0 16px rgba(0,240,255,0.8), inset 0 0 6px rgba(0,240,255,0.4); display:flex; align-items:center; justify-content:center;">
        <span style="width:7px; height:7px; border-radius:50%; background:#00F0FF; box-shadow:0 0 8px #00F0FF;"></span>
      </div>
      <div class="hazard-tooltip pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200" style="position:absolute; bottom:calc(100% + 4px); left:50%; transform:translateX(-50%); white-space:nowrap; z-index:70;">
        <div style="display:flex; align-items:center; gap:5px; padding:3px 8px; border-radius:7px; background:rgba(9,13,22,0.95); border:1px solid #00F0FF; color:#F8FAFC; font-family:monospace; font-size:9.5px; font-weight:700; box-shadow:0 0 16px rgba(0,240,255,0.6), 0 4px 14px rgba(0,0,0,0.9); backdrop-filter:blur(8px);">
          <span style="color:#00F0FF;">★</span>
          <span>${regionLabel || "Target Field"}:</span>
          <span style="color:#38BDF8;">${layerName} ${value} ${unit}</span>
        </div>
      </div>
    </div>
  `;
}

export interface GlobeViewportProps {
  telemetry: AgroTelemetry;
  activeLayer: MapLayer;
  onLayer: (l: MapLayer) => void;
  opacity: number;
  onOpacity: (o: number) => void;
  onPick: (lat: number, lon: number) => void;
  initialBasemapStyle?: BasemapStyle;
}

export function GlobeViewport({
  telemetry,
  activeLayer,
  onLayer,
  opacity,
  onOpacity,
  onPick,
  initialBasemapStyle,
}: GlobeViewportProps) {
  const { lat, lon } = telemetry.input;
  const { meta, hazards } = telemetry;
  const reading = telemetry.layers[activeLayer];

  const activeSatelliteConfig: SatelliteLayerMeta =
    SATELLITE_LAYERS_CONFIG[activeLayer] || SATELLITE_LAYERS_CONFIG.NDVI;

  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [mounted, setMounted] = useState(false);
  const [webGLSupported, setWebGLSupported] = useState(false);
  const [globeModule, setGlobeModule] = useState<ComponentType<Record<string, unknown>> | null>(
    null,
  );
  const [leafletModule, setLeafletModule] = useState<LeafletBundle | null>(null);
  const [hover, setHover] = useState<{ lat: number; lon: number } | null>(null);

  // Basemap & Layer Switcher State
  const [basemapStyle, setBasemapStyle] = useState<BasemapStyle>(
    initialBasemapStyle || "satellite",
  );
  const [showLabels, setShowLabels] = useState(true);
  const [enable3dTerrain, setEnable3dTerrain] = useState(true);

  // Zoom & LOD control state
  const [orbitalAltitude, setOrbitalAltitude] = useState(1.4);
  const [gisZoom, setGisZoom] = useState(12);

  // 2D Hazard layers visibility & filter
  const [hazardsVisible, setHazardsVisible] = useState(true);
  const [hazardFilter, setHazardFilter] = useState<
    "all" | "fire" | "wind" | "cyclone" | "earthquake" | "flood"
  >("all");

  const globeRef = useRef<GlobeMethods | null>(null);
  const leafletMapRef = useRef<LeafletMapInstance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 500 });

  // Safe client-side dynamic loading of WebGL & Leaflet to keep SSR 100% deterministic
  useEffect(() => {
    setMounted(true);
    const hasGL = hasWebGLSupport();
    setWebGLSupported(hasGL);
    if (!hasGL) {
      setViewMode("2d");
    }

    let active = true;

    // Load leaflet for 2D GIS
    import("react-leaflet")
      .then(async (rLeafletMod) => {
        const lMod = await import("leaflet");
        if (!active) return;
        setLeafletModule({
          MapContainer: rLeafletMod.MapContainer as unknown as LeafletBundle["MapContainer"],
          TileLayer: rLeafletMod.TileLayer as unknown as LeafletBundle["TileLayer"],
          Marker: rLeafletMod.Marker as unknown as LeafletBundle["Marker"],
          Circle: rLeafletMod.Circle as unknown as LeafletBundle["Circle"],
          Polyline: rLeafletMod.Polyline as unknown as LeafletBundle["Polyline"],
          Popup: rLeafletMod.Popup as unknown as LeafletBundle["Popup"],
          useMap: rLeafletMod.useMap,
          useMapEvents: rLeafletMod.useMapEvents,
          L: lMod.default || lMod,
        });
      })
      .catch((err) => {
        console.warn("Leaflet map load warning:", err);
      });

    // Load react-globe.gl only if WebGL is supported
    if (hasGL) {
      import("react-globe.gl")
        .then((gMod) => {
          if (!active) return;
          setGlobeModule(() => gMod.default as unknown as ComponentType<Record<string, unknown>>);
        })
        .catch((err) => {
          console.warn("3D Globe load warning, defaulting to 2D:", err);
          setViewMode("2d");
        });
    }

    return () => {
      active = false;
    };
  }, []);

  // Update container dimensions for responsive 3D WebGL canvas
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerDimensions({
          width: containerRef.current.clientWidth || 800,
          height: containerRef.current.clientHeight || 500,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [mounted, viewMode]);

  // Temporal Time-Machine Scrubber Configuration (-30D -> LIVE -> +7D AI Forecast)
  const TEMPORAL_STEPS = useMemo(
    () => [
      { id: "-30d", label: "30D AGO", dateLabel: "16 OCT 2026", factor: 0.93 },
      { id: "-7d", label: "7D AGO", dateLabel: "08 NOV 2026", factor: 0.98 },
      { id: "live", label: "LIVE NOW", dateLabel: "15 NOV 2026 (LIVE)", factor: 1.0 },
      { id: "+7d", label: "+7D FORECAST", dateLabel: "22 NOV 2026 (AI)", factor: 1.06 },
    ],
    [],
  );
  const [temporalIdx, setTemporalIdx] = useState(2);
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);

  useEffect(() => {
    if (!isPlayingTimeline) return;
    const interval = setInterval(() => {
      setTemporalIdx((prev) => (prev + 1) % TEMPORAL_STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isPlayingTimeline, TEMPORAL_STEPS.length]);

  const currentTemporal = TEMPORAL_STEPS[temporalIdx];
  const temporalReadingValue = useMemo(() => {
    const raw = reading.value;
    if (typeof raw === "number") {
      return Math.round(raw * currentTemporal.factor * 100) / 100;
    }
    const parsed = parseFloat(String(raw));
    if (!isNaN(parsed)) {
      return (Math.round(parsed * currentTemporal.factor * 100) / 100).toFixed(2);
    }
    return raw;
  }, [reading.value, currentTemporal.factor]);

  // Target Locked Reticle Banner State (Cinematic Fly-in)
  const [targetLockedBanner, setTargetLockedBanner] = useState<{
    lat: number;
    lon: number;
    visible: boolean;
  }>({ lat, lon, visible: true });

  const prevCoordsRef = useRef<{ lat: number; lon: number }>({ lat, lon });
  const lastPovRef = useRef<{ lat: number; lng: number; altitude: number }>({
    lat,
    lng: lon,
    altitude: 0.35,
  });
  const isFirst3dMountRef = useRef<boolean>(true);

  // Center 3D Globe camera on current farm coords when coords change
  useEffect(() => {
    const coordsChanged = prevCoordsRef.current.lat !== lat || prevCoordsRef.current.lon !== lon;

    if (coordsChanged) {
      prevCoordsRef.current = { lat, lon };
      lastPovRef.current = { lat, lng: lon, altitude: 0.35 };
      setTargetLockedBanner({ lat, lon, visible: true });

      if (
        viewMode === "3d" &&
        globeRef.current &&
        typeof globeRef.current.pointOfView === "function"
      ) {
        try {
          globeRef.current.pointOfView({ lat, lng: lon, altitude: 0.35 }, 1800);
        } catch {
          // ignore pointOfView transition timing
        }
      }
    }

    const timer = setTimeout(() => {
      setTargetLockedBanner((prev) => ({ ...prev, visible: false }));
    }, 3200);

    return () => clearTimeout(timer);
  }, [lat, lon, viewMode]);

  // 3D Orbital in-place basemap switching: updates Three.js globe texture, tile engine URL and atmosphere in real-time
  useEffect(() => {
    if (!globeRef.current || viewMode !== "3d") return;

    // Immediately clear tile engine cache if supported
    try {
      const globeAny = globeRef.current as unknown as Record<string, unknown>;
      if (typeof globeAny?.globeTileEngineClearCache === "function") {
        (globeAny.globeTileEngineClearCache as () => void)();
      }
    } catch {
      // ignore
    }

    const globe = globeRef.current as {
      globeImageUrl?: (url: string) => void;
      globeTileEngineUrl?: (fn: (x: number, y: number, l: number) => string) => void;
      atmosphereColor?: (color: string) => void;
      globeMaterial?: () => { needsUpdate?: boolean };
    };

    let bgImg = "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
    let tileFn = (x: number, y: number, l: number) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`;
    let atmoColor = "#00e5ff";

    if (basemapStyle === "dark") {
      bgImg = "https://unpkg.com/three-globe/example/img/earth-night.jpg";
      tileFn = (x: number, y: number, l: number) =>
        `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${l}/${y}/${x}`;
      atmoColor = "#818cf8";
    } else if (basemapStyle === "terrain") {
      bgImg = "https://unpkg.com/three-globe/example/img/earth-topology.png";
      tileFn = (x: number, y: number, l: number) =>
        `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${l}/${y}/${x}`;
      atmoColor = "#10b981";
    } else if (basemapStyle === "default") {
      bgImg = "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
      tileFn = (x: number, y: number, l: number) =>
        `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${l}/${y}/${x}`;
      atmoColor = "#38bdf8";
    }

    if (typeof globe.globeImageUrl === "function") {
      globe.globeImageUrl(bgImg);
    }
    if (typeof globe.globeTileEngineUrl === "function") {
      globe.globeTileEngineUrl(tileFn);
    }
    if (typeof globe.atmosphereColor === "function") {
      globe.atmosphereColor(atmoColor);
    }

    try {
      const mat = typeof globe.globeMaterial === "function" ? globe.globeMaterial() : null;
      if (mat) {
        mat.needsUpdate = true;
      }
    } catch {
      // ignore
    }
  }, [basemapStyle, enable3dTerrain, viewMode]);

  // Live Satellite Overpass Countdown Ticker
  const [overpassSeconds, setOverpassSeconds] = useState(862); // 14m 22s
  useEffect(() => {
    const interval = setInterval(() => {
      setOverpassSeconds((s) => (s > 1 ? s - 1 : 1200));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const overpassMinutes = Math.floor(overpassSeconds / 60);
  const overpassRemSec = overpassSeconds % 60;
  const overpassTimerStr = `${overpassMinutes}m ${overpassRemSec < 10 ? "0" : ""}${overpassRemSec}s`;

  // NASA GIBS WMTS URL definition for 2D Leaflet
  const gibsTileUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${activeSatelliteConfig.gibsLayerName}/default/${activeSatelliteConfig.defaultDate}/GoogleMapsCompatible_Level${activeSatelliteConfig.maxZoom}/{z}/{y}/{x}.${activeSatelliteConfig.format}`;

  // 3D Orbital Arcs Data (Cyclone threat vector + Terra, SMAP, GPM, ISS orbits with active sensor highlighted)
  const orbitArcsData = useMemo(() => {
    const isTerra = activeLayer === "NDVI" || activeLayer === "EVI" || activeLayer === "LAI";
    const isSmap = activeLayer === "SMAP Moisture";
    const isGpm = activeLayer === "GPM Rain";
    const isEcostress = activeLayer === "ECOSTRESS ESI";

    return [
      // Animated dashed red cyclone trajectory arc connecting cyclone to landfall/impact farm zone
      {
        startLat: lat + 3.2,
        startLng: lon + 4.5,
        endLat: lat,
        endLng: lon,
        color: ["#ef4444", "#ef4444"],
        name: "Cyclone Storm Threat Vector",
      },
      {
        startLat: 82,
        startLng: lon - 35,
        endLat: -78,
        endLng: lon + 25,
        color: isTerra ? ["#00f0ff", "#38bdf8"] : ["#10b981", "#06b6d4"],
        name: "MODIS Terra (Sun-Synchronous)",
      },
      {
        startLat: 86,
        startLng: lon - 75,
        endLat: -82,
        endLng: lon - 10,
        color: isSmap ? ["#00f0ff", "#38bdf8"] : ["#06b6d4", "#3b82f6"],
        name: "SMAP L-Band Polar Pass",
      },
      {
        startLat: 65,
        startLng: lon - 120,
        endLat: -65,
        endLng: lon + 55,
        color: isGpm ? ["#00f0ff", "#38bdf8"] : ["#06b6d4", "#a855f7"],
        name: "GPM IMERG 65° Inclined Orbit",
      },
      {
        startLat: 51.6,
        startLng: lon - 150,
        endLat: -51.6,
        endLng: lon + 30,
        color: isEcostress ? ["#00f0ff", "#38bdf8"] : ["#f59e0b", "#10b981"],
        name: "ISS ECOSTRESS 51.6° Orbit",
      },
    ];
  }, [lat, lon, activeLayer]);

  // 3D Dynamic Concentric Hazard Pulse Rings (Low-profile, no cluttering giant radar rings)
  const dynamicHazardRings = useMemo(() => {
    const rings = [
      // Primary field pin target beacon pulsing in active layer color
      {
        lat,
        lng: lon,
        maxR: 3.2,
        propagationSpeed: 2.2,
        repeatPeriod: 1500,
        color: activeSatelliteConfig.primaryColor,
        name: `Field Reticle • ${activeLayer}: ${reading.value} ${reading.unit}`,
      },
    ];

    // Pulsing hazard rings for active natural hazards
    for (const h of hazards) {
      if (h.type === "cyclone" && (h.severity === "critical" || h.severity === "warning")) {
        rings.push({
          lat: lat + 3.2,
          lng: lon + 4.5,
          maxR: 7.0,
          propagationSpeed: 2.5,
          repeatPeriod: 1600,
          color: "#ef4444",
          name: `Cyclone Track: ${h.metric}`,
        });
      }
      if (h.type === "earthquake") {
        rings.push({
          lat: lat - 0.75,
          lng: lon - 0.85,
          maxR: 5.0,
          propagationSpeed: 3.0,
          repeatPeriod: 1200,
          color: "#10b981",
          name: `Seismic Epicenter: ${h.metric}`,
        });
      }
      if (h.type === "fire") {
        rings.push({
          lat: lat + 0.08,
          lng: lon - 0.06,
          maxR: 3.5,
          propagationSpeed: 2.0,
          repeatPeriod: 1400,
          color: "#f59e0b",
          name: `FIRMS Hotspot: ${h.metric}`,
        });
      }
    }

    return rings;
  }, [lat, lon, activeLayer, activeSatelliteConfig, reading, hazards]);

  // 3D Spherical Overlay Mesh Object Data (semi-transparent telemetry aura shell)
  const customOverlayData = useMemo(() => {
    return [
      {
        id: `overlay-${activeLayer}`,
        layer: activeLayer,
        color: activeSatelliteConfig.primaryColor,
        secondaryColor:
          activeSatelliteConfig.colorRamp.colors[
            Math.floor(activeSatelliteConfig.colorRamp.colors.length / 2)
          ] || activeSatelliteConfig.primaryColor,
        opacity: (opacity / 100) * 0.65,
        colors: activeSatelliteConfig.colorRamp.colors,
        lat,
        lon,
      },
    ];
  }, [activeLayer, activeSatelliteConfig, opacity, lat, lon]);

  // Multi-zoom Google Earth-style dynamic 4-Stage LOD place labels on 3D Orbital Globe
  const activePlaceLabels = useMemo(() => {
    const isLight = basemapStyle === "terrain" || basemapStyle === "default";
    const labels: GlobeHtmlMarkerItem[] = [];

    // Stage 1 — Global / Far Orbital View (altitude > 1.4):
    // Show ONLY major non-overlapping country labels and major oceans.
    // Hide regional sea names (ARABIAN SEA, BAY OF BENGAL) and redundant continent/country duplicates (EUROPE vs UNITED KINGDOM).
    if (orbitalAltitude > 1.4) {
      for (const c of STAGE1_MAJOR_COUNTRIES) {
        labels.push({
          id: c.id,
          lat: c.lat,
          lng: c.lng,
          priority: 3,
          html: renderCountryHtml(c.text, isLight),
        });
      }
      for (const o of STAGE1_MAJOR_OCEANS) {
        labels.push({
          id: o.id,
          lat: o.lat,
          lng: o.lng,
          priority: 3,
          html: renderOceanHtml(o.text, isLight),
        });
      }
      return labels;
    }

    // Stage 2 — Country Zoom (0.65 < altitude <= 1.4):
    // Smoothly fade in State names in clean, small white/slate typography.
    // Keep smaller cities, districts, and terrain features hidden so they never overlap states.
    if (orbitalAltitude > 0.65 && orbitalAltitude <= 1.4) {
      for (const c of GLOBAL_COUNTRIES) {
        labels.push({
          id: c.id,
          lat: c.lat,
          lng: c.lng,
          priority: 3,
          html: renderCountryHtml(c.text, isLight),
        });
      }
      for (const o of REGIONAL_WATER_BODIES) {
        labels.push({
          id: o.id,
          lat: o.lat,
          lng: o.lng,
          priority: 3,
          html: renderOceanHtml(o.text, isLight),
        });
      }
      for (const s of REGIONAL_STATES) {
        labels.push({
          id: s.id,
          lat: s.lat,
          lng: s.lng,
          priority: 4,
          html: renderStateHtml(s.text, isLight),
        });
      }
      for (const m of MEGA_CAPITALS) {
        labels.push({
          id: m.id,
          lat: m.lat,
          lng: m.lng,
          priority: 5,
          html: renderMegaCapitalHtml(m.text, isLight),
        });
      }
      return labels;
    }

    // Stage 3 — State / Regional Zoom (0.28 < altitude <= 0.75):
    // Fade out giant country label.
    // Reveal regional cities, districts, towns with tiny white city dots, terrain features, and state labels.
    for (const s of REGIONAL_STATES) {
      labels.push({
        id: s.id,
        lat: s.lat,
        lng: s.lng,
        priority: 4,
        html: renderStateHtml(s.text, isLight),
      });
    }
    for (const m of MEGA_CAPITALS) {
      labels.push({
        id: m.id,
        lat: m.lat,
        lng: m.lng,
        priority: 5,
        html: renderMegaCapitalHtml(m.text, isLight),
      });
    }
    for (const ct of ALL_CITIES_AND_TOWNS) {
      labels.push({
        id: ct.id,
        lat: ct.lat,
        lng: ct.lng,
        priority: 6,
        html: renderCityTownHtml(ct.text, isLight),
      });
    }
    for (const tr of TERRAIN_FEATURES) {
      labels.push({
        id: tr.id,
        lat: tr.lat,
        lng: tr.lng,
        priority: 7,
        html: renderTerrainHtml(tr.text, isLight),
      });
    }

    return labels;
  }, [orbitalAltitude, basemapStyle]);

  // 3D Sleek Target Micro-Marker flush with Earth curvature (cluttering 16 green dots removed)
  const telemetryPointsData = useMemo(() => {
    return [
      {
        lat,
        lng: lon,
        size: 0.22,
        altitude: 0.002,
        color: activeSatelliteConfig.primaryColor,
        label: `Field Target Pin • ${activeLayer}: ${reading.value} ${reading.unit}`,
      },
    ];
  }, [lat, lon, activeLayer, activeSatelliteConfig, reading]);

  // 3D HTML Sleek Animated Circular Hazard Markers & Place Labels for react-globe.gl
  const dynamicGlobeHtmlMarkers = useMemo(() => {
    const list: GlobeHtmlMarkerItem[] = [
      {
        id: "field-reticle-marker",
        lat,
        lng: lon,
        priority: 1,
        html: renderFarmReticle3DMarker(activeLayer, reading.value, reading.unit, meta.regionLabel),
      },
    ];

    for (const h of hazards) {
      if (h.type === "cyclone") {
        list.push({
          id: `hazard-${h.id || "cyclone"}`,
          lat: lat + 3.2,
          lng: lon + 4.5,
          priority: 1,
          html: renderCyclone3DMarker(`CYCLONE TRACK • ${h.metric || "115 km/h"}`),
        });
      } else if (h.type === "fire") {
        list.push({
          id: `hazard-${h.id || "fire"}`,
          lat: lat + 0.08,
          lng: lon - 0.06,
          priority: 1,
          html: renderFire3DMarker(`FIRMS FIRE • ${h.metric || "42 MW"}`),
        });
      } else if (h.type === "earthquake") {
        list.push({
          id: `hazard-${h.id || "quake"}`,
          lat: lat - 0.75,
          lng: lon - 0.85,
          priority: 1,
          html: renderSeismic3DMarker(`USGS EPICENTER • ${h.metric || "M4.6"}`),
        });
      }
    }

    list.push(...activePlaceLabels);

    return list;
  }, [lat, lon, activeLayer, reading, meta.regionLabel, hazards, activePlaceLabels]);

  // Screen-space bounding-box collision culling for 3D Globe place labels & badges
  const runCollisionCull = useCallback(() => {
    if (!containerRef.current) return;
    const domLabels = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(".globe-lod-label"),
    );
    if (domLabels.length === 0) return;

    // Sort candidates by priority ascending: 1 (highest) to 7 (lowest)
    domLabels.sort((a, b) => {
      const pA = Number(a.dataset.priority || 99);
      const pB = Number(b.dataset.priority || 99);
      return pA - pB;
    });

    const acceptedBoxes: DOMRect[] = [];

    for (const label of domLabels) {
      const priority = Number(label.dataset.priority || 99);
      const rect = label.getBoundingClientRect();

      // If element is not rendered or has 0 dimensions, skip
      if (rect.width === 0 && rect.height === 0) {
        continue;
      }

      // Priority 1 (Active reticle / searched pin) is NEVER culled
      if (priority === 1) {
        label.style.opacity = "1";
        label.style.pointerEvents = "auto";
        acceptedBoxes.push(rect);
        continue;
      }

      // Check collision against accepted higher-priority bounding boxes
      // Strict 2D screen-space bounding-box collision culling (minDistance: 45px horizontal, 25px vertical)
      let collides = false;
      for (const box of acceptedBoxes) {
        const hCollision = !(rect.right + 45 < box.left || rect.left - 45 > box.right);
        const vCollision = !(rect.bottom + 25 < box.top || rect.top - 25 > box.bottom);
        if (hCollision && vCollision) {
          collides = true;
          break;
        }
      }

      if (collides) {
        label.style.opacity = "0";
        label.style.pointerEvents = "none";
      } else {
        label.style.opacity = "1";
        label.style.pointerEvents = "auto";
        acceptedBoxes.push(rect);
      }
    }
  }, []);

  // Run collision culling whenever dynamic HTML markers change
  useEffect(() => {
    if (viewMode !== "3d") return;
    const timer = setTimeout(() => {
      runCollisionCull();
    }, 60);
    return () => clearTimeout(timer);
  }, [viewMode, dynamicGlobeHtmlMarkers, runCollisionCull]);

  // Attach collision culling and altitude tracking to OrbitControls
  useEffect(() => {
    if (viewMode !== "3d" || !globeRef.current) return;
    let controlsInstance: {
      addEventListener?: (e: string, cb: () => void) => void;
      removeEventListener?: (e: string, cb: () => void) => void;
    } | null = null;

    const handleControlsChange = () => {
      if (globeRef.current && typeof globeRef.current.pointOfView === "function") {
        try {
          const pov = globeRef.current.pointOfView();
          if (pov && typeof pov.altitude === "number") {
            lastPovRef.current = {
              lat: typeof pov.lat === "number" ? pov.lat : lastPovRef.current.lat,
              lng: typeof pov.lng === "number" ? pov.lng : lastPovRef.current.lng,
              altitude: pov.altitude,
            };
            setOrbitalAltitude((prev) => {
              if (Math.abs(prev - pov.altitude) > 0.04) {
                return pov.altitude;
              }
              return prev;
            });
          }
        } catch {
          // ignore
        }
      }
      runCollisionCull();
    };

    try {
      if (typeof globeRef.current.controls === "function") {
        const ctrl = globeRef.current.controls() as {
          enableDamping?: boolean;
          dampingFactor?: number;
          rotateSpeed?: number;
          zoomSpeed?: number;
          addEventListener?: (e: string, cb: () => void) => void;
          removeEventListener?: (e: string, cb: () => void) => void;
        };
        if (ctrl) {
          ctrl.enableDamping = true;
          ctrl.dampingFactor = 0.06;
          ctrl.rotateSpeed = 0.55;
          ctrl.zoomSpeed = 0.75;
          controlsInstance = ctrl;
        }
      }
    } catch {
      // controls not ready yet
    }

    if (controlsInstance && typeof controlsInstance.addEventListener === "function") {
      controlsInstance.addEventListener("change", handleControlsChange);
    }

    const interval = setInterval(runCollisionCull, 350);

    return () => {
      clearInterval(interval);
      if (controlsInstance && typeof controlsInstance.removeEventListener === "function") {
        controlsInstance.removeEventListener("change", handleControlsChange);
      }
    };
  }, [viewMode, globeModule, runCollisionCull]);

  // 2D Field GIS Hazard Features List
  const mapHazardsList = useMemo(() => {
    return [
      {
        id: "hazard-firms-fire",
        type: "fire" as const,
        name: "NASA FIRMS — Stubble Fire & Smoke Hotspot",
        severity: "warning" as const,
        lat: lat + 0.08,
        lon: lon - 0.06,
        radiusM: 50000,
        color: "#f59e0b",
        icon: "🔥",
        telemetry: "6 hotspots / 50 km • AOD 0.55 • FRP 42 MW",
        impact:
          "Agricultural residue burning detected. Aerosol smoke dimming reduces PAR sunlight.",
        action:
          "Upland biomass burning active. Monitor smoke plume drift; clean solar PV panels and greenhouse polyhouse covers.",
      },
      {
        id: "hazard-firms-fire-sub",
        type: "fire" as const,
        name: "NASA FIRMS — Satellite Cluster Spot B",
        severity: "warning" as const,
        lat: lat - 0.045,
        lon: lon + 0.075,
        radiusM: 25000,
        color: "#f59e0b",
        icon: "🔥",
        telemetry: "VIIRS 375m • FRP 28 MW",
        impact: "Secondary field clearing hotspot.",
        action: "Halt downwind crop drying and protect open grain silos.",
      },
      {
        id: "hazard-wind-drift",
        type: "wind" as const,
        name: "NASA POWER — High Wind Spray Drift Hazard",
        severity: "warning" as const,
        lat: lat + 0.006,
        lon: lon + 0.006,
        radiusM: 5000,
        color: "#f59e0b",
        icon: "💨",
        telemetry: "7.2 m/s (25.9 km/h) Wind Speed at 2m",
        impact: "Pesticide and foliar spray droplet drift risk across field boundaries.",
        action:
          "Southwest monsoon gusting above 6.5 m/s. Halt pesticide spraying to protect adjacent crops and prevent chemical waste.",
      },
      {
        id: "hazard-cyclone-track",
        type: "cyclone" as const,
        name: "NASA EONET — Severe Storm / Cyclone Track",
        severity: "critical" as const,
        lat: lat + 3.2,
        lon: lon + 4.5,
        radiusM: 180000,
        polyline: [
          [lat + 3.2, lon + 4.5],
          [lat, lon],
        ] as [number, number][],
        color: "#ef4444",
        icon: "🌀",
        telemetry: "EONET 680 km from farm • Central Wind 38 kt",
        impact: "Potential heavy precipitation, flash flooding, and crop lodging.",
        action:
          "Dig radial drainage trenches to clear storm surface runoff; provide bamboo propping for tall crops (banana, sugarcane).",
      },
      {
        id: "hazard-usgs-quake",
        type: "earthquake" as const,
        name: "USGS Seismic Event Epicenter",
        severity: "nominal" as const,
        lat: lat - 0.75,
        lon: lon - 0.85,
        radiusM: 35000,
        color: "#10b981",
        icon: "⚡",
        telemetry: "M2.3 max depth 10km • Fault Proximity",
        impact: "Background micro-seismicity detected by USGS global monitoring.",
        action:
          "Inspect borewell casing integrity, submersible pump alignment, and electrical grounding.",
      },
      {
        id: "hazard-flood-hypoxia",
        type: "flood" as const,
        name: "GPM / SMAP — Flood & Root Hypoxia Zone",
        severity: "warning" as const,
        lat: lat - 0.02,
        lon: lon - 0.015,
        radiusM: 7000,
        color: "#06b6d4",
        icon: "🌊",
        telemetry: "GPM 24h Rain: 48mm • Root Saturation 88%",
        impact: "Risk of nitrogen leaching and root rot (damping-off).",
        action:
          "Aerate soil surface; delay top-dressing urea until drainage stabilizes; check low-lying bunds.",
      },
    ];
  }, [lat, lon]);

  // Filtered list of hazards for 2D GIS map
  const activeMapHazards = useMemo(() => {
    if (!hazardsVisible) return [];
    if (hazardFilter === "all") return mapHazardsList;
    return mapHazardsList.filter((h) => h.type === hazardFilter);
  }, [mapHazardsList, hazardsVisible, hazardFilter]);

  // Synchronized Zoom Level (1..18)
  const currentZoomLevel = useMemo(() => {
    if (viewMode === "3d") {
      return Math.max(
        1,
        Math.min(18, Math.round(18 - ((orbitalAltitude - 0.06) / (2.5 - 0.06)) * 16)),
      );
    }
    return gisZoom;
  }, [viewMode, orbitalAltitude, gisZoom]);

  const lastAutoTransitionRef = useRef(0);

  // Explicit View Mode Switchers with Camera Preservation (Zero reset to Africa/Europe)
  const handleSwitchTo3D = useCallback(() => {
    if (!webGLSupported) return;
    lastPovRef.current = {
      lat,
      lng: lon,
      altitude:
        lastPovRef.current.altitude &&
        lastPovRef.current.altitude >= 0.15 &&
        lastPovRef.current.altitude <= 1.2
          ? lastPovRef.current.altitude
          : 0.55,
    };
    isFirst3dMountRef.current = true;
    setViewMode("3d");
  }, [webGLSupported, lat, lon]);

  const handleSwitchTo2D = useCallback(() => {
    if (globeRef.current && typeof globeRef.current.pointOfView === "function") {
      try {
        const pov = globeRef.current.pointOfView();
        if (pov && typeof pov.altitude === "number") {
          lastPovRef.current = {
            lat: typeof pov.lat === "number" ? pov.lat : lat,
            lng: typeof pov.lng === "number" ? pov.lng : lon,
            altitude: pov.altitude,
          };
        }
      } catch {
        // ignore
      }
    }
    isFirst3dMountRef.current = true;
    setViewMode("2d");
  }, [lat, lon]);

  // Two-way auto-zoom transitions between 2D Map & 3D Orbital Globe (Wide Hysteresis Buffer)
  const handleAutoTransitionTo3D = useCallback(() => {
    const now = Date.now();
    if (now - lastAutoTransitionRef.current < 600) return;
    lastAutoTransitionRef.current = now;

    if (webGLSupported) {
      lastPovRef.current = { lat, lng: lon, altitude: 1.35 };
      isFirst3dMountRef.current = false;
      setViewMode("3d");
      setOrbitalAltitude(1.35);
      globeRef.current?.pointOfView({ lat, lng: lon, altitude: 1.35 }, 1000);
      toast.info("Entering 3D Orbital Overview", {
        description: "Zoomed out to global threshold (zoom <= 2). Switched to 3D Globe.",
      });
    }
  }, [webGLSupported, lat, lon]);

  const handleAutoTransitionTo2D = useCallback(() => {
    const now = Date.now();
    if (now - lastAutoTransitionRef.current < 600) return;
    lastAutoTransitionRef.current = now;

    if (globeRef.current && typeof globeRef.current.pointOfView === "function") {
      try {
        const pov = globeRef.current.pointOfView();
        if (pov && typeof pov.altitude === "number") {
          lastPovRef.current = {
            lat: typeof pov.lat === "number" ? pov.lat : lat,
            lng: typeof pov.lng === "number" ? pov.lng : lon,
            altitude: pov.altitude,
          };
        }
      } catch {
        // ignore
      }
    }
    isFirst3dMountRef.current = true;
    setViewMode("2d");
    setGisZoom(9);
    toast.info("Entering High-Resolution 2D Field GIS", {
      description: "Sub-district orbit reached (altitude <= 0.14). Switched to 2D Regional GIS.",
    });
  }, [lat, lon]);

  // Zoom In Handler (Strict 4-Stage LOD: triggers 2D Hand-Off when altitude <= 0.14)
  const handleZoomIn = () => {
    if (viewMode === "3d") {
      const newAlt = Math.max(0.04, orbitalAltitude * 0.65);
      setOrbitalAltitude(newAlt);
      lastPovRef.current.altitude = newAlt;
      globeRef.current?.pointOfView({ lat, lng: lon, altitude: newAlt }, 400);
      if (newAlt <= 0.14) {
        handleAutoTransitionTo2D();
      }
    } else {
      leafletMapRef.current?.zoomIn?.(1, { animate: true });
    }
  };

  // Zoom Out Handler (triggers 3D Hand-Off when 2D zoom <= 2)
  const handleZoomOut = () => {
    if (viewMode === "3d") {
      const newAlt = Math.min(2.5, orbitalAltitude * 1.45);
      setOrbitalAltitude(newAlt);
      lastPovRef.current.altitude = newAlt;
      globeRef.current?.pointOfView({ lat, lng: lon, altitude: newAlt }, 400);
    } else {
      const curZ = leafletMapRef.current?.getZoom?.() ?? gisZoom;
      if (curZ <= 2) {
        handleAutoTransitionTo3D();
      } else {
        leafletMapRef.current?.zoomOut?.(1, { animate: true });
      }
    }
  };

  // Vertical Zoom Slider Handler
  const handleSliderChange = (newZoom: number) => {
    if (viewMode === "3d") {
      if (newZoom >= 16) {
        handleAutoTransitionTo2D();
        return;
      }
      const newAlt = Math.max(0.04, Math.min(2.5, 2.5 - ((newZoom - 1) / 17) * (2.5 - 0.04)));
      setOrbitalAltitude(newAlt);
      lastPovRef.current.altitude = newAlt;
      globeRef.current?.pointOfView({ lat, lng: lon, altitude: newAlt }, 300);
      if (newAlt <= 0.14) handleAutoTransitionTo2D();
    } else {
      if (newZoom <= 2) {
        handleAutoTransitionTo3D();
        return;
      }
      leafletMapRef.current?.setZoom?.(newZoom, { animate: true });
      setGisZoom(newZoom);
    }
  };

  // Quick Action: Target Farm (Z:15)
  const handleTargetFarm = () => {
    if (viewMode === "3d") {
      handleAutoTransitionTo2D();
    } else {
      leafletMapRef.current?.flyTo?.([lat, lon], 15, { animate: true, duration: 1.2 });
      setGisZoom(15);
    }
  };

  // Quick Action: Full Orbit (Z:3)
  const handleFullOrbit = () => {
    if (viewMode === "3d") {
      setOrbitalAltitude(2.0);
      globeRef.current?.pointOfView({ lat, lng: lon, altitude: 2.0 }, 1000);
    } else {
      handleAutoTransitionTo3D();
    }
  };

  // 4-Stage Zoom HUD Status Information
  const zoomStageInfo = useMemo(() => {
    if (viewMode === "3d") {
      if (orbitalAltitude > 1.5) {
        return {
          stage: "STAGE 1",
          label: "ORBITAL VIEW • CONTINENT / GLOBAL",
          detail: `Alt: ${Math.round(orbitalAltitude * 6371)} km`,
          color: "#38BDF8",
          badgeColor: "bg-sky-500/20 text-sky-300 border-sky-400/40",
        };
      }
      if (orbitalAltitude > 0.65) {
        return {
          stage: "STAGE 2",
          label: "ORBITAL VIEW • STATE LEVEL",
          detail: `Alt: ${Math.round(orbitalAltitude * 6371)} km`,
          color: "#06B6D4",
          badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-400/40",
        };
      }
      if (orbitalAltitude > 0.14) {
        return {
          stage: "STAGE 3",
          label: "ORBITAL VIEW • DISTRICT LEVEL",
          detail: `Alt: ${Math.round(orbitalAltitude * 6371)} km`,
          color: "#10B981",
          badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
        };
      }
      return {
        stage: "STAGE 4",
        label: "AUTO-HAND-OFF • 2D TACTICAL MAP",
        detail: `Transitioning...`,
        color: "#F59E0B",
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-400/40",
      };
    } else {
      if (gisZoom >= 13) {
        return {
          stage: "STAGE 4",
          label: "2D TACTICAL MAP • FIELD PARCEL GIS",
          detail: `Zoom ${gisZoom} • High-Res`,
          color: "#10B981",
          badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
        };
      }
      if (gisZoom > 2) {
        return {
          stage: "STAGE 4",
          label: "2D TACTICAL MAP • REGIONAL OVERVIEW",
          detail: `Zoom ${gisZoom}`,
          color: "#06B6D4",
          badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-400/40",
        };
      }
      return {
        stage: "STAGE 1",
        label: "AUTO-HAND-OFF • 3D ORBITAL GLOBE",
        detail: `Zoom ${gisZoom} <= 2`,
        color: "#38BDF8",
        badgeColor: "bg-sky-500/20 text-sky-300 border-sky-400/40",
      };
    }
  }, [viewMode, orbitalAltitude, gisZoom]);

  // Fit All Hazards in 2D View
  const handleFitAllHazards = () => {
    if (viewMode === "2d" && leafletMapRef.current) {
      const bounds: [number, number][] = [
        [lat - 0.9, lon - 1.0],
        [lat + 3.6, lon + 5.0],
      ];
      leafletMapRef.current.fitBounds?.(bounds, { padding: [40, 40] });
    }
  };

  const x = toX(lon);
  const y = toY(lat);
  const tone = LAYER_TONE[activeLayer];
  const tintStrength = Math.round((opacity / 100) * (25 + reading.intensity * 55));

  const fromEvent = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const ex = (e.clientX - r.left) / r.width;
    const ey = (e.clientY - r.top) / r.height;
    return {
      lat: Math.round((90 - ey * 180) * 10000) / 10000,
      lon: Math.round((ex * 360 - 180) * 10000) / 10000,
    };
  };

  const GlobeComponent = globeModule;
  const LeafletComp = leafletModule;

  // Coordinate grid fallback for SSR and non-WebGL environments
  const graticuleGridFallback = (
    <div
      data-hud-overlay="coordinate-grid"
      role="button"
      tabIndex={0}
      aria-label="Coordinate grid. Click to set latitude and longitude."
      className="hud-graticule absolute inset-0 cursor-crosshair"
      onClick={(e) => {
        const p = fromEvent(e);
        onPick(p.lat, p.lon);
      }}
      onMouseMove={(e) => setHover(fromEvent(e))}
      onMouseLeave={() => setHover(null)}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-[background] duration-500"
        style={{
          background: `radial-gradient(circle at ${x}% ${y}%, color-mix(in oklab, ${tone} ${tintStrength}%, transparent) 0%, transparent 28%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-cyan/25" />
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-cyan/25" />

      <div
        className="pointer-events-none absolute inset-x-0 h-px bg-cyan/50"
        style={{ top: `${y}%` }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 w-px bg-cyan/50"
        style={{ left: `${x}%` }}
      />
      <div
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${x}%`, top: `${y}%` }}
      >
        <span
          className="absolute inset-0 m-auto size-3 rounded-full animate-ping-slow"
          style={{ background: tone }}
        />
        <span
          className="relative block size-3 rounded-full border-2 border-background"
          style={{ background: tone }}
        />
        <span className="absolute left-1/2 top-1/2 size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan/60" />
      </div>

      {LON_TICKS.map((t) => (
        <span
          key={`lon-${t}`}
          className="pointer-events-none absolute top-1 -translate-x-1/2 font-mono text-[9px] text-muted-foreground/70"
          style={{ left: `${toX(t)}%` }}
        >
          {t}°
        </span>
      ))}
      {LAT_TICKS.map((t) => (
        <span
          key={`lat-${t}`}
          className="pointer-events-none absolute right-1.5 -translate-y-1/2 font-mono text-[9px] text-muted-foreground/70"
          style={{ top: `${toY(t)}%` }}
        >
          {t}°
        </span>
      ))}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 animate-scan bg-gradient-to-b from-transparent via-cyan/5 to-transparent" />
    </div>
  );

  return (
    <div
      ref={containerRef}
      id="globe-container"
      data-lat={lat}
      data-lon={lon}
      data-layer={activeLayer}
      className="relative w-full h-[540px] rounded-xl border border-cyan/40 bg-[#03060d] overflow-hidden select-none shadow-[0_0_35px_rgba(0,0,0,0.8),inset_0_0_50px_rgba(0,240,255,0.05)]"
    >
      {/* Aerospace Tactical Corner Frame Ticks & Animated Sci-Fi Reticle */}
      <div className="pointer-events-none absolute inset-0 z-10 border border-cyan/25">
        <span className="absolute top-2 left-2 size-3 border-t-2 border-l-2 border-cyan-400" />
        <span className="absolute top-2 right-2 size-3 border-t-2 border-r-2 border-cyan-400" />
        <span className="absolute bottom-2 left-2 size-3 border-b-2 border-l-2 border-cyan-400" />
        <span className="absolute bottom-2 right-2 size-3 border-b-2 border-r-2 border-cyan-400" />

        {/* Center Sci-Fi Orbital Targeting Reticle */}
        <div
          data-hud-overlay="reticle"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-24 pointer-events-none flex items-center justify-center select-none opacity-80"
        >
          {/* Rotating outer dashed ring */}
          <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/50 animate-spin-slow" />
          {/* Inner concentric ring */}
          <div className="absolute inset-3 rounded-full border border-cyan-400/30" />
          {/* 4 Precision Rangefinder Tick Marks */}
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
          <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-0.5 h-2 bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
          <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-0.5 h-2 bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
          {/* Crosshair lines */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-cyan-400/40" />
          <div className="absolute left-0 right-0 top-1/2 h-px bg-cyan-400/40" />
          {/* Pulsing center target beacon */}
          <span className="size-2 rounded-full bg-cyan-300 animate-ping opacity-75" />
          <span className="size-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
        </div>
      </div>
      {/* ---------------- 3D ORBITAL GLOBE MODE (NASA GIBS WMTS + THREE.JS OVERLAYS) ---------------- */}
      {viewMode === "3d" && GlobeComponent && mounted && webGLSupported ? (
        <SafeGlobeErrorBoundary
          fallback={graticuleGridFallback}
          onFailure={() => setViewMode("2d")}
        >
          <div className="absolute inset-0">
            {/* Multi-Layer Cosmic Starfield Background */}
            <div className="cosmic-starfield-canvas">
              <div className="cosmic-stars-1" />
              <div className="cosmic-stars-2" />
              <div className="cosmic-stars-3" />
            </div>
            <GlobeComponent
              key={`globe-engine-${basemapStyle}-${showLabels}-${enable3dTerrain}`}
              ref={(inst: GlobeMethods | null) => {
                globeRef.current = inst;
                if (inst && typeof inst.pointOfView === "function") {
                  const initPov = {
                    lat: lastPovRef.current.lat || lat,
                    lng: lastPovRef.current.lng || lon,
                    altitude: lastPovRef.current.altitude || 0.45,
                  };
                  try {
                    // Frame 0 instant position initialization:
                    // Direct lock on current active target coordinates (Mulabagilu/Karnataka), ZERO reset to (0,0) Africa/Europe!
                    inst.pointOfView(initPov, 0);
                  } catch {
                    // ignore
                  }
                  if (isFirst3dMountRef.current) {
                    isFirst3dMountRef.current = false;
                    setTimeout(() => {
                      try {
                        inst.pointOfView({ lat, lng: lon, altitude: 0.35 }, 1200);
                      } catch {
                        // ignore
                      }
                    }, 50);
                  }
                }
              }}
              width={containerDimensions.width}
              height={containerDimensions.height}
              backgroundColor="rgba(0,0,0,0)"
              globeImageUrl={
                basemapStyle === "dark"
                  ? "https://unpkg.com/three-globe/example/img/earth-night.jpg"
                  : basemapStyle === "terrain"
                    ? "https://unpkg.com/three-globe/example/img/earth-topology.png"
                    : "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
              }
              bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
              bumpScale={basemapStyle === "terrain" && enable3dTerrain ? 0.08 : 0.02}
              globeTileEngineUrl={(x: number, y: number, l: number) => {
                if (basemapStyle === "dark") {
                  return `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${l}/${y}/${x}`;
                }
                if (basemapStyle === "terrain") {
                  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${l}/${y}/${x}`;
                }
                if (basemapStyle === "default") {
                  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${l}/${y}/${x}`;
                }
                return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`;
              }}
              rendererConfig={{ antialias: true, powerPreference: "high-performance" }}
              atmosphereColor={
                basemapStyle === "dark"
                  ? "#818cf8"
                  : basemapStyle === "terrain"
                    ? "#10b981"
                    : basemapStyle === "default"
                      ? "#38bdf8"
                      : "#00e5ff"
              }
              atmosphereAltitude={basemapStyle === "terrain" && enable3dTerrain ? 0.32 : 0.24}
              arcsData={orbitArcsData}
              arcColor={(d: unknown) =>
                (d as { color?: string[] })?.color || ["#00e5ff", "#10b981"]
              }
              arcDashLength={0.4}
              arcDashGap={0.2}
              arcDashAnimateTime={3000}
              arcAltitude={0.28}
              ringsData={dynamicHazardRings}
              ringColor={(d: unknown) => (d as { color?: string })?.color || "#00e5ff"}
              ringMaxRadius="maxR"
              ringPropagationSpeed="propagationSpeed"
              ringRepeatPeriod="repeatPeriod"
              pointsData={telemetryPointsData}
              pointColor={(d: unknown) => (d as { color?: string })?.color || "#00e5ff"}
              pointAltitude="altitude"
              pointRadius="size"
              pointResolution={16}
              pointsMerge={true}
              customLayerData={customOverlayData}
              customThreeObject={(d: unknown) => {
                const item = d as {
                  color: string;
                  secondaryColor: string;
                  opacity: number;
                  colors: string[];
                  lat: number;
                  lon: number;
                };
                const group = new THREE.Group();
                const geom = new THREE.SphereGeometry(100.3, 64, 32);

                if (typeof document !== "undefined") {
                  const canvas = document.createElement("canvas");
                  canvas.width = 512;
                  canvas.height = 256;
                  const ctx = canvas.getContext("2d");
                  if (ctx) {
                    // 100% transparent base: NEVER fill entire sphere with dark/opaque color!
                    ctx.clearRect(0, 0, 512, 256);

                    // Draw radiant localized scientific telemetry heatmap aura directly over the target field
                    const cx = ((item.lon + 180) / 360) * 512;
                    const cy = ((90 - item.lat) / 180) * 256;
                    const radGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 60);
                    radGrad.addColorStop(0, item.color);
                    radGrad.addColorStop(0.35, item.secondaryColor);
                    radGrad.addColorStop(0.7, item.colors[0] || item.color);
                    radGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

                    ctx.fillStyle = radGrad;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 60, 0, Math.PI * 2);
                    ctx.fill();
                  }

                  const texture = new THREE.CanvasTexture(canvas);
                  const mat = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    opacity: item.opacity,
                    blending: THREE.AdditiveBlending,
                    side: THREE.DoubleSide,
                    depthWrite: false,
                  });

                  const mesh = new THREE.Mesh(geom, mat);
                  mesh.visible = item.opacity > 0.01;
                  group.add(mesh);

                  // 1. Delicate 3D LEO Orbit Ring (ISS ECOSTRESS 51.6° Inclination)
                  const issRingGeom = new THREE.RingGeometry(103.8, 104.2, 96);
                  const issRingMat = new THREE.MeshBasicMaterial({
                    color: 0x00f0ff,
                    transparent: true,
                    opacity: 0.4,
                    side: THREE.DoubleSide,
                  });
                  const issRingMesh = new THREE.Mesh(issRingGeom, issRingMat);
                  issRingMesh.rotation.x = Math.PI / 2;
                  issRingMesh.rotation.y = (51.6 * Math.PI) / 180;
                  group.add(issRingMesh);

                  // 2. Delicate 3D Sun-Synchronous Polar Orbit Ring (MODIS / SMAP 98° Inclination)
                  const polarRingGeom = new THREE.RingGeometry(106.8, 107.2, 96);
                  const polarRingMat = new THREE.MeshBasicMaterial({
                    color: 0xa855f7,
                    transparent: true,
                    opacity: 0.3,
                    side: THREE.DoubleSide,
                  });
                  const polarRingMesh = new THREE.Mesh(polarRingGeom, polarRingMat);
                  polarRingMesh.rotation.x = Math.PI / 2;
                  polarRingMesh.rotation.y = (98 * Math.PI) / 180;
                  group.add(polarRingMesh);

                  // 3. Orbiting Satellite Beacon on ISS Ring
                  const satGeom = new THREE.SphereGeometry(0.85, 16, 16);
                  const satMat = new THREE.MeshBasicMaterial({
                    color: 0x00f0ff,
                  });
                  const satMesh = new THREE.Mesh(satGeom, satMat);
                  satMesh.name = "orbitingSatBeacon";
                  satMesh.position.set(104, 0, 0);
                  group.add(satMesh);
                }
                return group;
              }}
              customThreeObjectUpdate={(obj: unknown, d: unknown) => {
                const item = d as { opacity: number };
                const group = obj as THREE.Group;
                const mesh = group?.children?.[0] as THREE.Mesh<
                  THREE.BufferGeometry,
                  THREE.MeshBasicMaterial
                >;
                if (mesh?.material) {
                  mesh.material.opacity = item.opacity;
                  mesh.visible = item.opacity > 0.01;
                }
                const satBeacon = group?.getObjectByName("orbitingSatBeacon");
                if (satBeacon) {
                  const t = Date.now() * 0.0008;
                  satBeacon.position.set(104 * Math.cos(t), 25 * Math.sin(t), 104 * Math.sin(t));
                }
              }}
              htmlElementsData={
                showLabels
                  ? dynamicGlobeHtmlMarkers
                  : dynamicGlobeHtmlMarkers.filter((m) => m.priority === 1)
              }
              htmlLat="lat"
              htmlLng="lng"
              htmlAltitude={0.015}
              htmlElement={(d: unknown) => {
                const item = d as { id?: string; priority?: number; html?: string };
                const el = document.createElement("div");
                el.className =
                  item.priority === 1 ? "globe-lod-label globe-hazard-marker" : "globe-lod-label";
                if (item.id) el.dataset.labelId = item.id;
                el.dataset.priority = String(item.priority ?? 99);
                el.style.transition = "opacity 200ms ease-out, transform 200ms ease-out";
                el.style.opacity = "1";
                el.style.willChange = "opacity";
                if (item.priority === 1) {
                  el.style.pointerEvents = "auto";
                  el.style.cursor = "pointer";
                  el.onclick = (e) => {
                    e.stopPropagation();
                    el.classList.toggle("active");
                  };
                }
                if (item.html) el.innerHTML = item.html;
                return el;
              }}
              onZoom={(pov: { lat: number; lng: number; altitude: number }) => {
                if (typeof pov?.altitude === "number") {
                  lastPovRef.current = {
                    lat: typeof pov.lat === "number" ? pov.lat : lastPovRef.current.lat,
                    lng: typeof pov.lng === "number" ? pov.lng : lastPovRef.current.lng,
                    altitude: pov.altitude,
                  };
                  setOrbitalAltitude(pov.altitude);
                  if (pov.altitude <= 0.14) {
                    handleAutoTransitionTo2D();
                  }
                  setTimeout(runCollisionCull, 50);
                }
              }}
              onGlobeClick={({ lat: clickLat, lng: clickLng }: { lat: number; lng: number }) => {
                const targetLat = Math.round(clickLat * 10000) / 10000;
                const targetLng = Math.round(clickLng * 10000) / 10000;
                lastPovRef.current = { lat: targetLat, lng: targetLng, altitude: 0.35 };
                onPick(targetLat, targetLng);
                globeRef.current?.pointOfView?.(
                  { lat: targetLat, lng: targetLng, altitude: 0.35 },
                  1800,
                );
              }}
            />
          </div>
        </SafeGlobeErrorBoundary>
      ) : null}

      {/* ---------------- LIVE SATELLITE OVERPASS HUD READOUT ---------------- */}
      <div className="pointer-events-none absolute top-3.5 left-4 z-20 hidden md:flex items-center gap-2 rounded-full border border-cyan-500/35 bg-[#090D16]/90 px-3 py-1 font-mono text-[10px] text-cyan-300 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.2)]">
        <Satellite className="size-3 text-cyan-400 animate-pulse" />
        <span>
          {activeSatelliteConfig.sensorName.toUpperCase()} OVERPASS IN{" "}
          <strong className="text-white font-bold tabular-nums">{overpassTimerStr}</strong>
        </span>
      </div>

      {/* ---------------- TOP-CENTER ZOOM STAGE INDICATOR PILL ---------------- */}
      <div
        data-hud-overlay="zoom-stage-pill"
        className="pointer-events-none absolute top-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-cyan-500/40 bg-[#090D16]/90 px-3.5 py-1 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.8),0_0_12px_rgba(6,182,212,0.25)] text-xs font-mono select-none transition-all duration-300"
      >
        <span
          className="size-2 rounded-full animate-pulse"
          style={{ background: zoomStageInfo.color, boxShadow: `0 0 8px ${zoomStageInfo.color}` }}
        />
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[9px] font-bold border tracking-wider uppercase",
            zoomStageInfo.badgeColor,
          )}
        >
          {zoomStageInfo.stage}
        </span>
        <span className="font-semibold text-slate-200 tracking-wide text-[11px]">
          {zoomStageInfo.label}
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          ({zoomStageInfo.detail})
        </span>
      </div>

      {/* ---------------- TARGET LOCKED RETICLE BANNER OVERLAY ---------------- */}
      {targetLockedBanner.visible && (
        <div className="pointer-events-none absolute top-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full border border-cyan-400/60 bg-slate-950/90 px-4 py-1 backdrop-blur-xl shadow-[0_0_25px_rgba(34,211,238,0.45)] text-xs font-mono animate-in fade-in zoom-in-95 duration-200">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-80" />
            <span className="relative inline-flex rounded-full size-2 bg-cyan-400" />
          </span>
          <span className="font-bold text-cyan-300 tracking-wider">
            [ TARGET LOCKED: {Math.abs(targetLockedBanner.lat).toFixed(4)}°{" "}
            {targetLockedBanner.lat >= 0 ? "N" : "S"}, {Math.abs(targetLockedBanner.lon).toFixed(4)}
            ° {targetLockedBanner.lon >= 0 ? "E" : "W"} ]
          </span>
        </div>
      )}

      {/* ---------------- 2D FIELD GIS MODE (LEAFLET + NASA GIBS + HAZARDS) ---------------- */}
      {viewMode === "2d" && LeafletComp && mounted ? (
        <div className="absolute inset-0 z-0">
          <LeafletComp.MapContainer
            center={[lat, lon]}
            zoom={gisZoom}
            minZoom={2}
            maxZoom={18}
            scrollWheelZoom={true}
            style={{ width: "100%", height: "100%", background: "#050811" }}
          >
            {/* Dynamic Basemap Tile Layer (Instant In-Place Swap via React Key) */}
            <LeafletComp.TileLayer
              key={`2d-base-${basemapStyle}`}
              url={
                basemapStyle === "dark"
                  ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                  : basemapStyle === "terrain"
                    ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
                    : basemapStyle === "default"
                      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                      : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              }
              maxZoom={18}
              attribution={
                basemapStyle === "dark"
                  ? "Tiles &copy; Esri &mdash; Esri Dark Canvas"
                  : basemapStyle === "terrain"
                    ? "Tiles &copy; Esri &mdash; World Topo Map & Elevation Contours"
                    : basemapStyle === "default"
                      ? "Tiles &copy; Esri &mdash; World Street Map"
                      : "Tiles &copy; Esri &mdash; High-Resolution Farm Satellite"
              }
            />

            {/* Optional 100% Free Keyless ArcGIS Reference Place & Boundary Overlays */}
            {showLabels && (
              <LeafletComp.TileLayer
                key={`2d-labels-${basemapStyle}-${showLabels}`}
                url={
                  basemapStyle === "dark"
                    ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                    : "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                }
                maxZoom={18}
                zIndex={15}
                opacity={basemapStyle === "dark" ? 0.85 : 0.75}
                attribution="Labels &copy; Esri"
              />
            )}
            {showLabels && basemapStyle !== "dark" && (
              <LeafletComp.TileLayer
                key={`2d-ref-overlay-${basemapStyle}-${showLabels}`}
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}"
                maxZoom={18}
                zIndex={16}
                opacity={0.8}
              />
            )}

            {/* NASA GIBS WMTS Raster Tile Layer (Level maxZoom with smooth upscaling up to 18) */}
            <LeafletComp.TileLayer
              key={`${activeSatelliteConfig.gibsLayerName}-${activeSatelliteConfig.defaultDate}`}
              url={gibsTileUrl}
              maxNativeZoom={activeSatelliteConfig.maxZoom}
              maxZoom={18}
              opacity={opacity / 100}
              zIndex={10}
              attribution="NASA GIBS WMTS"
            />

            {/* Interactive & Draggable Farm Marker Pin */}
            <LeafletComp.Marker
              position={[lat, lon]}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const latlng = e?.target?.getLatLng();
                  if (latlng) {
                    onPick(
                      Math.round(latlng.lat * 10000) / 10000,
                      Math.round(latlng.lng * 10000) / 10000,
                    );
                  }
                },
              }}
              icon={
                new LeafletComp.L.DivIcon({
                  className: "custom-farm-pin",
                  html: `
                    <div style="position:relative; width:28px; height:28px; cursor:grab;">
                      <span style="position:absolute; inset:0; border-radius:50%; background:#00e5ff; opacity:0.4; animation:ping 2s infinite;"></span>
                      <span style="position:absolute; inset:4px; border-radius:50%; background:#06b6d4; border:2px solid #ffffff; box-shadow:0 0 10px #00e5ff;"></span>
                    </div>
                  `,
                  iconSize: [28, 28],
                  iconAnchor: [14, 14],
                })
              }
            >
              <LeafletComp.Popup className="hud-leaflet-popup">
                <div className="font-mono text-xs p-1 text-slate-100">
                  <div className="font-bold text-cyan flex items-center gap-1.5">
                    <Radar className="size-3.5" /> FARM PIN RETICLE
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    Lat: <span className="text-cyan">{lat.toFixed(4)}°</span> Lon:{" "}
                    <span className="text-cyan">{lon.toFixed(4)}°</span>
                  </div>
                  <div className="mt-1 font-semibold" style={{ color: tone }}>
                    {activeLayer}: {reading.value} {reading.unit}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground border-t border-border/50 pt-1">
                    Drag pin or click map to reposition field pin.
                  </div>
                </div>
              </LeafletComp.Popup>
            </LeafletComp.Marker>

            {/* ---------------- 2D WARNING & HAZARD MARKERS + IMPACT RINGS ---------------- */}
            {activeMapHazards.map((hazard) => (
              <div key={hazard.id}>
                {/* Geodesic Impact Radius Circle */}
                {hazard.radiusM && (
                  <LeafletComp.Circle
                    center={[hazard.lat, hazard.lon]}
                    radius={hazard.radiusM}
                    pathOptions={{
                      color: hazard.color,
                      fillColor: hazard.color,
                      fillOpacity: 0.1,
                      weight: 1.5,
                      dashArray: "5 5",
                    }}
                  />
                )}

                {/* Threat Vector Polyline (e.g. Cyclone to Farm with animated dashFlow) */}
                {hazard.polyline && (
                  <LeafletComp.Polyline
                    positions={hazard.polyline}
                    pathOptions={{
                      color: hazard.color,
                      weight: 2.5,
                      dashArray: "6 6",
                      opacity: 0.85,
                      className: "leaflet-dash-flow",
                    }}
                  />
                )}

                {/* Tactical Animated Hazard Marker */}
                <LeafletComp.Marker
                  position={[hazard.lat, hazard.lon]}
                  icon={
                    new LeafletComp.L.DivIcon({
                      className: "hazard-marker",
                      html: `
                        <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                          <span style="position:absolute; inset:0; border-radius:50%; border:1.5px dashed ${hazard.color}; opacity:0.75; box-shadow:0 0 10px ${hazard.color}40;"></span>
                          <span style="position:absolute; inset:4px; border-radius:50%; border:1.5px solid ${hazard.color}; animation:${hazard.type === "earthquake" ? "sonarRipple 2s ease-out" : "radarPulse 2.4s cubic-bezier(0.2,0.8,0.4,1)"} infinite;"></span>
                          <span style="position:relative; width:26px; height:26px; border-radius:50%; background:#090D16; border:2px solid ${hazard.color}; display:flex; align-items:center; justify-content:center; box-shadow:0 0 14px ${hazard.color};">
                            ${
                              hazard.type === "cyclone"
                                ? `<svg class="animate-spin-slow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="url(#c2dGrad)" stroke-width="2.2" stroke-linecap="round"><defs><linearGradient id="c2dGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#C084FC"/><stop offset="100%" stop-color="#38BDF8"/></linearGradient></defs><path d="M12 2a10 10 0 0 1 7.07 17.07M12 22a10 10 0 0 1-7.07-17.07M12 6a6 6 0 0 1 4.24 10.24M12 18a6 6 0 0 1-4.24-10.24M12 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/></svg>`
                                : hazard.type === "fire"
                                  ? `<svg class="animate-flame-flicker" viewBox="0 0 24 24" width="15" height="15" fill="url(#f2dGrad)"><defs><linearGradient id="f2dGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FDE047"/><stop offset="50%" stop-color="#F59E0B"/><stop offset="100%" stop-color="#EF4444"/></linearGradient></defs><path d="M12 2c.5 2.5 2 4.5 3.5 6 1.8 1.8 2.5 3.6 2.5 5.5A7.5 7.5 0 0 1 10.5 21a7.5 7.5 0 0 1-7.5-7.5c0-3.3 2.5-6.2 5-8 0 2.5 1.5 4 3 5 0-3 1-6.5 1-8.5z"/></svg>`
                                  : hazard.type === "earthquake"
                                    ? `<svg viewBox="0 0 24 24" width="15" height="15" fill="#F59E0B" stroke="#F59E0B" stroke-width="0.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`
                                    : `<span style="font-size:12px;">${hazard.icon}</span>`
                            }
                          </span>
                        </div>
                      `,
                      iconSize: [34, 34],
                      iconAnchor: [17, 17],
                    })
                  }
                >
                  <LeafletComp.Popup className="hud-leaflet-popup">
                    <div className="font-mono text-xs p-1 text-slate-100 max-w-64">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold truncate" style={{ color: hazard.color }}>
                          {hazard.name}
                        </span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[9px] uppercase font-semibold",
                            hazard.severity === "critical"
                              ? "bg-crimson/20 text-crimson border border-crimson/40"
                              : hazard.severity === "warning"
                                ? "bg-amber/20 text-amber border border-amber/40"
                                : "bg-emerald/20 text-emerald border border-emerald/40",
                          )}
                        >
                          {hazard.severity}
                        </span>
                      </div>
                      <div className="mt-1 font-semibold text-cyan text-[11px]">
                        {hazard.telemetry}
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">
                        {hazard.impact}
                      </p>
                      <div className="mt-2 rounded bg-black/40 p-1.5 border border-border/50 text-[10px] text-emerald-300">
                        <div className="font-semibold text-emerald uppercase text-[9px]">
                          Farmer Action Checklist:
                        </div>
                        {hazard.action}
                      </div>
                    </div>
                  </LeafletComp.Popup>
                </LeafletComp.Marker>
              </div>
            ))}

            {/* Map click listener & bridge */}
            <LeafletClickHandler onPick={onPick} useMapEvents={LeafletComp.useMapEvents} />
            <LeafletRecenter lat={lat} lon={lon} useMap={LeafletComp.useMap} />
            <LeafletBridge
              setMapInstance={(m) => {
                leafletMapRef.current = m;
              }}
              onZoomChange={setGisZoom}
              onAutoSwitchTo3D={handleAutoTransitionTo3D}
              useMap={LeafletComp.useMap}
              useMapEvents={LeafletComp.useMapEvents}
            />
          </LeafletComp.MapContainer>
        </div>
      ) : null}

      {/* ---------------- SSR & ENGINE LOADING FALLBACK GRID ---------------- */}
      {(!mounted ||
        (viewMode === "3d" && (!GlobeComponent || !webGLSupported)) ||
        (viewMode === "2d" && !LeafletComp)) &&
        graticuleGridFallback}

      {/* ---------------- TOP-LEFT RETICLE BADGE ---------------- */}
      <div
        data-hud-overlay="reticle"
        className="hud-card pointer-events-none absolute left-3.5 top-3.5 w-68 p-3.5 z-20 backdrop-blur-xl bg-background/90 border border-cyan/40 shadow-[0_0_20px_rgba(0,0,0,0.7)]"
      >
        <div className="flex items-center gap-2 border-b border-cyan/20 pb-2">
          <Radar className="size-3.5 text-cyan animate-spin" style={{ animationDuration: "8s" }} />
          <span className="hud-label font-bold text-cyan/90 text-[10px]">Target Reticle Lock</span>
          <span className="ml-auto size-2 rounded-full bg-emerald shadow-[0_0_8px_#00ff9d] animate-pulse" />
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-[11px]">
          <span className="text-muted-foreground/80 font-medium">LATITUDE</span>
          <span className="text-right tabular-nums text-cyan font-bold drop-shadow-[0_0_6px_#00f0ff]">
            {formatCoord(lat, "lat")}
          </span>
          <span className="text-muted-foreground/80 font-medium">LONGITUDE</span>
          <span className="text-right tabular-nums text-cyan font-bold drop-shadow-[0_0_6px_#00f0ff]">
            {formatCoord(lon, "lon")}
          </span>
          <span className="text-muted-foreground/80 font-medium">ELEVATION</span>
          <span className="text-right tabular-nums font-semibold">{meta.elevationM} m ASL</span>
          <span className="text-muted-foreground/80 font-medium">PASS</span>
          <span className="text-right text-emerald font-semibold truncate">
            {meta.satellitePass}
          </span>
          <span className="text-muted-foreground/80 font-medium">NEXT WINDOW</span>
          <span className="text-right tabular-nums text-amber font-semibold">
            T-{meta.nextPassMin} min
          </span>
        </div>

        {/* Integrated Sensor Metric Readout in Reticle Card */}
        <div className="mt-2.5 pt-2 border-t border-cyan/20 flex items-center justify-between text-xs font-mono">
          <span className="text-cyan font-bold">{activeLayer}</span>
          <span
            className="font-extrabold tabular-nums drop-shadow-[0_0_8px_currentColor]"
            style={{ color: tone }}
          >
            {reading.value} {reading.unit}
          </span>
        </div>
      </div>

      {/* ---------------- TOP-RIGHT 3D/2D VIEW SWITCHER ---------------- */}
      <div className="absolute right-4 top-3.5 z-20 flex items-center gap-1 rounded-lg border border-cyan/50 bg-background/90 p-1 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.7)]">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!webGLSupported}
          title={
            webGLSupported
              ? "3D Orbital Globe View"
              : "3D WebGL is unavailable in your browser environment"
          }
          className={cn(
            "h-7 px-3 font-mono text-xs transition-all",
            viewMode === "3d"
              ? "bg-cyan/20 text-cyan border border-cyan/60 font-bold shadow-[0_0_12px_rgba(0,240,255,0.35)]"
              : "text-muted-foreground hover:text-foreground",
            !webGLSupported && "opacity-50 cursor-not-allowed",
          )}
          onClick={handleSwitchTo3D}
        >
          <GlobeIcon className="mr-1.5 size-3.5 text-cyan drop-shadow-[0_0_6px_#00f0ff]" /> 3D
          Orbital
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn(
            "h-7 px-3 font-mono text-xs transition-all",
            viewMode === "2d"
              ? "bg-cyan/20 text-cyan border border-cyan/60 font-bold shadow-[0_0_12px_rgba(0,240,255,0.35)]"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={handleSwitchTo2D}
        >
          <MapIcon className="mr-1.5 size-3.5 text-cyan drop-shadow-[0_0_6px_#00f0ff]" /> 2D Field
          GIS
        </Button>
      </div>

      {/* ---------------- ACTIVE SENSOR METRIC READOUT CARD (POSITIONED LEFT OF ZOOM BAR) ---------------- */}
      <div
        data-hud-overlay="layer-readout"
        className="hud-card pointer-events-none absolute right-20 top-20 w-52 p-3 text-right backdrop-blur-xl bg-background/90 border border-cyan/40 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.7)] z-20"
      >
        <div className="flex items-center justify-end gap-1.5 border-b border-cyan/20 pb-1.5">
          <Radio className="size-3 text-emerald animate-pulse drop-shadow-[0_0_6px_#00ff9d]" />
          <span className="hud-label font-bold text-foreground">{activeLayer}</span>
        </div>
        <div
          className="mt-1.5 font-mono text-3xl font-extrabold tabular-nums tracking-tight"
          style={{ color: tone, textShadow: `0 0 14px ${tone}` }}
        >
          {reading.value}
        </div>
        <div className="font-mono text-[10px] text-muted-foreground/80 font-medium">
          {reading.unit}
        </div>
        <div className="mt-1 font-mono text-[9px] text-cyan/80 truncate">
          GIBS: {activeSatelliteConfig.gibsLayerName}
        </div>
        {hover && (
          <div className="mt-2 border-t border-border/50 pt-1 font-mono text-[10px] text-muted-foreground">
            cursor {hover.lat.toFixed(2)}°, {hover.lon.toFixed(2)}°
          </div>
        )}
      </div>

      {/* ---------------- FLOATING TACTICAL HUD ZOOM CONTROL BAR (RIGHT-DOCKED & VERTICALLY CENTERED) ---------------- */}
      <div
        data-hud-overlay="zoom-controls"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-[#0D1322]/90 p-1.5 backdrop-blur-md shadow-2xl select-none"
      >
        {/* Zoom In Button */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleZoomIn}
          title="Zoom In (+)"
          aria-label="Zoom In"
          className="size-7 rounded-lg text-cyan hover:bg-cyan-500/20 hover:text-cyan-300"
        >
          <Plus className="size-3.5" />
        </Button>

        {/* Vertical Range Slider */}
        <div className="relative py-1 flex flex-col items-center">
          <input
            type="range"
            min={1}
            max={18}
            step={1}
            value={currentZoomLevel}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            aria-label="Zoom Level Slider"
            className="h-24 w-2 cursor-pointer appearance-none rounded-full bg-slate-800 accent-cyan [writing-mode:vertical-lr] [direction:rtl]"
          />
        </div>

        {/* Zoom Out Button */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleZoomOut}
          title="Zoom Out (-)"
          aria-label="Zoom Out"
          className="size-7 rounded-lg text-cyan hover:bg-cyan-500/20 hover:text-cyan-300"
        >
          <Minus className="size-3.5" />
        </Button>

        {/* Live Readout Badge */}
        <div
          className="rounded border border-cyan-500/30 bg-black/60 px-1 py-0.5 font-mono text-[8px] text-cyan tabular-nums text-center w-full"
          title={
            viewMode === "3d"
              ? `Orbital Altitude: ${Math.round(orbitalAltitude * 6371)} km`
              : `Field Resolution: Zoom ${gisZoom}`
          }
        >
          Z:{currentZoomLevel}
        </div>

        <div className="w-full h-px bg-cyan-500/30 my-0.5" />

        {/* Quick Action: Target Farm (Z:15) */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleTargetFarm}
          title="Target Farm (Z:15)"
          aria-label="Target Farm"
          className="size-7 rounded-lg text-emerald hover:bg-emerald-500/20 hover:text-emerald-300"
        >
          <Crosshair className="size-3.5" />
        </Button>

        {/* Quick Action: Full Orbit (Z:3) */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleFullOrbit}
          title="Full Orbit (Z:3)"
          aria-label="Full Orbit"
          className="size-7 rounded-lg text-cyan hover:bg-cyan-500/20 hover:text-cyan-300"
        >
          <Compass className="size-3.5" />
        </Button>
      </div>

      {/* ---------------- 2D MAP HAZARD LEGEND & FILTER BAR ---------------- */}
      {viewMode === "2d" && (
        <div
          data-hud-overlay="hazard-filter"
          className="absolute left-4 bottom-18 z-20 flex flex-wrap items-center gap-1 rounded-xl border border-cyan-500/40 bg-[#0D1322]/90 px-2 py-1 backdrop-blur-md shadow-xl text-xs font-mono"
        >
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setHazardsVisible((v) => !v)}
            className={cn(
              "h-6 px-1.5 text-[10px] font-mono",
              hazardsVisible ? "text-cyan" : "text-muted-foreground opacity-60",
            )}
            title="Toggle Hazard Overlays"
          >
            {hazardsVisible ? (
              <Eye className="size-3 mr-1 text-cyan" />
            ) : (
              <EyeOff className="size-3 mr-1" />
            )}
            Hazards: {hazardsVisible ? "ON" : "OFF"}
          </Button>

          {hazardsVisible && (
            <>
              <div className="h-3 w-px bg-cyan-500/30" />
              <button
                type="button"
                onClick={() => setHazardFilter("all")}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px]",
                  hazardFilter === "all"
                    ? "bg-cyan/25 text-cyan font-bold"
                    : "text-muted-foreground",
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setHazardFilter("fire")}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px]",
                  hazardFilter === "fire"
                    ? "bg-amber/25 text-amber font-bold"
                    : "text-muted-foreground",
                )}
              >
                🔥 Fires
              </button>
              <button
                type="button"
                onClick={() => setHazardFilter("wind")}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px]",
                  hazardFilter === "wind"
                    ? "bg-amber/25 text-amber font-bold"
                    : "text-muted-foreground",
                )}
              >
                💨 Wind
              </button>
              <button
                type="button"
                onClick={() => setHazardFilter("cyclone")}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px]",
                  hazardFilter === "cyclone"
                    ? "bg-crimson/25 text-crimson font-bold"
                    : "text-muted-foreground",
                )}
              >
                🌀 Storms
              </button>
              <button
                type="button"
                onClick={() => setHazardFilter("earthquake")}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px]",
                  hazardFilter === "earthquake"
                    ? "bg-emerald/25 text-emerald font-bold"
                    : "text-muted-foreground",
                )}
              >
                ⚡ Seismic
              </button>

              <div className="h-3 w-px bg-cyan-500/30" />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleFitAllHazards}
                className="h-6 px-1.5 text-[10px] text-cyan hover:bg-cyan-500/20"
                title="Fit viewport to encompass all active hazards"
              >
                🎯 Fit All Hazards
              </Button>
            </>
          )}
        </div>
      )}

      {/* ---------------- FLOATING BASEMAP & TERRAIN SWITCHER (BOTTOM-LEFT ALIGNED) ---------------- */}
      <MapLayerSwitcher
        currentStyle={basemapStyle}
        onStyleChange={setBasemapStyle}
        showLabels={showLabels}
        onToggleLabels={setShowLabels}
        enable3dTerrain={enable3dTerrain}
        onToggle3dTerrain={setEnable3dTerrain}
        viewMode={viewMode}
        className="absolute left-4 bottom-4 z-30"
      />

      {/* ---------------- UNIFIED 2-TIER BOTTOM TELEMETRY DOCK ---------------- */}
      <div
        data-hud-overlay="layer-switcher"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5 max-w-4xl w-auto pointer-events-auto select-none"
      >
        {/* Tier 1: Upper Slim Row (Compact Legend + Temporal Controls in ONE line, max height 38px) */}
        <div className="h-[38px] max-h-[38px] py-1.5 px-3.5 sm:px-4 rounded-full border border-cyan-500/40 bg-[#0D1322]/92 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-2.5 sm:gap-3 text-xs font-mono">
          {/* Left Side: Active Sensor + Compact Gradient + Field Reading + Glow */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5 font-bold text-cyan">
              <Radio className="size-3 text-emerald animate-pulse shrink-0" />
              <span className="truncate max-w-24 sm:max-w-36">
                {activeSatelliteConfig.sensorName}
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1 shrink-0">
              <span className="text-[9px] text-muted-foreground font-mono">
                {activeSatelliteConfig.colorRamp.minLabel}
              </span>
              <div
                className="h-1.5 w-14 sm:w-20 rounded-full border border-white/10 shadow-inner"
                style={{ background: activeSatelliteConfig.colorRamp.gradient }}
              />
              <span className="text-[9px] text-muted-foreground font-mono">
                {activeSatelliteConfig.colorRamp.maxLabel}
              </span>
            </div>

            <span className="px-1.5 py-0.5 rounded bg-black/60 font-semibold border border-cyan-500/40 text-cyan text-[10px] tabular-nums shrink-0">
              FIELD: {temporalReadingValue} {reading.unit}
            </span>

            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <span className="text-[9px] text-muted-foreground font-mono">GLOW</span>
              <Slider
                aria-label="Layer opacity"
                className="w-14 sm:w-16"
                min={0}
                max={100}
                step={1}
                value={[opacity]}
                onValueChange={([v]) => v !== undefined && onOpacity(v)}
              />
              <span className="text-[10px] text-cyan tabular-nums w-7 text-right font-bold">
                {opacity}%
              </span>
            </div>
          </div>

          {/* 1px Vertical Divider */}
          <div className="h-4 w-px bg-cyan-500/30 shrink-0" />

          {/* Right Side: Play button, date label, and compact step pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsPlayingTimeline((p) => !p)}
              className={`size-6 flex items-center justify-center rounded border transition-all cursor-pointer ${
                isPlayingTimeline
                  ? "bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                  : "bg-white/5 text-slate-300 border-white/10 hover:text-white hover:bg-white/10"
              }`}
              title={isPlayingTimeline ? "Pause Time-Machine" : "Play Time-Machine"}
            >
              {isPlayingTimeline ? (
                <Pause className="size-2.5" />
              ) : (
                <Play className="size-2.5 fill-current ml-0.5" />
              )}
            </button>

            <span className="text-[9.5px] text-cyan-100 font-semibold px-2 py-0.5 rounded bg-black/60 border border-cyan-500/30 whitespace-nowrap">
              {currentTemporal.dateLabel}
            </span>

            <div className="flex items-center gap-1">
              {TEMPORAL_STEPS.map((step, idx) => {
                const isCur = temporalIdx === idx;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setTemporalIdx(idx)}
                    className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition-all cursor-pointer ${
                      isCur
                        ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.3)] font-bold"
                        : "bg-black/30 text-muted-foreground border border-white/5 hover:text-slate-200"
                    }`}
                  >
                    {step.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tier 2: Lower Slim Row (The 8 NASA Layer Pills with AnimatedBackground) */}
        <div
          role="radiogroup"
          aria-label="Map layer"
          className="flex flex-row items-center gap-1 whitespace-nowrap overflow-x-auto no-scrollbar rounded-full border border-cyan-500/25 bg-[#050B14]/90 p-1 backdrop-blur-xl shadow-[0_0_30px_rgba(6,182,212,0.15)] max-w-[calc(100vw-2rem)]"
        >
          <AnimatedBackground
            defaultValue={activeLayer}
            className="rounded-full bg-cyan-500/15 border border-cyan-400/50 shadow-[0_0_16px_rgba(34,211,238,0.3)]"
            transition={{
              type: "spring",
              bounce: 0.2,
              duration: 0.3,
            }}
            enableHover
          >
            {TELEMETRY_TABS.map((tab) => {
              const isSelected = activeLayer === tab;
              return (
                <button
                  key={tab}
                  data-id={tab}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={tab}
                  onClick={() => onLayer(tab)}
                  className={`px-3 py-1 font-mono text-xs tracking-wider rounded-full transition-colors duration-200 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "text-cyan-300 font-semibold border border-cyan-400/40 bg-cyan-500/10"
                      : "text-slate-400 hover:text-cyan-100 border border-white/5"
                  }`}
                >
                  {isSelected && (
                    <span className="size-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-pulse" />
                  )}
                  <span>{tab}</span>
                </button>
              );
            })}
          </AnimatedBackground>
        </div>
      </div>
    </div>
  );
}

// Leaflet click listener component
function LeafletClickHandler({
  onPick,
  useMapEvents,
}: {
  onPick: (lat: number, lon: number) => void;
  useMapEvents: LeafletBundle["useMapEvents"];
}) {
  useMapEvents({
    click(e) {
      if (e?.latlng) {
        onPick(Math.round(e.latlng.lat * 10000) / 10000, Math.round(e.latlng.lng * 10000) / 10000);
      }
    },
  });
  return null;
}

// Leaflet map center updater with smooth flyTo animation
function LeafletRecenter({
  lat,
  lon,
  useMap,
}: {
  lat: number;
  lon: number;
  useMap: LeafletBundle["useMap"];
}) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      if (typeof map.flyTo === "function") {
        map.flyTo([lat, lon], 13, { animate: true, duration: 1.2 });
      } else {
        map.panTo([lat, lon], { animate: true });
      }
    }
  }, [lat, lon, map]);
  return null;
}

// Leaflet bridge to store map instance and sync zoom state
function LeafletBridge({
  setMapInstance,
  onZoomChange,
  onAutoSwitchTo3D,
  useMap,
  useMapEvents,
}: {
  setMapInstance: (m: LeafletMapInstance) => void;
  onZoomChange: (z: number) => void;
  onAutoSwitchTo3D?: () => void;
  useMap: LeafletBundle["useMap"];
  useMapEvents: LeafletBundle["useMapEvents"];
}) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      setMapInstance(map);
      if (typeof map.getZoom === "function") {
        onZoomChange(map.getZoom());
      }
    }
  }, [map, setMapInstance, onZoomChange]);

  useMapEvents({
    zoomend(e) {
      if (e?.target && typeof e.target.getZoom === "function") {
        const z = e.target.getZoom();
        onZoomChange(z);
        if (z <= 2 && onAutoSwitchTo3D) {
          onAutoSwitchTo3D();
        }
      }
    },
  });
  return null;
}
