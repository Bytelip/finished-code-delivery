import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Compass,
  Copy,
  CornerDownLeft,
  HelpCircle,
  Loader2,
  MapPin,
  Plug,
  RefreshCw,
  Satellite,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  BOREWELL_DEPTH_RANGE,
  FARM_PRESETS,
  IRRIGATION_TYPES,
  SCENARIOS,
  SEASONS,
  type FarmPreset,
  type Irrigation,
  type Scenario,
  type Season,
} from "@/types/agroSpace";
import {
  resolvePreciseLocation,
  searchDualProviderPlaces,
  type PlaceSearchResult,
} from "@/utils/preciseLocation";
import { cn } from "@/lib/utils";
import { CONSOLE_NAV_ITEMS, type ConsoleView } from "./consoleTypes";

/* -------------------------------------------------------------------------- */
/* Command Palette Modal (Ctrl+K)                                             */
/* -------------------------------------------------------------------------- */

export interface CommandPaletteModalProps {
  open: boolean;
  onClose: () => void;
  onNavigateView: (view: ConsoleView) => void;
  onSelectPreset: (preset: FarmPreset) => void;
  onSelectPlace: (
    lat: number,
    lon: number,
    meta?: {
      name?: string | undefined;
      subtitle?: string | undefined;
      elevationM?: number | undefined;
    },
  ) => void;
  onRefreshTelemetry: () => void;
  onOpenConnect: () => void;
  onOpenMissionBrief: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  open,
  onClose,
  onNavigateView,
  onSelectPreset,
  onSelectPlace,
  onRefreshTelemetry,
  onOpenConnect,
  onOpenMissionBrief,
}) => {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<PlaceSearchResult[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setPlaces([]);
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!open || trimmed.length < 2) {
      setPlaces([]);
      setSearchingPlaces(false);
      return;
    }

    const controller = new AbortController();
    setSearchingPlaces(true);
    const timer = window.setTimeout(() => {
      searchDualProviderPlaces(trimmed, controller.signal)
        .then((res) => {
          setPlaces(res.slice(0, 5));
        })
        .catch(() => {
          if (!controller.signal.aborted) setPlaces([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearchingPlaces(false);
        });
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  const filteredViews = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CONSOLE_NAV_ITEMS.filter(
      (item) =>
        !q ||
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q),
    );
  }, [query]);

  const filteredPresets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FARM_PRESETS.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
    );
  }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-start justify-center bg-black/70 px-4 pt-16 sm:pt-24 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Global Command Palette"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-white/[0.1] bg-[#1c1c1c] text-[#ededed] shadow-[0_24px_64px_rgba(0,0,0,0.85)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-2.5 border-b border-white/[0.08] px-4 py-3">
          <Search className="size-4 text-[#8b8b8b] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to view, search farm locations, or run command…"
            className="flex-1 bg-transparent text-sm text-[#ededed] placeholder-[#8b8b8b] focus:outline-none"
          />
          {searchingPlaces && <Loader2 className="size-3.5 animate-spin text-[#3ecf8e]" />}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="rounded border border-white/[0.08] bg-[#171717] px-1.5 py-0.5 font-mono text-[10px] text-[#8b8b8b] hover:text-[#ededed] cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-3 studio-scrollbar">
          {/* Views */}
          {filteredViews.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-[#8b8b8b]">
                Console Views
              </div>
              <div className="space-y-0.5">
                {filteredViews.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onNavigateView(item.id);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs hover:bg-white/[0.06] cursor-pointer"
                  >
                    <div>
                      <div className="font-medium text-[#ededed]">{item.label}</div>
                      <div className="text-[11px] text-[#8b8b8b]">{item.description}</div>
                    </div>
                    <kbd className="rounded border border-white/[0.08] bg-[#171717] px-1.5 py-0.5 font-mono text-[10px] text-[#8b8b8b]">
                      {item.shortcut}
                    </kbd>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div>
            <div className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-[#8b8b8b]">
              Quick Actions
            </div>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenConnect();
                }}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs text-[#ededed] hover:bg-white/[0.06] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Plug className="size-3.5 text-[#3ecf8e]" />
                  Configure Target Coordinates & Endpoints
                </span>
                <CornerDownLeft className="size-3 text-[#8b8b8b]" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRefreshTelemetry();
                }}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs text-[#ededed] hover:bg-white/[0.06] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <RefreshCw className="size-3.5 text-[#3ecf8e]" />
                  Sync NASA POWER & GIBS Telemetry
                </span>
                <CornerDownLeft className="size-3 text-[#8b8b8b]" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMissionBrief();
                }}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs text-[#ededed] hover:bg-white/[0.06] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Satellite className="size-3.5 text-[#8b8b8b]" />
                  Open NASA Mission Brief
                </span>
                <CornerDownLeft className="size-3 text-[#8b8b8b]" />
              </button>
            </div>
          </div>

          {/* Farm Presets */}
          {filteredPresets.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-[#8b8b8b]">
                Monitoring Sites
              </div>
              <div className="space-y-0.5">
                {filteredPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onSelectPreset(preset);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs hover:bg-white/[0.06] cursor-pointer"
                  >
                    <div>
                      <div className="font-medium text-[#ededed]">{preset.name}</div>
                      <div className="text-[11px] text-[#8b8b8b]">Monitoring Station</div>
                    </div>
                    <span className="font-mono text-[11px] text-[#8b8b8b]">
                      {preset.lat.toFixed(2)}, {preset.lon.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Geocoded Places */}
          {places.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-[#8b8b8b]">
                Global Location Results
              </div>
              <div className="space-y-0.5">
                {places.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelectPlace(p.lat, p.lon, {
                        name: p.name,
                        subtitle: p.subtitle,
                        elevationM: p.elevationM,
                      });
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs hover:bg-white/[0.06] cursor-pointer"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="truncate font-medium text-[#ededed]">{p.name}</div>
                      <div className="truncate text-[11px] text-[#8b8b8b]">{p.subtitle}</div>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-[#3ecf8e]">
                      {p.lat.toFixed(3)}, {p.lon.toFixed(3)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Connect Endpoint / Target Modal                                            */
/* -------------------------------------------------------------------------- */

export interface ConnectEndpointModalProps {
  open: boolean;
  onClose: () => void;
  lat: number;
  lon: number;
  borewellDepth: number;
  irrigation: Irrigation;
  season: Season;
  scenario: Scenario;
  onSetLocation: (
    lat: number,
    lon: number,
    meta?: {
      name?: string | undefined;
      subtitle?: string | undefined;
      elevationM?: number | undefined;
    },
  ) => void;
  onBorewellDepthChange: (v: number) => void;
  onIrrigationChange: (v: Irrigation) => void;
  onSeasonChange: (v: Season) => void;
  onScenarioChange: (v: Scenario) => void;
}

export const ConnectEndpointModal: React.FC<ConnectEndpointModalProps> = ({
  open,
  onClose,
  lat,
  lon,
  borewellDepth,
  irrigation,
  season,
  scenario,
  onSetLocation,
  onBorewellDepthChange,
  onIrrigationChange,
  onSeasonChange,
  onScenarioChange,
}) => {
  const [latInput, setLatInput] = useState(lat.toFixed(4));
  const [lonInput, setLonInput] = useState(lon.toFixed(4));
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLatInput(lat.toFixed(4));
    setLonInput(lon.toFixed(4));
  }, [lat, lon, open]);

  useEffect(() => {
    if (!open || placeQuery.trim().length < 2) {
      setPlaceResults([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      searchDualProviderPlaces(placeQuery.trim(), ctrl.signal)
        .then((res) => setPlaceResults(res.slice(0, 4)))
        .catch(() => {
          if (!ctrl.signal.aborted) setPlaceResults([]);
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [open, placeQuery]);

  if (!open) return null;

  const powerUrl = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,PRECTOTCORR,ALLSKY_SFC_PAR_TOT&community=AG&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}&format=JSON`;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const nLat = Number(latInput);
    const nLon = Number(lonInput);
    if (!Number.isFinite(nLat) || !Number.isFinite(nLon) || nLat < -90 || nLat > 90) {
      toast.error("Invalid latitude/longitude");
      return;
    }
    onSetLocation(nLat, nLon);
    toast.success("Field Target Connected", {
      description: `${nLat.toFixed(4)}, ${nLon.toFixed(4)}`,
    });
    onClose();
  };

  const handleGps = async () => {
    setGpsBusy(true);
    try {
      const res = await resolvePreciseLocation();
      setLatInput(res.lat.toFixed(4));
      setLonInput(res.lon.toFixed(4));
      onSetLocation(res.lat, res.lon, {
        name: res.city || res.region || "GPS Field Station",
        subtitle: [res.city, res.region, res.country].filter(Boolean).join(", "),
      });
      toast.success("GPS Coordinates Synced");
    } catch {
      toast.error("Could not acquire GPS lock");
    } finally {
      setGpsBusy(false);
    }
  };

  const handleCopyUrl = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(powerUrl);
    }
    setCopied(true);
    toast.success("NASA POWER URL copied");
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Connect Field Telemetry"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-white/[0.1] bg-[#1c1c1c] text-[#ededed] shadow-[0_24px_64px_rgba(0,0,0,0.85)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Plug className="size-4 text-[#3ecf8e]" />
            <h2 className="text-sm font-semibold">Connect Field Target & Streams</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Connect Modal"
            className="rounded-md p-1 text-[#8b8b8b] hover:bg-white/[0.06] hover:text-[#ededed] cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleApply} className="space-y-4 p-5 text-xs">
          {/* Place lookup */}
          <div className="space-y-1.5">
            <label className="block text-[#8b8b8b]">Search Region or Village</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-[#8b8b8b]" />
                <input
                  type="text"
                  value={placeQuery}
                  onChange={(e) => setPlaceQuery(e.target.value)}
                  placeholder="Type city, district, or watershed…"
                  className="h-9 w-full rounded-md border border-white/[0.1] bg-[#171717] pl-8 pr-3 text-xs text-[#ededed] placeholder-[#8b8b8b] focus:border-[#3ecf8e] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleGps}
                disabled={gpsBusy}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/[0.1] bg-[#171717] px-3 font-medium text-[#ededed] hover:bg-white/[0.06] cursor-pointer shrink-0"
              >
                {gpsBusy ? (
                  <Loader2 className="size-3.5 animate-spin text-[#3ecf8e]" />
                ) : (
                  <Compass className="size-3.5 text-[#3ecf8e]" />
                )}
                <span>GPS</span>
              </button>
            </div>

            {placeResults.length > 0 && (
              <div className="mt-1 divide-y divide-white/[0.06] rounded-md border border-white/[0.08] bg-[#171717]">
                {placeResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSetLocation(p.lat, p.lon, {
                        name: p.name,
                        subtitle: p.subtitle,
                        elevationM: p.elevationM,
                      });
                      setLatInput(p.lat.toFixed(4));
                      setLonInput(p.lon.toFixed(4));
                      setPlaceResults([]);
                      setPlaceQuery("");
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-white/[0.05] cursor-pointer"
                  >
                    <span className="truncate font-medium text-[#ededed]">{p.name}</span>
                    <span className="font-mono text-[11px] text-[#8b8b8b]">
                      {p.lat.toFixed(3)}, {p.lon.toFixed(3)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lat / Lon */}
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[#8b8b8b]">Latitude</span>
              <input
                type="number"
                step="0.0001"
                value={latInput}
                onChange={(e) => setLatInput(e.target.value)}
                className="h-9 w-full rounded-md border border-white/[0.1] bg-[#171717] px-3 font-mono text-[#ededed] focus:border-[#3ecf8e] focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[#8b8b8b]">Longitude</span>
              <input
                type="number"
                step="0.0001"
                value={lonInput}
                onChange={(e) => setLonInput(e.target.value)}
                className="h-9 w-full rounded-md border border-white/[0.1] bg-[#171717] px-3 font-mono text-[#ededed] focus:border-[#3ecf8e] focus:outline-none"
              />
            </label>
          </div>

          {/* Quick Sim Selects */}
          <div className="grid grid-cols-3 gap-2.5">
            <label className="space-y-1">
              <span className="text-[#8b8b8b]">Depth ({borewellDepth}m)</span>
              <input
                type="number"
                min={BOREWELL_DEPTH_RANGE.min}
                max={BOREWELL_DEPTH_RANGE.max}
                step={1}
                value={borewellDepth}
                onChange={(e) => onBorewellDepthChange(Number(e.target.value))}
                className="h-8 w-full rounded-md border border-white/[0.1] bg-[#171717] px-2 font-mono text-[#ededed] focus:border-[#3ecf8e] focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[#8b8b8b]">Season</span>
              <select
                value={season}
                onChange={(e) => onSeasonChange(e.target.value as Season)}
                className="h-8 w-full rounded-md border border-white/[0.1] bg-[#171717] px-2 text-[#ededed] focus:border-[#3ecf8e] focus:outline-none"
              >
                {SEASONS.map((val) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[#8b8b8b]">Irrigation</span>
              <select
                value={irrigation}
                onChange={(e) => onIrrigationChange(e.target.value as Irrigation)}
                className="h-8 w-full rounded-md border border-white/[0.1] bg-[#171717] px-2 text-[#ededed] focus:border-[#3ecf8e] focus:outline-none"
              >
                {IRRIGATION_TYPES.map((val) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-1">
            <span className="text-[#8b8b8b]">Stress Scenario</span>
            <div className="flex flex-wrap gap-1.5">
              {SCENARIOS.map((val) => {
                const active = scenario === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onScenarioChange(val)}
                    className={cn(
                      "rounded border px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer",
                      active
                        ? "border-[#3ecf8e]/50 bg-[#3ecf8e]/15 text-[#3ecf8e]"
                        : "border-white/[0.08] bg-[#171717] text-[#8b8b8b] hover:text-[#ededed]",
                    )}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Copyable NASA endpoint */}
          <div className="rounded-md border border-white/[0.08] bg-[#171717] p-2.5">
            <div className="mb-1 flex items-center justify-between text-[11px] text-[#8b8b8b]">
              <span>NASA POWER Daily Point Endpoint</span>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="inline-flex items-center gap-1 text-[#ededed] hover:text-[#3ecf8e] cursor-pointer"
              >
                {copied ? <Check className="size-3 text-[#3ecf8e]" /> : <Copy className="size-3" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <div className="truncate font-mono text-[11px] text-[#8b8b8b]">{powerUrl}</div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-white/[0.08] pt-3">
            <button
              type="button"
              onClick={onClose}
              className="h-8 rounded-md border border-white/[0.1] bg-[#171717] px-3 font-medium text-[#ededed] hover:bg-white/[0.06] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#3ecf8e] px-4 font-semibold text-[#121212] hover:bg-[#24b47e] cursor-pointer"
            >
              <MapPin className="size-3.5" />
              <span>Connect Target</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Help & Shortcuts Modal                                                     */
/* -------------------------------------------------------------------------- */

export interface ConsoleHelpModalProps {
  open: boolean;
  onClose: () => void;
  onOpenMissionBrief: () => void;
  onStartTour: () => void;
}

export const ConsoleHelpModal: React.FC<ConsoleHelpModalProps> = ({
  open,
  onClose,
  onOpenMissionBrief,
  onStartTour,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Console Shortcuts and Help"
    >
      <div
        className="w-full max-w-md rounded-xl border border-white/[0.1] bg-[#1c1c1c] text-[#ededed] shadow-[0_24px_64px_rgba(0,0,0,0.85)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <HelpCircle className="size-4 text-[#3ecf8e]" />
            <h2 className="text-sm font-semibold">AgroSpace Console Reference</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Help"
            className="rounded-md p-1 text-[#8b8b8b] hover:bg-white/[0.06] hover:text-[#ededed] cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 p-5 text-xs">
          <div>
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#8b8b8b]">
              Keyboard Shortcuts
            </div>
            <div className="divide-y divide-white/[0.06] rounded-md border border-white/[0.08] bg-[#171717]">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-[#ededed]">Open Global Search</span>
                <kbd className="rounded border border-white/[0.1] bg-[#1c1c1c] px-1.5 py-0.5 font-mono text-[10px] text-[#8b8b8b]">
                  Ctrl K
                </kbd>
              </div>
              {CONSOLE_NAV_ITEMS.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-3 py-1.5">
                  <span className="text-[#8b8b8b]">{item.label}</span>
                  <kbd className="rounded border border-white/[0.1] bg-[#1c1c1c] px-1.5 py-0.5 font-mono text-[10px] text-[#8b8b8b]">
                    {item.shortcut}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] pt-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartTour();
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.1] bg-[#171717] px-3 font-medium text-[#ededed] hover:bg-white/[0.06] cursor-pointer"
            >
              <Sparkles className="size-3.5 text-[#3ecf8e]" />
              <span>Guided Tour</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMissionBrief();
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.1] bg-[#171717] px-3 font-medium text-[#ededed] hover:bg-white/[0.06] cursor-pointer"
              >
                <Satellite className="size-3.5 text-[#8b8b8b]" />
                <span>Mission Brief</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-8 rounded-md bg-[#3ecf8e] px-3.5 font-semibold text-[#121212] hover:bg-[#24b47e] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
