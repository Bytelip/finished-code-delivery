import React, { useEffect, useRef, useState } from "react";
import {
  User,
  ShieldCheck,
  MapPin,
  Settings,
  Bell,
  LogOut,
  ChevronDown,
  Sparkles,
  Radio,
  Lock,
} from "lucide-react";
import type { UserProfile } from "@/types/userProfile";
import { LocalizedText } from "@/components/i18n/LocalizedText";

export interface OperatorProfileDropdownProps {
  profile: UserProfile | null;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
  onNavigateHome?: ((lat: number, lon: number, label: string) => void) | undefined;
  onSignOut: () => void;
  className?: string;
  compact?: boolean;
}

export const OperatorProfileDropdown: React.FC<OperatorProfileDropdownProps> = ({
  profile,
  onOpenAuth,
  onOpenSettings,
  onNavigateHome,
  onSignOut,
  className = "",
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // If user is not authenticated, show sleek sign-in actuator
  if (!profile) {
    return (
      <button
        type="button"
        onClick={onOpenAuth}
        aria-label="Sign in to AgroSpace"
        title="Sign in to AgroSpace"
        className={
          compact
            ? `grid size-8 place-items-center rounded-full border border-cyan-400/40 bg-cyan-500/15 font-mono text-xs font-bold text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:border-cyan-400 hover:bg-cyan-500/25 transition-all cursor-pointer ${className}`
            : `flex items-center gap-2.5 rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-500/15 to-blue-600/10 px-3.5 py-2 font-mono text-xs font-semibold text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:border-cyan-400 hover:bg-cyan-500/25 transition-all cursor-pointer ${className}`
        }
      >
        {compact ? (
          <span>NG</span>
        ) : (
          <>
            <Lock className="size-3.5 text-cyan-300" />
            <span>{<LocalizedText text={"Mission Control Auth"} />}</span>
            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse" />
          </>
        )}
      </button>
    );
  }

  const initial = profile.fullName ? profile.fullName.charAt(0).toUpperCase() : "O";
  const avatarColor = profile.avatarColor || "#00F0FF";
  const homeBase = profile.preferences?.homeBaseName || "Kolar Plateau, Karnataka";
  const homeCoords = profile.preferences?.homeCoords || { lat: 13.1367, lon: 78.1292 };

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      {/* Operator Profile Avatar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1.5 pr-3 text-left shadow-sm backdrop-blur-xl hover:border-[var(--accent)] transition-all cursor-pointer"
        aria-label="Operator Profile Quick Menu"
        aria-expanded={isOpen}
      >
        {/* Avatar Initials with Glow */}
        <div className="relative">
          <div
            className="flex size-8 items-center justify-center rounded-lg font-mono text-xs font-black text-muted-foreground shadow-md"
            style={{
              background: `linear-gradient(135deg, ${avatarColor}, #ffffff)`,
              boxShadow: `0 0 12px ${avatarColor}88`,
            }}
          >
            {initial}
          </div>
          {/* Green Online Status Dot */}
          <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#080f1e] bg-emerald-400 shadow-[0_0_6px_#10b981]" />
        </div>

        {/* Display Name & Role Badge */}
        <div className="hidden sm:block min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-mono text-xs font-bold text-foreground max-w-[120px]">
              {profile.fullName}
            </span>
            <span className="rounded-md bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.2 font-mono text-xs font-bold text-emerald-400">
              {<LocalizedText text={"VERIFIED"} />}
            </span>
          </div>
          <div className="flex items-center gap-1 font-mono text-xs text-cyan-300">
            <Radio className="size-2 text-cyan-300 animate-pulse" />
            <span className="truncate">{profile.role}</span>
          </div>
        </div>

        <ChevronDown
          className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180 text-cyan-300" : ""
          }`}
        />
      </button>

      {/* Glassmorphic Dropdown Quick-Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full z-[1000] mt-2 w-72 sm:w-80 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 shadow-[var(--shadow-hud)] backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-150 text-[var(--text-primary)]">
          {/* Top User Identity Card */}
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center gap-3">
              <div
                className="flex size-10 items-center justify-center rounded-xl font-mono text-base font-black text-muted-foreground shadow-md"
                style={{
                  background: `linear-gradient(135deg, ${avatarColor}, #ffffff)`,
                  boxShadow: `0 0 14px ${avatarColor}88`,
                }}
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-mono text-xs font-bold text-foreground">
                    {profile.fullName}
                  </span>
                  <span className="rounded-md bg-emerald-500/15 border border-emerald-500/40 px-1 py-0.2 font-mono text-xs font-bold text-emerald-400">
                    {profile.role}
                  </span>
                </div>
                <div className="truncate font-mono text-xs text-muted-foreground">
                  {profile.email}
                </div>
              </div>
            </div>

            {/* Provider and Verification Badge */}
            <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2 text-xs font-mono">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <ShieldCheck className="size-3 text-emerald-400" />
                {<LocalizedText text={"GMAIL VERIFIED"} />}
              </span>
              <span className="text-muted-foreground">
                {<LocalizedText text={"Via "} />}
                {profile.provider}
              </span>
            </div>
          </div>

          {/* Quick Menu Options */}
          <div className="mt-1.5 space-y-1">
            {/* 1. Operator Profile & Account Settings */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left font-mono text-xs text-foreground hover:bg-cyan-500/15 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <Settings className="size-4 text-cyan-300" />
              <div>
                <div className="font-semibold text-foreground">
                  {<LocalizedText text={"Operator Profile & Settings"} />}
                </div>
                <div className="text-xs text-muted-foreground">
                  {<LocalizedText text={"Preferences, role, and telemetry HUD"} />}
                </div>
              </div>
            </button>

            {/* 2. Saved Telemetry Locations & Home Base */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onNavigateHome) {
                  onNavigateHome(homeCoords.lat, homeCoords.lon, homeBase);
                } else {
                  onOpenSettings();
                }
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left font-mono text-xs text-foreground hover:bg-cyan-500/15 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <MapPin className="size-4 text-emerald-400" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-foreground">
                    {<LocalizedText text={"Home Base Station"} />}
                  </span>
                  <span className="text-xs text-emerald-400 font-bold">
                    {<LocalizedText text={"RADAR LOCK"} />}
                  </span>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {homeBase} [{homeCoords.lat.toFixed(2)}°, {homeCoords.lon.toFixed(2)}°]
                </div>
              </div>
            </button>

            {/* 3. API Keys & Alert Thresholds */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left font-mono text-xs text-foreground hover:bg-cyan-500/15 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <Bell className="size-4 text-amber-400" />
              <div>
                <div className="font-semibold text-foreground">
                  {<LocalizedText text={"API Keys & Hazard Alerts"} />}
                </div>
                <div className="text-xs text-muted-foreground">
                  {<LocalizedText text={"EONET cyclone, USGS quake, drought"} />}
                </div>
              </div>
            </button>
          </div>

          {/* Divider */}
          <div className="my-1.5 h-px bg-white/10" />

          {/* 4. Sign Out */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onSignOut();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-mono text-xs text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
          >
            <LogOut className="size-3.5 text-rose-400" />
            <span>{<LocalizedText text={"Sign Out Operator Clearance"} />}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default OperatorProfileDropdown;
