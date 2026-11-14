/**
 * GlobeViewport.tsx
 * Interactive Dual 3D Orbital WebGL Globe & High-Zoom 2D NASA GIBS Field GIS Map.
 * Renders inside `#globe-container`.
 * - 3D Orbital Globe: Three.js / react-globe.gl with cyan atmosphere glow, pulsing hazard rings
 *   for EONET cyclones & USGS earthquakes, satellite orbit arcs (Terra, SMAP, GPM, ISS),
 *   and click-to-pick geolocation.
 * - 2D Field GIS: Leaflet / react-leaflet high-zoom satellite imagery overlaid with live
 *   NASA GIBS WMTS raster tiles for the 8 agricultural layers with dynamic opacity.
 */
import { useEffect, useMemo, useRef, useState, type ComponentType, type MouseEvent } from "react";
import { Globe as GlobeIcon, Map as MapIcon, Layers, Radar, Radio } from "lucide-react";
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

interface LeafletBundle {
  MapContainer: ComponentType<{
    center: [number, number];
    zoom: number;
    scrollWheelZoom?: boolean;
    style?: React.CSSProperties;
    children: React.ReactNode;
  }>;
  TileLayer: ComponentType<{
    url: string;
    maxZoom?: number;
    opacity?: number;
    zIndex?: number;
    attribution?: string;
  }>;
  Marker: ComponentType<{
    position: [number, number];
    icon?: unknown;
    children?: React.ReactNode;
  }>;
  Popup: ComponentType<{
    className?: string;
    children?: React.ReactNode;
  }>;
  useMap: () => { panTo: (coords: [number, number], options?: { animate?: boolean }) => void };
  useMapEvents: (handlers: {
    click?: (e: { latlng?: { lat: number; lng: number } }) => void;
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

  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [mounted, setMounted] = useState(false);
  const [globeModule, setGlobeModule] = useState<ComponentType<Record<string, unknown>> | null>(
    null,
  );
  const [leafletModule, setLeafletModule] = useState<LeafletBundle | null>(null);
  const [hover, setHover] = useState<{ lat: number; lon: number } | null>(null);

  const globeRef = useRef<GlobeMethods | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 480 });

