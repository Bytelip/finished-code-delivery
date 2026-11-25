import React, { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  HelpCircle,
  LogOut,
  MapPin,
  Menu,
  Plug,
  RefreshCw,
  Satellite,
  Search,
  Settings,
  Terminal,
  User as UserIcon,
} from "lucide-react";
import { FARM_PRESETS, type FarmPreset, type Scenario } from "@/types/agroSpace";
import type { UserProfile } from "@/types/userProfile";
import { cn } from "@/lib/utils";
import type { ConsoleView } from "./consoleTypes";

export interface ConsoleTopBarProps {
  regionLabel: string;
  lat: number;
  lon: number;
  scenario: Scenario;
  isLive: boolean;
  isLoadingLive: boolean;
  activeHazards: number;
  user: UserProfile | null;
  onToggleMobileDrawer: () => void;
  onSelectPreset: (preset: FarmPreset) => void;
  onNavigateView: (view: ConsoleView) => void;
  onOpenConnect: () => void;
  onOpenCommandPalette: () => void;
  onOpenHelp: () => void;
  onRefreshTelemetry: () => void;
  onOpenAccountSettings: () => void;
  onNavigateHome: (lat: number, lon: number, label: string) => void;
  onSignOut: () => void;
}

export const ConsoleTopBar: React.FC<ConsoleTopBarProps> = ({
  regionLabel,
  lat,
  lon,
  scenario,
  isLive,
  isLoadingLive,
  activeHazards,
  user,
  onToggleMobileDrawer,
  onSelectPreset,
  onNavigateView,
  onOpenConnect,
  onOpenCommandPalette,
  onOpenHelp,
  onRefreshTelemetry,
  onOpenAccountSettings,
  onNavigateHome,
  onSignOut,
}) => {
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const projectRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (workspaceRef.current && !workspaceRef.current.contains(target)) {
        setWorkspaceOpen(false);
      }
      if (projectRef.current && !projectRef.current.contains(target)) {
        setProjectOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const shortRegion = regionLabel.split(",")[0]?.trim() || "AgroSpace Nexus";
  const initials = (user?.fullName || user?.name || user?.email || "OP")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header
      aria-label="Global Console Header"
      className="sticky top-0 z-50 flex h-12 w-full items-center justify-between gap-2 border-b border-white/[0.08] bg-[#171717] px-2.5 sm:px-3 text-[#ededed] select-none"
    >
      {/* Left: Mobile Drawer Toggle + Brand + Breadcrumbs + Connect */}
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onToggleMobileDrawer}
          aria-label="Open navigation drawer"
          className="inline-flex size-8 items-center justify-center rounded-md text-[#8b8b8b] hover:bg-white/[0.06] hover:text-[#ededed] md:hidden cursor-pointer shrink-0"
        >
          <Menu className="size-4" />
        </button>

        {/* AgroSpace Brand Icon */}
        <button
          type="button"
          onClick={() => onNavigateView("overview")}
          aria-label="AgroSpace Nexus Overview"
          className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[#3ecf8e]/35 bg-[#3ecf8e]/12 text-[#3ecf8e] hover:bg-[#3ecf8e]/20 transition-colors cursor-pointer"
        >
          <Satellite className="size-3.5" />
        </button>

        {/* Slash-Separated Breadcrumb Selectors */}
        <nav aria-label="Workspace Breadcrumbs" className="flex min-w-0 items-center gap-1 text-xs">
          {/* Workspace Selector */}
          <div ref={workspaceRef} className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => {
                setWorkspaceOpen((o) => !o);
                setProjectOpen(false);
              }}
              className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-[#ededed] hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <span className="truncate max-w-[110px]">AgroSpace Ops</span>
              <span className="rounded border border-white/[0.1] bg-[#242424] px-1.5 py-0.2 font-mono text-[10px] font-medium uppercase text-[#8b8b8b]">
                PRO
              </span>
              <ChevronDown className="size-3 text-[#8b8b8b]" />
            </button>

            {workspaceOpen && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-56 rounded-lg border border-white/[0.08] bg-[#1c1c1c] p-1.5 shadow-[0_14px_38px_rgba(0,0,0,0.75)]">
                <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-[#8b8b8b]">
                  Organization Workspace
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceOpen(false);
                    onNavigateView("overview");
                  }}
                  className="flex w-full items-center justify-between rounded-md bg-[#242424] px-2.5 py-1.5 text-xs text-[#ededed] cursor-pointer"
                >
                  <span>AgroSpace Ops</span>
                  <span className="size-1.5 rounded-full bg-[#3ecf8e]" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceOpen(false);
                    onNavigateView("settings");
                  }}
                  className="mt-1 flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-[#8b8b8b] hover:bg-white/[0.05] hover:text-[#ededed] cursor-pointer"
                >
                  <span>Workspace Settings</span>
                  <Settings className="size-3.5" />
                </button>
              </div>
            )}
          </div>

          <span className="hidden sm:inline text-white/20 font-light">/</span>

          {/* Project / Field Selector */}
          <div ref={projectRef} className="relative min-w-0">
            <button
              type="button"
              onClick={() => {
                setProjectOpen((o) => !o);
                setWorkspaceOpen(false);
              }}
              className="flex h-7 min-w-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-[#ededed] hover:bg-white/[0.06] transition-colors cursor-pointer"
              title={`${regionLabel} (${lat.toFixed(4)}, ${lon.toFixed(4)})`}
            >
              <span className="truncate max-w-[130px] sm:max-w-[180px]">{shortRegion}</span>
              <ChevronDown className="size-3 shrink-0 text-[#8b8b8b]" />
            </button>

            {projectOpen && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-lg border border-white/[0.08] bg-[#1c1c1c] p-1.5 shadow-[0_14px_38px_rgba(0,0,0,0.75)]">
                <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-[#8b8b8b]">
                  Active Field Presets
                </div>
                {FARM_PRESETS.map((preset) => {
                  const active =
                    Math.abs(preset.lat - lat) < 0.05 && Math.abs(preset.lon - lon) < 0.05;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        onSelectPreset(preset);
                        setProjectOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer",
                        active
                          ? "bg-[#3ecf8e]/12 text-[#3ecf8e]"
                          : "text-[#ededed] hover:bg-white/[0.05]",
                      )}
                    >
                      <span className="truncate font-medium">{preset.name}</span>
                      <span className="font-mono text-[10px] text-[#8b8b8b]">
                        {preset.lat.toFixed(2)}, {preset.lon.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
                <div className="my-1 border-t border-white/[0.08]" />
                <button
                  type="button"
                  onClick={() => {
                    setProjectOpen(false);
                    onOpenConnect();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-[#3ecf8e] hover:bg-white/[0.05] cursor-pointer"
                >
                  <MapPin className="size-3.5" />
                  <span>Custom Coordinates & GPS…</span>
                </button>
              </div>
            )}
          </div>

          <span className="hidden md:inline text-white/20 font-light">/</span>

          {/* Branch & Live Status Pill */}
          <div className="hidden md:flex items-center gap-1.5 pl-1">
            <span className="font-mono text-xs text-[#8b8b8b]">main</span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide",
                scenario === "Nominal"
                  ? isLive
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    : "border-[#3ecf8e]/30 bg-[#3ecf8e]/10 text-[#3ecf8e]"
                  : "border-red-500/35 bg-red-500/10 text-red-400",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  scenario === "Nominal"
                    ? isLive
                      ? "bg-amber-400 animate-pulse"
                      : "bg-[#3ecf8e]"
                    : "bg-red-400 animate-pulse",
                )}
              />
              {scenario === "Nominal" ? (isLive ? "LIVE" : "READY") : "SIM"}
            </span>
          </div>
        </nav>

        {/* Connect Outline Button */}
        <button
          type="button"
          onClick={onOpenConnect}
          className="hidden lg:inline-flex h-7 items-center gap-1.5 rounded-md border border-white/[0.12] bg-transparent px-2.5 text-xs font-medium text-[#ededed] hover:border-white/[0.22] hover:bg-white/[0.05] transition-colors cursor-pointer shrink-0"
        >
          <Plug className="size-3 text-[#3ecf8e]" />
          <span>Connect</span>
        </button>
      </div>

      {/* Right: Ctrl K Search + Quick Actions + Profile Avatar */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        {/* Global Command Search Trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          aria-label="Open command palette search"
          className="flex h-7 items-center gap-2 rounded-md border border-white/[0.08] bg-[#1c1c1c] px-2 sm:px-2.5 text-xs text-[#8b8b8b] hover:border-white/[0.18] hover:text-[#ededed] transition-colors cursor-pointer"
        >
          <Search className="size-3.5 shrink-0" />
          <span className="hidden md:inline text-xs">Search…</span>
          <kbd className="hidden sm:inline-flex items-center rounded border border-white/[0.1] bg-[#141414] px-1.5 py-0.2 font-mono text-[10px] text-[#8b8b8b]">
            Ctrl K
          </kbd>
        </button>

        {/* Quick Icon Actions */}
        <button
          type="button"
          onClick={onOpenHelp}
          aria-label="Help and shortcuts"
          title="Help & Keyboard Shortcuts"
          className="hidden sm:inline-flex size-7 items-center justify-center rounded-md text-[#8b8b8b] hover:bg-white/[0.06] hover:text-[#ededed] transition-colors cursor-pointer"
        >
          <HelpCircle className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => onNavigateView("hazards")}
          aria-label="Hazard alerts"
          title="Hazard Advisors"
          className="relative hidden sm:inline-flex size-7 items-center justify-center rounded-md text-[#8b8b8b] hover:bg-white/[0.06] hover:text-[#ededed] transition-colors cursor-pointer"
        >
          <Bell className="size-4" />
          {activeHazards > 0 && (
            <span className="absolute right-1 top-1 size-2 rounded-full bg-red-500 ring-2 ring-[#171717]" />
          )}
        </button>

        <button
          type="button"
          onClick={onRefreshTelemetry}
          aria-label="Refresh telemetry"
          title="Sync Live NASA Telemetry"
          className="hidden sm:inline-flex size-7 items-center justify-center rounded-md text-[#8b8b8b] hover:bg-white/[0.06] hover:text-[#ededed] transition-colors cursor-pointer"
        >
          <RefreshCw className={cn("size-3.5", isLoadingLive && "animate-spin text-[#3ecf8e]")} />
        </button>

        <button
          type="button"
          onClick={() => onNavigateView("data-explorer")}
          aria-label="Data explorer console"
          title="Open Data Explorer (G then E)"
          className="hidden md:inline-flex size-7 items-center justify-center rounded-md text-[#8b8b8b] hover:bg-white/[0.06] hover:text-[#ededed] transition-colors cursor-pointer"
        >
          <Terminal className="size-4" />
        </button>

        {/* Signed-in Profile Avatar Dropdown */}
        <div ref={profileRef} className="relative pl-0.5">
          <button
            type="button"
            onClick={() => setProfileOpen((o) => !o)}
            aria-label="Operator Account Menu"
            aria-expanded={profileOpen}
            className="flex h-7 items-center gap-2 rounded-md border border-white/[0.08] bg-[#1c1c1c] px-1.5 sm:px-2 hover:border-white/[0.18] transition-colors cursor-pointer"
          >
            <span
              className="relative flex size-5 items-center justify-center rounded-full font-mono text-[10px] font-bold text-[#121212]"
              style={{ backgroundColor: user?.avatarColor || "#3ecf8e" }}
            >
              {initials || <UserIcon className="size-3" />}
              <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-[#1c1c1c] bg-[#3ecf8e]" />
            </span>
            <span className="hidden lg:inline max-w-[110px] truncate text-xs font-medium text-[#ededed]">
              {user?.fullName || user?.name || "Operator"}
            </span>
            <ChevronDown className="hidden sm:inline size-3 text-[#8b8b8b]" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-lg border border-white/[0.08] bg-[#1c1c1c] p-2 shadow-[0_16px_42px_rgba(0,0,0,0.8)]">
              <div className="border-b border-white/[0.08] px-2 pb-2.5 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-[#ededed]">
                    {user?.fullName || user?.name || "AgroSpace Operator"}
                  </span>
                  <span className="rounded bg-[#3ecf8e]/15 px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#3ecf8e]">
                    {user?.provider || "Email"}
                  </span>
                </div>
                <div className="mt-0.5 truncate font-mono text-[11px] text-[#8b8b8b]">
                  {user?.email || "Authenticated Session"}
                </div>
              </div>

              <div className="mt-1.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onOpenAccountSettings();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[#ededed] hover:bg-white/[0.06] cursor-pointer"
                >
                  <Settings className="size-3.5 text-[#8b8b8b]" />
                  <span>Account & Profile Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    const homeCoords = user?.preferences?.homeCoords;
                    const homeName = user?.preferences?.homeBaseName || "Home Station";
                    if (homeCoords) {
                      onNavigateHome(homeCoords.lat, homeCoords.lon, homeName);
                    } else {
                      onNavigateHome(13.1367, 78.1292, "Kolar Plateau, Karnataka");
                    }
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[#ededed] hover:bg-white/[0.06] cursor-pointer"
                >
                  <MapPin className="size-3.5 text-[#3ecf8e]" />
                  <span>Jump to Home Station</span>
                </button>
              </div>

              <div className="my-1.5 border-t border-white/[0.08]" />

              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  onSignOut();
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 cursor-pointer"
              >
                <LogOut className="size-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
