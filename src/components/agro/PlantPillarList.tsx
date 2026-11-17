import { HudCard } from "@/components/agro/hud";
import { cn } from "@/lib/utils";
import type { PlantHealth } from "@/types/agroSpace";

const tone = (s: number) =>
  s >= 75
    ? "bg-emerald shadow-[0_0_8px_#00ff9d]"
    : s >= 55
      ? "bg-cyan shadow-[0_0_8px_#00f0ff]"
      : s >= 35
        ? "bg-amber shadow-[0_0_8px_#ffb700]"
        : "bg-crimson shadow-[0_0_8px_#ff2e56]";

const text = (s: number) =>
  s >= 75
    ? "text-emerald-400 drop-shadow-[0_0_6px_#00ff9d]"
    : s >= 55
      ? "text-cyan-300 drop-shadow-[0_0_6px_#00f0ff]"
      : s >= 35
        ? "text-amber-400 drop-shadow-[0_0_6px_#ffb700]"
        : "text-rose-400 drop-shadow-[0_0_6px_#ff2e56]";

export function PlantPillarList({ health }: { health: PlantHealth }) {
  return (
    <HudCard
      title="Pillar Breakdown"
      subtitle="NASA VIIRS · MODIS · ECOSTRESS Weightings"
      className="border-cyan/35 shadow-[0_0_25px_rgba(0,0,0,0.5)]"
    >
      <ul className="space-y-3.5">
        {health.pillars.map((p) => (
          <li
            key={p.key}
            className="rounded-lg border border-border/30 bg-background/40 p-2.5 backdrop-blur-sm transition-all hover:border-cyan/40 hover:bg-background/60"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-foreground">{p.label}</span>
              <span className={cn("font-mono text-base font-bold tabular-nums", text(p.score))}>
                {p.score}
                <span className="text-xs font-normal text-muted-foreground">/100</span>
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/60 border border-border/30">
              <div
                className={cn("h-full rounded-full transition-all duration-500", tone(p.score))}
                style={{ width: `${p.score}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between gap-3 font-mono text-xs text-muted-foreground">
              <span>{p.note}</span>
              <span className="truncate text-cyan-300 font-semibold">{p.source}</span>
            </div>
          </li>
        ))}
      </ul>
    </HudCard>
  );
}
