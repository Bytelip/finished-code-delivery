import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
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
  SlidersHorizontal,
  Rocket,
  Clock,
  Radio,
  Satellite,
  Menu,
  ChevronDown,
  ChevronUp,
  GraduationCap,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { useLanguage } from "@/context/LanguageContext";
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
import { OperatorProfileDropdown } from "@/components/OperatorProfileDropdown";
import { UserProfileNavbarWidget } from "@/components/CosmicAuthPage";
import type { UserProfile } from "@/types/userProfile";
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
    <label className="flex items-center gap-1.5 rounded border border-border/40 bg-card/60 px-2 py-1 shadow-inner focus-within:border-cyan/70 focus-within:shadow-[0_0_10px_rgba(0,240,255,0.25)] transition-all">
      <span className="hud-label text-[10px] text-cyan/80 font-bold">{label}</span>
      <Input
        inputMode="decimal"
        aria-label={label === "Lat" ? "Latitude" : "Longitude"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className="h-6 w-18 border-0 bg-transparent p-0 font-mono text-xs font-semibold tabular-nums text-foreground focus-visible:ring-0 focus-visible:outline-none"
      />
    </label>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded border border-border/30 bg-card/40 px-2.5 py-1.5 backdrop-blur-sm min-w-0",
        className,
      )}
    >
      <span className="hud-label text-[10px] text-muted-foreground font-semibold shrink-0">
        {label}
      </span>
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
  profile,
  onOpenAuth,
  onOpenSettings,
  onNavigateHome,
  onSignOut,
  onUpdateUser,
  onOpenMissionBrief,
  onOpenTour,
  onToggleSidebar,
  sidebarCollapsed,
  plantHealthOverall,
  elevationM,
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
  profile?: UserProfile | null;
  onOpenAuth?: () => void;
  onOpenSettings?: () => void;
  onNavigateHome?: (lat: number, lon: number, label: string) => void;
  onSignOut?: () => void;
  onUpdateUser?: (u: UserProfile) => void;
  onOpenMissionBrief?: () => void;
  onOpenTour?: () => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  plantHealthOverall?: number;
  elevationM?: number;
}) {
  const [metSeconds, setMetSeconds] = useState(142 * 3600 + 18 * 60 + 22);

  useEffect(() => {
    const timer = setInterval(() => {
      setMetSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const metFormatted = useMemo(() => {
    const h = Math.floor(metSeconds / 3600);
    const m = Math.floor((metSeconds % 3600) / 60);
    const s = metSeconds % 60;
    return `T+ ${String(h).padStart(3, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [metSeconds]);

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
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const isInputFocused = useRef(false);

  const { t } = useLanguage();

  // Popover Drawer for Field Parameters & Search (Closed by default!)
  const [isParamsDrawerOpen, setIsParamsDrawerOpen] = useState(false);
  const paramsDrawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsParamsDrawerOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isParamsDrawerOpen) {
        setIsParamsDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isParamsDrawerOpen]);

  // Click outside to close floating parameters drawer
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isParamsDrawerOpen &&
        paramsDrawerRef.current &&
        !paramsDrawerRef.current.contains(e.target as Node)
      ) {
        const target = e.target as HTMLElement;
        if (!target.closest("[data-params-trigger]")) {
          setIsParamsDrawerOpen(false);
        }
      }
    };
    if (isParamsDrawerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isParamsDrawerOpen]);

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
      if (selectedIndex >= 0 && searchResults[selectedIndex]) {
        selectPlace(searchResults[selectedIndex]!);
      } else if (searchResults.length > 0) {
        selectPlace(searchResults[0]!);
      } else if (searchQuery.trim().length >= 2) {
        setSearching(true);
        const places = await searchDualProviderPlaces(searchQuery.trim());
        setSearching(false);
        if (places.length > 0) {
          selectPlace(places[0]!);
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
    <div className="sticky top-0 z-[100] border-b border-border/80 bg-background/85 backdrop-blur-2xl shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
      {/* ---------------- INSECURE LAN HOST BANNER ---------------- */}
      {showInsecureBanner && !bannerDismissed && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 font-mono text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-400" />
            <span>
              Browsers block hardware GPS on insecure LAN HTTP (<code>http://{host}</code>).
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

      {/* ---------------- 1. SINGLE UNIFIED GLASS NAVBAR (h-13) ---------------- */}
      <div className="w-full max-w-full min-h-13 px-2 sm:px-4 py-1 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3 border-b border-white/[0.08] bg-[#050912]/90 backdrop-blur-2xl relative z-40">
        {/* Left: Crisp Brand Emblem + AgroSpace Nexus title + Live Coordinate Pill */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0 whitespace-nowrap">
          {/* Brand Emblem */}
          <div className="grid size-7.5 place-items-center rounded-xl border border-cyan-400/50 bg-cyan-500/15 text-cyan-300 shadow-[0_0_14px_rgba(0,240,255,0.35)] shrink-0">
            <Satellite className="size-4 animate-pulse text-cyan-300" />
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="hidden sm:inline font-mono font-bold text-xs sm:text-sm tracking-wider text-white">
              AgroSpace Nexus
            </span>
            <span className="text-[9.5px] text-cyan-300 font-semibold px-1.5 py-0.2 rounded-full bg-cyan-500/15 border border-cyan-400/30">
              v2.4
            </span>
          </div>

          {/* Live Coordinate Pill */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-xs font-mono text-muted-foreground shrink-0 whitespace-nowrap">
            <MapPin className="size-3 text-cyan-400 shrink-0 drop-shadow-[0_0_6px_#00f0ff]" />
            <span className="text-white font-medium">
              📍 {locationLabel ? `${locationLabel} • ` : ""}{lat.toFixed(2)}°N, {lon.toFixed(2)}°E
            </span>
          </div>
        </div>

        {/* Center: Sleek single-line Command Pill */}
        <div data-tour="search-field-params" className="flex items-center justify-center shrink-0 order-3 sm:order-none w-full sm:w-auto">
          <button
            type="button"
            data-params-trigger="true"
            onClick={() => setIsParamsDrawerOpen((prev) => !prev)}
            className={cn(
              "whitespace-nowrap inline-flex items-center gap-2 h-8.5 px-3.5 py-1 rounded-full border text-xs font-mono font-semibold transition-all cursor-pointer shadow-inner shrink-0",
              isParamsDrawerOpen
                ? "bg-cyan-500/20 border-cyan-400/60 text-cyan-200 shadow-[0_0_18px_rgba(6,182,212,0.35)]"
                : "bg-white/[0.04] hover:bg-white/[0.08] border-white/15 text-cyan-300/90 hover:border-cyan-500/40"
            )}
            title="Search Location or Field Params (⌘K)"
          >
            <Search className="size-3.5 text-cyan-400 shrink-0 drop-shadow-[0_0_6px_rgba(0,240,255,0.6)]" />
            <span className="font-semibold whitespace-nowrap hidden sm:inline">
              🔍 {t("search_params", "Search Location or Field Params")}
            </span>
            <span className="font-semibold whitespace-nowrap sm:hidden">
              🔍 {t("search", "Search")}
            </span>
            <kbd className="hidden md:inline-block px-1.5 py-0.2 rounded bg-black/40 border border-white/10 text-[9px] text-white/50 font-sans">
              ⌘K
            </kbd>
            {isParamsDrawerOpen ? (
              <ChevronUp className="size-3 text-cyan-400 shrink-0" />
            ) : (
              <ChevronDown className="size-3 text-cyan-400/70 shrink-0" />
            )}
          </button>
        </div>

        {/* Right: Compact icon-first action pills */}
        <div
          data-tour="top-right-controls"
          className="flex items-center gap-1 sm:gap-2 shrink-0 max-w-full whitespace-nowrap"
        >
          {plantHealthOverall !== undefined && (
            <div className="hidden 2xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-mono text-xs font-semibold shadow-[0_0_10px_rgba(16,185,129,0.15)] select-none shrink-0 whitespace-nowrap">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {t("health", "Health")}: {Math.round(plantHealthOverall)}/100
              </span>
            </div>
          )}

          {/* 🌐 Prominent Language Selector Dropdown */}
          <div className="shrink-0 whitespace-nowrap">
            <LanguageSelector />
          </div>

          {/* Theme Switcher */}
          <div className="shrink-0 whitespace-nowrap">
            <ThemeSwitcher />
          </div>

          {/* Mission Brief Button */}
          <Button
            type="button"
            size="sm"
            onClick={onOpenMissionBrief}
            className="h-8 px-2.5 py-1 text-xs font-mono font-bold tracking-wider rounded-full bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 shadow-[0_0_14px_rgba(6,182,212,0.25)] transition-all flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
            title="Open NASA Space Apps Mission Brief"
          >
            <Rocket className="size-3.5 text-cyan-400 animate-pulse shrink-0" />
            <span className="hidden sm:inline">🚀 {t("brief", "Brief")}</span>
          </Button>

          {/* 🎓 Interactive Guided Tour Button */}
          {onOpenTour && (
            <Button
              type="button"
              size="sm"
              onClick={onOpenTour}
              className="h-8 px-2.5 py-1 text-xs font-mono font-bold tracking-wider rounded-full bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 shadow-[0_0_14px_rgba(6,182,212,0.25)] transition-all flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
              title="Start Interactive Guided Tour"
            >
              <GraduationCap className="size-3.5 text-cyan-400 animate-pulse shrink-0" />
              <span className="hidden sm:inline">🎓 {t("tour", "Tour")}</span>
            </Button>
          )}

          {/* Operator Profile Avatar */}
          <div className="shrink-0 whitespace-nowrap">
            {profile ? (
              <UserProfileNavbarWidget
                user={profile}
                onUpdateUser={(updated) => onUpdateUser?.(updated)}
                onLogout={() => onSignOut?.()}
                onNavigateHome={(locStr) => onNavigateHome?.(12.6622, 77.4503, locStr)}
              />
            ) : (
              <OperatorProfileDropdown
                profile={null}
                onOpenAuth={onOpenAuth || (() => {})}
                onOpenSettings={onOpenSettings || (() => {})}
                onNavigateHome={onNavigateHome}
                onSignOut={onSignOut || (() => {})}
              />
            )}
          </div>
        </div>
      </div>

      {/* ---------------- 2. FLOATING FIELD PARAMETERS DRAWER OVERLAY (ABSOLUTE POPOVER) ---------------- */}
      <div
        ref={paramsDrawerRef}
        className={cn(
          "transition-all duration-300 z-50 absolute top-14 left-1/2 -translate-x-1/2 w-[94%] max-w-4xl rounded-2xl bg-[#070D19]/95 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_24px_70px_rgba(0,0,0,0.9)] p-4",
          isParamsDrawerOpen
            ? "opacity-100 scale-100 pointer-events-auto visible"
            : "opacity-0 scale-95 pointer-events-none invisible max-h-0 overflow-hidden p-0 border-0"
        )}
      >
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-cyan-400" />
            <span className="font-mono text-xs font-bold text-cyan-300 tracking-wider uppercase">
              Field Target & Simulation Parameters
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsParamsDrawerOpen(false)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white font-mono text-xs transition-colors cursor-pointer"
            title="Close Parameters Drawer"
          >
            <X className="size-3.5" /> {t("done", "Done")}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Cluster 1: Lat / Lon / Accuracy / GPS / Search */}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
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
                  "inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider shrink-0",
                  accuracyBadge.type === "pinned"
                    ? "border-emerald-500/60 bg-emerald-500/20 text-emerald shadow-[0_0_10px_rgba(0,255,157,0.3)]"
                    : accuracyBadge.type === "high"
                      ? "border-cyan-500/50 bg-cyan-500/15 text-cyan shadow-[0_0_10px_rgba(0,240,255,0.25)]"
                      : "border-amber-500/50 bg-amber-500/15 text-amber shadow-[0_0_10px_rgba(255,183,0,0.25)]"
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
              className="h-7 px-2.5 text-xs font-mono font-semibold shrink-0"
              title="Acquire multi-sample high-precision GPS lock"
            >
              {locating ? (
                <Loader2 className="size-3 animate-spin mr-1 text-cyan" />
              ) : (
                <Crosshair className="size-3 mr-1 text-cyan drop-shadow-[0_0_6px_#00f0ff]" />
              )}
              GPS
            </Button>

            {/* Place Search Input & Dropdown */}
            <div ref={searchContainerRef} className="relative w-52 sm:w-64 shrink-0">
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-2 text-muted-foreground">
                  {searching ? (
                    <Loader2 className="size-3.5 animate-spin text-cyan" />
                  ) : (
                    <Search className="size-3.5 text-cyan drop-shadow-[0_0_6px_rgba(0,240,255,0.6)]" />
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
                  className="h-7.5 w-full pl-7 pr-6 font-mono text-xs bg-card/90 text-foreground placeholder:text-muted-foreground/50 border-cyan/40 focus:border-cyan focus:ring-1 focus:ring-cyan shadow-[0_0_12px_rgba(0,240,255,0.15)] truncate"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                      setDropdownOpen(false);
                    }}
                    className="absolute right-2 text-muted-foreground hover:text-cyan"
                    title="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* High-z-index Dark Aerospace HUD Dropdown Suggestions */}
              {dropdownOpen && searchResults.length > 0 && (
                <div className="absolute left-0 top-full z-[1000] mt-1.5 max-h-72 w-80 sm:w-96 overflow-y-auto rounded-lg border border-cyan/50 bg-[#060a14]/95 p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                  <div className="flex items-center justify-between px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/40">
                    <span className="flex items-center gap-1.5 text-cyan font-semibold">
                      <Globe2 className="size-3 text-cyan" /> Dual Geocoder Target Locks
                    </span>
                    <span className="text-[9px] text-muted-foreground/70">Enter to lock</span>
                  </div>
                  <ul className="divide-y divide-border/25 mt-1">
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
                            "flex cursor-pointer items-start gap-2.5 rounded-md p-2 text-xs transition-all",
                            isHighlighted
                              ? "bg-cyan/20 text-cyan border border-cyan/40 shadow-[0_0_12px_rgba(0,240,255,0.25)]"
                              : "hover:bg-card/70 border border-transparent"
                          )}
                        >
                          <MapPin className="size-3.5 mt-0.5 shrink-0 text-cyan drop-shadow-[0_0_6px_#00f0ff]" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-1">
                              <span className="font-semibold text-foreground truncate">
                                {place.name}
                              </span>
                              <span className="shrink-0 font-mono text-[10px] text-cyan font-bold">
                                [{place.lat.toFixed(4)}°, {place.lon.toFixed(4)}°]
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
          </div>

          {/* Cluster 2: Borewell Depth, Irrigation, Season, Sim Scenario */}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {/* Borewell Depth Slider */}
            <Field label="Borewell" className="shrink-0 whitespace-nowrap">
              <Slider
                aria-label="Borewell depth"
                className="w-16 sm:w-20"
                min={BOREWELL_DEPTH_RANGE.min}
                max={BOREWELL_DEPTH_RANGE.max}
                step={1}
                value={[borewellDepth]}
                onValueChange={([v]) => v !== undefined && onDepth(v)}
              />
              <span className="w-10 text-right font-mono text-xs font-bold tabular-nums text-cyan drop-shadow-[0_0_6px_rgba(0,240,255,0.4)]">
                {borewellDepth}m
              </span>
            </Field>

            {/* Irrigation Select */}
            <Field label="Irrigation" className="shrink-0 whitespace-nowrap min-w-[125px]">
              <Select value={irrigation} onValueChange={(v) => onIrrigation(v as Irrigation)}>
                <SelectTrigger
                  aria-label="Irrigation"
                  className="h-7 w-28 bg-background/80 text-xs font-mono border-border/60 shrink-0"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border/80 bg-[#080d1a]/95 backdrop-blur-xl">
                  {IRRIGATION_TYPES.map((i) => (
                    <SelectItem key={i} value={i} className="text-xs font-mono">
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Season Radios */}
            <Field label="Season" className="shrink-0 whitespace-nowrap">
              <div
                className="flex rounded border border-border/50 bg-background/80 p-0.5"
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
                      "rounded px-2 py-0.5 text-[10.5px] transition-all font-mono font-semibold cursor-pointer",
                      season === s
                        ? "bg-emerald/20 text-emerald shadow-[0_0_10px_rgba(0,255,157,0.3)] border border-emerald/50"
                        : "text-muted-foreground hover:text-foreground border border-transparent"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>

            {/* Sim Scenario Select */}
            <Field label="Sim Scenario" className="shrink-0 whitespace-nowrap min-w-[130px]">
              <Select value={scenario} onValueChange={(v) => onScenario(v as Scenario)}>
                <SelectTrigger
                  aria-label="Scenario simulator"
                  className={cn(
                    "h-7 w-28 bg-background/80 text-xs font-mono font-semibold truncate shrink-0",
                    alert
                      ? "border-crimson/70 text-crimson shadow-[0_0_12px_rgba(255,46,86,0.35)]"
                      : "border-border/60"
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border/80 bg-[#080d1a]/95 backdrop-blur-xl">
                  {SCENARIOS.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs font-mono">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {alert && (
                <span
                  className="size-2 animate-pulse rounded-full bg-crimson shadow-[0_0_8px_#ff2e56] shrink-0"
                  aria-hidden
                />
              )}
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}
