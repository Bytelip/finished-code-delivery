import {
  ChevronsLeft,
  ChevronsRight,
  Droplets,
  LayoutDashboard,
  Leaf,
  MapPin,
  Satellite,
  TriangleAlert,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FARM_PRESETS, type DashboardTab, type FarmPreset } from "@/types/agroSpace";

export const TABS: { id: DashboardTab; label: string; icon: typeof Leaf }[] = [
  { id: "overview", label: "HUD Overview", icon: LayoutDashboard },
  { id: "plant-health", label: "Plant Health (6-Pillar)", icon: Leaf },
  { id: "groundwater", label: "Groundwater & Crops", icon: Droplets },
  { id: "hazards", label: "Hazard Center (8 Alerts)", icon: TriangleAlert },
  { id: "granules", label: "NASA Granule Inspector", icon: Satellite },
];

export function DashboardSidebar({
  collapsed,
  onToggle,
  tab,
  onTab,
  lat,
  lon,
  onPreset,
  activeHazards,
}: {
  collapsed: boolean;
  onToggle: () => void;
  tab: DashboardTab;
  onTab: (t: DashboardTab) => void;
  lat: number;
  lon: number;
  onPreset: (p: FarmPreset) => void;
  activeHazards: number;
}) {
  return (
    <aside
      className={cn(
        "sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-sidebar-border/80 bg-sidebar/95 backdrop-blur-2xl transition-[width] duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.5)]",
        collapsed ? "w-16" : "w-72",
      )}
    >
      {/* Station Brand Header */}
      <div className="relative flex h-16 items-center gap-3 border-b border-sidebar-border px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative grid size-9 shrink-0 place-items-center rounded-lg border border-cyan/60 bg-cyan/15 text-cyan shadow-[0_0_15px_rgba(0,240,255,0.35)]">
          <Satellite className="size-4.5 animate-pulse" />
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald shadow-[0_0_8px_#00ff9d]" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-sans text-sm font-bold tracking-tight text-foreground">
                AgroSpace Nexus
              </span>
              <span className="rounded bg-cyan/20 px-1 py-0.2 font-mono text-[9px] font-semibold text-cyan uppercase tracking-widest">
                v2.4
              </span>
            </div>
            <div className="hud-label mt-0.5 truncate text-[9px] text-cyan/70">
              Orbital HUD · NASA Telemetry
            </div>
          </div>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex flex-col gap-1.5 p-2.5" aria-label="Dashboard sections">
        {!collapsed && (
          <div className="flex items-center justify-between px-2 pb-1 pt-1">
            <span className="hud-label tracking-widest text-[10px] text-muted-foreground/80">
              Telemetry Modules
            </span>
            <span className="font-mono text-[9px] text-cyan/60">[SYS:ONLINE]</span>
          </div>
        )}
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTab(id)}
              title={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-10.5 items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-all duration-150",
                active
                  ? "bg-cyan/15 text-cyan border border-cyan/40 shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground border border-transparent",
              )}
            >
              {active && (
                <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-cyan shadow-[0_0_10px_#00f0ff]" />
              )}
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                  active ? "text-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]" : "text-muted-foreground",
                )}
              />
              {!collapsed && <span className="truncate">{label}</span>}
              {id === "hazards" && activeHazards > 0 && (
                <span
                  className={cn(
                    "grid min-w-5 place-items-center rounded-full bg-crimson/25 border border-crimson/60 px-1.5 py-0.5 font-mono text-[10px] font-bold text-crimson shadow-[0_0_10px_rgba(255,46,86,0.4)] animate-pulse",
                    collapsed ? "absolute right-1 top-1" : "ml-auto",
                  )}
                >
                  {activeHazards}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Preset Target Farms */}
      <div className="flex flex-col gap-1.5 border-t border-sidebar-border/80 p-2.5 overflow-y-auto">
        {!collapsed && (
          <div className="flex items-center justify-between px-2 pb-1 pt-1">
            <span className="hud-label tracking-widest text-[10px] text-muted-foreground/80">
              Target Waypoints
            </span>
            <span className="font-mono text-[9px] text-emerald/70">RADAR LOCK</span>
          </div>
        )}
        {FARM_PRESETS.map((p) => {
          const active = Math.abs(p.lat - lat) < 0.005 && Math.abs(p.lon - lon) < 0.005;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPreset(p)}
              title={`${p.name} [${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}]`}
              className={cn(
                "group relative flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-all duration-150",
                active
                  ? "border-emerald/60 bg-emerald/15 shadow-[0_0_14px_rgba(0,255,157,0.22)]"
                  : "border-border/30 hover:border-cyan/40 hover:bg-sidebar-accent/50",
              )}
            >
              <div
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded border transition-colors",
                  active
                    ? "border-emerald/60 bg-emerald/20 text-emerald"
                    : "border-border/40 bg-background/40 text-muted-foreground group-hover:text-cyan group-hover:border-cyan/50",
                )}
              >
                <MapPin className="size-3.5" />
              </div>
              {!collapsed && (
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-foreground/90 group-hover:text-foreground">
                    {p.name}
                  </span>
                  <span className="block font-mono text-[10px] text-muted-foreground group-hover:text-cyan/80">
                    [{p.lat.toFixed(2)}°, {p.lon.toFixed(2)}°]
                  </span>
                </span>
              )}
              {active && !collapsed && (
                <span className="ml-auto size-1.5 rounded-full bg-emerald shadow-[0_0_6px_#00ff9d] animate-ping-slow" />
              )}
            </button>
          );
        })}
      </div>

      {/* Collapse Actuator Button */}
      <button
        type="button"
        onClick={onToggle}
        className="mt-auto flex h-12 items-center justify-between border-t border-sidebar-border/80 px-4 text-xs font-mono text-muted-foreground transition-colors hover:text-cyan hover:bg-cyan/5"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <div className="flex items-center gap-2.5">
          {collapsed ? <ChevronsRight className="size-4 text-cyan" /> : <ChevronsLeft className="size-4 text-cyan" />}
          {!collapsed && <span className="hud-label text-[10px]">Orbital Dock</span>}
        </div>
        {!collapsed && <span className="text-[10px] text-muted-foreground/60">[TAB / H]</span>}
      </button>
    </aside>
  );
}
