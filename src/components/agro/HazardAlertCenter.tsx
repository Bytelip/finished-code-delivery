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
import { HudCard, SEVERITY_STYLES } from "@/components/agro/hud";
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

export function HazardAlertCenter({ hazards, lang }: { hazards: HazardAlert[]; lang: Lang }) {
  const t = translator(lang);
  const counts = hazards.reduce((acc, h) => ({ ...acc, [h.severity]: acc[h.severity] + 1 }), {
    critical: 0,
    warning: 0,
    watch: 0,
    nominal: 0,
  } as Record<Severity, number>);
  const active = hazards.filter(
    (h) => h.severity === "critical" || h.severity === "warning",
  ).length;
  const ordered = [...hazards].sort((a, b) => RANK[b.severity] - RANK[a.severity]);

  return (
    <section id="hazard-matrix-slot" aria-label="Hazard alert center">
      <HudCard
        title={t("hud.hazardCenter")}
        subtitle={t("hud.hazardCenter.sub")}
        icon={<ShieldAlert />}
        right={
          <div className="flex items-center gap-1.5">
            <span className="hud-label mr-1 hidden sm:inline">
              {active} active / {hazards.length}
            </span>
            {(["critical", "warning", "watch", "nominal"] as Severity[]).map((s) => (
              <span
                key={s}
                title={t(SEVERITY_KEY(s))}
                className={cn(
                  "grid min-w-6 place-items-center rounded border px-1.5 py-0.5 font-mono text-[10px]",
                  SEVERITY_STYLES[s].chip,
                )}
              >
                {counts[s]}
              </span>
            ))}
          </div>
        }
      >
        <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-4">
          {ordered.map((h) => {
            const Icon = ICONS[h.type];
            const st = SEVERITY_STYLES[h.severity];
            return (
              <article
                key={h.id}
                data-hazard={h.type}
                data-severity={h.severity}
                className={cn("flex flex-col rounded-md border bg-background/40 p-3", st.ring)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <Icon className={cn("mt-0.5 size-4 shrink-0", st.text)} />
                    <h4 className="text-sm font-medium leading-snug">
                      {t(HAZARD_NAME_KEY(h.type))}
                    </h4>
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                      st.chip,
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        st.dot,
                        h.severity === "critical" && "animate-pulse",
                      )}
                    />
                    {t(SEVERITY_KEY(h.severity))}
                  </span>
                </div>

                <div className={cn("mt-2 font-mono text-xs tabular-nums", st.text)}>{h.metric}</div>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{h.detail}</p>

                <div className="mt-2.5 border-t border-border/60 pt-2">
                  <div className="hud-label">{t("hazard.checklist")}</div>
                  <ul className="mt-1 space-y-1">
                    {h.actions.map((action) => (
                      <li key={action} className="flex gap-1.5 text-[11px] leading-snug">
                        <span
                          aria-hidden
                          className={cn(
                            "mt-[3px] size-2.5 shrink-0 rounded-[2px] border",
                            st.ring,
                            "bg-background/60",
                          )}
                        />
                        <span className="text-foreground/85">{t(action)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="hud-label mt-auto pt-2">{h.source}</div>
              </article>
            );
          })}
        </div>
      </HudCard>
    </section>
  );
}
