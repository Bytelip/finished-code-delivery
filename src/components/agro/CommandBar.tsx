import { useEffect, useRef, useState, type KeyboardEvent } from "react";
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
  Globe2,
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
  searchDualProviderPlaces,
  type PlaceSearchResult,
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
  locationLabel,
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
  locationLabel?: string;
  onLocation: (lat: number, lon: number, label?: string) => void;
  onDepth: (d: number) => void;
  onIrrigation: (i: Irrigation) => void;
  onSeason: (s: Season) => void;
  onScenario: (s: Scenario) => void;
}) {
  const [locating, setLocating] = useState(false);
  const [accuracyBadge, setAccuracyBadge] = useState<{
    text: string;
    type: "pinned" | "high" | "coarse";
  } | null>(null);

  const [showInsecureBanner, setShowInsecureBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Search input & auto-complete states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const isInputFocused = useRef(false);

  // Synchronize location label into input if user is not typing
  useEffect(() => {
    if (locationLabel && !isInputFocused.current) {
      setSearchQuery(locationLabel);
    }
  }, [locationLabel]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search query to Dual-Provider Geocoder (Open-Meteo + Nominatim)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setDropdownOpen(false);
      setSelectedIndex(-1);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      const places = await searchDualProviderPlaces(q);
      setSearchResults(places);
      setSearching(false);
      setDropdownOpen(places.length > 0);
      setSelectedIndex(-1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Select place from search suggestions
  const selectPlace = (place: PlaceSearchResult) => {
    onLocation(place.lat, place.lon, place.name);
    setSearchQuery(place.name);
    setDropdownOpen(false);
    setSelectedIndex(-1);
    // Switch accuracy badge to emerald PINNED / SEARCH
    setAccuracyBadge({ text: "PINNED / SEARCH", type: "pinned" });
    toast.success(
      `Location locked: ${place.name} (${place.lat.toFixed(4)}°, ${place.lon.toFixed(4)}°)`,
    );
  };

  // Keyboard navigation for search input (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (searchResults.length > 0) {
        setDropdownOpen(true);
        setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (searchResults.length > 0) {
        setDropdownOpen(true);
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
      }
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
      setSelectedIndex(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      // If user selected an item from dropdown
      if (selectedIndex >= 0 && searchResults[selectedIndex]) {
        selectPlace(searchResults[selectedIndex]);
      } else if (searchResults.length > 0) {
        // Automatically select the top result if enter is pressed
        selectPlace(searchResults[0]);
      } else if (searchQuery.trim().length >= 2) {
        // Execute instant on-demand search
        setSearching(true);
        const places = await searchDualProviderPlaces(searchQuery.trim());
        setSearching(false);
        if (places.length > 0) {
          selectPlace(places[0]);
        } else {
          toast.error(
            `No locations found for "${searchQuery.trim()}". Try village, city, or pincode.`,
          );
        }
      }
    }
  };

  // Acquire High-Precision Location / GPS
  const locate = async () => {
    setLocating(true);
    try {
      const result = await resolvePreciseLocation();
      setLocating(false);

      if (result.isFallback || result.source === "ip-fallback") {
        setAccuracyBadge({
          text: `±${Math.round(result.accuracy)}m IP`,
          type: "coarse",
        });
      } else if (result.accuracy <= 100) {
        setAccuracyBadge({
          text: `±${Math.round(result.accuracy)}m`,
          type: "high",
        });
      } else {
        setAccuracyBadge({
          text: `±${(result.accuracy / 1000).toFixed(1)}km`,
          type: "coarse",
        });
      }

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

  const alert = scenario !== "Nominal";
  const host = typeof window !== "undefined" ? window.location.host : "192.168.0.3:8080";

  return (
    <div className="sticky top-0 z-[100] border-b border-border bg-background/80 backdrop-blur-xl">
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
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

          {/* Precision Accuracy / Pinned Badge */}
          {accuracyBadge !== null && (
            <span
              className={cn(
                "hidden sm:inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider",
                accuracyBadge.type === "pinned"
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                  : accuracyBadge.type === "high"
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan"
                    : "border-amber-500/40 bg-amber-500/10 text-amber",
              )}
              title={
                accuracyBadge.type === "pinned"
                  ? "Location confirmed via village/pincode search or map pin"
                  : `GPS accuracy: ${accuracyBadge.text}`
              }
            >
              {accuracyBadge.type === "pinned" ? (
                <Check className="size-3 text-emerald" />
              ) : (
                <Navigation className="size-2.5" />
              )}
              {accuracyBadge.text}
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

        {/* ---------------- AEROSPACE HUD PLACE / VILLAGE / PINCODE SEARCH ---------------- */}
        <div ref={searchContainerRef} className="relative w-56 sm:w-72 lg:w-80">
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-2.5 text-muted-foreground">
              {searching ? (
                <Loader2 className="size-3.5 animate-spin text-cyan" />
              ) : (
                <Search className="size-3.5 text-cyan/70" />
              )}
            </span>
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                isInputFocused.current = true;
                if (searchResults.length > 0) setDropdownOpen(true);
              }}
              onBlur={() => {
                isInputFocused.current = false;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search village, town, pincode..."
              className="h-8 pl-8 pr-7 font-mono text-xs bg-[#0B101E]/90 text-foreground placeholder:text-muted-foreground/60 border-cyan-500/30 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
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
                title="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* High-z-index Dark Aerospace HUD Dropdown Suggestions */}
          {dropdownOpen && searchResults.length > 0 && (
            <div className="absolute left-0 top-full z-[1000] mt-1 max-h-72 w-80 sm:w-96 overflow-y-auto rounded-lg border border-cyan-500/40 bg-[#0D1322] p-1.5 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between px-2.5 py-1 font-mono text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/50">
                <span className="flex items-center gap-1">
                  <Globe2 className="size-3 text-cyan" /> Geocoding Matches
                </span>
                <span>Press Enter to select</span>
              </div>
              <ul className="divide-y divide-border/30 mt-1">
                {searchResults.map((place, idx) => {
                  const isHighlighted = idx === selectedIndex;
                  return (
                    <li
                      key={place.id}
                      onClick={() => selectPlace(place)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectPlace(place);
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "flex cursor-pointer items-start gap-2.5 rounded-md p-2 text-xs transition-colors",
                        isHighlighted ? "bg-cyan-500/20 text-cyan" : "hover:bg-muted/50",
                      )}
                    >
                      <MapPin className="size-3.5 mt-0.5 shrink-0 text-cyan" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="font-semibold text-foreground truncate">
                            {place.name}
                          </span>
                          <span className="shrink-0 font-mono text-[10px] text-cyan/90">
                            [{place.lat.toFixed(4)}, {place.lon.toFixed(4)}]
                          </span>
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground truncate">
                          {place.subtitle}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* ---------------- BOREWELL SLIDER ---------------- */}
        <Field label="Borewell">
          <Slider
            aria-label="Borewell depth"
            className="w-28 sm:w-36"
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
