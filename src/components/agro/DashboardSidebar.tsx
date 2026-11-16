import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronsLeft,
  ChevronsRight,
  Droplets,
  LayoutDashboard,
  Leaf,
  MapPin,
  Satellite,
  TriangleAlert,
  Sprout,
  Pin,
  PinOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FARM_PRESETS, type DashboardTab, type FarmPreset } from "@/types/agroSpace";
import { useLanguage } from "@/context/LanguageContext";

export const TABS: { id: DashboardTab; label: string; icon: typeof Leaf }[] = [
  { id: "overview", label: "HUD Overview", icon: LayoutDashboard },
  { id: "crop-atlas", label: "Global Crop Atlas (600 Crops)", icon: Sprout },
  { id: "plant-health", label: "Plant Health (6-Pillar)", icon: Leaf },
  { id: "groundwater", label: "Groundwater & Crops", icon: Droplets },
  { id: "hazards", label: "Hazard Center (8 Alerts)", icon: TriangleAlert },
  { id: "granules", label: "NASA Granule Inspector", icon: Satellite },
];

export function DashboardSidebar({
  collapsed,
  onToggle,
  isPinned = false,
  onTogglePin,
  tab,
  onTab,
  lat,
  lon,
  onPreset,
  activeHazards,
  operator,
  onOpenAuth,
}: {
  collapsed: boolean;
  onToggle: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  tab: DashboardTab;
  onTab: (t: DashboardTab) => void;
  lat: number;
  lon: number;
  onPreset: (p: FarmPreset) => void;
  activeHazards: number;
  operator?: { email: string; fullName?: string | undefined } | null;
  onOpenAuth?: () => void;
  onOpenSettings?: () => void;
}) {
  const { t } = useLanguage();

  const getTabLabel = (id: DashboardTab, fallback: string) => {
    switch (id) {
      case "overview":
        return t("tab_overview", fallback);
      case "crop-atlas":
        return t("tab_crop_atlas", fallback);
      case "plant-health":
        return t("tab_plant_health", fallback);
      case "groundwater":
        return t("tab_groundwater", fallback);
      case "hazards":
        return t("tab_hazards", fallback);
      case "granules":
        return t("tab_granules", fallback);
      default:
        return fallback;
    }
  };
  return (
    <motion.aside
      initial={false}
      animate={{
        width: collapsed ? 56 : 240,
      }}
      transition={{
        type: "spring",
        stiffness: 340,
        damping: 30,
      }}
      className={cn(
        "fixed left-3 top-16 bottom-4 z-30 flex shrink-0 flex-col rounded-2xl",
        "bg-[#070D19]/88 backdrop-blur-2xl border border-white/10",
        "shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.16)]",
        "overflow-hidden select-none",
      )}
    >
      {/* Station Brand Header & Pin Control */}
      <div className="relative flex h-14 items-center justify-between border-b border-white/[0.08] px-2.5 overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onToggle}
            className="relative grid size-9 shrink-0 place-items-center rounded-xl border border-cyan-400/50 bg-cyan-500/15 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.35)] hover:bg-cyan-500/25 transition-all cursor-pointer"
            title={collapsed ? "Expand Orbital Dock (Tab / H)" : "Collapse Orbital Dock (Tab / H)"}
          >
            <Satellite className="size-4.5 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
          </button>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="min-w-0"
              >
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-sans text-xs font-bold tracking-tight text-white">
                    AgroSpace
                  </span>
                  <span className="rounded bg-cyan-500/20 px-1 py-0.2 font-mono text-[8.5px] font-semibold text-cyan-300 uppercase tracking-widest border border-cyan-400/30">
                    v2.4
                  </span>
                </div>
                <div className="hud-label mt-0.5 truncate text-[8.5px] text-cyan-300/80">
                  SPATIAL OBSERVATORY
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pin Actuator (When expanded) */}
        {!collapsed && onTogglePin && (
          <button
            type="button"
            onClick={onTogglePin}
            className={cn(
              "size-7 rounded-lg border flex items-center justify-center transition-colors cursor-pointer shrink-0",
              isPinned
                ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300"
                : "border-white/10 text-muted-foreground hover:text-white hover:bg-white/5",
            )}
            title={
              isPinned
                ? "Pinned: Will not auto-collapse on map drag"
                : "Unpinned: Auto-collapses on map rotation"
            }
          >
            {isPinned ? <Pin className="size-3.5 fill-current" /> : <PinOff className="size-3.5" />}
          </button>
        )}
      </div>

      {/* Navigation Modules */}
      <nav
        className="flex min-h-0 flex-col gap-1 overflow-y-auto px-1.5 py-2 no-scrollbar sm:p-2"
        aria-label="Dashboard sections"
      >
        {!collapsed && (
          <div className="flex items-center justify-between px-2 pb-1 pt-1">
            <span className="hud-label tracking-widest text-[9.5px] text-muted-foreground/80 font-bold">
              {t("orbital_modules", "ORBITAL MODULES")}
            </span>
            <span className="font-mono text-[8.5px] text-cyan-400/70">[ONLINE]</span>
          </div>
        )}

        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          const displayLabel = getTabLabel(id, label);
          return (
            <div key={id} className="relative group">
              <button
                type="button"
                onClick={() => onTab(id)}
                title={collapsed ? displayLabel : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-9.5 min-h-11 w-full items-center gap-2.5 overflow-hidden rounded-xl px-2.5 text-left text-xs font-medium transition-all duration-150 cursor-pointer sm:min-h-0",
                  active
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                    : "text-muted-foreground hover:bg-white/5 hover:text-white border border-transparent",
                  collapsed && "justify-center px-0",
                )}
              >
                {active && (
                  <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-cyan-400 shadow-[0_0_10px_#00f0ff]" />
                )}
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                    active
                      ? "text-cyan-300 drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]"
                      : "text-muted-foreground",
                  )}
                />

                {!collapsed && <span className="truncate">{displayLabel}</span>}

                {id === "hazards" && activeHazards > 0 && (
                  <span
                    className={cn(
                      "grid min-w-4.5 place-items-center rounded-full bg-crimson/25 border border-crimson/60 px-1 py-0.2 font-mono text-[9px] font-bold text-crimson shadow-[0_0_10px_rgba(255,46,86,0.4)] animate-pulse",
                      collapsed ? "absolute right-1 top-1" : "ml-auto",
                    )}
                  >
                    {activeHazards}
                  </span>
                )}
              </button>

              {/* Collapsed Instant Tooltip */}
              {collapsed && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3.5 hidden sm:block z-50 rounded-lg bg-[#0b0f19]/95 border border-cyan-500/30 px-2.5 py-1 text-xs font-mono text-cyan-200 shadow-2xl backdrop-blur-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  {displayLabel}
                  {id === "hazards" && activeHazards > 0 && ` (${activeHazards} active)`}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Preset Target Waypoints */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto border-t border-white/[0.08] px-1.5 py-2 no-scrollbar sm:p-2">
        {!collapsed && (
          <div className="flex items-center justify-between px-2 pb-1 pt-1 shrink-0">
            <span className="hud-label tracking-widest text-[9.5px] text-muted-foreground/80 font-bold">
              {t("target_waypoints", "TARGET WAYPOINTS")}
            </span>
            <span className="font-mono text-[8.5px] text-emerald-400/80">RADAR LOCK</span>
          </div>
        )}

        {FARM_PRESETS.map((p) => {
          const active = Math.abs(p.lat - lat) < 0.005 && Math.abs(p.lon - lon) < 0.005;
          return (
            <div key={p.id} className="relative group">
              <button
                type="button"
                onClick={() => onPreset(p)}
                title={
                  collapsed ? `${p.name} [${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}]` : undefined
                }
                className={cn(
                  "relative flex min-h-11 w-full items-center gap-2 overflow-hidden rounded-lg border px-2 py-1.5 text-left transition-all duration-150 cursor-pointer sm:min-h-0",
                  active
                    ? "border-emerald-500/60 bg-emerald-500/15 shadow-[0_0_14px_rgba(0,255,157,0.22)]"
                    : "border-transparent hover:border-cyan-500/40 hover:bg-white/5",
                  collapsed && "justify-center px-0",
                )}
              >
                <div
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded border transition-colors",
                    active
                      ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-300"
                      : "border-border/40 bg-background/40 text-muted-foreground group-hover:text-cyan-300 group-hover:border-cyan-500/50",
                  )}
                >
                  <MapPin className="size-3" />
                </div>

                {!collapsed && (
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold text-white/90 group-hover:text-white">
                      {p.name}
                    </span>
                    <span className="block font-mono text-[9px] text-muted-foreground group-hover:text-cyan-300/80">
                      [{p.lat.toFixed(2)}°, {p.lon.toFixed(2)}°]
                    </span>
                  </span>
                )}

                {active && !collapsed && (
                  <span className="ml-auto size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#00ff9d] animate-ping-slow shrink-0" />
                )}
              </button>

              {/* Collapsed Instant Tooltip */}
              {collapsed && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3.5 hidden sm:block z-50 rounded-lg bg-[#0b0f19]/95 border border-emerald-500/40 px-2.5 py-1 text-xs font-mono text-emerald-200 shadow-2xl backdrop-blur-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  {p.name} [{p.lat.toFixed(2)}°, {p.lon.toFixed(2)}°]
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Collapse Actuator Button */}
      <button
        type="button"
        onClick={onToggle}
        className="mt-auto flex h-10 items-center justify-between border-t border-white/[0.08] px-3 text-xs font-mono text-muted-foreground transition-colors hover:text-cyan-300 hover:bg-cyan-500/10 cursor-pointer shrink-0"
        aria-label={
          collapsed ? t("expand_dock", "Expand sidebar") : t("collapse_dock", "Collapse sidebar")
        }
      >
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronsRight className="size-4 text-cyan-400" />
          ) : (
            <ChevronsLeft className="size-4 text-cyan-400" />
          )}
          {!collapsed && (
            <span className="hud-label text-[9px]">{t("collapse_dock", "Collapse Dock")}</span>
          )}
        </div>
        {!collapsed && <span className="text-[9px] text-muted-foreground/60">[TAB / H]</span>}
      </button>
    </motion.aside>
  );
}
