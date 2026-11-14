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

export { GIBS_LAYER_CONFIG, SATELLITE_LAYERS_CONFIG };

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
  { id: "tn-klr", lat: 13.1367, lng: 78.1292, text: "Kolar" },
  { id: "tn-ckb", lat: 13.4325, lng: 77.7275, text: "Chikkaballapur" },
  { id: "tn-hsk", lat: 13.07, lng: 77.7981, text: "Hoskote" },
  { id: "tn-mlr", lat: 13.0044, lng: 77.9392, text: "Malur" },
  { id: "tn-bpt", lat: 12.9961, lng: 78.1994, text: "Bangarapet" },
  { id: "tn-mbl", lat: 13.1633, lng: 78.3967, text: "Mulbagal" },
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

function renderCountryHtml(text: string): string {
  return `<div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;font-weight:700;color:#F8FAFC;text-transform:uppercase;letter-spacing:0.18em;text-shadow:0 0 2px #020617, 0 1px 3px #020617, 0 0 6px #020617;white-space:nowrap;pointer-events:none;transform:translate(-50%,-50%);">${text}</div>`;
}

function renderOceanHtml(text: string): string {
  return `<div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;font-style:italic;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:0.15em;text-shadow:0 0 2px #020617, 0 1px 3px #020617;white-space:nowrap;pointer-events:none;transform:translate(-50%,-50%);">${text}</div>`;
}

function renderStateHtml(text: string): string {
  return `<div style="display:flex;align-items:center;gap:4px;pointer-events:none;white-space:nowrap;transform:translate(-50%,-50%);">
    <div style="width:3px;height:3px;border-radius:50%;background:#94A3B8;box-shadow:0 0 2px rgba(0,0,0,0.8);flex-shrink:0;"></div>
    <span style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:10.5px;font-weight:600;color:#CBD5E1;text-shadow:0 0 2px #020617, 0 1px 2px #020617;letter-spacing:0.04em;">${text}</span>
  </div>`;
}

function renderMegaCapitalHtml(text: string): string {
  return `<div style="display:flex;align-items:center;gap:4px;pointer-events:none;white-space:nowrap;transform:translate(-50%,-50%);">
    <div style="width:3.5px;height:3.5px;border-radius:50%;background:#FFFFFF;border:0.75px solid #020617;box-shadow:0 0 2px rgba(0,0,0,0.8);flex-shrink:0;"></div>
    <span style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:10px;font-weight:600;color:#F1F5F9;text-shadow:0 0 2px #020617, 0 1px 2px #020617;">${text}</span>
  </div>`;
}

function renderCityTownHtml(text: string): string {
  return `<div style="display:flex;align-items:center;gap:3.5px;pointer-events:none;white-space:nowrap;transform:translate(-50%,-50%);">
    <div style="width:2.5px;height:2.5px;border-radius:50%;background:#94A3B8;box-shadow:0 0 2px rgba(0,0,0,0.8);flex-shrink:0;"></div>
    <span style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:9.5px;font-weight:500;color:#E2E8F0;text-shadow:0 0 2px #020617, 0 1px 2px #020617;">${text}</span>
  </div>`;
}

function renderTerrainHtml(text: string): string {
  return `<div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:9px;font-style:italic;font-weight:500;color:#A1A1AA;letter-spacing:0.06em;text-shadow:0 0 2px #020617, 0 1px 2px #020617;white-space:nowrap;pointer-events:none;transform:translate(-50%,-50%);">${text}</div>`;
}

export interface GlobeViewportProps {
  telemetry: AgroTelemetry;
  activeLayer: MapLayer;
  onLayer: (l: MapLayer) => void;
  opacity: number;
  onOpacity: (o: number) => void;
  onPick: (lat: number, lon: number) => void;
}

