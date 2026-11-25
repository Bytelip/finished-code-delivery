import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  Filter,
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
  Info,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import type { AgroTelemetry, HazardAlert } from "@/types/agroSpace";
import { HazardMatrixSlot } from "@/components/agro/HazardMatrixSlot";
import { cn } from "@/lib/utils";

type HazardTabFilter = "all" | "critical" | "warning" | "info";

export interface ConsoleHazardsViewProps {
  telemetry: AgroTelemetry;
  isLoadingLive: boolean;
  onRefresh: () => void;
  onExportAdvisory: () => void;
}

export const ConsoleHazardsView: React.FC<ConsoleHazardsViewProps> = ({
  telemetry,
  isLoadingLive,
  onRefresh,
  onExportAdvisory,
}) => {
  const [statusTab, setStatusTab] = useState<HazardTabFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFullMatrix, setShowFullMatrix] = useState<boolean>(true);

  const counts = useMemo(() => {
    const hazards = telemetry.hazards;
    return {
      all: hazards.length,
      critical: hazards.filter((h) => h.severity === "critical").length,
      warning: hazards.filter((h) => h.severity === "warning" || h.severity === "watch").length,
      info: hazards.filter((h) => h.severity === "nominal").length,
    };
  }, [telemetry.hazards]);

  const sources = useMemo(
    () => Array.from(new Set(telemetry.hazards.map((h) => h.source))),
    [telemetry.hazards],
  );

  const filteredHazards = useMemo(() => {
    return telemetry.hazards.filter((h) => {
      const matchesTab =
        statusTab === "all" ||
        (statusTab === "critical" && h.severity === "critical") ||
        (statusTab === "warning" && (h.severity === "warning" || h.severity === "watch")) ||
        (statusTab === "info" && h.severity === "nominal");
      const matchesSource = sourceFilter === "all" || h.source === sourceFilter;
      return matchesTab && matchesSource;
    });
  }, [telemetry.hazards, statusTab, sourceFilter]);

  const exportCsv = () => {
    const header = "ID,Hazard Type,Severity,Origin,Source,Zone,Metric,Detail\n";
    const rows = telemetry.hazards
      .map(
        (h) =>
          `"${h.id}","${h.title}","${h.severity}","${h.origin}","${h.source}","${telemetry.meta.regionLabel}","${h.metric.replace(/"/g, '""')}","${h.detail.replace(/"/g, '""')}"`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agrospace-hazards-${telemetry.input.lat.toFixed(2)}-${telemetry.input.lon.toFixed(2)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Hazard advisor table exported to CSV");
  };

  const severityBadge = (sev: HazardAlert["severity"]) => {
    if (sev === "critical") {
      return (
        <span className="inline-flex items-center gap-1 rounded border border-red-500/35 bg-red-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-red-400">
          <ShieldAlert className="size-3" /> Critical
        </span>
      );
    }
    if (sev === "warning" || sev === "watch") {
      return (
        <span className="inline-flex items-center gap-1 rounded border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-amber-400">
          <AlertTriangle className="size-3" /> {sev === "warning" ? "Warning" : "Watch"}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded border border-[#3ecf8e]/30 bg-[#3ecf8e]/10 px-2 py-0.5 font-mono text-[11px] font-medium text-[#3ecf8e]">
        <Info className="size-3" /> Nominal
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="rounded-lg border border-white/[0.08] bg-[#1c1c1c]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-[#ededed]">Hazard Advisors</h2>
            <p className="text-xs text-[#8b8b8b]">
              Continuous orbital & meteorological checks for {telemetry.meta.regionLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex items-center">
              <Filter className="pointer-events-none absolute left-2.5 size-3.5 text-[#8b8b8b]" />
              <select
                aria-label="Filter by source"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="h-8 rounded-md border border-white/[0.1] bg-[#141414] pl-8 pr-3 text-xs text-[#ededed] focus:border-[#3ecf8e] focus:outline-none"
              >
                <option value="all">All Sources</option>
                {sources.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.1] bg-[#141414] px-3 text-xs font-medium text-[#ededed] hover:bg-white/[0.06] cursor-pointer"
            >
              <RefreshCw
                className={cn("size-3.5", isLoadingLive && "animate-spin text-[#3ecf8e]")}
              />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.1] bg-[#141414] px-3 text-xs font-medium text-[#ededed] hover:bg-white/[0.06] cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={onExportAdvisory}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#3ecf8e] px-3 text-xs font-semibold text-[#121212] hover:bg-[#24b47e] cursor-pointer"
            >
              <span>Advisory Bulletin</span>
            </button>
          </div>
        </div>

        {/* Status Tabs with Live Counters */}
        <div className="flex flex-wrap items-center gap-1 border-b border-white/[0.08] bg-[#171717] px-4 py-2">
          {(
            [
              {
                id: "all",
                label: "All Advisors",
                count: counts.all,
                pillClass: "bg-white/[0.08] text-[#ededed]",
              },
              {
                id: "critical",
                label: "Critical / Errors",
                count: counts.critical,
                pillClass:
                  counts.critical > 0
                    ? "bg-red-500/20 text-red-400"
                    : "bg-white/[0.06] text-[#8b8b8b]",
              },
              {
                id: "warning",
                label: "Warnings",
                count: counts.warning,
                pillClass:
                  counts.warning > 0
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-white/[0.06] text-[#8b8b8b]",
              },
              {
                id: "info",
                label: "Advisory / Info",
                count: counts.info,
                pillClass: "bg-[#3ecf8e]/15 text-[#3ecf8e]",
              },
            ] as const
          ).map((t) => {
            const active = statusTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setStatusTab(t.id)}
                className={cn(
                  "inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-medium transition-colors cursor-pointer",
                  active
                    ? "bg-[#242424] text-[#ededed] border border-white/[0.1]"
                    : "text-[#8b8b8b] hover:bg-white/[0.04] hover:text-[#ededed] border border-transparent",
                )}
              >
                <span>{t.label}</span>
                <span className={cn("rounded px-1.5 py-0.2 font-mono text-[10px]", t.pillClass)}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Crisp Border-Divided Table */}
        {filteredHazards.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full border border-[#3ecf8e]/30 bg-[#3ecf8e]/10 text-[#3ecf8e]">
              <CheckCircle2 className="size-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#ededed]">No hazards in this category</h3>
            <p className="mt-1 max-w-md text-xs text-[#8b8b8b]">
              All monitored orbital and meteorological thresholds for {telemetry.meta.regionLabel}{" "}
              are clear under the current filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#161616] text-[11px] font-medium uppercase tracking-wider text-[#8b8b8b]">
                  <th className="px-4 py-2.5">Hazard Type</th>
                  <th className="px-4 py-2.5">Zone / Field</th>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {filteredHazards.map((h) => {
                  const isOpen = expandedId === h.id;
                  return (
                    <React.Fragment key={h.id}>
                      <tr
                        onClick={() => setExpandedId(isOpen ? null : h.id)}
                        className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center gap-2 font-medium text-[#ededed]">
                            <ChevronRight
                              className={cn(
                                "size-3.5 text-[#8b8b8b] transition-transform",
                                isOpen && "rotate-90 text-[#3ecf8e]",
                              )}
                            />
                            <span>{h.title}</span>
                          </div>
                          <div className="mt-0.5 pl-5 font-mono text-[10px] text-[#8b8b8b]">
                            {h.source} · {h.origin.toUpperCase()}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-[#ededed]">
                          <div>{telemetry.meta.regionLabel}</div>
                          <div className="mt-0.5 font-mono text-[11px] text-[#8b8b8b]">
                            {telemetry.input.lat.toFixed(4)}, {telemetry.input.lon.toFixed(4)}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="font-mono text-xs text-[#ededed]">{h.metric}</div>
                          <div className="mt-0.5 text-xs text-[#8b8b8b]">{h.detail}</div>
                        </td>
                        <td className="px-4 py-3 text-right align-top">
                          {severityBadge(h.severity)}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-[#151515]">
                          <td colSpan={4} className="px-9 py-3">
                            <div className="flex flex-wrap gap-3">
                              {h.readings.map((r) => (
                                <div
                                  key={r.id}
                                  className={cn(
                                    "rounded border px-2.5 py-1.5 font-mono text-[11px]",
                                    r.breached
                                      ? "border-amber-500/35 bg-amber-500/10 text-amber-300"
                                      : "border-white/[0.08] bg-[#1c1c1c] text-[#ededed]",
                                  )}
                                >
                                  <span className="text-[#8b8b8b]">{r.id}: </span>
                                  <span>{r.value}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expandable Full Tactical Matrix (#hazard-matrix-slot) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8b8b8b]">
            Interactive Mitigation Matrix & Checklists
          </h3>
          <button
            type="button"
            onClick={() => setShowFullMatrix((v) => !v)}
            className="text-xs font-medium text-[#3ecf8e] hover:underline cursor-pointer"
          >
            {showFullMatrix ? "Hide Matrix Cards" : "Show Matrix Cards"}
          </button>
        </div>
        {showFullMatrix && (
          <HazardMatrixSlot hazards={telemetry.hazards} telemetry={telemetry} variant="full" />
        )}
      </div>
    </div>
  );
};
