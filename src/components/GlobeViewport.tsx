/**
 * GlobeViewport.tsx
 * Interactive Dual 3D Orbital WebGL Globe & High-Zoom 2D NASA GIBS Field GIS Map.
 * Renders inside `#globe-container`.
 *
 * Capabilities:
 * - 3D Orbital Globe: Three.js / react-globe.gl with multi-resolution slippy tile engine
 *   (ArcGIS World Imagery + Blue Marble), cyan atmosphere glow, pulsing hazard rings
 *   for EONET cyclones & USGS earthquakes, satellite orbit arcs (Terra, SMAP, GPM, ISS),
 *   HTML hazard badges, and Auto-LOD proximity switch.
 * - Floating Tactical HUD Zoom Control Bar: Zoom In (+), Zoom Out (-), interactive
 *   vertical range slider with live Z / ALT / FIELD readout badge, Target Farm (Z:15)
 *   and Full Orbit (Z:3) quick actions.
 * - 2D Field GIS: Leaflet / react-leaflet high-zoom satellite imagery overlaid with live
 *   NASA GIBS WMTS raster tiles (maxNativeZoom + maxZoom 18 for crisp upscaling), reference
 *   boundaries, and 5 interactive warning/hazard markers + impact radius circles + polyline tracks.
 * - Map Hazard Legend & Filter Bar: Toggle hazards, filter by category, and "Fit All Hazards".
 */
