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
  GLOBE_MAX_ZOOM,
  GLOBE_MIN_ZOOM,
  GLOBE_ZOOM_DURATION_MS,
  clampGlobeZoom,
  flyToZoomFor,
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
  onReady: (api: OrbitalGlobeApi | null) => void;
  onFailure?: () => void;
}

const round4 = (v: number) => Math.round(v * 10000) / 10000;

function buildStyle(p: OrbitalSatelliteGlobeProps): StyleSpecification {
  return {
    version: 8,
    projection: { type: "globe" },
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
      labels: {
        type: "raster",
        tiles: [globeLabelsTileUrl(p.basemapStyle)],
        tileSize: 256,
        maxzoom: 19,
      },
      roads: {
        type: "raster",
        tiles: [globeTransportationTileUrl()],
        tileSize: 256,
        maxzoom: 19,
      },
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
      {
        id: "roads",
        type: "raster",
        source: "roads",
        minzoom: 11,
        layout: { visibility: p.showLabels ? "visible" : "none" },
        paint: { "raster-opacity": 0.85 },
      },
      {
        id: "labels",
        type: "raster",
        source: "labels",
        layout: { visibility: p.showLabels ? "visible" : "none" },
      },
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

    // Missing tiles (ocean gaps, GIBS dates) are expected; keep them out of the error log.
    map.on("error", (e) => {
      const msg = String((e as { error?: { message?: string } }).error?.message ?? "");
      if (!/tile|Failed to fetch|AJAXError|404/i.test(msg)) console.warn("Globe:", msg);
    });

    let raf = 0;
    let lastSent = Number.NaN;
    map.on("zoom", () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (mapRef.current !== map) return;
        const z = map.getZoom();
        if (Number.isNaN(lastSent) || Math.abs(z - lastSent) >= 0.01) {
          lastSent = z;
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
      map.flyTo({ center: [lon, lat], zoom: flyToZoomFor(map.getZoom()), essential: true });
      propsRef.current.onPick(lat, lon);
    });

    const api: OrbitalGlobeApi = {
      zoomIn: () => map.zoomIn({ duration: GLOBE_ZOOM_DURATION_MS }),
      zoomOut: () => map.zoomOut({ duration: GLOBE_ZOOM_DURATION_MS }),
      zoomTo: (z) => map.zoomTo(clampGlobeZoom(z), { duration: 0 }),
      flyTo: (lat, lon, zoom) => {
        lastTargetRef.current = { lat, lon };
        map.flyTo({
          center: [lon, lat],
          zoom: clampGlobeZoom(zoom ?? flyToZoomFor(map.getZoom())),
          essential: true,
        });
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
    map.flyTo({ center: [props.lon, props.lat], zoom: flyToZoomFor(map.getZoom()), essential: true });
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
      const v = props.showLabels ? "visible" : "none";
      if (map.getLayer("labels")) map.setLayoutProperty("labels", "visibility", v);
      if (map.getLayer("roads")) map.setLayoutProperty("roads", "visibility", v);
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
        "roads",
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
