import { HudCard } from "@/components/agro/hud";
import { cn } from "@/lib/utils";
import type { PlantHealth } from "@/types/agroSpace";

const tone = (s: number) =>
  s >= 75 ? "bg-emerald" : s >= 55 ? "bg-cyan" : s >= 35 ? "bg-amber" : "bg-crimson";
const text = (s: number) =>
  s >= 75 ? "text-emerald" : s >= 55 ? "text-cyan" : s >= 35 ? "text-amber" : "text-crimson";

export function PlantPillarList({ health }: { health: PlantHealth }) {
  return (
    <HudCard title="Pillar Breakdown" subtitle="Per-sensor contribution">
      <ul className="space-y-3">
        {health.pillars.map((p) => (
          <li key={p.key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm">{p.label}</span>
              <span className={cn("font-mono text-sm tabular-nums", text(p.score))}>{p.score}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-[width] duration-500", tone(p.score))}
                style={{ width: `${p.score}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between gap-3 font-mono text-[10px] text-muted-foreground">
              <span>{p.note}</span>
              <span className="truncate">{p.source}</span>
            </div>
          </li>
        ))}
      </ul>
    </HudCard>
  );
}
