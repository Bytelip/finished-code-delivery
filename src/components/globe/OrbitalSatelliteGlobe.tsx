/**
 * OrbitalSatelliteGlobe — MapLibre GL globe projection that zooms smoothly from orbit
 * down to individual farm fields. Browser-only: load it with a dynamic import.
 *
 * Layers (bottom → top): Esri World Imagery, NASA GIBS overlay (adjustable opacity),
 * Esri boundaries & places labels, Esri transportation labels (field zooms only).
 */
import { memo, useEffect, useRef } from "react";
import maplibregl, {
  type Map as MaplibreMap,
  type ProjectionSpecification,
  type RasterTileSource,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  GLOBE_ATTRIBUTION,
  globeBasemapTileUrl,
  globeLabelsTileUrl,
  globeTransportationTileUrl,
} from "@/components/globe/globeTiles";
import {
  GLOBE_FLY_DURATION_MS,
  GLOBE_MAX_ZOOM,
  GLOBE_MIN_ZOOM,
  GLOBE_ZOOM_DURATION_MS,
  clampGlobeZoom,
  easeInOutCubic,
  flyToZoomFor,
  globeProjectionExpression,
  projectionModeForZoom,
} from "@/lib/orbitalZoom";

export interface OrbitalGlobeApi {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (zoom: number) => void;
  flyTo: (lat: number, lon: number, zoom?: number) => void;
  getZoom: () => number;
}

export interface OrbitalGlobeMarker {
  id: string;
  lat: number;
  lng: number;
  html: string;
}

export interface OrbitalSatelliteGlobeProps {
  lat: number;
  lon: number;
  initialZoom: number;
  basemapStyle: string;
  showLabels: boolean;
  overlayUrl: string;
  overlayMaxZoom: number;
  /** 0..1 */
  overlayOpacity: number;
  markers: OrbitalGlobeMarker[];
  onPick: (lat: number, lon: number) => void;
  onZoom: (zoom: number) => void;
  onLoading?: (loading: boolean) => void;
  onReady: (api: OrbitalGlobeApi | null) => void;
  onFailure?: () => void;
}

const round4 = (v: number) => Math.round(v * 10000) / 10000;

function cinematicFlight(lat: number, lon: number, zoom: number) {
  return {
    center: [lon, lat] as [number, number],
    zoom,
    essential: true,
    duration: GLOBE_FLY_DURATION_MS,
    easing: easeInOutCubic,
  };
}

function buildStyle(p: OrbitalSatelliteGlobeProps): StyleSpecification {
  return {
    version: 8,
    // Sphere in orbit, morphing into a flat mercator field map at 1 km altitude (and back).
    projection: {
      type: globeProjectionExpression() as unknown as NonNullable<ProjectionSpecification["type"]>,
    },
    sky: {
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 8, 0],
    },
    sources: {
      basemap: {
        type: "raster",
        tiles: [globeBasemapTileUrl(p.basemapStyle)],
        tileSize: 256,
        maxzoom: 19,
        attribution: GLOBE_ATTRIBUTION,
      },
      gibs: {
        type: "raster",
        tiles: [p.overlayUrl],
        tileSize: 256,
        maxzoom: p.overlayMaxZoom,
      },
      ...(p.showLabels
        ? {
            labels: {
              type: "raster" as const,
              tiles: [globeLabelsTileUrl(p.basemapStyle)],
              tileSize: 256,
              maxzoom: 19,
            },
            roads: {
              type: "raster" as const,
              tiles: [globeTransportationTileUrl()],
              tileSize: 256,
              maxzoom: 19,
            },
          }
        : {}),
    },
    layers: [
      { id: "space", type: "background", paint: { "background-color": "#02040a" } },
      { id: "basemap", type: "raster", source: "basemap" },
      {
        id: "gibs",
        type: "raster",
        source: "gibs",
        paint: { "raster-opacity": p.overlayOpacity, "raster-fade-duration": 200 },
      },
      ...(p.showLabels
        ? [
            {
              id: "roads",
              type: "raster" as const,
              source: "roads",
              minzoom: 11,
              paint: { "raster-opacity": 0.85 },
            },
            { id: "labels", type: "raster" as const, source: "labels" },
          ]
        : []),
    ],
  };
}

