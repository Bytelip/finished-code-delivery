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
            ? `grid size-8 place-items-center rounded-full border border-[var(--accent)]/45 bg-[var(--accent-surface)] font-mono text-xs font-bold text-[var(--accent)] shadow-sm hover:border-[var(--accent)] transition-all cursor-pointer ${className}`
            : `flex items-center gap-2.5 rounded-xl border border-[var(--accent)]/45 bg-[var(--accent-surface)] px-3.5 py-2 font-mono text-xs font-semibold text-[var(--accent)] shadow-sm hover:border-[var(--accent)] transition-all cursor-pointer ${className}`
        }
      >
        {compact ? (
          <span>NG</span>
        ) : (
          <>
            <Lock className="size-3.5 text-[var(--accent)]" />
            <span>{<LocalizedText text={"Mission Control Auth"} />}</span>
            <span className="size-2 rounded-full bg-[var(--status-ok)] shadow-[0_0_8px_var(--status-ok)] animate-pulse" />
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
          <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[var(--bg-surface)] bg-[var(--status-ok)]" />
        </div>

        {/* Display Name & Role Badge */}
        <div className="hidden sm:block min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-mono text-xs font-bold text-[var(--text-primary)] max-w-[120px]">
              {profile.fullName}
            </span>
            <span className="rounded-md bg-emerald-500/15 border border-emerald-500/40 px-1.5 py-0.2 font-mono text-xs font-bold text-[var(--status-ok)]">
              {<LocalizedText text={"VERIFIED"} />}
            </span>
          </div>
          <div className="flex items-center gap-1 font-mono text-xs text-[var(--accent)]">
            <Radio className="size-2 text-[var(--accent)] animate-pulse" />
            <span className="truncate">{profile.role}</span>
          </div>
        </div>

        <ChevronDown
          className={`size-3.5 text-[var(--text-muted)] transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[var(--accent)]" : ""
          }`}
        />
      </button>

      {/* Glassmorphic Dropdown Quick-Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full z-[1000] mt-2 w-72 sm:w-80 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 shadow-[var(--shadow-hud)] backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-150 text-[var(--text-primary)]">
          {/* Top User Identity Card */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-black/5 dark:bg-white/[0.04] p-3">
            <div className="flex items-center gap-3">
              <div
                className="flex size-10 items-center justify-center rounded-xl font-mono text-base font-black text-slate-900 shadow-md"
                style={{
                  background: `linear-gradient(135deg, ${avatarColor}, #ffffff)`,
                  boxShadow: `0 0 14px ${avatarColor}88`,
                }}
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-mono text-xs font-bold text-[var(--text-primary)]">
                    {profile.fullName}
                  </span>
                  <span className="rounded-md bg-emerald-500/15 border border-emerald-500/40 px-1 py-0.2 font-mono text-xs font-bold text-[var(--status-ok)]">
                    {profile.role}
                  </span>
                </div>
                <div className="truncate font-mono text-xs text-[var(--text-muted)]">
                  {profile.email}
                </div>
              </div>
            </div>

            {/* Provider and Verification Badge */}
            <div className="mt-2.5 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2 text-xs font-mono">
              <span className="flex items-center gap-1 text-[var(--status-ok)] font-semibold">
                <ShieldCheck className="size-3 text-[var(--status-ok)]" />
                {<LocalizedText text={"GMAIL VERIFIED"} />}
              </span>
              <span className="text-[var(--text-muted)]">
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
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left font-mono text-xs text-[var(--text-primary)] hover:bg-[var(--accent-surface)] hover:text-[var(--accent)] transition-colors cursor-pointer"
            >
              <Settings className="size-4 text-[var(--accent)]" />
              <div>
                <div className="font-semibold text-[var(--text-primary)]">
                  {<LocalizedText text={"Operator Profile & Settings"} />}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
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
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left font-mono text-xs text-[var(--text-primary)] hover:bg-[var(--accent-surface)] hover:text-[var(--accent)] transition-colors cursor-pointer"
            >
              <MapPin className="size-4 text-[var(--status-ok)]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {<LocalizedText text={"Home Base Station"} />}
                  </span>
                  <span className="text-xs text-[var(--status-ok)] font-bold">
                    {<LocalizedText text={"RADAR LOCK"} />}
                  </span>
                </div>
                <div className="truncate text-xs text-[var(--text-muted)]">
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
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left font-mono text-xs text-[var(--text-primary)] hover:bg-[var(--accent-surface)] hover:text-[var(--accent)] transition-colors cursor-pointer"
            >
              <Bell className="size-4 text-[var(--status-warn)]" />
              <div>
                <div className="font-semibold text-[var(--text-primary)]">
                  {<LocalizedText text={"API Keys & Hazard Alerts"} />}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {<LocalizedText text={"EONET cyclone, USGS quake, drought"} />}
                </div>
              </div>
            </button>
          </div>

          {/* Divider */}
          <div className="my-1.5 h-px bg-[var(--border-subtle)]" />

          {/* 4. Sign Out */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onSignOut();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-mono text-xs text-[var(--status-danger)] hover:bg-rose-500/15 transition-colors cursor-pointer"
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
