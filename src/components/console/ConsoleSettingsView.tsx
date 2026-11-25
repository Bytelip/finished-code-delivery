import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Compass,
  Droplets,
  HelpCircle,
  Loader2,
  LogOut,
  MapPin,
  Satellite,
  Settings,
  ShieldCheck,
  Sliders,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  BOREWELL_DEPTH_RANGE,
  FARM_PRESETS,
  IRRIGATION_TYPES,
  SCENARIOS,
  SEASONS,
  type Irrigation,
  type Scenario,
  type Season,
} from "@/types/agroSpace";
import type { UserProfile } from "@/types/userProfile";
import { resolvePreciseLocation } from "@/utils/preciseLocation";
import { ThemeSettingsCard } from "@/components/theme/ThemeSwitcher";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { TwoFactorSettingsCard } from "./TwoFactorSettingsCard";
import { cn } from "@/lib/utils";

export interface ConsoleSettingsViewProps {
  lat: number;
  lon: number;
  regionLabel: string;
  elevationM: number;
  climateZone: string;
  borewellDepth: number;
  irrigation: Irrigation;
  season: Season;
  scenario: Scenario;
  user: UserProfile | null;
  onSetLocation: (
    lat: number,
    lon: number,
    meta?: {
      name?: string | undefined;
      subtitle?: string | undefined;
      elevationM?: number | undefined;
      climateZone?: string | undefined;
    },
  ) => void;
  onBorewellDepthChange: (depth: number) => void;
  onIrrigationChange: (irrigation: Irrigation) => void;
  onSeasonChange: (season: Season) => void;
  onScenarioChange: (scenario: Scenario) => void;
  onOpenProfileModal: () => void;
  onOpenMissionBrief: () => void;
  onOpenTour: () => void;
  onSignOut: () => void;
}

