import { useState, type MouseEvent } from "react";
import { Layers, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatCoord } from "@/components/agro/hud";
import { MAP_LAYERS, type AgroTelemetry, type MapLayer } from "@/types/agroSpace";

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

export function GlobeContainer({
  telemetry,
  activeLayer,
  onLayer,
  opacity,
  onOpacity,
  onPick,
}: {
  telemetry: AgroTelemetry;
  activeLayer: MapLayer;
  onLayer: (l: MapLayer) => void;
  opacity: number;
  onOpacity: (o: number) => void;
  onPick: (lat: number, lon: number) => void;
}) {
  const { lat, lon } = telemetry.input;
  const { meta } = telemetry;
  const reading = telemetry.layers[activeLayer];
  const [hover, setHover] = useState<{ lat: number; lon: number } | null>(null);

  const fromEvent = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    return {
      lat: Math.round((90 - y * 180) * 100) / 100,
      lon: Math.round((x * 360 - 180) * 100) / 100,
    };
  };

  const x = toX(lon);
  const y = toY(lat);
  const tone = LAYER_TONE[activeLayer];
  const tintStrength = Math.round((opacity / 100) * (25 + reading.intensity * 55));

  return (
    <div
      id="globe-container"
      data-lat={lat}
      data-lon={lon}
      data-layer={activeLayer}
      className="relative w-full h-[440px] rounded-xl border border-cyan-500/30 bg-[#050811] overflow-hidden"
    >
      {/* Clickable equirectangular coordinate grid (test harness until the 3D engine mounts) */}
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

      {/* Top-left reticle badge */}
      <div
        data-hud-overlay="reticle"
        className="hud-card pointer-events-none absolute left-3 top-6 w-64 p-3"
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
          <span className="text-right text-emerald">{meta.satellitePass}</span>
          <span className="text-muted-foreground">NEXT</span>
          <span className="text-right tabular-nums">T-{meta.nextPassMin} min</span>
        </div>
      </div>

      {/* Top-right layer readout */}
      <div
        data-hud-overlay="layer-readout"
        className="hud-card pointer-events-none absolute right-8 top-6 p-3 text-right"
      >
        <div className="hud-label">{activeLayer}</div>
        <div className="mt-1 font-mono text-2xl font-semibold tabular-nums" style={{ color: tone }}>
          {reading.value}
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">{reading.unit}</div>
        {hover && (
          <div className="mt-2 border-t border-border pt-2 font-mono text-[10px] text-muted-foreground">
            cursor {hover.lat.toFixed(2)}, {hover.lon.toFixed(2)}
          </div>
        )}
      </div>

      {/* Bottom-center layer switcher + opacity */}
      <div
        data-hud-overlay="layer-switcher"
        className="absolute inset-x-3 bottom-3 mx-auto flex max-w-3xl flex-col items-center gap-2"
      >
        <div
          className="flex flex-wrap justify-center gap-1.5"
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
            >
              {l}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-3 rounded-full border border-border bg-background/70 px-4 py-1.5 backdrop-blur">
          <Layers className="size-3.5 text-cyan" />
          <span className="hud-label">Opacity</span>
          <Slider
            aria-label="Layer opacity"
            className="w-40"
            min={0}
            max={100}
            step={1}
            value={[opacity]}
            onValueChange={([v]) => v !== undefined && onOpacity(v)}
          />
          <span className="w-9 text-right font-mono text-[11px] tabular-nums text-cyan">
            {opacity}%
          </span>
        </div>
      </div>
    </div>
  );
}
