import { Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { HudCard } from "@/components/agro/hud";
import { MAP_LAYERS, type AgroTelemetry, type NasaGranule } from "@/types/agroSpace";

const STATUS: Record<NasaGranule["status"], string> = {
  ingested: "border-emerald/40 bg-emerald/10 text-emerald",
  processing: "border-amber/40 bg-amber/10 text-amber",
  stale: "border-crimson/40 bg-crimson/10 text-crimson",
};

export function GranuleInspector({ telemetry }: { telemetry: AgroTelemetry }) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <HudCard
        title="NASA Granule Inspector"
        subtitle="Source files feeding this field"
        icon={<Database />}
        className="xl:col-span-2"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="hud-label border-b border-border">
                <th className="py-2 pr-3 font-normal">Granule ID</th>
                <th className="py-2 pr-3 font-normal">Product</th>
                <th className="py-2 pr-3 font-normal">Res.</th>
                <th className="py-2 pr-3 font-normal">Acquired</th>
                <th className="py-2 pr-3 text-right font-normal">Latency</th>
                <th className="py-2 text-right font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {telemetry.granules.map((g) => (
                <tr key={g.id} className="border-b border-border/50 align-top last:border-0">
                  <td className="max-w-[260px] break-all py-2.5 pr-3 font-mono text-[11px] text-cyan">
                    {g.id}
                  </td>
                  <td className="py-2.5 pr-3">
                    <div>{g.product}</div>
                    <div className="text-[11px] text-muted-foreground">{g.instrument}</div>
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-3 font-mono">{g.resolution}</td>
                  <td className="py-2.5 pr-3 font-mono text-muted-foreground">{g.acquired}</td>
                  <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{g.latencyH} h</td>
                  <td className="py-2.5 text-right">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase",
                        STATUS[g.status],
                      )}
                    >
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
        title="Point Readings"
        subtitle={`${telemetry.input.lat.toFixed(4)}, ${telemetry.input.lon.toFixed(4)}`}
      >
        <dl className="divide-y divide-border/60">
          {MAP_LAYERS.map((l) => {
            const r = telemetry.layers[l];
            return (
              <div key={l} className="flex items-center justify-between py-2">
                <dt className="text-xs text-muted-foreground">{l}</dt>
                <dd className="font-mono text-xs tabular-nums">
                  {r.value} <span className="text-muted-foreground">{r.unit}</span>
                </dd>
              </div>
            );
          })}
        </dl>
      </HudCard>
    </div>
  );
}
