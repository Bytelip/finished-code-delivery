import {
  Flame,
  Mountain,
  ShieldAlert,
  Sun,
  SunDim,
  ThermometerSun,
  Tornado,
  Waves,
  Wind,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HudCard, SEVERITY_STYLES, SeverityChip } from "@/components/agro/hud";
import { HAZARD_NAME_KEY, SEVERITY_KEY, translator, type Lang } from "@/i18n/translations";
import type { HazardAlert, HazardType, Severity } from "@/types/agroSpace";

const ICONS: Record<HazardType, typeof Sun> = {
  cyclone: Tornado,
  earthquake: Mountain,
  "solar-storm": Sun,
  eclipse: SunDim,
  wildfire: Flame,
  flood: Waves,
  thermal: ThermometerSun,
  "wind-drift": Wind,
};

const RANK: Record<Severity, number> = { critical: 3, warning: 2, watch: 1, nominal: 0 };

export function HazardMatrixSlot({
  hazards,
  lang,
  variant = "summary",
}: {
  hazards: HazardAlert[];
  lang: Lang;
  variant?: "summary" | "full";
}) {
  const t = translator(lang);
  const counts = hazards.reduce((acc, h) => ({ ...acc, [h.severity]: acc[h.severity] + 1 }), {
    critical: 0,
    warning: 0,
    watch: 0,
    nominal: 0,
  } as Record<Severity, number>);
  const sorted = [...hazards].sort((a, b) => RANK[b.severity] - RANK[a.severity]);
  const shown = variant === "full" ? hazards : sorted.slice(0, 4);

  return (
    <section id="hazard-matrix-slot" aria-label="Hazard matrix">
      <HudCard
        title={t("hud.hazardMatrix")}
        subtitle={t("hud.hazardMatrix.sub")}
        icon={<ShieldAlert />}
        right={
          <div className="flex gap-1.5">
            {(["critical", "warning", "watch", "nominal"] as Severity[]).map((s) => (
              <span
                key={s}
                title={t(SEVERITY_KEY(s))}
                className={cn(
                  "grid min-w-7 place-items-center rounded border px-1.5 py-0.5 font-mono text-[10px]",
                  SEVERITY_STYLES[s].chip,
                )}
              >
                {counts[s]}
              </span>
            ))}
          </div>
        }
      >
        <div
          className={cn(
            "grid gap-2",
            variant === "full" ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2",
          )}
        >
          {shown.map((h) => {
            const Icon = ICONS[h.type];
            const st = SEVERITY_STYLES[h.severity];
            return (
              <article
                key={h.id}
                data-severity={h.severity}
                className={cn("rounded-md border bg-background/40 p-3", st.ring)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("size-4 shrink-0", st.text)} />
                    <h4 className="text-sm font-medium">{t(HAZARD_NAME_KEY(h.type))}</h4>
                  </div>
                  <SeverityChip severity={h.severity} label={t(SEVERITY_KEY(h.severity))} />
                </div>
                <div className={cn("mt-2 font-mono text-sm tabular-nums", st.text)}>{h.metric}</div>
                {variant === "full" && (
                  <p className="mt-1 text-xs text-muted-foreground">{h.detail}</p>
                )}
                <div className="hud-label mt-2">{h.source}</div>
              </article>
            );
          })}
        </div>
      </HudCard>
    </section>
  );
}
