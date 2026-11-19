import React, { useEffect, useState } from "react";
import {
  Satellite,
  Radio,
  CloudRain,
  Wind,
  Thermometer,
  Droplets,
  Gauge,
  ChevronUp,
  ChevronDown,
  Check,
  Info,
  Sprout,
  Sparkles,
} from "lucide-react";
import {
  type ZoomEarthLayerId,
  type SubLayerId,
  ZOOM_EARTH_LAYERS_META,
} from "@/types/zoomEarthLayers";
import { MAP_LAYERS, type MapLayer } from "@/types/agroSpace";
import { cn } from "@/lib/utils";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import {
  fetchForecastAtmosphere,
  FORECAST_INFO,
  type AtmosphereMetricId,
  type ForecastAtmosphere,
} from "@/services/forecastAtmosphereService";

interface ZoomEarthSidebarProps {
  activeLayer: ZoomEarthLayerId;
  onLayerChange: (layer: ZoomEarthLayerId) => void;
  activeSubLayer: SubLayerId;
  onSubLayerChange: (sub: SubLayerId) => void;
  onOpenInfoModal: (layerId: ZoomEarthLayerId) => void;
  coordinates: { lat: number; lon: number };
  className?: string;
}

export function ZoomEarthSidebar({
  activeLayer,
  onLayerChange,
  activeSubLayer,
  onSubLayerChange,
  onOpenInfoModal,
  coordinates,
  className,
}: ZoomEarthSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isNasaSectionOpen, setIsNasaSectionOpen] = useState(false);

  const activeMeta = ZOOM_EARTH_LAYERS_META[activeLayer] || ZOOM_EARTH_LAYERS_META["satellite"]!;

  const handleSelectParent = (id: ZoomEarthLayerId) => {
    onLayerChange(id);
    const meta = ZOOM_EARTH_LAYERS_META[id];
    if (meta?.defaultSubOption) {
      onSubLayerChange(meta.defaultSubOption);
    }
  };

  if (isCollapsed) {
    return (
      <div
        className={cn(
          "absolute left-3 top-16 md:top-14 z-40 flex items-center gap-1.5 rounded-full bg-[#181C24]/90 backdrop-blur-xl border border-white/15 px-3 py-1.5 text-foreground shadow-2xl transition-all duration-200 cursor-pointer hover:bg-[#181C24]",
          className,
        )}
        onClick={() => setIsCollapsed(false)}
        title="Expand Map Layers Dashbar"
      >
        <span className="text-sm">{activeMeta.emoji}</span>
        <span className="font-sans font-semibold text-xs tracking-wide">{activeMeta.name}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenInfoModal(activeLayer);
          }}
          className="p-0.5 rounded-full hover:bg-white/20 text-foreground hover:text-foreground"
          title="Layer Information"
        >
          <Info className="size-3 text-cyan-300" />
        </button>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      data-hud-overlay="zoom-earth-sidebar"
      className={cn(
        "absolute left-3 top-16 md:top-14 z-40 w-56 rounded-xl bg-[#181C24]/92 backdrop-blur-2xl border border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.65)] p-2.5 text-foreground select-none transition-all duration-300 max-h-[82vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20",
        className,
      )}
    >
      {/* Dashbar Header */}
      <div className="flex items-center justify-between px-1.5 pb-2 border-b border-white/10 text-xs font-mono font-bold tracking-wider text-foreground">
        <span className="flex items-center gap-1.5 uppercase text-xs text-cyan-300">
          <Sparkles className="size-3 text-cyan-300" /> {<LocalizedText text={" MAP LAYERS"} />}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onOpenInfoModal(activeLayer)}
            className="p-1 rounded-lg hover:bg-white/15 text-foreground hover:text-foreground transition-colors"
            title="Layer Scientific Description"
          >
            <Info className="size-3.5 text-cyan-300" />
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded-lg hover:bg-white/15 text-foreground hover:text-foreground transition-colors"
            title="Collapse Dashbar"
          >
            <ChevronUp className="size-3.5" />
          </button>
        </div>
      </div>

      {/* SECTION 1: LIVE MAPS */}
      <div className="mt-2">
        <div className="px-1.5 text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
          {<LocalizedText text={"Live Maps"} />}
        </div>
        <div className="space-y-1">
          {/* Satellite */}
          <button
            type="button"
            onClick={() => handleSelectParent("satellite")}
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150",
              activeLayer === "satellite"
                ? "bg-white/15 border border-white/30 text-foreground font-semibold shadow-inner"
                : "text-foreground hover:bg-white/5 hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              <Satellite className="size-3.5 text-cyan-300" />{" "}
              {<LocalizedText text={" Satellite"} />}
            </span>
            {activeLayer === "satellite" && (
              <span className="text-xs text-cyan-300">{<LocalizedText text={"● LIVE"} />}</span>
            )}
          </button>

          {/* Radar */}
          <button
            type="button"
            onClick={() => handleSelectParent("radar")}
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150",
              activeLayer === "radar"
                ? "bg-white/15 border border-white/30 text-foreground font-semibold shadow-inner"
                : "text-foreground hover:bg-white/5 hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              <Radio className="size-3.5 text-emerald-400" /> {<LocalizedText text={" Radar"} />}
            </span>
            {activeLayer === "radar" && (
              <span className="text-xs text-emerald-400">{<LocalizedText text={"● LIVE"} />}</span>
            )}
          </button>
        </div>
      </div>

      <div className="mt-3">
        <div className="px-1.5 text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
          Forecast &amp; Atmosphere
        </div>
      </div>
      <ForecastAtmospherePanel
        coordinates={coordinates}
        activeLayer={activeLayer}
        onLayerChange={onLayerChange}
      />

      {/* SECTION 3: NASA AGRO & HAZARD LAYERS */}
      <div className="mt-3 pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={() => setIsNasaSectionOpen(!isNasaSectionOpen)}
          className="w-full flex items-center justify-between px-1.5 py-1 text-xs font-mono uppercase tracking-wider text-foreground hover:text-foreground rounded-lg hover:bg-white/5"
        >
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <Sprout className="size-3" /> {<LocalizedText text={" NASA AGRO ("} />}
            {MAP_LAYERS.length})
          </span>
          {isNasaSectionOpen ? (
            <ChevronUp className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          )}
        </button>
        {isNasaSectionOpen && (
          <div className="space-y-1 mt-1.5 animate-in fade-in duration-150">
            {MAP_LAYERS.map((layer: MapLayer) => {
              const meta = ZOOM_EARTH_LAYERS_META[layer];
              const isSelected = activeLayer === layer;
              return (
                <button
                  key={layer}
                  type="button"
                  onClick={() => handleSelectParent(layer)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs font-sans transition-colors",
                    isSelected
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 font-semibold"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                  )}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span>{meta?.emoji || "🌱"}</span>
                    <span className="truncate">{meta?.name || layer}</span>
                  </span>
                  {isSelected && <Check className="size-3 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Removed duplicated inline weather rows; ForecastAtmospherePanel owns them. */}
      {/* SECTION 3: NASA AGRO & HAZARD LAYERS */}
      <div className="mt-3 pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={() => setIsNasaSectionOpen(!isNasaSectionOpen)}
          className="w-full flex items-center justify-between px-1.5 py-1 text-xs font-mono uppercase tracking-wider text-foreground hover:text-foreground rounded-lg hover:bg-white/5"
        >
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <Sprout className="size-3" /> {<LocalizedText text={" NASA AGRO ("} />}
            {MAP_LAYERS.length})
          </span>
          {isNasaSectionOpen ? (
            <ChevronUp className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          )}
        </button>

        {isNasaSectionOpen && (
          <div className="space-y-1 mt-1.5 animate-in fade-in duration-150">
            {MAP_LAYERS.map((layer: MapLayer) => {
              const meta = ZOOM_EARTH_LAYERS_META[layer];
              const isSelected = activeLayer === layer;
              return (
                <button
                  key={layer}
                  type="button"
                  onClick={() => handleSelectParent(layer)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs font-sans transition-colors",
                    isSelected
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 font-semibold"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                  )}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span>{meta?.emoji || "🌱"}</span>
                    <span className="truncate">{meta?.name || layer}</span>
                  </span>
                  {isSelected && <Check className="size-3 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function ForecastAtmospherePanel({
  coordinates,
  activeLayer,
  onLayerChange,
}: {
  coordinates: { lat: number; lon: number };
  activeLayer: ZoomEarthLayerId;
  onLayerChange: (layer: ZoomEarthLayerId) => void;
}) {
  const [data, setData] = useState<ForecastAtmosphere | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<AtmosphereMetricId | null>(null);
  const [infoOpen, setInfoOpen] = useState<AtmosphereMetricId | null>(null);
  const [windHeight, setWindHeight] = useState<"10m" | "2m">("10m");
  const [windUnit, setWindUnit] = useState<"km/h" | "m/s">("km/h");
  const [temperatureUnit, setTemperatureUnit] = useState<"°C" | "°F">("°C");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(() => {
      fetchForecastAtmosphere(coordinates.lat, coordinates.lon, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) setData(result);
        })
        .catch(() => {
          if (!controller.signal.aborted) setData(null);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [coordinates.lat, coordinates.lon]);

  const rows: {
    id: AtmosphereMetricId;
    label: string;
    icon: typeof CloudRain;
    color: string;
    expandable?: boolean;
  }[] = [
    { id: "precipitation", label: "Precipitation", icon: CloudRain, color: "text-cyan-300" },
    { id: "wind", label: "Wind", icon: Wind, color: "text-emerald-400", expandable: true },
    {
      id: "temperature",
      label: "Temperature",
      icon: Thermometer,
      color: "text-amber-400",
      expandable: true,
    },
    { id: "humidity", label: "Humidity", icon: Droplets, color: "text-sky-300", expandable: true },
    { id: "pressure", label: "Pressure", icon: Gauge, color: "text-indigo-300" },
  ];
  const valueFor = (id: AtmosphereMetricId): number | null => {
    if (!data) return null;
    if (id === "wind")
      return windHeight === "2m" ? data.windSpeed2m.value : data.metrics.wind.value;
    return data.metrics[id].value;
  };
  const formatted = (id: AtmosphereMetricId): string => {
    const value = valueFor(id);
    if (value == null) return "—";
    if (id === "wind")
      return `${(value * (windUnit === "km/h" ? 3.6 : 1)).toFixed(1)} ${windUnit}${data?.windDirection == null ? "" : ` ${directionLabel(data.windDirection)}`}`;
    if (id === "temperature")
      return `${(temperatureUnit === "°F" ? (value * 9) / 5 + 32 : value).toFixed(1)} ${temperatureUnit}`;
    if (id === "precipitation")
      return `${value.toFixed(1)} ${data?.metrics.precipitation.cadence === "daily" ? "mm/d" : "mm/h"}`;
    if (id === "humidity") return `${Math.round(value)}%`;
    return `${Math.round(value)} hPa`;
  };
  const displayStat = (value: number | null, id: AtmosphereMetricId) => {
    if (value == null) return "—";
    if (id === "temperature")
      return `${(temperatureUnit === "°F" ? (value * 9) / 5 + 32 : value).toFixed(1)}${temperatureUnit}`;
    if (id === "wind") return `${(value * (windUnit === "km/h" ? 3.6 : 1)).toFixed(1)} ${windUnit}`;
    if (id === "humidity") return `${Math.round(value)}%`;
    if (id === "pressure") return `${Math.round(value)} hPa`;
    return `${value.toFixed(1)} ${data?.metrics.precipitation.cadence === "daily" ? "mm/d" : "mm/h"}`;
  };
  const select = (id: AtmosphereMetricId) => onLayerChange(id as ZoomEarthLayerId);

  return (
    <div>
      <div className="space-y-1">
        {rows.map(({ id, label, icon: Icon, color, expandable }) => {
          const active = activeLayer === id;
          const metric = data?.metrics[id];
          const info = FORECAST_INFO[id];
          const statMetric = id === "wind" && windHeight === "2m" ? data?.windSpeed2m : metric;
          const latestValue = metric?.baseline;
          const latestLabel = metric?.date
            ? `${metric.date} · NASA POWER baseline`
            : "NASA POWER · most recent valid daily value";
          const observation =
            metric?.cadence && metric.cadence !== "daily" ? data?.timestamp : metric?.date;
          const title = `NASA POWER / MERRA-2 · ${info.parameter} · ${info.resolution}. Submitted coordinate ${coordinates.lat.toFixed(3)}, ${coordinates.lon.toFixed(3)}. Observation: ${observation ?? "waiting for a valid value"}. Current value source: ${metric?.source ?? "loading"}.`;
          return (
            <div key={id} className="overflow-hidden rounded-lg">
              <div
                className={cn(
                  "flex items-center gap-1 rounded-lg border px-2 py-1.5 transition-colors",
                  active ? "bg-white/15 border-white/30" : "border-transparent hover:bg-white/5",
                )}
              >
                <button
                  type="button"
                  onClick={() => select(id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs"
                  title={title}
                  aria-pressed={active}
                >
                  <Icon className={cn("size-3.5 shrink-0", color)} />
                  <span className={cn("truncate", active && "font-semibold text-foreground")}>
                    {label}
                  </span>
                  {loading ? (
                    <span
                      className="ml-auto h-3 w-16 animate-pulse rounded bg-white/15"
                      aria-label="Loading"
                    />
                  ) : (
                    <span className="ml-auto whitespace-nowrap font-mono text-xs tabular-nums text-foreground">
                      {formatted(id)}
                    </span>
                  )}
                  {!loading && (
                    <span className="rounded bg-black/30 px-1 py-0.5 text-xs text-muted-foreground">
                      {metric?.source === "Open-Meteo"
                        ? "NOW"
                        : metric?.source === "NASA POWER"
                          ? "POWER"
                          : "—"}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  title={title}
                  aria-label={`${label} NASA data information`}
                  aria-expanded={infoOpen === id}
                  onClick={() => setInfoOpen(infoOpen === id ? null : id)}
                  className="rounded p-0.5 text-muted-foreground hover:text-cyan-300"
                >
                  <Info className="size-3" />
                </button>
                {expandable && (
                  <button
                    type="button"
                    aria-label={`${expanded === id ? "Collapse" : "Expand"} ${label} details`}
                    aria-expanded={expanded === id}
                    onClick={() => setExpanded(expanded === id ? null : id)}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    {expanded === id ? (
                      <ChevronUp className="size-3" />
                    ) : (
                      <ChevronDown className="size-3" />
                    )}
                  </button>
                )}
              </div>
              {infoOpen === id && (
                <div
                  role="tooltip"
                  className="mx-1 rounded-md border border-cyan-400/20 bg-slate-950/95 px-2 py-1.5 text-xs leading-relaxed text-muted-foreground shadow-lg"
                >
                  <b className="text-cyan-300">{info.dataset}</b>
                  <br />
                  Parameter: {info.parameter}
                  <br />
                  Resolution: {info.resolution}
                  <br />
                  Observation: {observation ?? "No valid observation yet"}. Value source:{" "}
                  {metric?.source ?? "loading"}.
                </div>
              )}
              {expanded === id && (
                <div className="ml-3 border-l-2 border-white/15 bg-black/25 px-2 py-2 text-xs text-muted-foreground">
                  {id === "wind" && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      <span className="mr-1 self-center">Height</span>
                      {(["2m", "10m"] as const).map((height) => (
                        <button
                          key={height}
                          type="button"
                          onClick={() => setWindHeight(height)}
                          className={cn(
                            "rounded px-1.5 py-0.5",
                            windHeight === height
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-white/5",
                          )}
                        >
                          {height}
                          {height === "2m" ? " ag surface" : " standard"}
                        </button>
                      ))}
                      <span className="ml-auto self-center">Units</span>
                      {(["m/s", "km/h"] as const).map((selectedUnit) => (
                        <button
                          key={selectedUnit}
                          type="button"
                          onClick={() => setWindUnit(selectedUnit)}
                          className={cn(
                            "rounded px-1.5 py-0.5",
                            windUnit === selectedUnit
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-white/5",
                          )}
                        >
                          {selectedUnit}
                        </button>
                      ))}
                    </div>
                  )}
                  {id === "temperature" && (
                    <div className="mb-2 flex gap-1">
                      <span className="self-center">Units</span>
                      {(["°C", "°F"] as const).map((selectedUnit) => (
                        <button
                          key={selectedUnit}
                          type="button"
                          onClick={() => setTemperatureUnit(selectedUnit)}
                          className={cn(
                            "rounded px-1.5 py-0.5",
                            temperatureUnit === selectedUnit
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-white/5",
                          )}
                        >
                          {selectedUnit}
                        </button>
                      ))}
                    </div>
                  )}
                  {id === "humidity" && (
                    <div className="mb-1">
                      Specific humidity:{" "}
                      {data?.specificHumidity == null
                        ? "—"
                        : `${data.specificHumidity.toFixed(2)} g/kg`}
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <span>
                      MIN
                      <br />
                      <b className="text-foreground">
                        {id === "temperature"
                          ? displayStat(data?.temperatureDaily.min ?? null, id)
                          : displayStat(statMetric?.min ?? null, id)}
                      </b>
                    </span>
                    <span>
                      MAX
                      <br />
                      <b className="text-foreground">
                        {id === "temperature"
                          ? displayStat(data?.temperatureDaily.max ?? null, id)
                          : displayStat(statMetric?.max ?? null, id)}
                      </b>
                    </span>
                    <span>
                      7D AVG
                      <br />
                      <b className="text-foreground">
                        {id === "temperature"
                          ? displayStat(data?.temperatureDaily.average ?? null, id)
                          : displayStat(statMetric?.average ?? null, id)}
                      </b>
                    </span>
                  </div>
                  <div className="mt-2 border-t border-white/10 pt-1">
                    {info.dataset} · {info.parameter}
                    <br />
                    {latestLabel}
                    <br />
                    Current source: {metric?.source ?? "loading"}
                    {latestValue != null && metric?.source === "Open-Meteo"
                      ? ` · ${displayStat(latestValue, id)}`
                      : ""}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div
        className="mt-1 px-2 text-xs leading-tight text-muted-foreground"
        title="Coordinates are submitted to point APIs; gridded source data represents the nearest native grid cell."
      >
        {loading
          ? "Querying coordinate…"
          : data
            ? `${data.coordinates.lat.toFixed(3)}, ${data.coordinates.lon.toFixed(3)} · ${data.loadingSource}`
            : `${coordinates.lat.toFixed(3)}, ${coordinates.lon.toFixed(3)} · data unavailable`}
      </div>
    </div>
  );
}

function directionLabel(degrees: number): string {
  return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][
    Math.round((((degrees % 360) + 360) % 360) / 45) % 8
  ]!;
}