export const ConsoleSettingsView: React.FC<ConsoleSettingsViewProps> = ({
  lat,
  lon,
  regionLabel,
  elevationM,
  climateZone,
  borewellDepth,
  irrigation,
  season,
  scenario,
  user,
  onSetLocation,
  onBorewellDepthChange,
  onIrrigationChange,
  onSeasonChange,
  onScenarioChange,
  onOpenProfileModal,
  onOpenMissionBrief,
  onOpenTour,
  onSignOut,
}) => {
  const [latInput, setLatInput] = useState(lat.toFixed(4));
  const [lonInput, setLonInput] = useState(lon.toFixed(4));
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    setLatInput(lat.toFixed(4));
    setLonInput(lon.toFixed(4));
  }, [lat, lon]);

  const handleApplyCoords = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedLat = Number(latInput);
    const parsedLon = Number(lonInput);
    if (
      !Number.isFinite(parsedLat) ||
      !Number.isFinite(parsedLon) ||
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLon < -180 ||
      parsedLon > 180
    ) {
      toast.error("Invalid Coordinates", {
        description: "Latitude must be between -90 and 90, Longitude between -180 and 180.",
      });
      return;
    }
    onSetLocation(parsedLat, parsedLon);
    toast.success("Field Target Updated", {
      description: `Locked to ${parsedLat.toFixed(4)}, ${parsedLon.toFixed(4)}`,
    });
  };

  const handleAcquireGps = async () => {
    setLocating(true);
    try {
      const res = await resolvePreciseLocation();
      const subtitleParts = [res.city, res.region, res.country].filter(Boolean);
      onSetLocation(res.lat, res.lon, {
        name: res.city || res.region || "GPS Field Station",
        subtitle: subtitleParts.join(", ") || "Device GPS Lock",
      });
      toast.success("Location Locked", {
        description: `${res.lat.toFixed(4)}, ${res.lon.toFixed(4)} (±${Math.round(res.accuracy)}m)`,
      });
    } catch (err) {
      toast.error("GPS Acquisition Failed", {
        description: err instanceof Error ? err.message : "Could not resolve location.",
      });
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#ededed]">
            Console & Field Settings
          </h1>
          <p className="text-xs text-[#8b8b8b]">
            Configure target farm coordinates, agronomic simulation inputs, interface theme, and
            operator credentials.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenMissionBrief}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.1] bg-[#1c1c1c] px-3 text-xs font-medium text-[#ededed] hover:bg-white/[0.06] cursor-pointer"
          >
            <Satellite className="size-3.5 text-[#3ecf8e]" />
            <span>Mission Brief</span>
          </button>
          <button
            type="button"
            onClick={onOpenTour}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.1] bg-[#1c1c1c] px-3 text-xs font-medium text-[#ededed] hover:bg-white/[0.06] cursor-pointer"
          >
            <HelpCircle className="size-3.5 text-[#8b8b8b]" />
            <span>Guided Tour</span>
          </button>
        </div>
      </div>

      {/* Top Grid: Field Target + Agronomic Simulation */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Field Target Coordinates */}
        <section className="rounded-lg border border-white/[0.08] bg-[#1c1c1c] p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-[#3ecf8e]" />
              <h2 className="text-sm font-semibold text-[#ededed]">Field Target & GPS Lock</h2>
            </div>
            <span className="rounded border border-white/[0.08] bg-[#171717] px-2 py-0.5 font-mono text-[11px] text-[#8b8b8b]">
              {elevationM}m · {climateZone}
            </span>
          </div>

          <div className="rounded-md border border-white/[0.08] bg-[#171717] px-3 py-2 text-xs text-[#8b8b8b]">
            Active region: <span className="font-medium text-[#ededed]">{regionLabel}</span>
          </div>

          <form onSubmit={handleApplyCoords} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1 text-xs">
              <span className="text-[#8b8b8b]">Latitude</span>
              <input
                type="number"
                step="0.0001"
                value={latInput}
                onChange={(e) => setLatInput(e.target.value)}
                className="h-9 w-full rounded-md border border-white/[0.1] bg-[#171717] px-3 font-mono text-xs text-[#ededed] focus:border-[#3ecf8e] focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-[#8b8b8b]">Longitude</span>
              <input
                type="number"
                step="0.0001"
                value={lonInput}
                onChange={(e) => setLonInput(e.target.value)}
                className="h-9 w-full rounded-md border border-white/[0.1] bg-[#171717] px-3 font-mono text-xs text-[#ededed] focus:border-[#3ecf8e] focus:outline-none"
              />
            </label>

            <div className="sm:col-span-2 flex flex-wrap items-center gap-2 pt-1">
              <button
                type="submit"
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#3ecf8e] px-3.5 text-xs font-semibold text-[#121212] hover:bg-[#24b47e] transition-colors cursor-pointer"
              >
                <CheckCircle2 className="size-3.5" />
                <span>Apply Coordinates</span>
              </button>
              <button
                type="button"
                onClick={handleAcquireGps}
                disabled={locating}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.1] bg-[#171717] px-3 text-xs font-medium text-[#ededed] hover:bg-white/[0.06] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {locating ? (
                  <Loader2 className="size-3.5 animate-spin text-[#3ecf8e]" />
                ) : (
                  <Compass className="size-3.5 text-[#3ecf8e]" />
                )}
                <span>{locating ? "Acquiring GPS…" : "Acquire Device GPS"}</span>
              </button>
            </div>
          </form>

          <div className="border-t border-white/[0.08] pt-3">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#8b8b8b]">
              Reference Presets
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FARM_PRESETS.map((preset) => {
                const active =
                  Math.abs(preset.lat - lat) < 0.05 && Math.abs(preset.lon - lon) < 0.05;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      onSetLocation(preset.lat, preset.lon, {
                        name: preset.name,
                      })
                    }
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs transition-colors cursor-pointer",
                      active
                        ? "border-[#3ecf8e]/50 bg-[#3ecf8e]/12 text-[#3ecf8e] font-medium"
                        : "border-white/[0.08] bg-[#171717] text-[#8b8b8b] hover:text-[#ededed] hover:bg-white/[0.04]",
                    )}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Agronomic Simulation Inputs */}
        <section className="rounded-lg border border-white/[0.08] bg-[#1c1c1c] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="size-4 text-[#3ecf8e]" />
            <h2 className="text-sm font-semibold text-[#ededed]">
              Agronomic Simulation Parameters
            </h2>
          </div>

          <div className="space-y-4">
            {/* Borewell Depth */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-[#8b8b8b]">
                  <Droplets className="size-3.5 text-[#3ecf8e]" />
                  Borewell Depth
                </span>
                <span className="font-mono font-medium text-[#ededed]">{borewellDepth} m</span>
              </div>
              <input
                type="range"
                min={BOREWELL_DEPTH_RANGE.min}
                max={BOREWELL_DEPTH_RANGE.max}
                step={1}
                value={borewellDepth}
                onChange={(e) => onBorewellDepthChange(Number(e.target.value))}
                aria-label="Borewell depth in meters"
                className="w-full accent-[#3ecf8e] cursor-pointer"
              />
            </div>

            {/* Irrigation */}
            <div className="space-y-1.5">
              <span className="block text-xs text-[#8b8b8b]">Irrigation Infrastructure</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {IRRIGATION_TYPES.map((val) => {
                  const active = irrigation === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onIrrigationChange(val)}
                      className={cn(
                        "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                        active
                          ? "border-[#3ecf8e]/50 bg-[#3ecf8e]/12 text-[#3ecf8e]"
                          : "border-white/[0.08] bg-[#171717] text-[#8b8b8b] hover:text-[#ededed]",
                      )}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Season & Scenario */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1.5 text-xs">
                <span className="block text-[#8b8b8b]">Cropping Season</span>
                <select
                  value={season}
                  onChange={(e) => onSeasonChange(e.target.value as Season)}
                  className="h-9 w-full rounded-md border border-white/[0.1] bg-[#171717] px-3 text-xs text-[#ededed] focus:border-[#3ecf8e] focus:outline-none"
                >
                  {SEASONS.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="block text-[#8b8b8b]">Stress Scenario</span>
                <select
                  value={scenario}
                  onChange={(e) => onScenarioChange(e.target.value as Scenario)}
                  className="h-9 w-full rounded-md border border-white/[0.1] bg-[#171717] px-3 text-xs text-[#ededed] focus:border-[#3ecf8e] focus:outline-none"
                >
                  {SCENARIOS.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </section>
      </div>

      {/* Operator Account, 2FA Security & Localization */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-white/[0.08] bg-[#1c1c1c] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserIcon className="size-4 text-[#3ecf8e]" />
              <h2 className="text-sm font-semibold text-[#ededed]">Operator Session</h2>
            </div>
            <span className="inline-flex items-center gap-1 rounded border border-[#3ecf8e]/30 bg-[#3ecf8e]/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#3ecf8e]">
              <ShieldCheck className="size-3" />
              VERIFIED
            </span>
          </div>

          <div className="rounded-md border border-white/[0.08] bg-[#171717] p-3 space-y-1 text-xs">
            <div className="font-medium text-[#ededed]">
              {user?.fullName || user?.name || "AgroSpace Operator"}
            </div>
            <div className="font-mono text-[11px] text-[#8b8b8b] truncate">
              {user?.email || "Active Authenticated Session"}
            </div>
            <div className="pt-1 font-mono text-[10px] text-[#8b8b8b]">
              Role: <span className="text-[#ededed]">{user?.role || "OPERATOR"}</span> · Provider:{" "}
              <span className="text-[#ededed]">{user?.provider || "Supabase Auth"}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenProfileModal}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#3ecf8e] px-3 text-xs font-semibold text-[#121212] hover:bg-[#24b47e] transition-colors cursor-pointer"
            >
              <Settings className="size-3.5" />
              <span>Edit Profile & API Key</span>
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
            >
              <LogOut className="size-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </section>

        <TwoFactorSettingsCard />
      </div>

      <section className="rounded-lg border border-white/[0.08] bg-[#1c1c1c] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[#ededed]">
            Interface Theme & Language Preferences
          </h2>
          <LanguageSelector />
        </div>
        <ThemeSettingsCard />
      </section>
    </div>
  );
};
