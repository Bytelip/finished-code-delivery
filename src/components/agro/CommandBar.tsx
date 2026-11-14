import { useEffect, useRef, useState } from "react";
import {
  Crosshair,
  Loader2,
  MapPin,
  Search,
  Navigation,
  AlertTriangle,
  ExternalLink,
  X,
  Check,
} from "lucide-react";
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
import {
  isInsecureLanContext,
  resolvePreciseLocation,
  searchNominatimPlaces,
  type NominatimPlace,
} from "@/utils/preciseLocation";

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
    <label className="flex items-center gap-1.5">
      <span className="hud-label text-[11px]">{label}</span>
      <Input
        inputMode="decimal"
        aria-label={label === "Lat" ? "Latitude" : "Longitude"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className="h-8 w-20 bg-background/60 font-mono text-xs tabular-nums px-2"
      />
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="hud-label text-[11px]">{label}</span>
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
  onLocation: (lat: number, lon: number, label?: string) => void;
  onDepth: (d: number) => void;
  onIrrigation: (i: Irrigation) => void;
  onSeason: (s: Season) => void;
  onScenario: (s: Scenario) => void;
}) {
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [showInsecureBanner, setShowInsecureBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Search input & auto-complete states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search query to OpenStreetMap Nominatim
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setDropdownOpen(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      const places = await searchNominatimPlaces(q);
      setSearchResults(places);
      setSearching(false);
      setDropdownOpen(places.length > 0);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Acquire High-Precision Location / GPS
  const locate = async () => {
    setLocating(true);
    try {
      const result = await resolvePreciseLocation();
      setLocating(false);
      setAccuracy(result.accuracy);

      onLocation(result.lat, result.lon, result.city || result.region);

      // Insecure LAN warning
      if (result.networkBlocked || isInsecureLanContext()) {
        setShowInsecureBanner(true);
        const host = typeof window !== "undefined" ? window.location.host : "192.168.0.3:8080";
        toast.warning(
          `Insecure LAN HTTP blocks hardware GPS. Approximate IP location used. Switch to https://${host} or set chrome://flags.`,
          { duration: 8000 },
        );
      } else if (result.isCoarse && result.warning) {
        // Laptop coarse Wi-Fi/IP location warning
        toast.warning(result.warning, { duration: 7000 });
      } else {
        toast.success(
          `Location locked: ${result.lat}°, ${result.lon}° (±${Math.round(result.accuracy)}m)`,
        );
      }
    } catch (err) {
      setLocating(false);
      console.warn("Location error:", err);
      toast.error("Could not acquire location. Please enter coordinates or search your village.");
    }
  };

  const selectPlace = (place: NominatimPlace) => {
    onLocation(place.lat, place.lon, place.shortName);
    setSearchQuery(place.shortName);
    setDropdownOpen(false);
    setAccuracy(null);
    toast.success(`Location set: ${place.shortName} (${place.lat}°, ${place.lon}°)`);
  };

  const alert = scenario !== "Nominal";
  const host = typeof window !== "undefined" ? window.location.host : "192.168.0.3:8080";

  return (
    <div className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
      {/* ---------------- INSECURE LAN HOST BANNER ---------------- */}
      {showInsecureBanner && !bannerDismissed && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 font-mono text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-400" />
            <span>
              Browsers block hardware GPS on insecure LAN IP (<code>http://{host}</code>).
              Approximate location used.
            </span>
            <a
              href={`https://${host}`}
              className="ml-1 inline-flex items-center gap-1 font-semibold text-cyan hover:underline"
            >
              Switch to HTTPS <ExternalLink className="size-3" />
            </a>
            <span className="hidden xl:inline text-muted-foreground ml-2">
              (or open <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code> and add{" "}
              <code>http://{host}</code>)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="text-muted-foreground hover:text-foreground p-0.5"
            title="Dismiss notice"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* ---------------- MAIN CONTROLS ROW ---------------- */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
        {/* Lat / Lon / Accuracy / GPS Trigger */}
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

          {/* Precision Accuracy Badge */}
          {accuracy !== null && (
            <span
              className={cn(
                "hidden sm:inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px]",
                accuracy <= 50
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald"
                  : accuracy <= 500
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan"
                    : "border-amber-500/40 bg-amber-500/10 text-amber",
              )}
              title={`Detected GPS accuracy: ±${Math.round(accuracy)} meters`}
            >
              <Navigation className="size-2.5" /> ±{Math.round(accuracy)}m
            </span>
          )}

          {/* High-Precision GPS Trigger Button */}
          <Button
            variant="hud"
            size="sm"
            onClick={locate}
            disabled={locating}
            aria-label="Acquire high-precision GPS location"
            className="h-8 px-2.5 text-xs font-mono"
            title="Acquire multi-sample high-precision GPS lock"
          >
            {locating ? (
              <Loader2 className="size-3.5 animate-spin mr-1" />
            ) : (
              <Crosshair className="size-3.5 mr-1 text-cyan" />
            )}
            GPS
          </Button>
        </div>

        {/* ---------------- PLACE / VILLAGE / PINCODE SEARCH INPUT ---------------- */}
        <div ref={searchContainerRef} className="relative w-52 sm:w-64">
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-2 text-muted-foreground">
              {searching ? (
                <Loader2 className="size-3.5 animate-spin text-cyan" />
              ) : (
                <Search className="size-3.5" />
              )}
            </span>
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setDropdownOpen(true)}
              placeholder="Search village, town, pincode..."
              className="h-8 pl-7 pr-2 font-mono text-xs bg-background/60 placeholder:text-muted-foreground/60 border-border/80"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setDropdownOpen(false);
                }}
                className="absolute right-2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Nominatim Search Dropdown Suggestions */}
          {dropdownOpen && searchResults.length > 0 && (
            <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-72 sm:w-80 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-2xl backdrop-blur-md">
              <div className="px-2 py-1 font-mono text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/50">
                OpenStreetMap Places
              </div>
              <ul className="divide-y divide-border/30">
                {searchResults.map((place) => (
                  <li
                    key={place.placeId}
                    onClick={() => selectPlace(place)}
                    className="flex cursor-pointer items-start gap-2 p-2 text-xs transition-colors hover:bg-muted/60"
                  >
                    <MapPin className="size-3.5 mt-0.5 shrink-0 text-cyan" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground truncate">
                        {place.shortName}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground truncate">
                        {place.displayName}
                      </div>
                      <div className="font-mono text-[10px] text-cyan/80">
                        {place.lat.toFixed(4)}°, {place.lon.toFixed(4)}°
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ---------------- BOREWELL SLIDER ---------------- */}
        <Field label="Borewell">
          <Slider
            aria-label="Borewell depth"
            className="w-32 sm:w-36"
            min={BOREWELL_DEPTH_RANGE.min}
            max={BOREWELL_DEPTH_RANGE.max}
            step={1}
            value={[borewellDepth]}
            onValueChange={([v]) => v !== undefined && onDepth(v)}
          />
          <span className="w-16 font-mono text-xs tabular-nums text-cyan">{borewellDepth} m</span>
        </Field>

        {/* ---------------- IRRIGATION SELECT ---------------- */}
        <Field label="Irrigation">
          <Select value={irrigation} onValueChange={(v) => onIrrigation(v as Irrigation)}>
            <SelectTrigger aria-label="Irrigation" className="h-8 w-26 bg-background/60 text-xs">
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

        {/* ---------------- SEASON SELECTOR ---------------- */}
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
                  "rounded px-2 py-0.5 text-xs transition-colors font-mono",
                  season === s
                    ? "bg-emerald/15 text-emerald font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>

        {/* ---------------- SCENARIO SIMULATOR ---------------- */}
        <Field label="Scenario">
          <Select value={scenario} onValueChange={(v) => onScenario(v as Scenario)}>
            <SelectTrigger
              aria-label="Scenario simulator"
              className={cn(
                "h-8 w-36 sm:w-40 bg-background/60 text-xs font-mono",
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