export function GlobeViewport({
  telemetry,
  activeLayer,
  onLayer,
  opacity,
  onOpacity,
  onPick,
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

  // Zoom & LOD control state
  const [orbitalAltitude, setOrbitalAltitude] = useState(1.4);
  const [gisZoom, setGisZoom] = useState(12);
  const [autoLodNotice, setAutoLodNotice] = useState(false);

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

  // Center 3D Globe camera on current farm coords whenever lat/lon changes
  useEffect(() => {
    if (
      viewMode === "3d" &&
      globeRef.current &&
      typeof globeRef.current.pointOfView === "function"
    ) {
      try {
        globeRef.current.pointOfView({ lat, lng: lon, altitude: 1.2 }, 1200);
      } catch {
        // ignore pointOfView transition timing
      }
    }
  }, [lat, lon, viewMode]);

  // NASA GIBS WMTS URL definition for 2D Leaflet
  const gibsTileUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${activeSatelliteConfig.gibsLayerName}/default/${activeSatelliteConfig.defaultDate}/GoogleMapsCompatible_Level${activeSatelliteConfig.maxZoom}/{z}/{y}/{x}.${activeSatelliteConfig.format}`;

  // 3D Orbital Arcs Data (Terra, SMAP, GPM, ISS orbits)
  const orbitArcsData = useMemo(() => {
    return [
      {
        startLat: 82,
        startLng: lon - 35,
        endLat: -78,
        endLng: lon + 25,
        color: ["#10b981", "#06b6d4"],
        name: "MODIS Terra (Sun-Synchronous)",
      },
      {
        startLat: 86,
        startLng: lon - 75,
        endLat: -82,
        endLng: lon - 10,
        color: ["#06b6d4", "#3b82f6"],
        name: "SMAP L-Band Polar Pass",
      },
      {
        startLat: 65,
        startLng: lon - 120,
        endLat: -65,
        endLng: lon + 55,
        color: ["#06b6d4", "#a855f7"],
        name: "GPM IMERG 65° Inclined Orbit",
      },
      {
        startLat: 51.6,
        startLng: lon - 150,
        endLat: -51.6,
        endLng: lon + 30,
        color: ["#f59e0b", "#10b981"],
        name: "ISS ECOSTRESS 51.6° Orbit",
      },
    ];
  }, [lon]);

  // 3D Dynamic Concentric Hazard & Telemetry Scanning Rings
  const dynamicHazardRings = useMemo(() => {
    const rings = [
      // Primary field pin target beacon pulsing in active layer color
      {
        lat,
        lng: lon,
        maxR: 4.5,
        propagationSpeed: 2.5,
        repeatPeriod: 1200,
        color: activeSatelliteConfig.primaryColor,
        name: `Field Reticle • ${activeLayer}: ${reading.value} ${reading.unit}`,
      },
      // Regional telemetry coverage scanning halo
      {
        lat,
        lng: lon,
        maxR: 9.5,
        propagationSpeed: 1.8,
        repeatPeriod: 2200,
        color: activeSatelliteConfig.colorRamp.colors[1] || activeSatelliteConfig.primaryColor,
        name: `${activeLayer} Sensor Swath Radius`,
      },
    ];

    // Pulsing hazard rings for active natural hazards
    for (const h of hazards) {
      if (h.type === "cyclone" && (h.severity === "critical" || h.severity === "warning")) {
        rings.push({
          lat: lat + 3.2,
          lng: lon + 4.5,
          maxR: 9.0,
          propagationSpeed: 3,
          repeatPeriod: 1500,
          color: "#ef4444",
          name: `Cyclone Track: ${h.metric}`,
        });
      }
      if (h.type === "earthquake") {
        rings.push({
          lat: lat - 0.75,
          lng: lon - 0.85,
          maxR: 6.5,
          propagationSpeed: 4,
          repeatPeriod: 1000,
          color: "#10b981",
          name: `Seismic Epicenter: ${h.metric}`,
        });
      }
      if (h.type === "fire") {
        rings.push({
          lat: lat + 0.08,
          lng: lon - 0.06,
          maxR: 4.5,
          propagationSpeed: 2.5,
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

  // Multi-zoom Google Maps-style dynamic LOD place labels on 3D Orbital Globe
  const activePlaceLabels = useMemo(() => {
    const labels: GlobeHtmlMarkerItem[] = [];

    // Tier 1 — Far Orbital View (altitude > 1.6):
    // Show ONLY country names and major oceans.
    // Completely HIDE all states, cities, and terrain features.
    if (orbitalAltitude > 1.6) {
      for (const c of GLOBAL_COUNTRIES) {
        labels.push({
          id: c.id,
          lat: c.lat,
          lng: c.lng,
          priority: 3,
          html: renderCountryHtml(c.text),
        });
      }
      for (const o of GLOBAL_OCEANS) {
        labels.push({
          id: o.id,
          lat: o.lat,
          lng: o.lng,
          priority: 3,
          html: renderOceanHtml(o.text),
        });
      }
      return labels;
    }

    // Tier 2 — Medium Regional Zoom (0.7 < altitude <= 1.6):
    // Smoothly fade in State names and top-tier national/mega capitals.
    // Keep smaller cities, districts, and terrain features hidden so they never overlap states.
    if (orbitalAltitude > 0.7 && orbitalAltitude <= 1.6) {
      for (const c of GLOBAL_COUNTRIES) {
        labels.push({
          id: c.id,
          lat: c.lat,
          lng: c.lng,
          priority: 3,
          html: renderCountryHtml(c.text),
        });
      }
      for (const o of REGIONAL_WATER_BODIES) {
        labels.push({
          id: o.id,
          lat: o.lat,
          lng: o.lng,
          priority: 3,
          html: renderOceanHtml(o.text),
        });
      }
      for (const s of REGIONAL_STATES) {
        labels.push({
          id: s.id,
          lat: s.lat,
          lng: s.lng,
          priority: 4,
          html: renderStateHtml(s.text),
        });
      }
      for (const m of MEGA_CAPITALS) {
        labels.push({
          id: m.id,
          lat: m.lat,
          lng: m.lng,
          priority: 5,
          html: renderMegaCapitalHtml(m.text),
        });
      }
      return labels;
    }

    // Tier 3 — Close Local Zoom (altitude <= 0.7):
    // Fade out giant country label.
    // Reveal regional cities, districts, towns, terrain features, and active field label.
    for (const s of REGIONAL_STATES) {
      labels.push({
        id: s.id,
        lat: s.lat,
        lng: s.lng,
        priority: 4,
        html: renderStateHtml(s.text),
      });
    }
    for (const m of MEGA_CAPITALS) {
      labels.push({
        id: m.id,
        lat: m.lat,
        lng: m.lng,
        priority: 5,
        html: renderMegaCapitalHtml(m.text),
      });
    }
    for (const ct of ALL_CITIES_AND_TOWNS) {
      labels.push({
        id: ct.id,
        lat: ct.lat,
        lng: ct.lng,
        priority: 6,
        html: renderCityTownHtml(ct.text),
      });
    }
    for (const tr of TERRAIN_FEATURES) {
      labels.push({
        id: tr.id,
        lat: tr.lat,
        lng: tr.lng,
        priority: 7,
        html: renderTerrainHtml(tr.text),
      });
    }

    // Active searched/GPS location label (Priority 1)
    labels.push({
      id: "active-field-target-label",
      lat,
      lng: lon,
      priority: 1,
      html: `
        <div style="display:flex;align-items:center;gap:4px;padding:2px 6px;border-radius:4px;background:#030712dd;border:1px solid #38BDF8;pointer-events:none;white-space:nowrap;box-shadow:0 0 10px rgba(56,189,248,0.4);transform:translate(-50%,-50%);">
          <span style="font-size:10px;color:#38BDF8;">★</span>
          <span style="font-family:system-ui,-apple-system,sans-serif;font-size:10px;font-weight:700;color:#7DD3FC;letter-spacing:0.04em;">${meta.regionLabel || "Target Field"}</span>
        </div>
      `,
    });

    return labels;
  }, [orbitalAltitude, lat, lon, meta.regionLabel]);

  // 3D Regional Telemetry Grid Micro-Points (Sleek surface micro-markers flush with Earth curvature)
  const telemetryPointsData = useMemo(() => {
    const points: {
      lat: number;
      lng: number;
      size: number;
      altitude: number;
      color: string;
      label: string;
    }[] = [];

    // Sleek primary target marker dot flush to the sphere surface
    points.push({
      lat,
      lng: lon,
      size: 0.28,
      altitude: 0.0025,
      color: activeSatelliteConfig.primaryColor,
      label: `Field Target Pin • ${activeLayer}: ${reading.value} ${reading.unit}`,
    });

    // 16 Regional 3D telemetry sensor micro-nodes flush with Earth curvature
    const gridOffsets = [
      { dLat: 0.12, dLon: 0.12, weight: 0.85 },
      { dLat: -0.15, dLon: 0.18, weight: 0.72 },
      { dLat: 0.22, dLon: -0.16, weight: 0.92 },
      { dLat: -0.25, dLon: -0.22, weight: 0.65 },
      { dLat: 0.45, dLon: 0.35, weight: 0.88 },
      { dLat: -0.42, dLon: 0.52, weight: 0.61 },
      { dLat: 0.65, dLon: -0.48, weight: 0.79 },
      { dLat: -0.58, dLon: -0.62, weight: 0.54 },
      { dLat: 1.2, dLon: 1.1, weight: 0.82 },
      { dLat: -1.4, dLon: 0.95, weight: 0.7 },
      { dLat: 1.6, dLon: -1.3, weight: 0.9 },
      { dLat: -1.8, dLon: -1.5, weight: 0.58 },
      { dLat: 2.8, dLon: 2.2, weight: 0.75 },
      { dLat: -3.1, dLon: 2.5, weight: 0.68 },
      { dLat: 3.5, dLon: -2.9, weight: 0.86 },
      { dLat: -3.6, dLon: -3.2, weight: 0.62 },
    ];

    const colorScale = activeSatelliteConfig.colorRamp.colors;

    for (const off of gridOffsets) {
      const pLat = lat + off.dLat;
      const pLon = lon + off.dLon;
      const cIdx = Math.min(colorScale.length - 1, Math.floor(off.weight * colorScale.length));
      const ptColor = colorScale[cIdx] || activeSatelliteConfig.primaryColor;

      if (activeLayer === "FIRMS Fires") {
        if (off.weight > 0.68) {
          points.push({
            lat: pLat,
            lng: pLon,
            size: 0.22 * off.weight + 0.08,
            altitude: 0.002,
            color: off.weight > 0.85 ? "#ef4444" : "#f59e0b",
            label: `FIRMS Hotspot • FRP ${Math.round(off.weight * 50)} MW`,
          });
        }
      } else {
        points.push({
          lat: pLat,
          lng: pLon,
          size: 0.16 * off.weight + 0.05,
          altitude: 0.002,
          color: ptColor,
          label: `${activeLayer} Sensor Node (${pLat.toFixed(2)}°, ${pLon.toFixed(2)}°) • ${(off.weight * (reading.intensity + 0.3)).toFixed(2)} ${reading.unit}`,
        });
      }
    }

    return points;
  }, [lat, lon, activeLayer, activeSatelliteConfig, reading]);

  // 3D HTML Status Badges & Place Labels for react-globe.gl
  const dynamicGlobeHtmlMarkers = useMemo(() => {
    const list: GlobeHtmlMarkerItem[] = [
      {
        id: "field-reticle-badge",
        lat,
        lng: lon,
        priority: 1,
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%) translateY(-14px);pointer-events:none;white-space:nowrap;z-index:50;">
            <div style="display:flex;align-items:center;gap:6px;padding:4px 9px;border-radius:7px;background:#070C18f2;border:1.5px solid ${activeSatelliteConfig.primaryColor};color:#ffffff;font-family:monospace;font-size:10px;font-weight:700;box-shadow:0 0 16px ${activeSatelliteConfig.primaryColor}99, 0 4px 12px rgba(0,0,0,0.85);backdrop-filter:blur(8px);">
              <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${activeSatelliteConfig.primaryColor};box-shadow:0 0 8px ${activeSatelliteConfig.primaryColor};"></span>
              <span style="color:${activeSatelliteConfig.primaryColor};text-transform:uppercase;letter-spacing:0.5px;">${activeLayer}:</span>
              <span style="font-weight:800;color:#ffffff;">${reading.value} <span style="font-weight:500;color:#94a3b8;font-size:9px;">${reading.unit}</span></span>
            </div>
            <div style="width:1.5px;height:12px;background:linear-gradient(to bottom, ${activeSatelliteConfig.primaryColor}, transparent);"></div>
            <div style="width:4px;height:4px;border-radius:50%;background:${activeSatelliteConfig.primaryColor};"></div>
          </div>
        `,
      },
    ];

    for (const h of hazards) {
      if (h.type === "cyclone") {
        list.push({
          id: `hazard-${h.id || "cyclone"}`,
          lat: lat + 4.2,
          lng: lon + 5.5,
          priority: 2,
          html: `
            <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%) translateY(-12px);pointer-events:none;white-space:nowrap;z-index:40;">
              <div style="display:flex;align-items:center;gap:5px;padding:3px 8px;border-radius:6px;background:#070C18ee;border:1px solid #ef4444;color:#ef4444;font-family:monospace;font-size:9px;font-weight:700;box-shadow:0 0 14px rgba(239,68,68,0.5), 0 3px 8px rgba(0,0,0,0.8);backdrop-filter:blur(6px);">
                <span style="font-size:11px;">🌀</span>
                <span>CYCLONE TRACK</span>
              </div>
              <div style="width:1px;height:8px;background:#ef4444;"></div>
            </div>
          `,
        });
      } else if (h.type === "fire") {
        list.push({
          id: `hazard-${h.id || "fire"}`,
          lat: lat + 1.2,
          lng: lon - 1.8,
          priority: 2,
          html: `
            <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%) translateY(-12px);pointer-events:none;white-space:nowrap;z-index:40;">
              <div style="display:flex;align-items:center;gap:5px;padding:3px 8px;border-radius:6px;background:#070C18ee;border:1px solid #f59e0b;color:#f59e0b;font-family:monospace;font-size:9px;font-weight:700;box-shadow:0 0 14px rgba(245,158,11,0.5), 0 3px 8px rgba(0,0,0,0.8);backdrop-filter:blur(6px);">
                <span style="font-size:11px;">🔥</span>
                <span>FIRMS HOTSPOT</span>
              </div>
              <div style="width:1px;height:8px;background:#f59e0b;"></div>
            </div>
          `,
        });
      } else if (h.type === "earthquake") {
        list.push({
          id: `hazard-${h.id || "quake"}`,
          lat: lat - 2.8,
          lng: lon - 3.2,
          priority: 2,
          html: `
            <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%) translateY(-12px);pointer-events:none;white-space:nowrap;z-index:40;">
              <div style="display:flex;align-items:center;gap:5px;padding:3px 8px;border-radius:6px;background:#070C18ee;border:1px solid #10b981;color:#10b981;font-family:monospace;font-size:9px;font-weight:700;box-shadow:0 0 14px rgba(16,185,129,0.5), 0 3px 8px rgba(0,0,0,0.8);backdrop-filter:blur(6px);">
                <span style="font-size:11px;">⚡</span>
                <span>USGS EPICENTER</span>
              </div>
              <div style="width:1px;height:8px;background:#10b981;"></div>
            </div>
          `,
        });
      }
    }

    list.push(...activePlaceLabels);

    return list;
  }, [lat, lon, activeLayer, activeSatelliteConfig, reading, hazards, activePlaceLabels]);

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
      // Vertical margin: 18px, Horizontal margin: 35px
      let collides = false;
      for (const box of acceptedBoxes) {
        const hCollision = !(rect.right + 35 < box.left || rect.left - 35 > box.right);
        const vCollision = !(rect.bottom + 18 < box.top || rect.top - 18 > box.bottom);
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
        controlsInstance = globeRef.current.controls() as {
          addEventListener?: (e: string, cb: () => void) => void;
          removeEventListener?: (e: string, cb: () => void) => void;
        };
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

  // Two-way auto-zoom transitions between 2D Map & 3D Orbital Globe
  const handleAutoTransitionTo3D = useCallback(() => {
    const now = Date.now();
    if (now - lastAutoTransitionRef.current < 1800) return;
    lastAutoTransitionRef.current = now;

    if (webGLSupported) {
      setViewMode("3d");
      setOrbitalAltitude(1.8);
      globeRef.current?.pointOfView({ lat, lng: lon, altitude: 1.8 }, 1000);
      toast.info("Entering 3D Orbital Overview", {
        description: "Auto-transitioned from 2D Field GIS to 3D Orbital Globe.",
      });
    }
  }, [webGLSupported, lat, lon]);

  const handleAutoTransitionTo2D = useCallback(() => {
    const now = Date.now();
    if (now - lastAutoTransitionRef.current < 1800) return;
    lastAutoTransitionRef.current = now;

    setViewMode("2d");
    setGisZoom(14);
    setAutoLodNotice(false);
    toast.info("Entering High-Resolution 2D Field GIS", {
      description: "Ground proximity reached (<50 km). Switched to 2D Satellite GIS.",
    });
  }, []);

  // Zoom In Handler
  const handleZoomIn = () => {
    if (viewMode === "3d") {
      const newAlt = Math.max(0.06, orbitalAltitude * 0.65);
      setOrbitalAltitude(newAlt);
      globeRef.current?.pointOfView({ lat, lng: lon, altitude: newAlt }, 400);
      if (newAlt <= 0.08) {
        handleAutoTransitionTo2D();
      } else if (newAlt < 0.18) {
        setAutoLodNotice(true);
      }
    } else {
      leafletMapRef.current?.zoomIn?.(1, { animate: true });
    }
  };

  // Zoom Out Handler
  const handleZoomOut = () => {
    if (viewMode === "3d") {
      const newAlt = Math.min(2.5, orbitalAltitude * 1.45);
      setOrbitalAltitude(newAlt);
      globeRef.current?.pointOfView({ lat, lng: lon, altitude: newAlt }, 400);
      if (newAlt >= 0.18) setAutoLodNotice(false);
    } else {
      const curZ = leafletMapRef.current?.getZoom?.() ?? gisZoom;
      if (curZ <= 4) {
        handleAutoTransitionTo3D();
      } else {
        leafletMapRef.current?.zoomOut?.(1, { animate: true });
      }
    }
  };

  // Vertical Zoom Slider Handler
  const handleSliderChange = (newZoom: number) => {
    if (viewMode === "3d") {
      if (newZoom >= 17) {
        handleAutoTransitionTo2D();
        return;
      }
      const newAlt = Math.max(0.06, Math.min(2.5, 2.5 - ((newZoom - 1) / 17) * (2.5 - 0.06)));
      setOrbitalAltitude(newAlt);
      globeRef.current?.pointOfView({ lat, lng: lon, altitude: newAlt }, 300);
      if (newAlt <= 0.08) handleAutoTransitionTo2D();
      else if (newAlt < 0.18) setAutoLodNotice(true);
      else setAutoLodNotice(false);
    } else {
      if (newZoom <= 3) {
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
      setOrbitalAltitude(0.12);
      globeRef.current?.pointOfView({ lat, lng: lon, altitude: 0.12 }, 1000);
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
      setAutoLodNotice(false);
    } else {
      handleAutoTransitionTo3D();
    }
  };

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
      {/* Aerospace Tactical Corner Frame Ticks */}
      <div className="pointer-events-none absolute inset-0 z-10 border border-cyan/20">
        <span className="absolute top-2 left-2 size-3 border-t-2 border-l-2 border-cyan/80" />
        <span className="absolute top-2 right-2 size-3 border-t-2 border-r-2 border-cyan/80" />
        <span className="absolute bottom-2 left-2 size-3 border-b-2 border-l-2 border-cyan/80" />
        <span className="absolute bottom-2 right-2 size-3 border-b-2 border-r-2 border-cyan/80" />
        {/* Subtle center crosshair watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 pointer-events-none opacity-20">
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-cyan" />
          <div className="absolute left-0 right-0 top-1/2 h-px bg-cyan" />
        </div>
      </div>
      {/* ---------------- 3D ORBITAL GLOBE MODE (NASA GIBS WMTS + THREE.JS OVERLAYS) ---------------- */}
      {viewMode === "3d" && GlobeComponent && mounted && webGLSupported ? (
        <SafeGlobeErrorBoundary
          fallback={graticuleGridFallback}
          onFailure={() => setViewMode("2d")}
        >
          <div className="absolute inset-0">
            <GlobeComponent
              ref={globeRef}
              width={containerDimensions.width}
              height={containerDimensions.height}
              backgroundColor="#050811"
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
              globeTileEngineUrl={(x: number, y: number, l: number) =>
                `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`
              }
              rendererConfig={{ antialias: true, powerPreference: "high-performance" }}
              atmosphereColor="#00e5ff"
              atmosphereAltitude={0.22}
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
              }}
              htmlElementsData={dynamicGlobeHtmlMarkers}
              htmlLat="lat"
              htmlLng="lng"
              htmlAltitude={0.015}
              htmlElement={(d: unknown) => {
                const item = d as { id?: string; priority?: number; html?: string };
                const el = document.createElement("div");
                el.className = "globe-lod-label";
                if (item.id) el.dataset.labelId = item.id;
                el.dataset.priority = String(item.priority ?? 99);
                el.style.transition = "opacity 200ms ease-out, transform 200ms ease-out";
                el.style.opacity = "1";
                el.style.willChange = "opacity";
                if (item.html) el.innerHTML = item.html;
                return el;
              }}
              onZoom={(pov: { lat: number; lng: number; altitude: number }) => {
                if (typeof pov?.altitude === "number") {
                  setOrbitalAltitude(pov.altitude);
                  if (pov.altitude <= 0.08) {
                    handleAutoTransitionTo2D();
                  } else if (pov.altitude < 0.18) {
                    setAutoLodNotice(true);
                  } else {
                    setAutoLodNotice(false);
                  }
                  setTimeout(runCollisionCull, 50);
                }
              }}
              onGlobeClick={({ lat: clickLat, lng: clickLng }: { lat: number; lng: number }) => {
                onPick(Math.round(clickLat * 10000) / 10000, Math.round(clickLng * 10000) / 10000);
              }}
            />
          </div>
        </SafeGlobeErrorBoundary>
      ) : null}

      {/* ---------------- AUTO-LOD NOTICE (HIGH PROXIMITY ALERT) ---------------- */}
      {viewMode === "3d" && autoLodNotice && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-lg border border-cyan-400/80 bg-[#0D1322]/95 px-3 py-1.5 font-mono text-xs text-cyan shadow-[0_0_15px_rgba(6,182,212,0.4)] backdrop-blur-md animate-pulse">
          <Radio className="size-3.5 text-cyan animate-pulse" />
          <span>Auto-LOD: Ground Proximity (&lt;100 km). Switch to High-Res 2D Field GIS?</span>
          <Button
            size="sm"
            variant="default"
            className="h-6 bg-cyan text-slate-950 font-bold px-2 text-[10px] hover:bg-cyan-400"
            onClick={() => setViewMode("2d")}
          >
            Switch to 2D GIS
          </Button>
        </div>
      )}

      {/* ---------------- 2D FIELD GIS MODE (LEAFLET + NASA GIBS + HAZARDS) ---------------- */}
      {viewMode === "2d" && LeafletComp && mounted ? (
        <div className="absolute inset-0 z-0">
          <LeafletComp.MapContainer
            center={[lat, lon]}
            zoom={gisZoom}
            scrollWheelZoom={true}
            style={{ width: "100%", height: "100%", background: "#050811" }}
          >
            {/* Esri World Imagery high-zoom satellite base layer */}
            <LeafletComp.TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
              attribution="Tiles &copy; Esri &mdash; High-Resolution Farm Satellite"
            />

            {/* Hybrid Boundaries & Road Labels Layer */}
            <LeafletComp.TileLayer
              url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
              zIndex={15}
              opacity={0.65}
            />

            {/* CartoDB Dark Matter Only-Labels for high-contrast crisp text */}
            <LeafletComp.TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              maxZoom={18}
              zIndex={16}
              opacity={0.85}
            />

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

                {/* Threat Vector Polyline (e.g. Cyclone to Farm) */}
                {hazard.polyline && (
                  <LeafletComp.Polyline
                    positions={hazard.polyline}
                    pathOptions={{
                      color: hazard.color,
                      weight: 2,
                      dashArray: "6 6",
                      opacity: 0.8,
                    }}
                  />
                )}

                {/* Tactical Hazard Marker */}
                <LeafletComp.Marker
                  position={[hazard.lat, hazard.lon]}
                  icon={
                    new LeafletComp.L.DivIcon({
                      className: "hazard-marker",
                      html: `
                        <div style="position:relative; width:30px; height:30px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                          <span style="position:absolute; inset:0; border-radius:50%; background:${hazard.color}; opacity:0.35; animation:ping 2.2s infinite;"></span>
                          <span style="position:relative; width:24px; height:24px; border-radius:50%; background:#0D1322; border:2px solid ${hazard.color}; display:flex; align-items:center; justify-content:center; font-size:12px; box-shadow:0 0 10px ${hazard.color};">
                            ${hazard.icon}
                          </span>
                        </div>
                      `,
                      iconSize: [30, 30],
                      iconAnchor: [15, 15],
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
      </div>

      {/* ---------------- TOP-RIGHT CONTROLS & LAYER READOUT ---------------- */}
      <div className="absolute right-3.5 top-3.5 flex flex-col items-end gap-2.5 z-20">
        {/* 3D WebGL vs 2D Leaflet GIS Mode Switcher Toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-cyan/50 bg-background/90 p-1 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.7)]">
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
            onClick={() => webGLSupported && setViewMode("3d")}
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
            onClick={() => setViewMode("2d")}
          >
            <MapIcon className="mr-1.5 size-3.5 text-cyan drop-shadow-[0_0_6px_#00f0ff]" /> 2D Field
            GIS
          </Button>
        </div>

        {/* Layer Readout Card */}
        <div
          data-hud-overlay="layer-readout"
          className="hud-card pointer-events-none p-3.5 text-right backdrop-blur-xl bg-background/90 border border-cyan/40 min-w-40 shadow-[0_0_20px_rgba(0,0,0,0.7)]"
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
          <div className="mt-1 font-mono text-[9px] text-cyan/80 truncate max-w-48">
            GIBS: {activeSatelliteConfig.gibsLayerName}
          </div>
          {hover && (
            <div className="mt-2 border-t border-border/50 pt-1 font-mono text-[10px] text-muted-foreground">
              cursor {hover.lat.toFixed(2)}°, {hover.lon.toFixed(2)}°
            </div>
          )}
        </div>
      </div>

      {/* ---------------- FLOATING TACTICAL HUD ZOOM CONTROL BAR (RIGHT-DOCKED) ---------------- */}
      <div
        data-hud-overlay="zoom-controls"
        className="absolute right-3 top-28 z-[500] flex flex-col items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-[#0D1322]/90 p-1.5 backdrop-blur-md shadow-2xl select-none"
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
          className="absolute left-3 bottom-24 z-20 flex flex-wrap items-center gap-1 rounded-xl border border-cyan-500/40 bg-[#0D1322]/90 px-2 py-1 backdrop-blur-md shadow-xl text-xs font-mono"
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

      {/* ---------------- BOTTOM-CENTER SCIENTIFIC LAYER LEGEND + SWITCHER ---------------- */}
      <div
        data-hud-overlay="layer-switcher"
        className="absolute inset-x-3 bottom-3 mx-auto flex max-w-3xl flex-col items-center gap-2 z-20 pointer-events-auto"
      >
        {/* Floating Glassmorphic Color-Scale Legend Pill */}
        <div className="w-full max-w-xl rounded-xl border border-cyan-500/40 bg-[#0D1322]/95 p-2 backdrop-blur-md shadow-2xl">
          <div className="flex items-center justify-between gap-2 mb-1.5 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 truncate">
              <Radio className="size-3 text-emerald animate-pulse shrink-0" />
              <span className="font-bold text-cyan truncate">
                {activeSatelliteConfig.sensorName}
              </span>
              <span className="text-muted-foreground hidden sm:inline truncate">
                • {activeSatelliteConfig.title}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-[10px] text-muted-foreground">GLOW</span>
              <Slider
                aria-label="Layer opacity"
                className="w-20 sm:w-24"
                min={0}
                max={100}
                step={1}
                value={[opacity]}
                onValueChange={([v]) => v !== undefined && onOpacity(v)}
              />
              <span className="font-mono text-[10px] text-cyan tabular-nums w-8 text-right font-bold">
                {opacity}%
              </span>
            </div>
          </div>

          {/* Continuous Color Gradient Bar */}
          <div
            className="h-2 w-full rounded-full shadow-inner border border-white/10"
            style={{ background: activeSatelliteConfig.colorRamp.gradient }}
          />

          {/* Scale Min / Active Reading / Max Readout */}
          <div className="mt-1 flex items-center justify-between font-mono text-[9px] text-muted-foreground">
            <span className="truncate">{activeSatelliteConfig.colorRamp.minLabel}</span>
            <span className="px-1.5 py-0.5 rounded bg-black/60 font-semibold border border-cyan-500/30 text-cyan text-[10px] tabular-nums">
              FIELD: {reading.value} {reading.unit}
            </span>
            <span className="truncate text-right">{activeSatelliteConfig.colorRamp.maxLabel}</span>
          </div>
        </div>

        {/* Layer Switcher Buttons Pill Bar */}
        <div
          className="flex flex-wrap justify-center gap-1.5 bg-background/90 px-3.5 py-1.5 rounded-xl border border-cyan/40 backdrop-blur-xl shadow-[0_0_25px_rgba(0,0,0,0.8)]"
          role="radiogroup"
          aria-label="Map layer"
        >
          {MAP_LAYERS.map((l) => {
            const isAct = activeLayer === l;
            return (
              <Button
                key={l}
                type="button"
                variant="pill"
                size="pill"
                role="radio"
                aria-checked={isAct}
                data-active={isAct}
                onClick={() => onLayer(l)}
                className={cn(
                  "transition-all text-xs font-semibold flex items-center gap-1.5",
                  isAct &&
                    "border-cyan bg-cyan/25 text-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.7)] shadow-[0_0_12px_rgba(0,240,255,0.35)]",
                )}
              >
                {isAct && <span className="size-1.5 rounded-full bg-cyan animate-pulse" />}
                {l}
              </Button>
            );
          })}
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
        if (z <= 3 && onAutoSwitchTo3D) {
          onAutoSwitchTo3D();
        }
      }
    },
  });
  return null;
}