function OrbitalSatelliteGlobeImpl(props: OrbitalSatelliteGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const lastTargetRef = useRef<{ lat: number; lon: number }>({ lat: props.lat, lon: props.lon });
  // Latest props for event handlers registered once at mount.
  const propsRef = useRef(props);
  propsRef.current = props;

  // Create the map once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const initial = propsRef.current;
    lastTargetRef.current = { lat: initial.lat, lon: initial.lon };

    let map: MaplibreMap;
    try {
      map = new maplibregl.Map({
        container: el,
        style: buildStyle(initial),
        center: [initial.lon, initial.lat],
        zoom: clampGlobeZoom(initial.initialZoom),
        minZoom: GLOBE_MIN_ZOOM,
        maxZoom: GLOBE_MAX_ZOOM,
        attributionControl: { compact: true },
        renderWorldCopies: false,
        dragRotate: true,
        maxPitch: 70,
      });
    } catch (err) {
      console.warn("3D satellite globe unavailable, using 2D map:", err);
      initial.onFailure?.();
      return;
    }
    mapRef.current = map;

    // Keep the credits collapsed to the small (i) button so the bottom map dock never covers them.
    map.once("load", () => {
      el.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
    });

    // Missing tiles (ocean gaps, GIBS dates) are expected; keep them out of the error log.
    map.on("error", (e) => {
      const msg = String((e as { error?: { message?: string } }).error?.message ?? "");
      if (!/tile|Failed to fetch|AJAXError|404/i.test(msg)) console.warn("Globe:", msg);
    });

    // The projection itself morphs via the zoom expression; this only tags the DOM
    // so styles (starfield fade) and tests can read the current tier.
    const tagProjection = () => {
      el.dataset["projection"] = projectionModeForZoom(map.getZoom());
    };
    tagProjection();

    let raf = 0;
    let lastSent = Number.NaN;
    let lastZoomUpdateAt = 0;
    const updateTileState = () => propsRef.current.onLoading?.(true);
    const finishTileState = () => propsRef.current.onLoading?.(false);
    map.on("dataloading", updateTileState);
    map.on("idle", finishTileState);
    map.on("zoom", () => {
      tagProjection();
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (mapRef.current !== map) return;
        const z = map.getZoom();
        const now = performance.now();
        if (
          (Number.isNaN(lastSent) || Math.abs(z - lastSent) >= 0.01) &&
          now - lastZoomUpdateAt >= 100
        ) {
          lastSent = z;
          lastZoomUpdateAt = now;
          propsRef.current.onZoom(z);
        }
      });
    });

    // Exact value once an animation settles (rAF sampling can stop at 10.99 instead of 11).
    map.on("zoomend", () => {
      if (mapRef.current !== map) return;
      lastSent = map.getZoom();
      propsRef.current.onZoom(lastSent);
    });

    map.on("click", (e) => {
      const lat = round4(e.lngLat.lat);
      const lon = round4(e.lngLat.lng);
      lastTargetRef.current = { lat, lon };
      map.flyTo(cinematicFlight(lat, lon, flyToZoomFor(map.getZoom())));
      propsRef.current.onPick(lat, lon);
    });

    // Keep the locked reticle and coordinate-driven data aligned with a deliberate pan.
    map.on("moveend", () => {
      if (mapRef.current !== map) return;
      const center = map.getCenter();
      const lat = round4(center.lat);
      const lon = round4(center.lng);
      if (
        Math.abs(lastTargetRef.current.lat - lat) > 0.0005 ||
        Math.abs(lastTargetRef.current.lon - lon) > 0.0005
      ) {
        lastTargetRef.current = { lat, lon };
        propsRef.current.onPick(lat, lon);
      }
    });

    const api: OrbitalGlobeApi = {
      zoomIn: () => map.zoomIn({ duration: GLOBE_ZOOM_DURATION_MS }),
      zoomOut: () => map.zoomOut({ duration: GLOBE_ZOOM_DURATION_MS }),
      zoomTo: (z) => map.zoomTo(clampGlobeZoom(z), { duration: GLOBE_ZOOM_DURATION_MS }),
      flyTo: (lat, lon, zoom) => {
        lastTargetRef.current = { lat, lon };
        map.flyTo(cinematicFlight(lat, lon, clampGlobeZoom(zoom ?? flyToZoomFor(map.getZoom()))));
      },
      getZoom: () => map.getZoom(),
    };
    initial.onReady(api);
    initial.onZoom(map.getZoom());

    // Keep the canvas sized to the container (dock collapse, window resize).
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        if (mapRef.current === map) map.resize();
      });
      ro.observe(el);
    }

    return () => {
      ro?.disconnect();
      map.off("dataloading", updateTileState);
      map.off("idle", finishTileState);
      if (raf) cancelAnimationFrame(raf);
      for (const m of markersRef.current) m.remove();
      markersRef.current = [];
      mapRef.current = null;
      propsRef.current.onReady(null);
      map.remove();
    };
  }, []);

  // Fly to coordinates chosen outside the globe (search, presets, tour).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const prev = lastTargetRef.current;
    if (Math.abs(prev.lat - props.lat) < 0.0005 && Math.abs(prev.lon - props.lon) < 0.0005) return;
    lastTargetRef.current = { lat: props.lat, lon: props.lon };
    map.flyTo(cinematicFlight(props.lat, props.lon, flyToZoomFor(map.getZoom())));
  }, [props.lat, props.lon]);

  // Basemap + label tile swaps.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      (map.getSource("basemap") as RasterTileSource | undefined)?.setTiles([
        globeBasemapTileUrl(props.basemapStyle),
      ]);
      (map.getSource("labels") as RasterTileSource | undefined)?.setTiles([
        globeLabelsTileUrl(props.basemapStyle),
      ]);
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [props.basemapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      if (props.showLabels) {
        if (!map.getSource("labels")) {
          map.addSource("labels", {
            type: "raster",
            tiles: [globeLabelsTileUrl(props.basemapStyle)],
            tileSize: 256,
            maxzoom: 19,
          });
        }
        if (!map.getSource("roads")) {
          map.addSource("roads", {
            type: "raster",
            tiles: [globeTransportationTileUrl()],
            tileSize: 256,
            maxzoom: 19,
          });
        }
        if (!map.getLayer("roads"))
          map.addLayer(
            {
              id: "roads",
              type: "raster",
              source: "roads",
              minzoom: 11,
              paint: { "raster-opacity": 0.85 },
            },
            "gibs",
          );
        if (!map.getLayer("labels"))
          map.addLayer({ id: "labels", type: "raster", source: "labels" });
      } else {
        if (map.getLayer("labels")) map.removeLayer("labels");
        if (map.getLayer("roads")) map.removeLayer("roads");
        if (map.getSource("labels")) map.removeSource("labels");
        if (map.getSource("roads")) map.removeSource("roads");
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [props.showLabels]);

  // NASA GIBS overlay: swap layer when the telemetry layer changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      if (map.getLayer("gibs")) map.removeLayer("gibs");
      if (map.getSource("gibs")) map.removeSource("gibs");
      map.addSource("gibs", {
        type: "raster",
        tiles: [props.overlayUrl],
        tileSize: 256,
        maxzoom: props.overlayMaxZoom,
      });
      map.addLayer(
        {
          id: "gibs",
          type: "raster",
          source: "gibs",
          paint: { "raster-opacity": propsRef.current.overlayOpacity, "raster-fade-duration": 200 },
        },
        map.getLayer("roads") ? "roads" : undefined,
      );
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [props.overlayUrl, props.overlayMaxZoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer("gibs")) map.setPaintProperty("gibs", "raster-opacity", props.overlayOpacity);
  }, [props.overlayOpacity]);

  // Target reticle + hazard markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const m of markersRef.current) m.remove();
    markersRef.current = props.markers.map((item) => {
      const wrapper = document.createElement("div");
      wrapper.className = "orbital-globe-marker";
      wrapper.dataset["markerId"] = item.id;
      // Zero-size anchor: the marker HTML centres itself with translate(-50%,-50%).
      wrapper.style.width = "0";
      wrapper.style.height = "0";
      wrapper.innerHTML = item.html;
      wrapper.addEventListener("click", (ev) => ev.stopPropagation());
      return new maplibregl.Marker({ element: wrapper, anchor: "center" })
        .setLngLat([item.lng, item.lat])
        .addTo(map);
    });
  }, [props.markers]);

  return (
    <div
      ref={containerRef}
      data-globe-engine="maplibre-globe"
      className="orbital-satellite-globe"
      // Inline so maplibre-gl.css (`.maplibregl-map { position: relative }`) can't collapse it.
      style={{ position: "absolute", inset: 0 }}
      aria-label="3D satellite globe. Scroll or use the zoom buttons to zoom, drag to rotate, click to pick a field."
    />
  );
}

export const OrbitalSatelliteGlobe = memo(OrbitalSatelliteGlobeImpl);
export default OrbitalSatelliteGlobe;
