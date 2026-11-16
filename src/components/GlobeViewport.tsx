/**
 * GlobeViewport.tsx
 * Interactive Dual 3D Orbital WebGL Globe & High-Zoom 2D NASA GIBS Field GIS Map.
 * Renders inside `#globe-container`.
 *
 * Capabilities:
 * - 3D Orbital Globe: MapLibre GL globe projection (OrbitalSatelliteGlobe) with Esri World
 *   Imagery, Esri boundaries & places labels that appear country -> state -> district -> town
 *   as you zoom, and the active NASA GIBS WMTS layer overlaid with adjustable opacity.
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
  Fragment,
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
  TriangleAlert as AlertTriangle,
  Eye,
  EyeOff,
  Compass,
  Satellite,
  ChevronDown,
  ChevronUp,
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
import {
  MapLayerSwitcher,
  type BasemapStyle,
  type SubOptionId,
} from "@/components/map/MapLayerSwitcher";
import { LayerInfoModal } from "@/components/hud/LayerInfoModal";
import { DynamicColorScaleBar } from "@/components/hud/DynamicColorScaleBar";
import { MeteorologicalCanvasOverlay } from "@/components/hud/MeteorologicalCanvasOverlay";
import {
  fetchMeteorologicalForecast,
  generateDeterministicForecast,
  type MeteorologicalForecast,
} from "@/services/meteorologicalService";
import { useLanguage } from "@/context/LanguageContext";
import type {
  OrbitalGlobeApi,
  OrbitalGlobeMarker,
  OrbitalSatelliteGlobeProps,
} from "@/components/globe/OrbitalSatelliteGlobe";
import {
  GLOBE_DEFAULT_ZOOM,
  GLOBE_FLY_TO_MIN_ZOOM,
  GLOBE_MAX_ZOOM,
  GLOBE_MIN_ZOOM,
  altitudeKmForZoom,
  clampGlobeZoom,
  orbitalStageForZoom,
} from "@/lib/orbitalZoom";
import type { ZoomEarthLayerId } from "@/types/zoomEarthLayers";

export { GIBS_LAYER_CONFIG, SATELLITE_LAYERS_CONFIG };
export const TELEMETRY_TABS = MAP_LAYERS;

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
  invalidateSize?: (options?: boolean | { animate?: boolean; pan?: boolean }) => void;
}

/**
 * A Leaflet map stays referenced after its <MapContainer> unmounts (e.g. switching to 3D).
 * Calling invalidateSize/flyTo on that removed map reads `_leaflet_pos` of a deleted pane
 * and throws, blanking the page. Only touch maps whose panes and container still exist.
 */
function isLeafletMapAlive(map: LeafletMapInstance | null | undefined): map is LeafletMapInstance {
  if (!map) return false;
  const internal = map as unknown as {
    _mapPane?: HTMLElement;
    _container?: HTMLElement;
    _loaded?: boolean;
  };
  return Boolean(internal._mapPane && internal._loaded && internal._container?.isConnected);
}

function safeInvalidateSize(map: LeafletMapInstance | null | undefined) {
  if (!isLeafletMapAlive(map) || typeof map.invalidateSize !== "function") return;
  try {
    map.invalidateSize({ animate: false });
  } catch {
    // map was torn down between the check and the call
  }
}

interface LeafletBundle {
  MapContainer: ComponentType<{
    center: [number, number];
    zoom: number;
    minZoom?: number;
    maxZoom?: number;
    attributionControl?: boolean;
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
      className?: string;
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

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.warn(
      "3D WebGL Globe failed to render, auto-reverting to 2D GIS map:",
      error,
      errorInfo,
    );
    this.props.onFailure?.();
  }

