import { Database, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { HudCard } from "@/components/agro/hud";
import { MAP_LAYERS, type AgroTelemetry, type NasaGranule } from "@/types/agroSpace";

const STATUS: Record<NasaGranule["status"], string> = {
  ingested: "border-emerald/50 bg-emerald/15 text-emerald shadow-[0_0_8px_rgba(0,255,157,0.25)]",
  processing: "border-amber/50 bg-amber/15 text-amber shadow-[0_0_8px_rgba(255,183,0,0.25)]",
  stale: "border-crimson/50 bg-crimson/15 text-crimson shadow-[0_0_8px_rgba(255,46,86,0.25)]",
};

export function GranuleInspector({ telemetry }: { telemetry: AgroTelemetry }) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <HudCard
        title="NASA Earthdata Granule Catalog"
        subtitle="Active Satellite Telemetry Feeds"
        icon={<Database />}
        className="xl:col-span-2 border-cyan/40 shadow-[0_0_30px_rgba(0,0,0,0.6)]"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="hud-label border-b border-border/70 pb-2 text-[10px] text-cyan/90 font-bold">
                <th className="py-2.5 pr-3 font-semibold">Granule ID / Orbit</th>
                <th className="py-2.5 pr-3 font-semibold">Product & Sensor</th>
                <th className="py-2.5 pr-3 font-semibold">Res.</th>
                <th className="py-2.5 pr-3 font-semibold">Acquired</th>
                <th className="py-2.5 pr-3 text-right font-semibold">Latency</th>
                <th className="py-2.5 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {telemetry.granules.map((g) => (
                <tr key={g.id} className="transition-colors hover:bg-cyan/5 align-top">
                  <td className="max-w-[260px] break-all py-3 pr-3 font-mono text-[11px] font-bold text-cyan drop-shadow-[0_0_4px_rgba(0,240,255,0.4)]">
                    {g.id}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="font-semibold text-foreground/95">{g.product}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {g.instrument}
                    </div>
                  </td>
                  <td className="whitespace-nowrap py-3 pr-3 font-mono text-[11px] text-foreground/80">
                    {g.resolution}
                  </td>
                  <td className="py-3 pr-3 font-mono text-[11px] text-muted-foreground">
                    {g.acquired}
                  </td>
                  <td className="py-3 pr-3 text-right font-mono text-[11px] font-semibold tabular-nums text-foreground/90">
                    {g.latencyH} h
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider",
                        STATUS[g.status],
                      )}
                    >
                      <span className="size-1.5 rounded-full bg-current animate-pulse" />
                      {g.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </HudCard>

      <HudCard
        title="Field Point Telemetry"
        subtitle={`TARGET LOCK: ${telemetry.input.lat.toFixed(4)}°, ${telemetry.input.lon.toFixed(4)}°`}
        className="border-cyan/40 shadow-[0_0_30px_rgba(0,0,0,0.6)]"
      >
        <dl className="divide-y divide-border/40">
          {MAP_LAYERS.map((l) => {
            const r = telemetry.layers[l];
            return (
              <div
                key={l}
                className="flex items-center justify-between py-2.5 transition-colors hover:bg-cyan/5 px-1 rounded"
              >
                <dt className="text-xs font-semibold text-muted-foreground/90 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-cyan shadow-[0_0_4px_#00f0ff]" />
                  {l}
                </dt>
                <dd className="font-mono text-xs font-bold tabular-nums text-foreground">
                  <span className="text-cyan drop-shadow-[0_0_6px_rgba(0,240,255,0.3)]">
                    {r.value}
                  </span>{" "}
                  <span className="text-muted-foreground/80 font-normal">{r.unit}</span>
                </dd>
              </div>
            );
          })}
        </dl>
      </HudCard>
    </div>
  );
}