import {
  Component,
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
import { GIBS_LAYER_CONFIG } from "@/services/gibsLayers";

export { GIBS_LAYER_CONFIG };

interface GlobeMethods {
  pointOfView: (pov: { lat?: number; lng?: number; altitude?: number }, ms?: number) => void;
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

  const [viewMode, setViewMode] = useState<"3d" | "2d">("2d");
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
  const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 480 });

  // Safe client-side dynamic loading of WebGL & Leaflet to keep SSR 100% deterministic
  useEffect(() => {
    setMounted(true);
    const hasGL = hasWebGLSupport();
    setWebGLSupported(hasGL);
    if (hasGL) {
      setViewMode("3d");
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
          height: containerRef.current.clientHeight || 480,
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

  // NASA GIBS WMTS URL definition
  const gibsConfig = GIBS_LAYER_CONFIG[activeLayer];
  const gibsTileUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${gibsConfig.layerName}/default/${gibsConfig.defaultDate}/GoogleMapsCompatible_Level${gibsConfig.maxZoom}/{z}/{y}/{x}.png`;

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

  // 3D Hazard Rings Data (EONET cyclones, USGS earthquakes, and field radar beacon)
  const hazardRingsData = useMemo(() => {
    const rings = [
      {
        lat,
        lng: lon,
        maxR: 3.5,
        propagationSpeed: 2,
        repeatPeriod: 1200,
        color: "#00e5ff",
        name: "Field Sensor Reticle",
      },
    ];

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
  }, [lat, lon, hazards]);

  // 3D HTML Hazard Badges and Pins for react-globe.gl
  const globeHtmlMarkers = useMemo(() => {
    const list = [
      {
        lat,
        lng: lon,
        html: `
          <div style="display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;background:#0D1322f0;border:1px solid #00e5ff;color:#00e5ff;font-family:monospace;font-size:10px;font-weight:600;box-shadow:0 0 12px rgba(0,229,255,0.4);pointer-events:none;">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#00e5ff;animation:ping 1.5s infinite;"></span>
            <span>TARGET FIELD</span>
          </div>
        `,
      },
    ];

    for (const h of hazards) {
      if (h.type === "cyclone") {
        list.push({
          lat: lat + 3.2,
          lng: lon + 4.5,
          html: `
            <div style="display:flex;align-items:center;gap:4px;padding:3px 6px;border-radius:6px;background:#0D1322f0;border:1px solid #ef4444;color:#ef4444;font-family:monospace;font-size:9px;font-weight:bold;box-shadow:0 0 10px rgba(239,68,68,0.4);">
              <span>🌀</span>
              <span>CYCLONE TRACK</span>
            </div>
          `,
        });
      } else if (h.type === "fire") {
        list.push({
          lat: lat + 0.08,
          lng: lon - 0.06,
          html: `
            <div style="display:flex;align-items:center;gap:4px;padding:3px 6px;border-radius:6px;background:#0D1322f0;border:1px solid #f59e0b;color:#f59e0b;font-family:monospace;font-size:9px;font-weight:bold;box-shadow:0 0 10px rgba(245,158,11,0.4);">
              <span>🔥</span>
              <span>FIRMS HOTSPOT</span>
            </div>
          `,
        });
      } else if (h.type === "earthquake") {
        list.push({
          lat: lat - 0.75,
          lng: lon - 0.85,
          html: `
            <div style="display:flex;align-items:center;gap:4px;padding:3px 6px;border-radius:6px;background:#0D1322f0;border:1px solid #10b981;color:#10b981;font-family:monospace;font-size:9px;font-weight:bold;box-shadow:0 0 10px rgba(16,185,129,0.4);">
              <span>⚡</span>
              <span>USGS EPICENTER</span>
            </div>
          `,
        });
      }
    }

    return list;
  }, [lat, lon, hazards]);

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

  // Zoom In Handler
  const handleZoomIn = () => {
    if (viewMode === "3d") {
      const newAlt = Math.max(0.06, orbitalAltitude * 0.65);
      setOrbitalAltitude(newAlt);
      globeRef.current?.pointOfView({ lat, lng: lon, altitude: newAlt }, 400);
      if (newAlt < 0.18) setAutoLodNotice(true);
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
      leafletMapRef.current?.zoomOut?.(1, { animate: true });
    }
  };

  // Vertical Zoom Slider Handler
  const handleSliderChange = (newZoom: number) => {
    if (viewMode === "3d") {
      const newAlt = Math.max(0.06, Math.min(2.5, 2.5 - ((newZoom - 1) / 17) * (2.5 - 0.06)));
      setOrbitalAltitude(newAlt);
      globeRef.current?.pointOfView({ lat, lng: lon, altitude: newAlt }, 300);
      if (newAlt < 0.18) setAutoLodNotice(true);
      else setAutoLodNotice(false);
    } else {
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
      leafletMapRef.current?.flyTo?.([lat, lon], 3, { animate: true, duration: 1.2 });
      setGisZoom(3);
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
      className="relative w-full h-[520px] rounded-xl border border-cyan/40 bg-[#03060d] overflow-hidden select-none shadow-[0_0_35px_rgba(0,0,0,0.8),inset_0_0_50px_rgba(0,240,255,0.05)]"
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
      {/* ---------------- 3D ORBITAL GLOBE MODE (SLIPPY TILE ENGINE + HIGH-DPI) ---------------- */}
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
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
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
              ringsData={hazardRingsData}
              ringColor={(d: unknown) => (d as { color?: string })?.color || "#00e5ff"}
              ringMaxRadius="maxR"
              ringPropagationSpeed="propagationSpeed"
              ringRepeatPeriod="repeatPeriod"
              htmlElementsData={globeHtmlMarkers}
              htmlLat="lat"
              htmlLng="lng"
              htmlAltitude={0.03}
              htmlElement={(d: unknown) => {
                const item = d as { html?: string };
                const el = document.createElement("div");
                if (item.html) el.innerHTML = item.html;
                return el;
              }}
              onZoom={(pov: { lat: number; lng: number; altitude: number }) => {
                if (typeof pov?.altitude === "number") {
                  setOrbitalAltitude(pov.altitude);
                  if (pov.altitude < 0.18) {
                    setAutoLodNotice(true);
                  } else {
                    setAutoLodNotice(false);
                  }
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

            {/* NASA GIBS WMTS Raster Tile Layer (Level maxZoom with smooth upscaling up to 18) */}
            <LeafletComp.TileLayer
              key={`${gibsConfig.layerName}-${gibsConfig.defaultDate}`}
              url={gibsTileUrl}
              maxNativeZoom={gibsConfig.maxZoom}
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
          <span className="text-right text-emerald font-semibold truncate">{meta.satellitePass}</span>
          <span className="text-muted-foreground/80 font-medium">NEXT WINDOW</span>
          <span className="text-right tabular-nums text-amber font-semibold">T-{meta.nextPassMin} min</span>
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
            <GlobeIcon className="mr-1.5 size-3.5 text-cyan drop-shadow-[0_0_6px_#00f0ff]" /> 3D Orbital
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
            <MapIcon className="mr-1.5 size-3.5 text-cyan drop-shadow-[0_0_6px_#00f0ff]" /> 2D Field GIS
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
          <div className="font-mono text-[10px] text-muted-foreground/80 font-medium">{reading.unit}</div>
          <div className="mt-1 font-mono text-[9px] text-cyan/80 truncate max-w-48">
            GIBS: {gibsConfig.layerName}
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
          className="absolute left-3 bottom-14 z-20 flex flex-wrap items-center gap-1 rounded-xl border border-cyan-500/40 bg-[#0D1322]/90 px-2 py-1 backdrop-blur-md shadow-xl text-xs font-mono"
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

      {/* ---------------- BOTTOM-CENTER LAYER SWITCHER + OPACITY ---------------- */}
      <div
        data-hud-overlay="layer-switcher"
        className="absolute inset-x-3 bottom-3 mx-auto flex max-w-3xl flex-col items-center gap-2 z-20 pointer-events-auto"
      >
        <div
          className="flex flex-wrap justify-center gap-1.5 bg-background/90 px-3.5 py-1.5 rounded-xl border border-cyan/40 backdrop-blur-xl shadow-[0_0_25px_rgba(0,0,0,0.8)]"
          role="radiogroup"
          aria-label="Map layer"
        >
          {MAP_LAYERS.map((l) => (
            <Button
              key={l}
              type="button"
              variant="pill"
              size="pill"
              role="radio"
              aria-checked={activeLayer === l}
              data-active={activeLayer === l}
              onClick={() => onLayer(l)}
              className={cn(
                "transition-all text-xs font-semibold",
                activeLayer === l && "border-cyan bg-cyan/25 text-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.7)] shadow-[0_0_12px_rgba(0,240,255,0.35)]",
              )}
            >
              {l}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-3 rounded-full border border-cyan/40 bg-background/90 px-4 py-1.5 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.8)]">
          <Layers className="size-3.5 text-cyan drop-shadow-[0_0_6px_#00f0ff]" />
          <span className="hud-label font-bold text-cyan/90 text-[10px]">GIBS Opacity</span>
          <Slider
            aria-label="Layer opacity"
            className="w-36"
            min={0}
            max={100}
            step={1}
            value={[opacity]}
            onValueChange={([v]) => v !== undefined && onOpacity(v)}
          />
          <span className="w-9 text-right font-mono text-xs font-bold tabular-nums text-cyan drop-shadow-[0_0_6px_rgba(0,240,255,0.5)]">
            {opacity}%
          </span>
          <span className="hidden sm:inline-block border-l border-border/60 pl-2.5 font-mono text-[10px] text-muted-foreground/80 truncate">
            Level {gibsConfig.maxZoom} WMTS
          </span>
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
  useMap,
  useMapEvents,
}: {
  setMapInstance: (m: LeafletMapInstance) => void;
  onZoomChange: (z: number) => void;
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
        onZoomChange(e.target.getZoom());
      }
    },
  });
  return null;
}
