import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  Crosshair,
  Loader2,
  MapPin,
  Search,
  Navigation,
  AlertTriangle,
  Droplets,
  CloudSun,
  ExternalLink,
  X,
  Check,
  Globe2,
  SlidersHorizontal,
  Satellite,
  Rocket,
  GraduationCap,
  Share2,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { AnimatedThemeSwitch } from "@/components/theme/AnimatedThemeSwitch";
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
  buildShareableLocationUrl,
  isInsecureLanContext,
  resolvePreciseLocation,
  searchDualProviderPlaces,
  type PlaceSearchResult,
} from "@/utils/preciseLocation";
import { LocalizedText } from "@/components/i18n/LocalizedText";

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
    <label className="flex items-center gap-1.5 rounded-md border border-border/40 bg-card/60 px-2 py-1 shadow-inner focus-within:border-cyan/70 focus-within:shadow-[0_0_10px_rgba(0,240,255,0.25)] transition-all">
      <span className="hud-label text-xs text-cyan-300 font-bold">{label}</span>
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
        "flex items-center gap-2 rounded-md border border-border/30 bg-card/40 px-2.5 py-1.5 backdrop-blur-sm min-w-0",
        className,
      )}
    >
      <span className="hud-label text-xs text-muted-foreground font-semibold shrink-0">
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
  onSearchDestination,
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
  onSearchDestination?: (destination: "soil" | "satellite" | "hazards" | "atmosphere") => void;
  isMobile?: boolean;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  plantHealthOverall?: number;
  elevationM?: number;
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
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isInputFocused = useRef(false);
  const hasUsedSearch = useRef(false);

  const { t } = useLanguage();

  // Advanced field controls drawer (closed by default)
  const [isParamsDrawerOpen, setIsParamsDrawerOpen] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const paramsDrawerRef = useRef<HTMLDivElement>(null);

  const handleCopyShareLink = async () => {
    const shareUrl = buildShareableLocationUrl(lat, lon);
    try {
      await navigator.clipboard?.writeText(shareUrl);
    } catch {
      // Clipboard API may be unavailable in restricted contexts; toast still exposes the URL
    }
    setCopiedShareLink(true);
    window.setTimeout(() => setCopiedShareLink(false), 2000);
    toast.success(<LocalizedText text="Shareable location link copied" />, {
      description: shareUrl,
    });
  };

  useEffect(() => {
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMobileSearchOpen(true);
        window.setTimeout(() => searchInputRef.current?.focus(), 10);
        setSearchPanelOpen(true);
      }
      if (e.key === "Escape") {
        setSearchPanelOpen(false);
        setDropdownOpen(false);
        setIsParamsDrawerOpen(false);
        setMobileSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

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

  // Keep the chosen place visible after the user has used search, without filling
  // the empty command bar on the initial dashboard load.
  useEffect(() => {
    if (hasUsedSearch.current && locationLabel && !isInputFocused.current) {
      setSearchQuery(locationLabel);
    }
  }, [locationLabel]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearchPanelOpen(false);
        setMobileSearchOpen(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search query to Dual-Provider Geocoder (Open-Meteo + Nominatim)
  useEffect(() => {
    const controller = new AbortController();
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setDropdownOpen(false);
      setSelectedIndex(-1);
      setSearching(false);
      return;
    }

    setSearchResults([]);
    setDropdownOpen(false);
    setSelectedIndex(-1);
    setSearching(true);
    const timer = setTimeout(async () => {
      const places = await searchDualProviderPlaces(q, controller.signal);
      if (controller.signal.aborted) return;
      setSearchResults(places);
      setSearching(false);
      setDropdownOpen(places.length > 0);
      setSelectedIndex(-1);
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  // Select place from search suggestions
  const selectPlace = (place: PlaceSearchResult) => {
    hasUsedSearch.current = true;
    onLocation(place.lat, place.lon, place.name);
    setSearchQuery(place.name);
    setDropdownOpen(false);
    setSearchPanelOpen(false);
    setMobileSearchOpen(false);
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
      setSearchPanelOpen(false);
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
            <LocalizedText
              text={`No locations found for "${searchQuery.trim()}". Try village, city, or pincode.`}
            />,
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
          <LocalizedText
            text={`Insecure LAN HTTP blocks hardware GPS. Approximate IP location used. Switch to https://${host} or set chrome://flags.`}
          />,
          { duration: 8000 },
        );
      } else if (result.isCoarse && result.warning) {
        toast.warning(<LocalizedText text={result.warning} />, { duration: 7000 });
      } else {
        toast.success(
          `Location locked: ${result.lat}°, ${result.lon}° (±${Math.round(result.accuracy)}m)`,
        );
      }
    } catch (err) {
      setLocating(false);
      console.warn("Location error:", err);
      toast.error(
        <LocalizedText text="Could not acquire location. Please enter coordinates or search your village." />,
      );
    }
  };

  const alert = scenario !== "Nominal";
  const host = typeof window !== "undefined" ? window.location.host : "192.168.0.3:8080";

  const quickSearchSuggestions = [
    {
      label: "Districts & villages",
      detail: "Find a place by name or pincode",
      icon: MapPin,
      action: "places" as const,
    },
    {
      label: "Agricultural fields",
      detail: "Open field target controls",
      icon: Crosshair,
      action: "coordinates" as const,
    },
    {
      label: "Latitude & longitude",
      detail: "Enter an exact map location",
      icon: Globe2,
      action: "coordinates" as const,
    },
    {
      label: "Farms by coordinates",
      detail: "Lock a farm using geographic coordinates",
      icon: MapPin,
      action: "coordinates" as const,
    },
    {
      label: "Soil conditions & moisture",
      detail: "View soil moisture and groundwater",
      icon: Droplets,
      action: "soil" as const,
    },
    {
      label: "Satellite imagery & vegetation",
      detail: "Explore satellite layers and vegetation indices",
      icon: Satellite,
      action: "satellite" as const,
    },
    {
      label: "Agricultural hazards",
      detail: "View active field hazard information",
      icon: AlertTriangle,
      action: "hazards" as const,
    },
    {
      label: "Weather information",
      detail: "Open forecast and atmosphere telemetry",
      icon: CloudSun,
      action: "atmosphere" as const,
    },
  ];

  const handleQuickSearch = (action: (typeof quickSearchSuggestions)[number]["action"]) => {
    setSelectedIndex(-1);
    setDropdownOpen(false);
    if (action === "coordinates") {
      setSearchPanelOpen(false);
      setIsParamsDrawerOpen(true);
      return;
    }
    if (action === "places") {
      setSearchQuery("");
      setSearchPanelOpen(true);
      searchInputRef.current?.focus();
      toast.info("Type a district, village, farm name, or pincode to find a location.");
      return;
    }
    setSearchPanelOpen(false);
    setSearchQuery("");
    onSearchDestination?.(action);
  };

  return (
    <div className="sticky top-0 z-[100] overflow-visible border-b border-[var(--border-subtle)] bg-[var(--bg-glass)] backdrop-blur-2xl shadow-[0_4px_20px_rgba(0,0,0,0.45)]">
      {/* ---------------- INSECURE LAN HOST BANNER ---------------- */}
      {showInsecureBanner && !bannerDismissed && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/40 bg-amber-500/15 px-3 py-2 font-mono text-xs text-amber-400 sm:px-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-400" />
            <span className="break-words">
              {<LocalizedText text={"Browsers block hardware GPS on insecure LAN HTTP ("} />}
              <code>http://{host}</code>
              {<LocalizedText text={"). Approximate location used."} />}
            </span>
            <a
              href={`https://${host}`}
              className="ml-1 inline-flex items-center gap-1 font-semibold text-cyan-300 hover:underline"
            >
              {<LocalizedText text={"Switch to HTTPS "} />}
              <ExternalLink className="size-3" />
            </a>
            <span className="hidden xl:inline text-muted-foreground ml-2">
              {<LocalizedText text={"(or open "} />}
              <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>{" "}
              {<LocalizedText text={" and add"} />} <code>http://{host}</code>)
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

      {/* ---------------- UNIFIED SINGLE-ROW GLASS HEADER (3-Zone Layout) ---------------- */}
      <div className="relative z-40 flex h-14 w-full max-w-full flex-nowrap items-center justify-between gap-2 md:gap-3 overflow-visible px-2.5 sm:px-3">
        {/* Zone 1 (Left): Brand */}
        <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <div className="grid size-8 shrink-0 place-items-center rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-surface)] text-[var(--accent)] shadow-sm">
            <Satellite className="size-4 animate-pulse" />
          </div>
          <div className="flex flex-col leading-none sm:flex-row sm:items-center sm:gap-1.5">
            <span className="font-display text-sm font-bold tracking-tight text-[var(--text-primary)] sm:text-base">
              AgroSpace
            </span>
            <div className="mt-0.5 flex items-center gap-1 sm:mt-0">
              <span className="font-mono text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-[var(--status-ok)]">
                Nexus
              </span>
              <span className="hidden xl:inline-flex shrink-0 rounded-full border border-[var(--accent)]/35 bg-[var(--accent-surface)] px-1.5 font-mono text-xs font-semibold leading-4 text-[var(--accent)]">
                v2.4
              </span>
            </div>
          </div>
        </div>

        {/* Zone 2 (Center): Inline Top-Bar Search (desktop/laptop) / Expandable Overlay (mobile) */}
        <div
          ref={searchContainerRef}
          className={cn(
            "min-w-0 overflow-visible",
            mobileSearchOpen
              ? "fixed inset-x-2 top-2 z-[1100] flex flex-col md:relative md:inset-auto md:flex-1 md:max-w-md lg:max-w-xl md:mx-2"
              : "relative hidden md:flex md:flex-1 md:max-w-md lg:max-w-xl md:mx-2",
          )}
        >
          <div className="group flex h-9 md:h-9 w-full items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 shadow-sm transition-all duration-200 focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent-glow)]">
            <span className="grid size-6 shrink-0 place-items-center text-[var(--accent)]">
              {searching ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Search className="size-3.5" />
              )}
            </span>
            <Input
              ref={searchInputRef}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-label="Search districts, villages, farms, coordinates or agricultural insights"
              aria-expanded={searchPanelOpen}
              value={searchQuery}
              onChange={(e) => {
                hasUsedSearch.current = true;
                setSearchQuery(e.target.value);
                setSearchPanelOpen(true);
              }}
              onFocus={() => {
                isInputFocused.current = true;
                setSearchPanelOpen(true);
                if (searchResults.length > 0) setDropdownOpen(true);
              }}
              onBlur={() => {
                isInputFocused.current = false;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search place, farm, or lat/lon…"
              className="h-full min-w-0 flex-1 border-0 bg-transparent px-0 font-sans text-xs sm:text-sm text-foreground shadow-none outline-none placeholder:text-muted-foreground/80 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {searchQuery && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setDropdownOpen(false);
                  setSearchPanelOpen(true);
                  setSelectedIndex(-1);
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear search"
                title="Clear search"
                className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-white/5 hover:text-cyan-200"
              >
                <X className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={locate}
              disabled={locating}
              aria-label="Acquire high-precision GPS location"
              title="Acquire high-precision GPS lock"
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-transparent px-1.5 font-mono text-[11px] font-semibold text-[var(--accent)] transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent-surface)] cursor-pointer disabled:opacity-50"
            >
              {locating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Crosshair className="size-3.5" />
              )}
              <span className="hidden lg:inline">
                <LocalizedText text="GPS" />
              </span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void handleCopyShareLink()}
              aria-label="Copy shareable location link"
              title="Copy shareable location link"
              className={cn(
                "hidden sm:grid size-7 shrink-0 place-items-center rounded-lg border transition-colors cursor-pointer",
                copiedShareLink
                  ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-400"
                  : "border-transparent text-[var(--text-muted)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent-surface)] hover:text-[var(--accent)]",
              )}
            >
              {copiedShareLink ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
            </button>
            <button
              type="button"
              data-params-trigger="true"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setSearchPanelOpen(false);
                setMobileSearchOpen(false);
                setIsParamsDrawerOpen((prev) => !prev);
              }}
              aria-label="Open advanced field search and filters"
              aria-expanded={isParamsDrawerOpen}
              title="Advanced search and field filters"
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-lg border transition-colors cursor-pointer",
                isParamsDrawerOpen
                  ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-200"
                  : "border-transparent text-muted-foreground hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-200",
              )}
            >
              <SlidersHorizontal className="size-3.5" />
            </button>
            {mobileSearchOpen && (
              <button
                type="button"
                onClick={() => {
                  setMobileSearchOpen(false);
                  setSearchPanelOpen(false);
                }}
                aria-label="Close mobile search"
                className="grid md:hidden size-7 shrink-0 place-items-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {searchPanelOpen && (
            <div
              id="agrospace-search-suggestions"
              role="region"
              aria-label="Search suggestions"
              className="absolute left-0 right-0 top-full z-[1100] mt-2 max-h-[min(70dvh,30rem)] w-full max-w-[calc(100vw-1rem)] overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 shadow-[var(--shadow-hud)] backdrop-blur-2xl sm:p-3"
            >
              {searchResults.length > 0 && dropdownOpen && (
                <div className="mb-2">
                  <div className="flex items-center justify-between border-b border-white/10 px-2 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-2 text-cyan-200">
                      <Globe2 className="size-4" /> Places and coordinate matches
                    </span>
                    <span>Enter to lock</span>
                  </div>
                  <ul
                    id="agrospace-place-results"
                    role="listbox"
                    aria-label="Place search results"
                    className="mt-1 divide-y divide-white/5"
                  >
                    {searchResults.map((place, idx) => {
                      const isHighlighted = idx === selectedIndex;
                      return (
                        <li
                          key={place.id}
                          role="option"
                          aria-selected={isHighlighted}
                          onClick={() => selectPlace(place)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                          }}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-2.5 text-xs transition-all",
                            isHighlighted
                              ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-100"
                              : "hover:bg-white/[0.04]",
                          )}
                        >
                          <MapPin className="mt-0.5 size-4 shrink-0 text-cyan-300" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="truncate font-semibold text-foreground">
                                {place.name}
                              </span>
                              <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-cyan-200">
                                {place.lat.toFixed(4)}°, {place.lon.toFixed(4)}°
                              </span>
                            </div>
                            <div className="truncate font-mono text-xs text-muted-foreground">
                              {place.subtitle}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {searching && searchQuery.trim().length >= 2 && (
                <div className="px-2 py-2 font-mono text-xs text-cyan-200">Searching places…</div>
              )}
              {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <div className="px-2 py-2 font-mono text-xs text-muted-foreground">
                  No place matches yet. Explore a dashboard section below or try coordinates.
                </div>
              )}

              <div className="px-2 pb-1 pt-2 font-mono text-xs font-semibold uppercase tracking-wider text-cyan-200">
                {searchQuery.trim().length < 2 ? "Search suggestions" : "Explore AgroSpace"}
              </div>
              <div className="grid gap-1 sm:grid-cols-2">
                {quickSearchSuggestions.map(({ label, detail, icon: Icon, action }) => (
                  <button
                    key={label}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleQuickSearch(action)}
                    className="flex min-w-0 items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-left transition-colors hover:border-cyan-400/20 hover:bg-cyan-500/[0.07]"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-cyan-400/20 bg-cyan-500/[0.08] text-cyan-300">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-foreground">
                        {label}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{detail}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Zone 3 (Right): Compact Controls */}
        <div
          data-tour="top-right-controls"
          className="flex shrink-0 items-center justify-end gap-1 sm:gap-1.5 whitespace-nowrap"
        >
          <button
            type="button"
            onClick={() => {
              setMobileSearchOpen(true);
              setSearchPanelOpen(true);
              setIsParamsDrawerOpen(false);
              window.setTimeout(() => searchInputRef.current?.focus(), 20);
            }}
            aria-label="Open location search"
            title="Search location or coordinates"
            className="grid md:hidden size-8 shrink-0 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--accent)] hover:border-[var(--accent)] cursor-pointer"
          >
            <Search className="size-4" />
          </button>
          <button
            type="button"
            data-params-trigger="true"
            onClick={() => {
              setMobileSearchOpen(false);
              setSearchPanelOpen(false);
              setIsParamsDrawerOpen((prev) => !prev);
            }}
            aria-label="Toggle field parameters"
            title="Field parameters"
            className="grid md:hidden size-8 shrink-0 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer"
          >
            <SlidersHorizontal className="size-4" />
          </button>
          <LanguageSelector compact />
          <ThemeSwitcher variant="compact" />
          <AnimatedThemeSwitch />
          <div className="shrink-0">
            <OperatorProfileDropdown
              profile={profile ?? null}
              compact={!profile}
              onOpenAuth={onOpenAuth || (() => {})}
              onOpenSettings={onOpenSettings || (() => {})}
              onNavigateHome={onNavigateHome}
              onSignOut={onSignOut || (() => {})}
            />
          </div>
        </div>
      </div>

      {/* ---------------- 2. FLOATING FIELD PARAMETERS DRAWER OVERLAY (ABSOLUTE POPOVER) ---------------- */}
      <div
        ref={paramsDrawerRef}
        className={cn(
          "transition-all duration-300 z-[900] absolute top-[3.75rem] left-1/2 -translate-x-1/2 w-[min(calc(100vw-1rem),56rem)] rounded-xl bg-[var(--bg-surface)] backdrop-blur-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-hud)] p-3 sm:p-4 max-h-[calc(100dvh-5rem)] overflow-y-auto overflow-x-hidden",
          isParamsDrawerOpen
            ? "opacity-100 scale-100 pointer-events-auto visible"
            : "opacity-0 scale-95 pointer-events-none invisible max-h-0 overflow-hidden p-0 border-0",
        )}
      >
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-cyan-300" />
            <span className="font-mono text-xs font-bold text-cyan-300 tracking-wider uppercase">
              {<LocalizedText text={"Field Target & Simulation Parameters"} />}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsParamsDrawerOpen(false)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-foreground font-mono text-xs transition-colors cursor-pointer"
            title="Close Parameters Drawer"
          >
            <X className="size-3.5" /> {t("done", "Done")}
          </button>
        </div>

        {(onOpenMissionBrief || onOpenTour) && (
          <div className="mb-3 flex flex-wrap justify-end gap-2">
            {onOpenMissionBrief && (
              <button
                type="button"
                onClick={() => {
                  setIsParamsDrawerOpen(false);
                  onOpenMissionBrief();
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 font-mono text-xs text-cyan-200 hover:bg-cyan-500/20"
              >
                <Rocket className="size-3.5" /> Mission Brief
              </button>
            )}
            {onOpenTour && (
              <button
                type="button"
                onClick={() => {
                  setIsParamsDrawerOpen(false);
                  onOpenTour();
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 font-mono text-xs text-cyan-200 hover:bg-cyan-500/20"
              >
                <GraduationCap className="size-3.5" /> Guided Tour
              </button>
            )}
          </div>
        )}

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
                  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs font-semibold tracking-wider shrink-0",
                  accuracyBadge.type === "pinned"
                    ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(0,255,157,0.3)]"
                    : accuracyBadge.type === "high"
                      ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.25)]"
                      : "border-amber-500/50 bg-amber-500/15 text-amber-400 shadow-[0_0_10px_rgba(255,183,0,0.25)]",
                )}
                title={
                  accuracyBadge.type === "pinned"
                    ? "Location confirmed via village/pincode search or map pin"
                    : `GPS accuracy: ${accuracyBadge.text}`
                }
              >
                {accuracyBadge.type === "pinned" ? (
                  <Check className="size-3 text-emerald-400" />
                ) : (
                  <Navigation className="size-2.5" />
                )}
                {accuracyBadge.text}
              </span>
            )}

            {/* High-Precision GPS Trigger Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={locate}
              disabled={locating}
              aria-label="Calibrate high-precision field GPS"
              className="h-7 px-2.5 text-xs font-mono font-semibold shrink-0"
              title="Acquire multi-sample high-precision GPS lock"
            >
              {locating ? (
                <Loader2 className="size-3 animate-spin mr-1 text-cyan-300" />
              ) : (
                <Crosshair className="size-3 mr-1 text-cyan-300 drop-shadow-[0_0_6px_#00f0ff]" />
              )}
              {<LocalizedText text={"GPS"} />}
            </Button>

            {/* Copy Shareable Location Link */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleCopyShareLink()}
              aria-label="Share current coordinates link"
              className="h-7 px-2.5 text-xs font-mono font-semibold shrink-0"
              title="Copy shareable link for current field coordinates"
            >
              {copiedShareLink ? (
                <Check className="size-3 mr-1 text-emerald-400" />
              ) : (
                <Share2 className="size-3 mr-1 text-[var(--accent)]" />
              )}
              <LocalizedText text={copiedShareLink ? "Copied" : "Share Link"} />
            </Button>
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
              <span className="w-10 text-right font-mono text-xs font-bold tabular-nums text-cyan-300 drop-shadow-[0_0_6px_rgba(0,240,255,0.4)]">
                {borewellDepth}
                {<LocalizedText text={"m"} />}
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
                <SelectContent className="border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] backdrop-blur-xl">
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
                className="flex rounded-md border border-border/50 bg-background/80 p-0.5"
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
                      "rounded-md px-2 py-0.5 text-xs transition-all font-mono font-semibold cursor-pointer",
                      season === s
                        ? "bg-emerald/20 text-emerald-400 shadow-[0_0_10px_rgba(0,255,157,0.3)] border border-emerald/50"
                        : "text-muted-foreground hover:text-foreground border border-transparent",
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
                      ? "border-crimson/70 text-rose-400 shadow-[0_0_12px_rgba(255,46,86,0.35)]"
                      : "border-border/60",
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] backdrop-blur-xl">
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
