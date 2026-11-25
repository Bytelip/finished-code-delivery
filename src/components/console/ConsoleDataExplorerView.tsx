import React, { useMemo, useState } from "react";
import {
  BarChart3,
  Download,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Plus,
  Search,
  Star,
  Table2,
  Terminal,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { MAP_LAYERS, type AgroTelemetry } from "@/types/agroSpace";
import type { LiveApiStatus } from "@/services/nasaLiveApiService";
import { cn } from "@/lib/utils";

type QueryDatasetId = "power" | "soil" | "waterBudget" | "layers";

interface SavedView {
  id: string;
  name: string;
  dataset: QueryDatasetId;
  favorite?: boolean;
  sql: string;
}

export interface ConsoleDataExplorerViewProps {
  telemetry: AgroTelemetry;
  liveStatus: LiveApiStatus | null;
  onRefresh: () => void;
}

export const ConsoleDataExplorerView: React.FC<ConsoleDataExplorerViewProps> = ({
  telemetry,
  liveStatus,
  onRefresh,
}) => {
  const { lat, lon } = telemetry.input;
  const [innerSidebarOpen, setInnerSidebarOpen] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [bottomTab, setBottomTab] = useState<"results" | "chart">("results");

  const defaultViews: SavedView[] = useMemo(
    () => [
      {
        id: "nasa_power_30d",
        name: "nasa_power_30d_series",
        dataset: "power",
        favorite: true,
        sql: `SELECT day, PAR, VPD, EVPTRNS, PRECTOTCORR\nFROM nasa_power_daily\nWHERE lat = ${lat.toFixed(4)} AND lon = ${lon.toFixed(4)}\nORDER BY day ASC;`,
      },
      {
        id: "soil_moisture_depth",
        name: "soil_moisture_profile",
        dataset: "soil",
        favorite: true,
        sql: `SELECT day, sm0_5, sm7_28, sm28_100, GWETPROF, borewellAccess\nFROM smap_open_meteo_soil\nWHERE depth_m = ${telemetry.input.borewellDepth};`,
      },
      {
        id: "crop_water_budget",
        name: "crop_water_budget",
        dataset: "waterBudget",
        sql: `SELECT stage, days, Kc, ETc, available\nFROM phenology_water_budget\nWHERE crop = '${telemetry.crop.crop}';`,
      },
      {
        id: "spectral_layers",
        name: "gibs_layer_telemetry",
        dataset: "layers",
        sql: `SELECT layer, value, unit, intensity\nFROM nasa_gibs_point_readouts\nWHERE region = '${telemetry.meta.regionLabel}';`,
      },
    ],
    [lat, lon, telemetry.input.borewellDepth, telemetry.crop.crop, telemetry.meta.regionLabel],
  );

  const [customViews, setCustomViews] = useState<SavedView[]>([]);
  const allViews = useMemo(() => [...defaultViews, ...customViews], [defaultViews, customViews]);

  const [openTabIds, setOpenTabIds] = useState<string[]>(["nasa_power_30d", "soil_moisture_depth"]);
  const [activeTabId, setActiveTabId] = useState<string>("nasa_power_30d");
  const [queryOverride, setQueryOverride] = useState<Record<string, string>>({});

  const activeView = allViews.find((v) => v.id === activeTabId) ?? defaultViews[0]!;
  const currentSql = queryOverride[activeView.id] ?? activeView.sql;

  const filteredViews = useMemo(() => {
    const q = sidebarSearch.trim().toLowerCase();
    return allViews.filter((v) => !q || v.name.toLowerCase().includes(q));
  }, [allViews, sidebarSearch]);

  const favoriteViews = filteredViews.filter((v) => v.favorite);
  const logs = useMemo(() => {
    const activeFeeds = liveStatus?.activeFeeds ?? [];
    const baseTime = liveStatus?.timestamp
      ? new Date(liveStatus.timestamp).toLocaleTimeString()
      : "Session Start";
    return [
      { id: "l1", text: `[${baseTime}] Query synced (${telemetry.power.length} NASA POWER rows)` },
      {
        id: "l2",
        text: `[${baseTime}] ${activeFeeds.length > 0 ? `${activeFeeds.length} live endpoints online` : "Deterministic cache ready"}`,
      },
      {
        id: "l3",
        text: `[${baseTime}] Target ${lat.toFixed(4)}, ${lon.toFixed(4)} locked`,
      },
    ];
  }, [liveStatus, telemetry.power.length, lat, lon]);

  const handleOpenView = (id: string) => {
    if (!openTabIds.includes(id)) {
      setOpenTabIds((prev) => [...prev, id]);
    }
    setActiveTabId(id);
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (openTabIds.length === 1) return;
    const remaining = openTabIds.filter((t) => t !== id);
    setOpenTabIds(remaining);
    if (activeTabId === id && remaining[0]) {
      setActiveTabId(remaining[0]);
    }
  };

  const handleNewView = () => {
    const idx = customViews.length + 1;
    const id = `custom_view_${idx}`;
    const newView: SavedView = {
      id,
      name: `custom_query_${idx}`,
      dataset: "power",
      sql: `SELECT day, PAR, VPD, PRECTOTCORR\nFROM nasa_power_daily\nWHERE lat = ${lat.toFixed(4)} AND lon = ${lon.toFixed(4)};`,
    };
    setCustomViews((prev) => [...prev, newView]);
    setOpenTabIds((prev) => [...prev, id]);
    setActiveTabId(id);
    toast.success(`Created ${newView.name}`);
  };

  const handleRun = () => {
    onRefresh();
    toast.success(`Executed query for ${activeView.name}`);
  };

  const datasetRows = useMemo(() => {
    if (activeView.dataset === "soil") {
      return telemetry.soil.map((s) => ({
        day: s.day,
        sm_0_5cm: `${s.sm0_5}%`,
        sm_7_28cm: `${s.sm7_28}%`,
        sm_28_100cm: `${s.sm28_100}%`,
        GWETPROF: s.GWETPROF,
        borewellAccess: `${s.borewellAccess}%`,
      }));
    }
    if (activeView.dataset === "waterBudget") {
      return telemetry.waterBudget.map((w) => ({
        stage: w.stage,
        days: w.days,
        Kc: w.Kc,
        ETc_mm: w.ETc,
        available_mm: w.available,
      }));
    }
    if (activeView.dataset === "layers") {
      return MAP_LAYERS.map((l) => ({
        layer: l,
        value: telemetry.layers[l].value,
        unit: telemetry.layers[l].unit,
        intensity: telemetry.layers[l].intensity.toFixed(2),
      }));
    }
    return telemetry.power.map((p) => ({
      day: p.day,
      PAR_Wm2: p.PAR,
      VPD_kPa: p.VPD,
      EVPTRNS_mm: p.EVPTRNS,
      PRECTOTCORR_mm: p.PRECTOTCORR,
    }));
  }, [activeView.dataset, telemetry]);

  const exportCsv = () => {
    if (datasetRows.length === 0) return;
    const keys = Object.keys(datasetRows[0]!);
    const csv = [
      keys.join(","),
      ...datasetRows.map((row) =>
        keys.map((k) => `"${String((row as Record<string, unknown>)[k] ?? "")}"`).join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeView.name}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${activeView.name}.csv`);
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-[#1c1c1c] lg:flex-row min-h-[580px]">
      {/* Secondary Inner Sidebar */}
      {innerSidebarOpen && (
        <aside
          aria-label="Explorer Saved Views"
          className="flex w-full shrink-0 flex-col border-b border-white/[0.08] bg-[#171717] lg:w-60 lg:border-b-0 lg:border-r"
        >
          <div className="flex items-center justify-between border-b border-white/[0.08] px-3 py-2.5">
            <span className="text-xs font-semibold text-[#ededed]">Data Explorer</span>
            <button
              type="button"
              onClick={handleNewView}
              className="inline-flex h-6 items-center gap-1 rounded border border-white/[0.12] bg-[#1c1c1c] px-2 text-[11px] font-medium text-[#ededed] hover:border-[#3ecf8e]/50 hover:text-[#3ecf8e] cursor-pointer"
            >
              <Plus className="size-3" />
              <span>New</span>
            </button>
          </div>

          <div className="p-2 border-b border-white/[0.08]">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-2 size-3 text-[#8b8b8b]" />
              <input
                type="text"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder="Filter views…"
                className="h-7 w-full rounded border border-white/[0.08] bg-[#121212] pl-7 pr-2 text-xs text-[#ededed] placeholder:text-[#8b8b8b] focus:border-[#3ecf8e] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-2.5 text-xs studio-scrollbar">
            {/* FAVORITES */}
            {favoriteViews.length > 0 && (
              <div>
                <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8b8b8b]">
                  Favorites
                </div>
                <div className="space-y-0.5">
                  {favoriteViews.map((v) => (
                    <button
                      key={`fav-${v.id}`}
                      type="button"
                      onClick={() => handleOpenView(v.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left font-mono text-[11px] cursor-pointer",
                        activeTabId === v.id
                          ? "bg-white/[0.08] text-[#3ecf8e]"
                          : "text-[#ededed] hover:bg-white/[0.04]",
                      )}
                    >
                      <Star className="size-3 shrink-0 text-amber-400" />
                      <span className="truncate">{v.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SAVED VIEWS */}
            <div>
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8b8b8b]">
                Saved Views
              </div>
              <div className="space-y-0.5">
                {filteredViews.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleOpenView(v.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left font-mono text-[11px] cursor-pointer",
                      activeTabId === v.id
                        ? "bg-white/[0.08] text-[#3ecf8e]"
                        : "text-[#8b8b8b] hover:bg-white/[0.04] hover:text-[#ededed]",
                    )}
                  >
                    <Terminal className="size-3 shrink-0" />
                    <span className="truncate">{v.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* LOGS */}
            <div>
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8b8b8b]">
                Logs
              </div>
              <div className="space-y-1.5 px-2">
                {logs.map((l) => (
                  <div key={l.id} className="font-mono text-[10px] leading-relaxed text-[#8b8b8b]">
                    {l.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Main Split-Pane Tabbed Workspace */}
      <div className="flex min-w-0 flex-1 flex-col bg-[#141414]">
        {/* Tabs & Run Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-[#171717] px-2.5 py-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setInnerSidebarOpen((o) => !o)}
              aria-label="Toggle explorer sidebar"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded text-[#8b8b8b] hover:bg-white/[0.06] hover:text-[#ededed] cursor-pointer"
            >
              {innerSidebarOpen ? (
                <PanelLeftClose className="size-3.5" />
              ) : (
                <PanelLeftOpen className="size-3.5" />
              )}
            </button>

            {openTabIds.map((id) => {
              const v = allViews.find((item) => item.id === id);
              if (!v) return null;
              const isActive = activeTabId === id;
              return (
                <div
                  key={id}
                  onClick={() => setActiveTabId(id)}
                  className={cn(
                    "group flex h-7 shrink-0 cursor-pointer items-center gap-2 rounded-md border px-2.5 font-mono text-[11px] transition-colors",
                    isActive
                      ? "border-white/[0.12] bg-[#1c1c1c] text-[#ededed]"
                      : "border-transparent text-[#8b8b8b] hover:bg-white/[0.04] hover:text-[#ededed]",
                  )}
                >
                  <span>{v.name}</span>
                  {openTabIds.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleCloseTab(id, e)}
                      aria-label={`Close ${v.name}`}
                      className="rounded p-0.5 text-[#8b8b8b] hover:bg-white/[0.1] hover:text-[#ededed]"
                    >
                      <X className="size-2.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-7 items-center gap-1 rounded border border-white/[0.1] bg-[#1c1c1c] px-2.5 text-xs text-[#ededed] hover:bg-white/[0.06] cursor-pointer"
            >
              <Download className="size-3" />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              type="button"
              onClick={handleRun}
              className="inline-flex h-7 items-center gap-1.5 rounded bg-[#3ecf8e] px-3 text-xs font-semibold text-[#121212] hover:bg-[#24b47e] cursor-pointer"
            >
              <Play className="size-3 fill-current" />
              <span>Run</span>
            </button>
          </div>
        </div>

        {/* Query Editor Pane */}
        <div className="border-b border-white/[0.08] bg-[#121212] p-3">
          <textarea
            aria-label="Telemetry query inspector"
            value={currentSql}
            onChange={(e) =>
              setQueryOverride((prev) => ({ ...prev, [activeView.id]: e.target.value }))
            }
            rows={4}
            spellCheck={false}
            className="w-full resize-none rounded border border-white/[0.06] bg-[#161616] p-3 font-mono text-xs leading-relaxed text-[#ededed] focus:border-[#3ecf8e]/50 focus:outline-none"
          />
        </div>

        {/* Bottom Panel: Results & Chart Tabs */}
        <div className="flex flex-1 flex-col bg-[#171717]">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-3 py-1.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setBottomTab("results")}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium cursor-pointer",
                  bottomTab === "results"
                    ? "bg-[#242424] text-[#ededed]"
                    : "text-[#8b8b8b] hover:text-[#ededed]",
                )}
              >
                <Table2 className="size-3.5 text-[#3ecf8e]" />
                <span>Results</span>
                <span className="rounded bg-white/[0.08] px-1.5 font-mono text-[10px] text-[#8b8b8b]">
                  {datasetRows.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setBottomTab("chart")}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium cursor-pointer",
                  bottomTab === "chart"
                    ? "bg-[#242424] text-[#ededed]"
                    : "text-[#8b8b8b] hover:text-[#ededed]",
                )}
              >
                <BarChart3 className="size-3.5 text-[#3ecf8e]" />
                <span>Chart</span>
              </button>
            </div>
            <span className="font-mono text-[11px] text-[#8b8b8b]">
              {activeView.dataset.toUpperCase()}
            </span>
          </div>

          {bottomTab === "results" ? (
            <div className="flex-1 overflow-auto max-h-[320px] studio-scrollbar">
              {datasetRows.length > 0 && (
                <table className="w-full min-w-[540px] border-collapse text-left font-mono text-xs">
                  <thead className="sticky top-0 bg-[#1a1a1a]">
                    <tr className="border-b border-white/[0.08] text-[11px] text-[#8b8b8b]">
                      {Object.keys(datasetRows[0]!).map((col) => (
                        <th key={col} className="px-3.5 py-2 font-medium">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {datasetRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.03]">
                        {Object.values(row).map((val, cIdx) => (
                          <td key={cIdx} className="whitespace-nowrap px-3.5 py-2 text-[#ededed]">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="h-[300px] w-full p-4">
              <ResponsiveContainer width="100%" height="100%">
                {activeView.dataset === "soil" ? (
                  <AreaChart data={telemetry.soil}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="day" stroke="#8b8b8b" fontSize={11} />
                    <YAxis stroke="#8b8b8b" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1c1c1c",
                        borderColor: "rgba(255,255,255,0.1)",
                        color: "#ededed",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sm0_5"
                      name="Surface (0-5cm)"
                      stroke="#3ecf8e"
                      fill="#3ecf8e"
                      fillOpacity={0.18}
                    />
                    <Area
                      type="monotone"
                      dataKey="sm7_28"
                      name="Root (7-28cm)"
                      stroke="#38bdf8"
                      fill="#38bdf8"
                      fillOpacity={0.12}
                    />
                  </AreaChart>
                ) : activeView.dataset === "waterBudget" ? (
                  <BarChart data={telemetry.waterBudget}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="stage" stroke="#8b8b8b" fontSize={11} />
                    <YAxis stroke="#8b8b8b" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1c1c1c",
                        borderColor: "rgba(255,255,255,0.1)",
                        color: "#ededed",
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="ETc"
                      name="Demand ETc (mm)"
                      fill="#f59e0b"
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      dataKey="available"
                      name="Available Water (mm)"
                      fill="#3ecf8e"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                ) : activeView.dataset === "layers" ? (
                  <BarChart
                    data={MAP_LAYERS.map((l) => ({
                      layer: l,
                      intensityPct: Math.round(telemetry.layers[l].intensity * 100),
                    }))}
                  >
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="layer" stroke="#8b8b8b" fontSize={10} />
                    <YAxis stroke="#8b8b8b" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1c1c1c",
                        borderColor: "rgba(255,255,255,0.1)",
                        color: "#ededed",
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="intensityPct"
                      name="Signal %"
                      fill="#3ecf8e"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                ) : (
                  <ComposedChart data={telemetry.power}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="day" stroke="#8b8b8b" fontSize={11} />
                    <YAxis yAxisId="left" stroke="#8b8b8b" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" stroke="#8b8b8b" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1c1c1c",
                        borderColor: "rgba(255,255,255,0.1)",
                        color: "#ededed",
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="PRECTOTCORR"
                      name="Rain (mm)"
                      fill="#38bdf8"
                      fillOpacity={0.5}
                      radius={[3, 3, 0, 0]}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="PAR"
                      name="PAR (W/m²)"
                      stroke="#3ecf8e"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="EVPTRNS"
                      name="ET (mm)"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
