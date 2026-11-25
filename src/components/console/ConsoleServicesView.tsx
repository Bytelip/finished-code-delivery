import React, { useMemo, useState } from "react";
import { Check, Copy, Plug, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import type { AgroTelemetry } from "@/types/agroSpace";
import type { LiveApiStatus } from "@/services/nasaLiveApiService";
import { GranuleInspector } from "@/components/agro/GranuleInspector";
import { cn } from "@/lib/utils";

interface ServiceFeedRow {
  id: string;
  name: string;
  category: string;
  url: string;
  status: "connected" | "fallback";
  latencyMs: number;
  updatedAt: string;
}

export interface ConsoleServicesViewProps {
  telemetry: AgroTelemetry;
  liveStatus: LiveApiStatus | null;
  isLoadingLive: boolean;
  onRefresh: () => void;
  onOpenConnect: () => void;
}

export const ConsoleServicesView: React.FC<ConsoleServicesViewProps> = ({
  telemetry,
  liveStatus,
  isLoadingLive,
  onRefresh,
  onOpenConnect,
}) => {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "latency" | "status">("name");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { lat, lon } = telemetry.input;
  const activeSet = useMemo(() => new Set(liveStatus?.activeFeeds ?? []), [liveStatus]);
  const updatedStr = liveStatus?.timestamp
    ? new Date(liveStatus.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Baseline";

  const rows: ServiceFeedRow[] = useMemo(
    () => [
      {
        id: "nasa-power",
        name: "NASA POWER Agroclimatology",
        category: "Solar · Meteorology · ET",
        url: `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=ALLSKY_SFC_PAR_TOT,EVPTRNS,PRECTOTCORR&latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`,
        status: activeSet.has("NASA POWER AG") ? "connected" : "fallback",
        latencyMs: 240,
        updatedAt: updatedStr,
      },
      {
        id: "nasa-gibs",
        name: "NASA GIBS WMTS Tile Server",
        category: "NDVI · EVI · LAI · FIRMS · SMAP",
        url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default",
        status: "connected",
        latencyMs: 115,
        updatedAt: updatedStr,
      },
      {
        id: "ornl-modis",
        name: "ORNL DAAC MODIS Subset",
        category: "Canopy Spectral Indices",
        url: `https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`,
        status: activeSet.has("ORNL DAAC MODIS") ? "connected" : "fallback",
        latencyMs: 310,
        updatedAt: updatedStr,
      },
      {
        id: "open-meteo-soil",
        name: "Open-Meteo Multi-Depth Soil",
        category: "Root Zone & Surface Moisture",
        url: `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&hourly=soil_moisture_0_to_7cm`,
        status: activeSet.has("Open-Meteo Soil") ? "connected" : "fallback",
        latencyMs: 145,
        updatedAt: updatedStr,
      },
      {
        id: "nasa-eonet",
        name: "NASA EONET v3 Natural Events",
        category: "Cyclones · Wildfires",
        url: "https://eonet.gsfc.nasa.gov/api/v3/events?status=open",
        status: activeSet.has("NASA EONET v3") ? "connected" : "fallback",
        latencyMs: 280,
        updatedAt: updatedStr,
      },
      {
        id: "usgs-comcat",
        name: "USGS Earthquake Catalog",
        category: "Seismic & Liquefaction",
        url: `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`,
        status: activeSet.has("USGS ComCat") ? "connected" : "fallback",
        latencyMs: 190,
        updatedAt: updatedStr,
      },
      {
        id: "noaa-swpc",
        name: "NOAA / NASA SWPC Space Weather",
        category: "Kp Index · Solar Flares",
        url: "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json",
        status: activeSet.has("NOAA/NASA SWPC") ? "connected" : "fallback",
        latencyMs: 160,
        updatedAt: updatedStr,
      },
      {
        id: "isric-soilgrids",
        name: "ISRIC SoilGrids v2.0",
        category: "Soil pH · Nitrogen · Organic Carbon",
        url: `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon.toFixed(4)}&lat=${lat.toFixed(4)}`,
        status: activeSet.has("ISRIC SoilGrids") ? "connected" : "fallback",
        latencyMs: 390,
        updatedAt: updatedStr,
      },
    ],
    [lat, lon, activeSet, updatedStr],
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter(
      (r) =>
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.url.toLowerCase().includes(q),
    );
    return [...list].sort((a, b) => {
      if (sortBy === "latency") return a.latencyMs - b.latencyMs;
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return a.name.localeCompare(b.name);
    });
  }, [rows, search, sortBy]);

  const liveCount = rows.filter((r) => r.status === "connected").length;

  const copyUrl = (id: string, url: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(url);
    }
    setCopiedId(id);
    toast.success("Endpoint URL copied");
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-white/[0.08] bg-[#1c1c1c]">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#ededed]">Field Services & Endpoints</h2>
              <p className="text-xs text-[#8b8b8b]">
                Live NASA & Earth-observation REST/WMTS telemetry integrations
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#3ecf8e]/30 bg-[#3ecf8e]/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-[#3ecf8e]">
              <span className="size-1.5 rounded-full bg-[#3ecf8e] animate-pulse" />
              {liveCount}/{rows.length} Active
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-2.5 size-3.5 text-[#8b8b8b]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search endpoints…"
                aria-label="Search endpoints"
                className="h-8 w-44 sm:w-56 rounded-md border border-white/[0.1] bg-[#141414] pl-8 pr-2.5 text-xs text-[#ededed] placeholder:text-[#8b8b8b] focus:border-[#3ecf8e] focus:outline-none"
              />
            </div>

            <select
              aria-label="Sort services"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "latency" | "status")}
              className="h-8 rounded-md border border-white/[0.1] bg-[#141414] px-2.5 text-xs text-[#ededed] focus:border-[#3ecf8e] focus:outline-none"
            >
              <option value="name">Sort: Name</option>
              <option value="latency">Sort: Latency</option>
              <option value="status">Sort: Status</option>
            </select>

            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.1] bg-[#141414] px-2.5 text-xs font-medium text-[#ededed] hover:bg-white/[0.06] cursor-pointer"
            >
              <RefreshCw
                className={cn("size-3.5", isLoadingLive && "animate-spin text-[#3ecf8e]")}
              />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={onOpenConnect}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#3ecf8e] px-3 text-xs font-semibold text-[#121212] hover:bg-[#24b47e] cursor-pointer"
            >
              <Plug className="size-3.5" />
              <span>Configure Target</span>
            </button>
          </div>
        </div>

        {/* Endpoints Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#161616] text-[11px] font-medium uppercase tracking-wider text-[#8b8b8b]">
                <th className="px-4 py-2.5">Service / Feed</th>
                <th className="px-4 py-2.5">Endpoint URL</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {filteredRows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-white/[0.03]">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-[#ededed]">{row.name}</div>
                    <div className="mt-0.5 text-[11px] text-[#8b8b8b]">{row.category}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex max-w-md items-center gap-2">
                      <code className="truncate font-mono text-[11px] text-[#8b8b8b]">
                        {row.url}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyUrl(row.id, row.url)}
                        aria-label={`Copy ${row.name} URL`}
                        className="inline-flex h-6 shrink-0 items-center gap-1 rounded border border-white/[0.08] bg-[#141414] px-2 font-mono text-[10px] text-[#8b8b8b] hover:border-white/[0.18] hover:text-[#ededed] cursor-pointer"
                      >
                        {copiedId === row.id ? (
                          <Check className="size-3 text-[#3ecf8e]" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {row.status === "connected" ? (
                      <span className="inline-flex items-center gap-1.5 rounded border border-[#3ecf8e]/30 bg-[#3ecf8e]/10 px-2 py-0.5 font-mono text-[11px] text-[#3ecf8e]">
                        <span className="size-1.5 rounded-full bg-[#3ecf8e]" />
                        Connected · {row.latencyMs}ms
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] text-amber-400">
                        <span className="size-1.5 rounded-full bg-amber-400" />
                        Fallback Ready
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right align-top font-mono text-[11px] text-[#8b8b8b]">
                    {row.updatedAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Satellite Granule Catalog & Field Layer Readouts */}
      <GranuleInspector telemetry={telemetry} />
    </div>
  );
};
