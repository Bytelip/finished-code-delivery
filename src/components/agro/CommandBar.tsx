import { useEffect, useState } from "react";
import { Crosshair, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  BOREWELL_DEPTH_RANGE,
  IRRIGATION_TYPES,
  SCENARIOS,
  SEASONS,
  type Irrigation,
  type Scenario,
  type Season,
} from "@/types/agroSpace";

function CoordInput({
  label,
  value,
  min,
  max,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(n)) return setDraft(String(value));
    const c = Math.min(max, Math.max(min, Math.round(n * 10000) / 10000));
    onCommit(c);
    setDraft(String(c));
  };
  return (
    <label className="flex items-center gap-2">
      <span className="hud-label">{label}</span>
      <Input
        inputMode="decimal"
        aria-label={label === "Lat" ? "Latitude" : "Longitude"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className="h-8 w-24 bg-background/60 font-mono text-xs tabular-nums"
      />
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="hud-label">{label}</span>
      {children}
    </div>
  );
}

export function CommandBar({
  lat,
  lon,
  borewellDepth,
  irrigation,
  season,
  scenario,
  onLocation,
  onDepth,
  onIrrigation,
  onSeason,
  onScenario,
}: {
  lat: number;
  lon: number;
  borewellDepth: number;
  irrigation: Irrigation;
  season: Season;
  scenario: Scenario;
  onLocation: (lat: number, lon: number) => void;
  onDepth: (d: number) => void;
  onIrrigation: (i: Irrigation) => void;
  onSeason: (s: Season) => void;
  onScenario: (s: Scenario) => void;
}) {
  const [locating, setLocating] = useState(false);
  const locate = () => {
    if (!("geolocation" in navigator)) {
      toast.error("GPS isn't available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onLocation(
          Math.round(pos.coords.latitude * 10000) / 10000,
          Math.round(pos.coords.longitude * 10000) / 10000,
        );
        toast.success("Location locked from GPS");
      },
      () => {
        setLocating(false);
        toast.error("Couldn't read your location. Check browser permissions.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const alert = scenario !== "Nominal";

  return (
    <div className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <CoordInput
            label="Lat"
            value={lat}
            min={-90}
            max={90}
            onCommit={(v) => onLocation(v, lon)}
          />
          <CoordInput
            label="Lon"
            value={lon}
            min={-180}
            max={180}
            onCommit={(v) => onLocation(lat, v)}
          />
          <Button
            variant="hud"
            size="sm"
            onClick={locate}
            disabled={locating}
            aria-label="Use GPS location"
          >
            {locating ? <Loader2 className="animate-spin" /> : <Crosshair />}
            GPS
          </Button>
        </div>

        <Field label="Borewell">
          <Slider
            aria-label="Borewell depth"
            className="w-36"
            min={BOREWELL_DEPTH_RANGE.min}
            max={BOREWELL_DEPTH_RANGE.max}
            step={1}
            value={[borewellDepth]}
            onValueChange={([v]) => v !== undefined && onDepth(v)}
          />
          <span className="w-20 font-mono text-xs tabular-nums text-cyan">
            {borewellDepth} m mbgl
          </span>
        </Field>

        <Field label="Irrigation">
          <Select value={irrigation} onValueChange={(v) => onIrrigation(v as Irrigation)}>
            <SelectTrigger aria-label="Irrigation" className="h-8 w-28 bg-background/60 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IRRIGATION_TYPES.map((i) => (
                <SelectItem key={i} value={i}>
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Season">
          <div
            className="flex rounded-md border border-border bg-background/60 p-0.5"
            role="radiogroup"
            aria-label="Season"
          >
            {SEASONS.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={season === s}
                onClick={() => onSeason(s)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs transition-colors",
                  season === s
                    ? "bg-emerald/15 text-emerald"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Scenario">
          <Select value={scenario} onValueChange={(v) => onScenario(v as Scenario)}>
            <SelectTrigger
              aria-label="Scenario simulator"
              className={cn(
                "h-8 w-40 bg-background/60 text-xs",
                alert && "border-crimson/60 text-crimson",
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCENARIOS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {alert && <span className="size-2 animate-pulse rounded-full bg-crimson" aria-hidden />}
        </Field>
      </div>
    </div>
  );
}
