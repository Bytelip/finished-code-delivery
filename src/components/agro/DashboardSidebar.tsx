import {
  ChevronsLeft,
  ChevronsRight,
  Droplets,
  LayoutDashboard,
  Leaf,
  MapPin,
  Satellite,
  TriangleAlert,
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
        "sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar backdrop-blur-xl transition-[width] duration-300",
        collapsed ? "w-16" : "w-72",
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="grid size-8 shrink-0 place-items-center rounded-md border border-cyan/50 bg-cyan/10 text-cyan glow-cyan">
          <Satellite className="size-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight">AgroSpace Nexus</div>
            <div className="hud-label truncate">Precision Ag · Multi-Hazard HUD</div>
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-1 p-2" aria-label="Dashboard sections">
        {!collapsed && <div className="hud-label px-2 pb-1 pt-2">Modules</div>}
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
                "group relative flex h-10 items-center gap-3 rounded-md px-3 text-left text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              {active && (
                <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-cyan glow-cyan" />
              )}
              <Icon className={cn("size-4 shrink-0", active && "text-cyan")} />
              {!collapsed && <span className="truncate">{label}</span>}
              {id === "hazards" && activeHazards > 0 && (
                <span
                  className={cn(
                    "grid min-w-5 place-items-center rounded-full bg-crimson/20 px-1 font-mono text-[10px] text-crimson",
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

      <div className="flex flex-col gap-1 border-t border-sidebar-border p-2">
        {!collapsed && <div className="hud-label px-2 pb-1 pt-2">Preset Farms</div>}
        {FARM_PRESETS.map((p) => {
          const active = Math.abs(p.lat - lat) < 0.005 && Math.abs(p.lon - lon) < 0.005;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPreset(p)}
              title={`${p.name} [${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}]`}
              className={cn(
                "flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors",
                active
                  ? "border-emerald/50 bg-emerald/10"
                  : "border-transparent hover:border-border hover:bg-sidebar-accent/60",
              )}
            >
              <MapPin
                className={cn("size-4 shrink-0", active ? "text-emerald" : "text-muted-foreground")}
              />
              {!collapsed && (
                <span className="min-w-0">
                  <span className="block truncate text-sm">{p.name}</span>
                  <span className="block font-mono text-[10px] text-muted-foreground">
                    [{p.lat.toFixed(2)}, {p.lon.toFixed(2)}]
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="mt-auto flex h-12 items-center gap-3 border-t border-sidebar-border px-5 text-xs text-muted-foreground transition-colors hover:text-cyan"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        {!collapsed && <span className="hud-label">Collapse</span>}
      </button>
    </aside>
  );
}