  override render(): ReactNode {
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

interface GlobeHtmlMarkerItem {
  id: string;
  lat: number;
  lng: number;
  priority: number;
  html: string;
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
  onInteraction?: () => void;
}

export function GlobeViewport({
  telemetry,
  activeLayer,
  onLayer,
  opacity,
  onOpacity,
  onPick,
  initialBasemapStyle,
  onInteraction,
}: GlobeViewportProps) {
  const { lat, lon } = telemetry.input;
  const { meta, hazards } = telemetry;
  const reading = telemetry.layers[activeLayer];

  const activeSatelliteConfig: SatelliteLayerMeta =
    SATELLITE_LAYERS_CONFIG[activeLayer] || SATELLITE_LAYERS_CONFIG.NDVI;

  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [mounted, setMounted] = useState(false);
  const [webGLSupported, setWebGLSupported] = useState(false);
  const [globeModule, setGlobeModule] = useState<ComponentType<OrbitalSatelliteGlobeProps> | null>(
    null,
  );
  const [leafletModule, setLeafletModule] = useState<LeafletBundle | null>(null);
  const [hover, setHover] = useState<{ lat: number; lon: number } | null>(null);

  // HUD Card Minimization States (Adaptive default based on screen width)
  const [isReticleMinimized, setIsReticleMinimized] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 1440;
    }
    return false;
  });
  const [isDockMinimized, setIsDockMinimized] = useState(false);
  // Radar Lock: keeps the camera tracking the selected target coordinates
  const [isRadarLocked, setIsRadarLocked] = useState(true);
  // Phone-only: the hazard legend collapses into a single chip so the bottom stage stays compact
  const [isHazardFilterOpen, setIsHazardFilterOpen] = useState(false);
  const { t } = useLanguage();

  // Keyboard shortcut listener for 'L' (Toggle Telemetry Dock)
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === "l" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsDockMinimized((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Basemap & Layer Switcher State (Zoom Earth Meteorological Modes)
  const [basemapStyle, setBasemapStyle] = useState<BasemapStyle>(
    initialBasemapStyle || "satellite",
  );
  const [basemapSubOption, setBasemapSubOption] = useState<SubOptionId>("satellite_live");
  const [showLabels, setShowLabels] = useState(true);
  const [enable3dTerrain, setEnable3dTerrain] = useState(true);

  // Center Layer Info Modal
  const [showLayerInfoModal, setShowLayerInfoModal] = useState(false);
  const [infoModalLayerId, setInfoModalLayerId] = useState<ZoomEarthLayerId | null>(null);
  const seenLayersRef = useRef<Set<string>>(new Set(["satellite"]));

  // Live Open-Meteo Weather & 4-Day Forecast
  const [weatherForecast, setWeatherForecast] = useState<MeteorologicalForecast>(() =>
    generateDeterministicForecast(lat, lon),
  );

  useEffect(() => {
    let active = true;
    fetchMeteorologicalForecast(lat, lon).then((data) => {
      if (active) setWeatherForecast(data);
    });
    return () => {
      active = false;
    };
  }, [lat, lon]);

  const handleBasemapStyleChange = useCallback((newStyle: BasemapStyle) => {
    setBasemapStyle(newStyle);
    const atmosphericModes = [
      "wind",
      "temperature",
      "humidity",
      "pressure",
      "precipitation",
      "radar",
    ];
    if (atmosphericModes.includes(newStyle) && !seenLayersRef.current.has(newStyle)) {
      seenLayersRef.current.add(newStyle);
      setInfoModalLayerId(newStyle as ZoomEarthLayerId);
      setShowLayerInfoModal(true);
    }
  }, []);

  // Zoom state: the 3D globe uses MapLibre zoom (1.5–19), the 2D map uses Leaflet zoom
  const [globeZoom, setGlobeZoom] = useState(GLOBE_DEFAULT_ZOOM);
  const [gisZoom, setGisZoom] = useState(12);
  const globeZoomRef = useRef(GLOBE_DEFAULT_ZOOM);
  const handleGlobeZoom = useCallback((z: number) => {
    globeZoomRef.current = z;
    setGlobeZoom(z);
  }, []);

  // 2D Hazard layers visibility & filter
  const [hazardsVisible, setHazardsVisible] = useState(true);
  const [hazardFilter, setHazardFilter] = useState<
    "all" | "fire" | "wind" | "cyclone" | "earthquake" | "flood"
  >("all");

  const globeApiRef = useRef<OrbitalGlobeApi | null>(null);
  const leafletMapRef = useRef<LeafletMapInstance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 500 });
  const lastGlobeClickRef = useRef<{ time: number; lat: number; lon: number }>({
    time: 0,
    lat: 0,
    lon: 0,
  });

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

    // Load the MapLibre satellite globe only if WebGL is supported
    if (hasGL) {
      import("@/components/globe/OrbitalSatelliteGlobe")
        .then((gMod) => {
          if (!active) return;
          setGlobeModule(
            () =>
              gMod.OrbitalSatelliteGlobe as unknown as ComponentType<OrbitalSatelliteGlobeProps>,
          );
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

  // Canvas Auto-Resize Observer: recalculates Three.js and Leaflet immediately on window resize or dock expand/collapse
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = (w: number, h: number) => {
      const width = Math.max(300, Math.round(w) || 800);
      const height = Math.max(300, Math.round(h) || 500);
      setContainerDimensions({ width, height });

      // Recalibrate Leaflet map
      safeInvalidateSize(leafletMapRef.current);
    };

    if (containerRef.current.clientWidth && containerRef.current.clientHeight) {
      updateSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    }

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            updateSize(width, height);
          }
        }
      });
      ro.observe(containerRef.current);
    }

    const handleWindowResize = () => {
      if (containerRef.current) {
        updateSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    };
    window.addEventListener("resize", handleWindowResize);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [mounted, viewMode]);

  // Target Locked Reticle Banner State (Cinematic Fly-in)
  const [targetLockedBanner, setTargetLockedBanner] = useState<{
    lat: number;
    lon: number;
    visible: boolean;
  }>({ lat, lon, visible: false });

  const prevCoordsRef = useRef<{ lat: number; lon: number }>({ lat, lon });
  // Show the target-locked banner when coords change (the globe flies there itself)
  useEffect(() => {
    const dLat = Math.abs(prevCoordsRef.current.lat - lat);
    const dLon = Math.abs(prevCoordsRef.current.lon - lon);
    const coordsChanged = dLat > 0.005 || dLon > 0.005;

    if (coordsChanged) {
      prevCoordsRef.current = { lat, lon };
      setTargetLockedBanner({ lat, lon, visible: true });

      const timer = setTimeout(() => {
        setTargetLockedBanner((prev) => ({ ...prev, visible: false }));
      }, 2000);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [lat, lon]);

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

  // HTML target reticle + hazard markers (place names come from the Esri label tiles)
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

    if (hazardsVisible) {
      for (const h of hazards) {
        if (hazardFilter !== "all" && h.type !== hazardFilter) continue;
        if (h.type === "cyclone") {
          list.push({
            id: `hazard-${h.id || "cyclone"}`,
            lat: lat + 3.2,
            lng: lon + 4.5,
            priority: 1,
            html: renderCyclone3DMarker(`CYCLONE TRACK • ${h.metric || "115 km/h"}`),
          });
        } else if (h.type === "fire-smoke") {
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
    }

    return list;
  }, [lat, lon, activeLayer, reading, meta.regionLabel, hazards, hazardsVisible, hazardFilter]);
  // Target reticle + hazard markers drawn on the 3D satellite globe
  const globeMarkers = useMemo<OrbitalGlobeMarker[]>(
    () => dynamicGlobeHtmlMarkers.map((m) => ({ id: m.id, lat: m.lat, lng: m.lng, html: m.html })),
    [dynamicGlobeHtmlMarkers],
  );

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

  // Shared zoom level for the slider: MapLibre globe zoom in 3D, Leaflet zoom in 2D
  const currentZoomLevel = viewMode === "3d" ? globeZoom : gisZoom;

  const lastAutoTransitionRef = useRef(0);

  const handleGlobeReady = useCallback((api: OrbitalGlobeApi | null) => {
    globeApiRef.current = api;
  }, []);

  const handleGlobeFailure = useCallback(() => {
    setViewMode("2d");
  }, []);

  // Explicit view switchers: the globe keeps its last zoom, 2D inherits a field-level zoom
  const handleSwitchTo3D = useCallback(() => {
    if (!webGLSupported) return;
    setViewMode("3d");
  }, [webGLSupported]);

  const handleSwitchTo2D = useCallback(() => {
    const z = globeApiRef.current?.getZoom() ?? globeZoomRef.current;
    if (z >= 5) setGisZoom(Math.max(3, Math.min(18, Math.round(z))));
    setViewMode("2d");
  }, []);

  // 2D map zoomed all the way out hands off to the orbital globe
  const handleAutoTransitionTo3D = useCallback(() => {
    const now = Date.now();
    if (now - lastAutoTransitionRef.current < 400) return;
    lastAutoTransitionRef.current = now;
    if (!webGLSupported) return;
    handleGlobeZoom(GLOBE_DEFAULT_ZOOM);
    setViewMode("3d");
    toast.info("Entering 3D Orbital Overview", {
      description: "Zoomed out to the global view. Switched to the 3D satellite globe.",
    });
  }, [webGLSupported, handleGlobeZoom]);

  const handleZoomIn = useCallback(() => {
    if (viewMode === "3d") {
      globeApiRef.current?.zoomIn();
    } else {
      leafletMapRef.current?.zoomIn?.(1, { animate: true });
    }
  }, [viewMode]);

  const handleZoomOut = useCallback(() => {
    if (viewMode === "3d") {
      globeApiRef.current?.zoomOut();
      return;
    }
    const curZ = leafletMapRef.current?.getZoom?.() ?? gisZoom;
    if (curZ <= 2) {
      handleAutoTransitionTo3D();
    } else {
      leafletMapRef.current?.zoomOut?.(1, { animate: true });
    }
  }, [viewMode, gisZoom, handleAutoTransitionTo3D]);

  const handleSliderChange = useCallback(
    (newZoom: number) => {
      if (viewMode === "3d") {
        const z = clampGlobeZoom(newZoom);
        globeApiRef.current?.zoomTo(z);
        handleGlobeZoom(z);
        return;
      }
      if (newZoom <= 2) {
        handleAutoTransitionTo3D();
        return;
      }
      leafletMapRef.current?.setZoom?.(newZoom, { animate: true });
      setGisZoom(newZoom);
    },
    [viewMode, handleAutoTransitionTo3D, handleGlobeZoom],
  );

  // Keyboard Shortcuts: +, -, R (reset), 0 (full orbit)
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      const activeEl = document.activeElement;
      const tag = activeEl?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (activeEl as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        if (viewMode === "3d") {
          globeApiRef.current?.flyTo(lat, lon, GLOBE_FLY_TO_MIN_ZOOM);
          toast.info("Target camera reset");
        } else {
          leafletMapRef.current?.flyTo?.([lat, lon], 13, { animate: true, duration: 0.8 });
        }
      } else if (e.key === "0") {
        e.preventDefault();
        handleFullOrbit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleZoomIn, handleZoomOut, viewMode, lat, lon]);

  // Quick Action: Target Farm (Z:15)
  const handleTargetFarm = () => {
    if (viewMode === "3d") {
      globeApiRef.current?.flyTo(lat, lon, 15);
    } else {
      leafletMapRef.current?.flyTo?.([lat, lon], 15, { animate: true, duration: 1.2 });
      setGisZoom(15);
    }
  };

  // Quick Action: Full Orbit
  const handleFullOrbit = () => {
    if (viewMode === "3d") {
      globeApiRef.current?.flyTo(lat, lon, GLOBE_DEFAULT_ZOOM);
    } else {
      handleAutoTransitionTo3D();
    }
  };

  // Radar Lock toggle: engaged = camera tracks the target coordinates, released = free pan/orbit
  const handleToggleRadarLock = useCallback(() => {
    setIsRadarLocked((prev) => {
      const next = !prev;
      if (next) {
        // Re-acquire the target immediately on both engines
        const zoom = globeApiRef.current?.getZoom() ?? globeZoomRef.current;
        globeApiRef.current?.flyTo(lat, lon, zoom);
        leafletMapRef.current?.flyTo?.([lat, lon], leafletMapRef.current?.getZoom?.() ?? gisZoom, {
          animate: true,
          duration: 1,
        });
        toast.info("Radar Lock engaged", {
          description: "Camera tracking the selected target coordinates.",
        });
      } else {
        toast.info("Radar Lock released", {
          description: "Free pan and orbit mode enabled.",
        });
      }
      return next;
    });
  }, [lat, lon, gisZoom]);

  // Telemetry layer click: the NASA GIBS overlay is drawn on whichever view is active
  const handleSelectTelemetryLayer = useCallback(
    (layerKey: MapLayer) => {
      onLayer(layerKey);
    },
    [onLayer],
  );

  // 4-Stage Zoom HUD Status Information
  const zoomStageInfo = useMemo(() => {
    if (viewMode === "3d") {
      const s = orbitalStageForZoom(globeZoom);
      const tone =
        s.id === "orbital"
          ? { color: "#38BDF8", badgeColor: "bg-sky-500/20 text-sky-300 border-sky-400/40" }
          : s.id === "continental"
            ? { color: "#06B6D4", badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-400/40" }
            : s.id === "regional"
              ? { color: "#22D3EE", badgeColor: "bg-cyan-500/20 text-cyan-200 border-cyan-300/40" }
              : {
                  color: "#10B981",
                  badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
                };
      return {
        stage: s.stage,
        label: s.label,
        detail: `ALT: ${altitudeKmForZoom(globeZoom).toLocaleString()} km`,
        ...tone,
      };
    }
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
  }, [viewMode, globeZoom, gisZoom]);

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
      onPointerDown={() => onInteraction?.()}
      className="relative mx-auto w-full max-w-[1920px] h-[calc(100dvh-4.25rem)] min-h-[500px] max-h-[820px] rounded-2xl border border-white/[0.08] bg-[#03060d] overflow-hidden select-none shadow-[0_24px_60px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.18)] mb-4"
    >
      {/* Ambient Radiant Orbital Glows (Google Stitch) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-cyan-500/10 blur-[120px] z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-emerald-500/10 blur-[130px] z-10"
      />

      {/* Aerospace Tactical Corner Frame Ticks & Animated Sci-Fi Reticle */}
      <div className="pointer-events-none absolute inset-0 z-10 border border-cyan/25">
        <span className="absolute top-2 left-2 size-3 border-t-2 border-l-2 border-cyan-400" />
        <span className="absolute top-2 right-2 size-3 border-t-2 border-r-2 border-cyan-400" />
        <span className="absolute bottom-2 left-2 size-3 border-b-2 border-l-2 border-cyan-400" />
        <span className="absolute bottom-2 right-2 size-3 border-b-2 border-r-2 border-cyan-400" />

        {/* Center Sci-Fi Orbital Targeting Reticle (glows + pulses while Radar Lock is engaged) */}
        <div
          data-hud-overlay="reticle"
          data-radar-lock={isRadarLocked ? "engaged" : "idle"}
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center select-none transition-all duration-500",
            isRadarLocked ? "size-40 opacity-100" : "size-24 opacity-80",
          )}
        >
          {/* Radar Lock: sweeping beam + pulsing sonar rings */}
          {isRadarLocked && (
            <>
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div className="hud-radar-sweep absolute inset-0 rounded-full" />
              </div>
              <span className="absolute inset-0 rounded-full border border-cyan-400/40 animate-sonar-ripple" />
              <span className="absolute inset-4 rounded-full border border-cyan-300/30 animate-sonar-ripple [animation-delay:900ms]" />
              <span className="absolute inset-0 rounded-full border border-cyan-400/60 shadow-[0_0_28px_rgba(34,211,238,0.55),inset_0_0_18px_rgba(34,211,238,0.35)] animate-radar-pulse" />
            </>
          )}
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
      {/* ---------------- 3D ORBITAL SATELLITE GLOBE (MAPLIBRE GLOBE + ESRI IMAGERY + NASA GIBS) ---------------- */}
      {viewMode === "3d" && GlobeComponent && mounted && webGLSupported ? (
        <SafeGlobeErrorBoundary
          fallback={graticuleGridFallback}
          onFailure={() => setViewMode("2d")}
        >
          <div className="absolute inset-0">
            {/* Deep-space starfield behind the transparent globe canvas */}
            <div className="cosmic-starfield-canvas">
              <div className="cosmic-stars-1" />
              <div className="cosmic-stars-2" />
              <div className="cosmic-stars-3" />
            </div>
            <GlobeComponent
              lat={lat}
              lon={lon}
              initialZoom={globeZoomRef.current}
              basemapStyle={basemapStyle}
              showLabels={showLabels}
              overlayUrl={gibsTileUrl}
              overlayMaxZoom={activeSatelliteConfig.maxZoom}
              overlayOpacity={opacity / 100}
              markers={globeMarkers}
              lockToTarget={isRadarLocked}
              onPick={onPick}
              onZoom={handleGlobeZoom}
              onReady={handleGlobeReady}
              onFailure={handleGlobeFailure}
            />
          </div>
        </SafeGlobeErrorBoundary>
      ) : null}

      {/* ---------------- TARGET LOCKED RETICLE BANNER OVERLAY ---------------- */}
      {targetLockedBanner.visible && (
        <div className="pointer-events-none absolute top-12 left-1/2 z-30 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-2 overflow-hidden rounded-full border border-cyan-400/60 bg-slate-950/90 px-4 py-1 backdrop-blur-xl shadow-[0_0_25px_rgba(34,211,238,0.45)] text-xs font-mono animate-in fade-in zoom-in-95 duration-200">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-80" />
            <span className="relative inline-flex rounded-full size-2 bg-cyan-400" />
          </span>
          <span className="truncate font-bold text-cyan-300 tracking-wider">
            [ TARGET LOCKED: {Math.abs(targetLockedBanner.lat).toFixed(4)}°{" "}
            {targetLockedBanner.lat >= 0 ? "N" : "S"}, {Math.abs(targetLockedBanner.lon).toFixed(4)}
            ° {targetLockedBanner.lon >= 0 ? "E" : "W"} ]
          </span>
        </div>
      )}

      {/* ---------------- 2D FIELD GIS MODE (LEAFLET + NASA GIBS + HAZARDS) ---------------- */}
      {viewMode === "2d" && LeafletComp && mounted ? (
        <div className="absolute inset-0 z-0 w-full h-full rounded-2xl overflow-hidden">
          <LeafletComp.MapContainer
            center={[lat, lon]}
            zoom={gisZoom}
            minZoom={2}
            maxZoom={18}
            scrollWheelZoom={true}
            attributionControl={false}
            style={{ width: "100%", height: "100%", background: "#050811" }}
          >
            {/* Dynamic Basemap Tile Layer (Instant In-Place Swap via React Key) */}
            <LeafletComp.TileLayer
              key={`2d-base-${basemapStyle}`}
              url={
                basemapStyle === "dark" ||
                basemapStyle === "wind" ||
                basemapStyle === "humidity" ||
                basemapStyle === "temperature" ||
                basemapStyle === "precipitation" ||
                basemapStyle === "radar"
                  ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                  : basemapStyle === "pressure"
                    ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
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

            {/* Live Radar Reflectivity Layer in 2D */}
            {basemapStyle === "radar" && (
              <LeafletComp.TileLayer
                key="2d-radar-reflectivity"
                url="https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GPM_3IMERGM_Precipitation/default/default/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png"
                maxZoom={12}
                zIndex={12}
                opacity={0.8}
              />
            )}

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
              key={`2d-nasa-overlay-${activeLayer}`}
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
              <Fragment key={hazard.id}>
                {/* Geodesic Impact Radius Circle */}
                {hazard.radiusM && (
                  <LeafletComp.Circle
                    center={[hazard.lat, hazard.lon]}
                    radius={hazard.radiusM}
                    pathOptions={{
                      color: hazard.color,
                      fillColor: hazard.color,
                      fillOpacity: 0.12,
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
                        <div style="position:relative; width:36px; height:36px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                          <span style="position:absolute; inset:0; border-radius:50%; border:2px dashed ${hazard.color}; opacity:0.85; animation:spin 8s linear infinite;"></span>
                          <span style="position:absolute; inset:3px; border-radius:50%; background:${hazard.color}25; border:1.5px solid ${hazard.color}; animation:ping 2.5s cubic-bezier(0,0,0.2,1) infinite;"></span>
                          <span style="position:relative; width:26px; height:26px; border-radius:50%; background:#090D16; border:2px solid ${hazard.color}; display:flex; align-items:center; justify-content:center; box-shadow:0 0 14px ${hazard.color}; font-size:14px;">
                            ${
                              hazard.type === "cyclone"
                                ? `🌀`
                                : hazard.type === "fire"
                                  ? `🔥`
                                  : hazard.type === "earthquake"
                                    ? `⚡`
                                    : hazard.type === "wind"
                                      ? `💨`
                                      : `🌊`
                            }
                          </span>
                        </div>
                      `,
                      iconSize: [36, 36],
                      iconAnchor: [18, 18],
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
              </Fragment>
            ))}

            {/* Map click listener & bridge */}
            <LeafletClickHandler onPick={onPick} useMapEvents={LeafletComp.useMapEvents} />
            <LeafletRecenter
              lat={lat}
              lon={lon}
              enabled={isRadarLocked}
              useMap={LeafletComp.useMap}
            />
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

      {/* ---------------- LIVE WEBGL / CANVAS METEOROLOGICAL OVERLAYS (WIND STREAMLINES, HEATMAPS, ISOBARS, RADAR) ---------------- */}
      <MeteorologicalCanvasOverlay
        activeLayer={basemapStyle as ZoomEarthLayerId}
        activeSubLayer={basemapSubOption}
        windStreamlinesActive={basemapStyle === "wind"}
        centerLat={lat}
        centerLon={lon}
        zoomLevel={viewMode === "3d" ? Math.round(globeZoom) : gisZoom}
        viewMode={viewMode}
      />

      {/* ---------------- TOP UNIFIED HUD CONTROL HEADER ROW (ZERO COLLISION FLEXBOX) ---------------- */}
      <div className="absolute inset-x-[var(--hud-inset)] top-[var(--hud-inset)] z-20 flex min-w-0 flex-nowrap items-start justify-between gap-2 pointer-events-none">
        {/* Left: TARGET RETICLE LOCK CARD */}
        <div
          data-hud-overlay="reticle"
          data-tour="reticle-lock"
          className={cn(
            "hud-card hud-surface max-w-[calc(100%-7.25rem)] backdrop-blur-xl bg-background/90 border border-cyan/40 shadow-[0_0_20px_rgba(0,0,0,0.7)] rounded-xl transition-all",
            isReticleMinimized
              ? "w-[min(10rem,42vw)] p-2 sm:w-52"
              : "w-[min(13rem,54vw)] p-2.5 sm:w-64 sm:p-3",
          )}
        >
          <div className="flex items-center gap-2 border-b border-cyan/20 pb-1.5">
            <Radar
              className="size-3.5 text-cyan animate-spin shrink-0"
              style={{ animationDuration: "8s" }}
            />
            <span className="hud-label font-bold text-cyan/90 text-[10px] truncate">
              {t("target_reticle_lock", "Target Reticle Lock")}
            </span>
            <span className="ml-auto size-2 rounded-full bg-emerald shadow-[0_0_8px_#00ff9d] animate-pulse shrink-0" />
            <button
              type="button"
              onClick={() => setIsReticleMinimized((prev) => !prev)}
              className="p-0.5 rounded text-white/50 hover:text-cyan hover:bg-white/10 cursor-pointer ml-1 shrink-0"
              title={isReticleMinimized ? "Expand Target Reticle" : "Minimize Target Reticle"}
            >
              {isReticleMinimized ? <Plus className="size-3" /> : <Minus className="size-3" />}
            </button>
          </div>
          {!isReticleMinimized ? (
            <>
              <div className="mt-2 grid grid-cols-2 gap-x-2.5 gap-y-1 font-mono text-[10.5px]">
                <span className="text-muted-foreground/80 font-medium">
                  {t("latitude", "LATITUDE")}
                </span>
                <span className="text-right tabular-nums text-cyan font-bold drop-shadow-[0_0_6px_#00f0ff]">
                  {formatCoord(lat, "lat")}
                </span>
                <span className="text-muted-foreground/80 font-medium">
                  {t("longitude", "LONGITUDE")}
                </span>
                <span className="text-right tabular-nums text-cyan font-bold drop-shadow-[0_0_6px_#00f0ff]">
                  {formatCoord(lon, "lon")}
                </span>
                <span className="text-muted-foreground/80 font-medium">
                  {t("elevation", "ELEVATION")}
                </span>
                <span className="text-right tabular-nums font-semibold">
                  {meta.elevationM} m ASL
                </span>
                <span className="text-muted-foreground/80 font-medium">
                  {t("satellite_pass", "PASS")}
                </span>
                <span className="text-right text-emerald font-semibold truncate">
                  {meta.satellitePass}
                </span>
                <span className="text-muted-foreground/80 font-medium">
                  {t("next_window", "NEXT WINDOW")}
                </span>
                <span className="text-right tabular-nums text-amber font-semibold">
                  T-{meta.nextPassMin} min
                </span>
              </div>

              {/* Integrated Sensor Metric Readout in Reticle Card (data-hud-overlay="layer-readout") */}
              <div
                data-hud-overlay="layer-readout"
                className="mt-2 pt-1.5 border-t border-cyan/20 flex min-w-0 items-center justify-between gap-2 text-xs font-mono"
              >
                <span className="truncate text-cyan font-bold">{activeLayer}</span>
                <div className="flex min-w-0 items-center justify-end gap-1.5">
                  <span
                    className="shrink-0 font-extrabold tabular-nums drop-shadow-[0_0_8px_currentColor]"
                    style={{ color: tone }}
                  >
                    {reading.value} {reading.unit}
                  </span>
                  <span className="hidden truncate text-[9px] text-muted-foreground font-mono sm:inline">
                    [{activeSatelliteConfig.sensorName}]
                  </span>
                </div>
              </div>

              {/* 4-Day Adaptive Meteorological Mini-Forecast Strip */}
              <div className="mt-2 pt-1.5 border-t border-cyan/20">
                <div className="flex items-center justify-between text-[8.5px] font-mono text-muted-foreground uppercase mb-1">
                  <span className="flex items-center gap-1 text-slate-300 font-semibold">
                    <span>📅</span> {t("forecast_4day", "4-Day Forecast")}
                  </span>
                  <span className="text-cyan font-bold">
                    {basemapStyle === "temperature"
                      ? "MIN / MAX °C"
                      : basemapStyle === "wind"
                        ? "MIN / GUSTS km/h"
                        : basemapStyle === "pressure"
                          ? "PRESSURE hPa"
                          : basemapStyle === "precipitation" || basemapStyle === "radar"
                            ? "RAIN mm"
                            : basemapStyle === "humidity"
                              ? "RH %"
                              : "TEMP °C"}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-center font-mono">
                  {(weatherForecast?.daily || []).map((day) => {
                    let displayVal = `${Math.round(day.tempMin)}/${Math.round(day.tempMax)}°`;
                    if (basemapStyle === "temperature") {
                      displayVal = `${Math.round(day.tempMin)}/${Math.round(day.tempMax)}°`;
                    } else if (basemapStyle === "wind") {
                      displayVal = `${Math.round(day.windSpeedMax)}/${Math.round(day.windGustsMax)}k`;
                    } else if (basemapStyle === "pressure") {
                      displayVal = `${day.pressure}`;
                    } else if (basemapStyle === "precipitation" || basemapStyle === "radar") {
                      displayVal = `${day.precipitationSum}mm`;
                    } else if (basemapStyle === "humidity") {
                      displayVal = `${Math.round(weatherForecast?.current?.relativeHumidity ?? 50)}%`;
                    }

                    return (
                      <div
                        key={day.date}
                        className="bg-black/40 rounded px-1 py-0.5 border border-cyan-500/20"
                      >
                        <div className="text-[8px] text-slate-400 font-semibold">{day.label}</div>
                        <div className="text-[9px] text-cyan-300 font-bold tracking-tight">
                          {displayVal}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div
              data-hud-overlay="layer-readout"
              className="mt-1 pt-1 flex min-w-0 items-center justify-between gap-2 text-[11px] font-mono"
            >
              <span className="truncate text-cyan font-semibold">
                {lat.toFixed(2)}°, {lon.toFixed(2)}°
              </span>
              <span className="shrink-0 font-bold text-emerald-400">
                {reading.value} {reading.unit}
              </span>
            </div>
          )}
        </div>

        {/* Center: STAGE 1 ORBITAL VIEW PILL */}
        <div
          data-hud-overlay="zoom-stage-pill"
          className="hud-surface hidden shrink-0 items-center gap-2 rounded-full border border-cyan-500/40 bg-[#090D16]/90 px-3.5 py-1.5 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.8),0_0_12px_rgba(6,182,212,0.25)] text-xs font-mono select-none whitespace-nowrap transition-all duration-300 lg:flex"
        >
          <span
            className="size-2 rounded-full animate-pulse shrink-0"
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

        {/* Right: 3D ORBITAL | 2D FIELD GIS TOGGLE */}
        <div
          data-tour="view-toggle-dock"
          className="hud-surface flex max-w-full shrink-0 flex-wrap items-center justify-end gap-1 rounded-lg border border-cyan/50 bg-background/90 p-1 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.7)]"
        >
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
              "h-11 min-w-11 justify-center px-2 font-mono text-xs transition-all sm:h-7 sm:min-w-0 sm:px-3",
              viewMode === "3d"
                ? "bg-cyan/20 text-cyan border border-cyan/60 font-bold shadow-[0_0_12px_rgba(0,240,255,0.35)]"
                : "text-muted-foreground hover:text-foreground",
              !webGLSupported && "opacity-50 cursor-not-allowed",
            )}
            aria-label="3D Orbital View"
            onClick={handleSwitchTo3D}
          >
            <GlobeIcon className="mr-1.5 size-3.5 text-cyan drop-shadow-[0_0_6px_#00f0ff]" />{" "}
            <span className="hidden md:inline">{t("view_3d_orbital", "3D Orbital")}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "h-11 min-w-11 justify-center px-2 font-mono text-xs transition-all sm:h-7 sm:min-w-0 sm:px-3",
              viewMode === "2d"
                ? "bg-cyan/20 text-cyan border border-cyan/60 font-bold shadow-[0_0_12px_rgba(0,240,255,0.35)]"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="2D Field GIS View"
            onClick={handleSwitchTo2D}
          >
            <MapIcon className="mr-1.5 size-3.5 text-cyan drop-shadow-[0_0_6px_#00f0ff]" />{" "}
            <span className="hidden md:inline">{t("view_2d_field_gis", "2D Field GIS")}</span>
          </Button>
        </div>
      </div>

      {/* ---------------- FLOATING TACTICAL HUD ZOOM CONTROL BAR (RIGHT-DOCKED & VERTICALLY CENTERED) ---------------- */}
      <div
        data-hud-overlay="zoom-controls"
        className="hud-surface absolute right-[var(--hud-inset)] top-1/2 z-30 flex w-auto max-w-[calc(100%-1rem)] -translate-y-1/2 flex-col items-center gap-1 rounded-xl border border-cyan-500/40 bg-[#0D1322]/90 p-1.5 py-2 backdrop-blur-md shadow-2xl select-none hud-scroll-area no-scrollbar max-h-[calc(100%-18rem)] sm:max-h-[calc(100%-9.5rem)]"
      >
        {/* Live Altitude / Zoom Readout Badge directly above the + button */}
        <div
          className="hidden rounded border border-cyan-500/40 bg-black/80 px-1.5 py-0.5 font-mono text-[8.5px] font-bold text-cyan-300 tabular-nums text-center whitespace-nowrap shadow-[0_0_8px_rgba(6,182,212,0.3)] mb-0.5 sm:block"
          title={
            viewMode === "3d"
              ? `Orbital Altitude: ${altitudeKmForZoom(globeZoom).toLocaleString()} km`
              : `Field Resolution: Zoom ${gisZoom}x`
          }
        >
          {viewMode === "3d"
            ? `ALT: ${altitudeKmForZoom(globeZoom).toLocaleString()} km`
            : `Zoom: ${gisZoom}x`}
        </div>

        {/* Zoom In Button */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleZoomIn}
          title="Zoom In (+)"
          aria-label="Zoom In"
          className="size-11 sm:size-7 rounded-lg text-cyan hover:bg-cyan-500/20 hover:text-cyan-300 cursor-pointer"
        >
          <Plus className="size-3.5" />
        </Button>

        {/* Vertical Range Slider */}
        <div className="relative py-1 flex flex-col items-center">
          <input
            type="range"
            min={viewMode === "3d" ? GLOBE_MIN_ZOOM : 1}
            max={viewMode === "3d" ? GLOBE_MAX_ZOOM : 18}
            step={viewMode === "3d" ? 0.1 : 1}
            value={currentZoomLevel}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            aria-label="Zoom Level Slider"
            className="h-16 sm:h-20 w-2 cursor-pointer appearance-none rounded-full bg-slate-800 accent-cyan [writing-mode:vertical-lr] [direction:rtl]"
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
          className="size-11 sm:size-7 rounded-lg text-cyan hover:bg-cyan-500/20 hover:text-cyan-300 cursor-pointer"
        >
          <Minus className="size-3.5" />
        </Button>

        {/* Live Readout Badge */}
        <div
          className="hidden w-full rounded border border-cyan-500/30 bg-black/60 px-1 py-0.5 font-mono text-[8px] text-cyan tabular-nums text-center sm:block"
          title={
            viewMode === "3d"
              ? `Orbital Altitude: ${altitudeKmForZoom(globeZoom).toLocaleString()} km`
              : `Field Resolution: Zoom ${gisZoom}`
          }
        >
          Z:{viewMode === "3d" ? globeZoom.toFixed(2) : currentZoomLevel}
        </div>

        <div className="my-0.5 hidden h-px w-full bg-cyan-500/30 sm:block" />

        {/* Quick Action: Target Farm (Z:15) */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleTargetFarm}
          title="Target Farm (Z:15)"
          aria-label="Target Farm"
          className="hidden size-11 rounded-lg text-emerald hover:bg-emerald-500/20 hover:text-emerald-300 cursor-pointer sm:inline-flex sm:size-7"
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
          className="hidden size-11 rounded-lg text-cyan hover:bg-cyan-500/20 hover:text-cyan-300 cursor-pointer sm:inline-flex sm:size-7"
        >
          <Compass className="size-3.5" />
        </Button>
      </div>

      {/* ---------------- BOTTOM HUD STAGE (SINGLE NON-OVERLAPPING VERTICAL STACK) ----------------
          Hazard pills, telemetry dock, basemap switcher and color scale live in one flex column, so
          no two HUD rows can collide between 320px phones and 4K monitors. The stage stays
          pointer-events-none: wheel/drag gestures between panels fall through to the map canvas;
          each interactive child opts back in via .hud-surface (pointer-events-auto). */}
      <div className="hud-stage" onPointerDown={(e) => e.stopPropagation()}>
        {/* Row 1: hazard legend & filters — collapses to a single chip on phones */}
        <div className="order-1 flex w-full min-w-0 flex-wrap items-center gap-[var(--hud-gap)] sm:relative">
          <button
            type="button"
            onClick={() => setIsHazardFilterOpen((v) => !v)}
            aria-expanded={isHazardFilterOpen}
            aria-controls="hazard-filter-bar"
            className="hud-surface flex h-11 min-w-0 max-w-full shrink-0 items-center gap-1.5 rounded-full border border-amber-500/40 bg-[#0D1322]/95 px-3 font-mono text-[10px] font-bold text-amber-300 shadow-2xl backdrop-blur-md sm:hidden"
          >
            <AlertTriangle className="size-3.5 shrink-0 text-amber-400" />
            <span className="truncate">Hazards: {hazardsVisible ? "ON" : "OFF"}</span>
            {isHazardFilterOpen ? (
              <ChevronDown className="size-3.5 shrink-0 text-slate-400" />
            ) : (
              <ChevronUp className="size-3.5 shrink-0 text-slate-400" />
            )}
          </button>

          <div
            id="hazard-filter-bar"
            data-hud-overlay="hazard-filter"
            className={cn(
              // Phones: floats above the stage as a bottom sheet so the stage height never grows
              // and the zoom dock can never collide with it. Tablet and up: normal flow row.
              "hud-surface hud-scroll-area absolute bottom-full left-0 z-10 mb-1 w-full max-w-full flex-wrap items-center gap-1.5 rounded-xl border border-amber-500/40 bg-[#0D1322]/95 px-3 py-1.5 text-xs font-mono shadow-2xl backdrop-blur-md max-h-[min(9rem,40vh)] sm:static sm:z-auto sm:mb-0 sm:w-auto sm:max-h-24",
              isHazardFilterOpen ? "flex" : "hidden sm:flex",
            )}
          >
            <div className="flex items-center gap-1.5 pr-1 border-r border-cyan-500/30">
              <AlertTriangle className="size-3.5 text-amber-400 shrink-0 animate-pulse" />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setHazardsVisible((v) => !v)}
                className={cn(
                  "h-6 px-1.5 text-[10px] font-mono font-bold transition-all",
                  hazardsVisible
                    ? "text-amber-300 bg-amber-500/10"
                    : "text-muted-foreground opacity-60",
                )}
                title="Toggle Hazard Overlays"
              >
                {hazardsVisible ? (
                  <Eye className="size-3 mr-1 text-amber-400" />
                ) : (
                  <EyeOff className="size-3 mr-1" />
                )}
                Hazards: {hazardsVisible ? "ON" : "OFF"}
              </Button>
            </div>

            {hazardsVisible && (
              <>
                <button
                  type="button"
                  onClick={() => setHazardFilter("all")}
                  className={cn(
                    "rounded px-2 py-0.5 text-[10px] transition-all",
                    hazardFilter === "all"
                      ? "bg-cyan/25 text-cyan font-bold border border-cyan/40"
                      : "text-muted-foreground hover:text-slate-200",
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setHazardFilter("fire")}
                  className={cn(
                    "rounded px-2 py-0.5 text-[10px] transition-all",
                    hazardFilter === "fire"
                      ? "bg-amber/25 text-amber font-bold border border-amber/40"
                      : "text-muted-foreground hover:text-slate-200",
                  )}
                >
                  🔥 Fires
                </button>
                <button
                  type="button"
                  onClick={() => setHazardFilter("wind")}
                  className={cn(
                    "rounded px-2 py-0.5 text-[10px] transition-all",
                    hazardFilter === "wind"
                      ? "bg-amber/25 text-amber font-bold border border-amber/40"
                      : "text-muted-foreground hover:text-slate-200",
                  )}
                >
                  💨 Wind
                </button>
                <button
                  type="button"
                  onClick={() => setHazardFilter("cyclone")}
                  className={cn(
                    "rounded px-2 py-0.5 text-[10px] transition-all",
                    hazardFilter === "cyclone"
                      ? "bg-crimson/25 text-crimson font-bold border border-crimson/40"
                      : "text-muted-foreground hover:text-slate-200",
                  )}
                >
                  🌀 Storms
                </button>
                <button
                  type="button"
                  onClick={() => setHazardFilter("earthquake")}
                  className={cn(
                    "rounded px-2 py-0.5 text-[10px] transition-all",
                    hazardFilter === "earthquake"
                      ? "bg-emerald/25 text-emerald font-bold border border-emerald/40"
                      : "text-muted-foreground hover:text-slate-200",
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
                  className="h-6 px-2 text-[10px] text-cyan hover:bg-cyan-500/20 font-mono"
                  title="Fit viewport to encompass all active hazards"
                >
                  🎯 Fit All Hazards
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Row 3 (bottom edge): basemap switcher + meteorological color scale */}
        <div className="order-3 flex w-full min-w-0 flex-wrap items-end justify-between gap-[var(--hud-gap)]">
          <div data-tour="basemap-switcher" className="hud-surface min-w-0 max-w-full">
            <MapLayerSwitcher
              currentStyle={basemapStyle}
              onStyleChange={handleBasemapStyleChange}
              activeSubOption={basemapSubOption}
              onSubOptionChange={setBasemapSubOption}
              onOpenInfoModal={(style) => {
                setInfoModalLayerId(style as ZoomEarthLayerId);
                setShowLayerInfoModal(true);
              }}
              showLabels={showLabels}
              onToggleLabels={setShowLabels}
              enable3dTerrain={enable3dTerrain}
              onToggle3dTerrain={setEnable3dTerrain}
              viewMode={viewMode}
            />
          </div>

          {/* Dynamic color scale strip (adapts to the active meteorological basemap) */}
          {(basemapStyle === "wind" ||
            basemapStyle === "temperature" ||
            basemapStyle === "humidity" ||
            basemapStyle === "pressure" ||
            basemapStyle === "precipitation" ||
            basemapStyle === "radar") && (
            <DynamicColorScaleBar
              activeLayer={basemapStyle as ZoomEarthLayerId}
              activeSubLayer={basemapSubOption}
              hoverValue={
                basemapStyle === "wind"
                  ? weatherForecast?.current?.windSpeed
                  : basemapStyle === "temperature"
                    ? weatherForecast?.current?.temperature
                    : basemapStyle === "humidity"
                      ? basemapSubOption === "hum_wetbulb"
                        ? weatherForecast?.current?.wetBulb
                        : weatherForecast?.current?.relativeHumidity
                      : basemapStyle === "pressure"
                        ? weatherForecast?.current?.pressure
                        : weatherForecast?.current?.precipitation
              }
              className="hud-surface min-w-0 max-w-full"
            />
          )}
        </div>

        {/* Row 2 (above the bottom edge): unified 2-tier telemetry dock, centered */}
        <div
          data-hud-overlay="layer-switcher"
          data-tour="nasa-telemetry-dock"
          className="hud-surface order-2 flex w-auto min-w-0 max-w-full shrink-0 flex-col items-center gap-1.5 self-center select-none"
        >
          {/* Minimized Compact Floating Capsule Pill */}
          {isDockMinimized && (
            <button
              type="button"
              onClick={() => setIsDockMinimized(false)}
              className="pointer-events-auto h-8 px-3.5 rounded-full bg-[#0D1322]/95 backdrop-blur-2xl border border-cyan-500/40 text-cyan-200 font-mono text-xs flex items-center gap-2 shadow-[0_8px_25px_rgba(0,0,0,0.85)] hover:border-cyan-400 hover:bg-[#0f172a] transition-all cursor-pointer animate-in fade-in zoom-in-95 duration-200"
              title="Open Orbital Layers Dock (L)"
            >
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
              <span className="font-semibold text-white">
                {activeLayer}: {reading.value} {reading.unit}
              </span>
              {isRadarLocked && (
                <span
                  className="flex items-center gap-1 text-cyan-300"
                  title="Radar Lock engaged"
                  data-hud-indicator="radar-lock"
                >
                  <Radar className="size-3 animate-pulse" />
                  <span className="hidden text-[9px] font-bold tracking-wider sm:inline">LOCK</span>
                </span>
              )}
              <span className="text-white/30">•</span>
              <span className="text-cyan-400 font-bold flex items-center gap-1">
                <ChevronUp className="size-3.5" /> {t("open_orbital_layers", "Telemetry Dock")}
              </span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-black/50 border border-white/10 text-[9px] text-white/50 font-sans">
                L
              </kbd>
            </button>
          )}

          <div
            className={cn(
              "pointer-events-auto w-full max-w-full transition-all duration-300 flex flex-col items-center gap-1.5",
              isDockMinimized
                ? "max-h-0 opacity-0 pointer-events-none overflow-hidden scale-95"
                : "max-h-[220px] opacity-100 scale-100",
            )}
          >
            {/* Tier 1: Upper Slim Row (Clean Essential Telemetry Bar, max height 38px) */}
            <div className="h-[38px] max-h-[38px] max-w-full overflow-hidden py-1.5 px-3 sm:px-4 rounded-full border border-cyan-500/40 bg-[#0D1322]/95 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-1.5 sm:gap-3 text-xs font-mono">
              {/* Left Side: Sensor title + Color scale ramp + FIELD readout + GLOW opacity slider */}
              <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                {/* Sensor Title (hidden on phones so Radar Lock + Minimize always fit) */}
                <div className="hidden items-center gap-1.5 font-bold text-cyan sm:flex">
                  <Radio className="size-3 text-emerald animate-pulse shrink-0" />
                  <span className="truncate max-w-20 sm:max-w-40">
                    {activeSatelliteConfig.sensorName}
                  </span>
                </div>

                {/* Color Scale Ramp (labels appear at xl so Radar Lock + Minimize always fit) */}
                <div className="hidden md:flex items-center gap-1 shrink-0">
                  <span className="hidden xl:inline text-[9px] text-muted-foreground font-mono">
                    {activeSatelliteConfig.colorRamp.minLabel}
                  </span>
                  <div
                    className="h-1.5 w-16 xl:w-24 rounded-full border border-white/10 shadow-inner"
                    style={{ background: activeSatelliteConfig.colorRamp.gradient }}
                  />
                  <span className="hidden xl:inline text-[9px] text-muted-foreground font-mono">
                    {activeSatelliteConfig.colorRamp.maxLabel}
                  </span>
                </div>

                {/* FIELD Readout */}
                <span className="px-2 py-0.5 rounded bg-black/60 font-semibold border border-cyan-500/40 text-cyan text-[10.5px] tabular-nums shrink-0">
                  FIELD: {reading.value} {reading.unit}
                </span>

                {/* GLOW Opacity Slider (lg+: the dock keeps Radar Lock + Minimize visible below that) */}
                <div className="hidden lg:flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] text-muted-foreground font-mono">GLOW</span>
                  <Slider
                    aria-label="Layer opacity"
                    className="w-14 sm:w-18"
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
              <div className="hidden h-4 w-px bg-cyan-500/30 shrink-0 sm:block" />

              {/* Right Side: Radar Lock toggle + Collapse button, nested INSIDE the border container */}
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleRadarLock}
                  aria-pressed={isRadarLocked}
                  aria-label="Radar Lock"
                  title={
                    isRadarLocked
                      ? "Radar Lock: camera tracking target — click for free pan & orbit"
                      : "Radar Lock off: free pan & orbit — click to lock camera on target"
                  }
                  className={cn(
                    "flex items-center gap-1 px-1.5 py-0.5 sm:px-2 rounded-full border font-mono text-[10px] transition-all cursor-pointer shrink-0",
                    isRadarLocked
                      ? "bg-cyan-500/25 border-cyan-400/70 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.45)]"
                      : "bg-white/5 border-white/15 text-slate-400 opacity-80 hover:opacity-100 hover:border-cyan-400/40 hover:text-slate-200",
                  )}
                >
                  <Radar
                    className={cn(
                      "size-3 shrink-0",
                      isRadarLocked ? "text-cyan-300 animate-pulse" : "text-slate-500",
                    )}
                  />
                  <span className="hidden md:inline">RADAR LOCK</span>
                  <span
                    className={cn(
                      "hidden size-1.5 rounded-full shrink-0 sm:block",
                      isRadarLocked
                        ? "bg-cyan-300 shadow-[0_0_6px_#22d3ee]"
                        : "bg-slate-600 opacity-70",
                    )}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setIsDockMinimized(true)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 hover:text-cyan-100 transition-all cursor-pointer shrink-0"
                  title="Minimize Telemetry Dock (L)"
                >
                  <ChevronDown className="size-3 text-cyan-400" />
                  <span className="hidden sm:inline">{t("minimize_dock", "Minimize")}</span>
                </button>
              </div>
            </div>

            {/* Tier 2: Lower Slim Row (The 8 NASA Layer Pills with AnimatedBackground) */}
            <div
              role="radiogroup"
              aria-label="Map layer"
              className="flex flex-row items-center gap-1 whitespace-nowrap overflow-x-auto no-scrollbar rounded-full border border-cyan-500/25 bg-[#050B14]/90 p-1 backdrop-blur-xl shadow-[0_0_30px_rgba(6,182,212,0.15)] max-w-full"
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
                      onClick={() => handleSelectTelemetryLayer(tab)}
                      className={`px-2.5 sm:px-3 py-1 font-mono text-[11px] sm:text-xs tracking-wider rounded-full transition-colors duration-200 cursor-pointer flex items-center gap-1.5 ${
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
      </div>

      {/* ---------------- CENTER LAYER EXPLANATION MODAL (WITH BLUE "OK" BUTTON) ---------------- */}
      <LayerInfoModal
        layerId={infoModalLayerId}
        subLayerId={basemapSubOption}
        open={showLayerInfoModal}
        onClose={() => setShowLayerInfoModal(false)}
      />
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

// Leaflet map center updater with smooth flyTo animation that preserves user's 2D field zoom & prevents jitter snapping
function LeafletRecenter({
  lat,
  lon,
  enabled = true,
  useMap,
}: {
  lat: number;
  lon: number;
  /** Radar Lock: when false the map keeps the user's free pan position. */
  enabled?: boolean;
  useMap: LeafletBundle["useMap"];
}) {
  const map = useMap();
  const prevCenterRef = useRef<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (!isLeafletMapAlive(map)) return;
    // Radar Lock released: never force the camera back onto the target coordinates
    if (!enabled) return;

    if (prevCenterRef.current) {
      const dLat = Math.abs(prevCenterRef.current.lat - lat);
      const dLon = Math.abs(prevCenterRef.current.lon - lon);
      // Skip micro-jitter (< 0.005 deg ~ 550m) so user's zoomed-in field exploration and pan position are strictly preserved
      if (dLat < 0.005 && dLon < 0.005) {
        return;
      }
    }
    prevCenterRef.current = { lat, lon };

    // Strictly preserve user's current zoom level: never reset zoom back out
    const currentZoom = typeof map.getZoom === "function" ? Math.max(map.getZoom(), 13) : 13;
    if (typeof map.flyTo === "function") {
      map.flyTo([lat, lon], currentZoom, { animate: true, duration: 1.0 });
    } else if (typeof map.panTo === "function") {
      map.panTo([lat, lon], { animate: true });
    }
  }, [lat, lon, map, enabled]);
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
  setMapInstance: (m: LeafletMapInstance | null) => void;
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
      safeInvalidateSize(map);
      const timer = setTimeout(() => safeInvalidateSize(map), 150);
      return () => {
        clearTimeout(timer);
        // Drop the reference so resize/zoom handlers never reach a removed map
        setMapInstance(null);
      };
    }
    return undefined;
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