  // Safe client-side dynamic loading of WebGL & Leaflet to keep SSR 100% deterministic
  useEffect(() => {
    setMounted(true);
    let active = true;

    Promise.all([import("react-globe.gl"), import("react-leaflet"), import("leaflet")])
      .then(([gMod, rLeafletMod, lMod]) => {
        if (!active) return;
        setGlobeModule(() => gMod.default as unknown as ComponentType<Record<string, unknown>>);
        setLeafletModule({
          MapContainer: rLeafletMod.MapContainer as unknown as LeafletBundle["MapContainer"],
          TileLayer: rLeafletMod.TileLayer as unknown as LeafletBundle["TileLayer"],
          Marker: rLeafletMod.Marker as unknown as LeafletBundle["Marker"],
          Popup: rLeafletMod.Popup as unknown as LeafletBundle["Popup"],
          useMap: rLeafletMod.useMap,
          useMapEvents: rLeafletMod.useMapEvents,
          L: lMod.default || lMod,
        });
      })
      .catch((err) => {
        console.warn("Client map engines fallback to equirectangular grid:", err);
      });

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
    if (viewMode === "3d" && globeRef.current) {
      globeRef.current.pointOfView({ lat, lng: lon, altitude: 2.2 }, 1000);
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
      // Primary farm pin target beacon
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

    // Pulsing hazard rings for active hazards
    for (const h of hazards) {
      if (h.type === "cyclone" && (h.severity === "critical" || h.severity === "warning")) {
        rings.push({
          lat: lat + 1.2,
          lng: lon + 1.8,
          maxR: 8.0,
          propagationSpeed: 3,
          repeatPeriod: 1500,
          color: "#ef4444",
          name: `Cyclone Hazard: ${h.metric}`,
        });
      }
      if (h.type === "earthquake" && (h.severity === "critical" || h.severity === "warning")) {
        rings.push({
          lat: lat - 0.8,
          lng: lon - 0.9,
          maxR: 6.5,
          propagationSpeed: 4,
          repeatPeriod: 1000,
          color: "#f59e0b",
          name: `Seismic Epicenter: ${h.metric}`,
        });
      }
    }

    return rings;
  }, [lat, lon, hazards]);

  // HTML Points or Marker Pins on 3D Globe
  const globePointsData = useMemo(() => {
    return [
      {
        lat,
        lng: lon,
        size: 1.2,
        color: "#00e5ff",
        label: `Field Pin: ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
      },
    ];
  }, [lat, lon]);

  const x = toX(lon);
  const y = toY(lat);
  const tone = LAYER_TONE[activeLayer];
  const tintStrength = Math.round((opacity / 100) * (25 + reading.intensity * 55));

  const fromEvent = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const ex = (e.clientX - r.left) / r.width;
    const ey = (e.clientY - r.top) / r.height;
    return {
      lat: Math.round((90 - ey * 180) * 100) / 100,
      lon: Math.round((ex * 360 - 180) * 100) / 100,
    };
  };

  const GlobeComponent = globeModule;
  const LeafletComp = leafletModule;

  return (
    <div
      ref={containerRef}
      id="globe-container"
      data-lat={lat}
      data-lon={lon}
      data-layer={activeLayer}
      className="relative w-full h-[480px] rounded-xl border border-cyan-500/30 bg-[#050811] overflow-hidden select-none"
    >
      {/* ---------------- 3D ORBITAL GLOBE MODE ---------------- */}
      {viewMode === "3d" && GlobeComponent && mounted ? (
        <div className="absolute inset-0">
          <GlobeComponent
            ref={globeRef}
            width={containerDimensions.width}
            height={containerDimensions.height}
            backgroundColor="#050811"
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            atmosphereColor="#00e5ff"
            atmosphereAltitude={0.22}
            arcsData={orbitArcsData}
            arcColor="color"
            arcDashLength={0.4}
            arcDashGap={0.2}
            arcDashAnimateTime={3000}
            arcAltitude={0.28}
            ringsData={hazardRingsData}
            ringColor={(d: unknown) => () => (d as { color?: string })?.color || "#00e5ff"}
            ringMaxRadius="maxR"
            ringPropagationSpeed="propagationSpeed"
            ringRepeatPeriod="repeatPeriod"
            pointsData={globePointsData}
            pointColor="color"
            pointAltitude={0.04}
            pointRadius={0.7}
            onGlobeClick={({ lat: clickLat, lng: clickLng }: { lat: number; lng: number }) => {
              onPick(Math.round(clickLat * 100) / 100, Math.round(clickLng * 100) / 100);
            }}
          />
        </div>
      ) : null}

      {/* ---------------- 2D FIELD GIS MODE (LEAFLET + NASA GIBS WMTS) ---------------- */}
      {viewMode === "2d" && LeafletComp && mounted ? (
        <div className="absolute inset-0 z-0">
          <LeafletComp.MapContainer
            center={[lat, lon]}
            zoom={12}
            scrollWheelZoom={true}
            style={{ width: "100%", height: "100%", background: "#050811" }}
          >
            {/* Esri World Imagery high-zoom satellite base layer */}
            <LeafletComp.TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
              attribution="Tiles &copy; Esri &mdash; High-Resolution Farm Satellite"
            />

            {/* NASA GIBS WMTS Raster Tile Layer */}
            <LeafletComp.TileLayer
              key={`${gibsConfig.layerName}-${gibsConfig.defaultDate}`}
              url={gibsTileUrl}
              maxZoom={gibsConfig.maxZoom}
              opacity={opacity / 100}
              zIndex={10}
              attribution="NASA GIBS WMTS"
            />

            {/* Interactive Farm Marker Pin */}
            <LeafletComp.Marker
              position={[lat, lon]}
              icon={
                new LeafletComp.L.DivIcon({
                  className: "custom-farm-pin",
                  html: `
                    <div style="position:relative; width:28px; height:28px;">
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
                <div className="font-mono text-xs p-1 text-slate-900">
                  <div className="font-bold text-cyan-600">FARM RETICLE</div>
                  <div>Lat: {lat.toFixed(4)}°</div>
                  <div>Lon: {lon.toFixed(4)}°</div>
                  <div className="mt-1 font-semibold text-emerald-600">
                    {activeLayer}: {reading.value} {reading.unit}
                  </div>
                </div>
              </LeafletComp.Popup>
            </LeafletComp.Marker>

            {/* Map click listener to pick coords */}
            <LeafletClickHandler onPick={onPick} useMapEvents={LeafletComp.useMapEvents} />
            <LeafletRecenter lat={lat} lon={lon} useMap={LeafletComp.useMap} />
          </LeafletComp.MapContainer>
        </div>
      ) : null}

      {/* ---------------- SSR & ENGINE LOADING FALLBACK GRID ---------------- */}
      {(!mounted ||
        (viewMode === "3d" && !GlobeComponent) ||
        (viewMode === "2d" && !LeafletComp)) && (
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
          {/* Equator & prime meridian */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-cyan/25" />
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-cyan/25" />

          {/* Crosshair on current target */}
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

          {/* Graticule labels */}
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
      )}

      {/* ---------------- TOP-LEFT RETICLE BADGE ---------------- */}
      <div
        data-hud-overlay="reticle"
        className="hud-card pointer-events-none absolute left-3 top-3 w-64 p-3 z-20 backdrop-blur-md bg-background/80"
      >
        <div className="flex items-center gap-2">
          <Radar className="size-3.5 text-cyan" />
          <span className="hud-label">Target Reticle</span>
          <span className="ml-auto size-1.5 animate-pulse rounded-full bg-emerald" />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-[11px]">
          <span className="text-muted-foreground">LAT</span>
          <span className="text-right tabular-nums text-cyan text-glow">
            {formatCoord(lat, "lat")}
          </span>
          <span className="text-muted-foreground">LON</span>
          <span className="text-right tabular-nums text-cyan text-glow">
            {formatCoord(lon, "lon")}
          </span>
          <span className="text-muted-foreground">ELEV</span>
          <span className="text-right tabular-nums">{meta.elevationM} m ASL</span>
          <span className="text-muted-foreground">PASS</span>
          <span className="text-right text-emerald truncate">{meta.satellitePass}</span>
          <span className="text-muted-foreground">NEXT</span>
          <span className="text-right tabular-nums">T-{meta.nextPassMin} min</span>
        </div>
      </div>

      {/* ---------------- TOP-RIGHT CONTROLS & LAYER READOUT ---------------- */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-2 z-20">
        {/* 3D WebGL vs 2D Leaflet GIS Mode Switcher Toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-background/85 p-1 backdrop-blur-md shadow-lg">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "h-7 px-2.5 font-mono text-xs transition-all",
              viewMode === "3d"
                ? "bg-cyan/25 text-cyan border border-cyan/60 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setViewMode("3d")}
          >
            <GlobeIcon className="mr-1.5 size-3.5 text-cyan" /> 3D Orbital
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "h-7 px-2.5 font-mono text-xs transition-all",
              viewMode === "2d"
                ? "bg-cyan/25 text-cyan border border-cyan/60 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setViewMode("2d")}
          >
            <MapIcon className="mr-1.5 size-3.5 text-cyan" /> 2D Field GIS
          </Button>
        </div>

        {/* Layer Readout Card */}
        <div
          data-hud-overlay="layer-readout"
          className="hud-card pointer-events-none p-3 text-right backdrop-blur-md bg-background/80 min-w-36"
        >
          <div className="flex items-center justify-end gap-1.5">
            <Radio className="size-3 text-emerald animate-pulse" />
            <span className="hud-label">{activeLayer}</span>
          </div>
          <div
            className="mt-1 font-mono text-2xl font-semibold tabular-nums"
            style={{ color: tone }}
          >
            {reading.value}
          </div>
          <div className="font-mono text-[10px] text-muted-foreground">{reading.unit}</div>
          <div className="mt-1 font-mono text-[9px] text-cyan/70 truncate max-w-44">
            GIBS: {gibsConfig.layerName}
          </div>
          {hover && (
            <div className="mt-2 border-t border-border pt-1 font-mono text-[10px] text-muted-foreground">
              cursor {hover.lat.toFixed(2)}, {hover.lon.toFixed(2)}
            </div>
          )}
        </div>
      </div>

      {/* ---------------- BOTTOM-CENTER LAYER SWITCHER + OPACITY ---------------- */}
      <div
        data-hud-overlay="layer-switcher"
        className="absolute inset-x-3 bottom-2.5 mx-auto flex max-w-3xl flex-col items-center gap-1.5 z-20 pointer-events-auto"
      >
        <div
          className="flex flex-wrap justify-center gap-1.5 bg-background/85 px-3 py-1.5 rounded-xl border border-cyan-500/30 backdrop-blur-md shadow-xl"
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
                "transition-all text-xs",
                activeLayer === l && "border-cyan/80 bg-cyan/20 text-cyan text-glow",
              )}
            >
              {l}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-3 rounded-full border border-cyan-500/30 bg-background/85 px-4 py-1 backdrop-blur-md shadow-lg">
          <Layers className="size-3.5 text-cyan" />
          <span className="hud-label">GIBS Opacity</span>
          <Slider
            aria-label="Layer opacity"
            className="w-36"
            min={0}
            max={100}
            step={1}
            value={[opacity]}
            onValueChange={([v]) => v !== undefined && onOpacity(v)}
          />
          <span className="w-8 text-right font-mono text-[11px] tabular-nums text-cyan">
            {opacity}%
          </span>
          <span className="hidden sm:inline-block border-l border-border pl-2 font-mono text-[10px] text-muted-foreground truncate">
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
        onPick(Math.round(e.latlng.lat * 1000) / 1000, Math.round(e.latlng.lng * 1000) / 1000);
      }
    },
  });
  return null;
}

// Leaflet map center updater
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
      map.panTo([lat, lon], { animate: true });
    }
  }, [lat, lon, map]);
  return null;
}
