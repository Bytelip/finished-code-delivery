import React, { useState } from "react";
import {
  CloudSun,
  Globe2,
  LayoutDashboard,
  Radio,
  Settings,
  ShieldAlert,
  Table2,
  X,
  Plug,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CONSOLE_NAV_ITEMS, type ConsoleView } from "./consoleTypes";

const ICONS: Record<ConsoleView, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  "satellite-map": Globe2,
  "weather-soil": CloudSun,
  hazards: ShieldAlert,
  "data-explorer": Table2,
  services: Radio,
  settings: Settings,
};

export interface ConsoleSidebarRailProps {
  activeView: ConsoleView;
  onSelectView: (view: ConsoleView) => void;
  activeHazards: number;
  isLive: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenConnect: () => void;
  onRefreshTelemetry: () => void;
}

export const ConsoleSidebarRail: React.FC<ConsoleSidebarRailProps> = ({
  activeView,
  onSelectView,
  activeHazards,
  isLive,
  mobileOpen,
  onCloseMobile,
  onOpenConnect,
  onRefreshTelemetry,
}) => {
  const [hovered, setHovered] = useState(false);

  const missionItems = CONSOLE_NAV_ITEMS.filter((i) => i.section === "MISSION");
  const operationsItems = CONSOLE_NAV_ITEMS.filter((i) => i.section === "OPERATIONS");
  const systemItems = CONSOLE_NAV_ITEMS.filter((i) => i.section === "SYSTEM");

  const renderNavItem = (
    item: (typeof CONSOLE_NAV_ITEMS)[number],
    expanded: boolean,
    isDrawer = false,
  ) => {
    const Icon = ICONS[item.id];
    const active = activeView === item.id;
    const isHazards = item.id === "hazards";
    const isServices = item.id === "services";

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          onSelectView(item.id);
          if (isDrawer) onCloseMobile();
        }}
        title={!expanded ? `${item.label} (${item.shortcut})` : undefined}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex h-9 w-full items-center rounded-md px-2.5 text-left text-xs font-medium transition-colors cursor-pointer",
          active
            ? "bg-white/[0.08] text-[#ededed]"
            : "text-[#8b8b8b] hover:bg-white/[0.04] hover:text-[#ededed]",
        )}
      >
        {active && (
          <span
            aria-hidden="true"
            className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-[#3ecf8e]"
          />
        )}

        <div className="relative flex size-5 shrink-0 items-center justify-center">
          <Icon className={cn("size-4", active ? "text-[#3ecf8e]" : "text-current")} />
          {!expanded && isHazards && activeHazards > 0 && (
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-red-500 ring-2 ring-[#171717]" />
          )}
          {!expanded && isServices && isLive && (
            <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-[#3ecf8e] ring-2 ring-[#171717]" />
          )}
        </div>

        <div
          className={cn(
            "ml-3 flex min-w-0 flex-1 items-center justify-between gap-2 transition-opacity duration-150",
            expanded ? "opacity-100" : "pointer-events-none w-0 overflow-hidden opacity-0 ml-0",
          )}
        >
          <span className="truncate">{item.label}</span>

          <span className="flex shrink-0 items-center gap-1.5">
            {isHazards && activeHazards > 0 && (
              <span className="rounded bg-red-500/15 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-red-400">
                {activeHazards}
              </span>
            )}
            {item.badge === "NEW" && (
              <span className="rounded bg-teal-500/15 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-teal-400">
                NEW
              </span>
            )}
            <kbd className="hidden sm:inline rounded border border-white/[0.08] bg-[#141414] px-1 py-0.2 font-mono text-[9px] text-[#8b8b8b]">
              {item.shortcut}
            </kbd>
          </span>
        </div>
      </button>
    );
  };

  return (
    <>
      {/* Desktop Hover-Expanding Left Icon Rail (Overlaying cleanly without layout shift) */}
      <aside
        aria-label="Console Navigation Rail"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ width: hovered ? 236 : 52 }}
        className={cn(
          "fixed left-0 top-12 bottom-0 z-40 hidden md:flex flex-col justify-between border-r border-white/[0.08] bg-[#171717] transition-[width] duration-200 ease-out overflow-hidden select-none",
          hovered && "shadow-[10px_0_30px_rgba(0,0,0,0.65)]",
        )}
      >
        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden py-3 px-1.5 space-y-4 studio-scrollbar">
          {/* Mission Group */}
          <div className="space-y-0.5">
            {hovered && (
              <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8b8b8b]">
                Mission
              </div>
            )}
            {missionItems.map((item) => renderNavItem(item, hovered))}
          </div>

          <div className="mx-1.5 border-t border-white/[0.08]" />

          {/* Operations Group */}
          <div className="space-y-0.5">
            {hovered && (
              <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8b8b8b]">
                Operations
              </div>
            )}
            {operationsItems.map((item) => renderNavItem(item, hovered))}
          </div>
        </div>

        {/* System / Settings Pinned Bottom */}
        <div className="border-t border-white/[0.08] py-2.5 px-1.5 space-y-0.5">
          {systemItems.map((item) => renderNavItem(item, hovered))}
        </div>
      </aside>

      {/* Mobile Slide-Out Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside
            aria-label="Mobile Console Drawer"
            className="fixed inset-y-0 left-0 z-[71] flex w-72 max-w-[85vw] flex-col justify-between border-r border-white/[0.08] bg-[#171717] shadow-2xl"
          >
            <div>
              <div className="flex h-12 items-center justify-between border-b border-white/[0.08] px-3">
                <span className="font-sans text-xs font-semibold text-[#ededed]">
                  AgroSpace Nexus Console
                </span>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  aria-label="Close navigation drawer"
                  className="inline-flex size-8 items-center justify-center rounded-md text-[#8b8b8b] hover:bg-white/[0.06] hover:text-[#ededed] cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="p-2.5 space-y-4 overflow-y-auto max-h-[calc(100dvh-7.5rem)]">
                <div className="space-y-1">
                  <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8b8b8b]">
                    Mission
                  </div>
                  {missionItems.map((item) => renderNavItem(item, true, true))}
                </div>

                <div className="border-t border-white/[0.08]" />

                <div className="space-y-1">
                  <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8b8b8b]">
                    Operations
                  </div>
                  {operationsItems.map((item) => renderNavItem(item, true, true))}
                </div>

                <div className="border-t border-white/[0.08]" />

                <div className="space-y-1">
                  <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8b8b8b]">
                    System
                  </div>
                  {systemItems.map((item) => renderNavItem(item, true, true))}
                </div>
              </div>
            </div>

            <div className="border-t border-white/[0.08] p-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onCloseMobile();
                  onOpenConnect();
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-white/[0.12] bg-[#1c1c1c] px-3 py-2 text-xs font-medium text-[#ededed] hover:bg-white/[0.05] cursor-pointer"
              >
                <Plug className="size-3.5 text-[#3ecf8e]" />
                <span>Connect</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onRefreshTelemetry();
                  onCloseMobile();
                }}
                className="flex items-center justify-center gap-1.5 rounded-md bg-[#3ecf8e] px-3 py-2 text-xs font-semibold text-[#121212] hover:bg-[#24b47e] cursor-pointer"
              >
                <RefreshCw className="size-3.5" />
                <span>Sync</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
