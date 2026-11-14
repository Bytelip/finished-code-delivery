import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SEVERITY_STYLES } from "@/components/agro/hud";
import { CROP_NAME_KEY, translator, type Lang } from "@/i18n/translations";
import { groupCropMatches, type CropClassId, type CropMatch } from "@/utils/cropSuitabilityEngine";
import type { Severity } from "@/types/agroSpace";

const CLASS_TONE: Record<CropClassId, Severity> = {
  optimal: "nominal",
  conditional: "warning",
  "high-risk": "critical",
};

const CLASS_COPY: Record<CropClassId, string> = {
  optimal: "crop.group.optimal",
  conditional: "crop.group.conditional",
  "high-risk": "crop.group.highRisk",
};

const PILLARS: { key: keyof CropMatch["pillars"]; copy: string; weight: number }[] = [
  { key: "water", copy: "crop.pillar.water", weight: 30 },
  { key: "thermal", copy: "crop.pillar.thermal", weight: 25 },
  { key: "soil", copy: "crop.pillar.soil", weight: 25 },
  { key: "hazard", copy: "crop.pillar.hazard", weight: 20 },
];

const demandKey = (demand: CropMatch["profile"]["waterDemand"]) =>
  demand === "very-high" ? "veryHigh" : demand;

function pillarTone(value: number) {
  if (value >= 70) return "bg-emerald";
  if (value >= 45) return "bg-amber";
  return "bg-crimson";
}

function CropCard({ match, lang }: { match: CropMatch; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const t = translator(lang);
  const tone = SEVERITY_STYLES[CLASS_TONE[match.classification]];
  const panelId = `crop-detail-${match.id}`;

  return (
    <article
      data-class={match.classification}
      className={cn(
        "rounded-md border bg-background/40 transition-colors",
        tone.ring,
        open && "bg-background/70",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        title={open ? t("crop.hide") : t("crop.show")}
        className="w-full rounded-md p-2.5 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h5 className="truncate text-sm font-medium">{t(CROP_NAME_KEY(match.id))}</h5>
              {!match.inSeason && (
                <span className="rounded border border-border px-1 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                  {t("crop.offSeason")}
                </span>
              )}
            </div>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {match.seasonalETc} mm ETc · {t(`crop.class.${demandKey(match.profile.waterDemand)}`)}{" "}
              {t("crop.waterClass").toLowerCase()}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("font-mono text-lg font-semibold tabular-nums", tone.text)}>
              {match.score}
              <span className="text-[10px] font-normal text-muted-foreground">%</span>
            </span>
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </div>
        </div>

        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {PILLARS.map((p) => {
            const value = match.pillars[p.key];
            return (
              <div key={p.key} title={`${t(p.copy)} · ${p.weight}%`}>
                <div className="hud-label truncate text-[9px]">{p.weight}%</div>
                <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", pillarTone(value))}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </button>

      {open && (
        <div id={panelId} className="space-y-2 border-t border-border/60 p-2.5">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px] text-muted-foreground">
            {PILLARS.map((p) => (
              <div key={p.key} className="flex justify-between gap-2">
                <span className="truncate">{t(p.copy)}</span>
                <span
                  className={cn(
                    "tabular-nums",
                    SEVERITY_STYLES[CLASS_TONE[match.classification]].text,
                  )}
                >
                  {match.pillars[p.key]}
                </span>
              </div>
            ))}
            <div className="flex justify-between gap-2">
              <span>{t("crop.deficit")}</span>
              <span
                className={cn("tabular-nums", match.deficitMm > 0 ? "text-amber" : "text-emerald")}
              >
                {match.deficitMm} mm
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span>GDD</span>
              <span className="tabular-nums">{match.gddSeason}</span>
            </div>
          </div>

          <div>
            <div className="hud-label">{t("crop.sowing")}</div>
            <p className="mt-0.5 font-mono text-[11px] text-foreground/90">
              {match.profile.sowing} · {match.profile.duration} d
            </p>
          </div>

          <div>
            <div className="hud-label">{t("crop.fertilizer")}</div>
            <p className="mt-0.5 text-[11px] leading-snug text-foreground/90">{match.fertilizer}</p>
          </div>

          <div>
            <div className="hud-label">{t("crop.irrigation")}</div>
            <p className="mt-0.5 text-[11px] leading-snug text-foreground/90">{match.irrigation}</p>
          </div>

          {match.reasons.length > 0 && (
            <div>
              <div className="hud-label">{t("crop.reasons")}</div>
              <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[11px] leading-snug text-muted-foreground">
                {match.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export function CropSuitabilityGrid({ matches, lang }: { matches: CropMatch[]; lang: Lang }) {
  const t = translator(lang);
  const groups = groupCropMatches(matches);
  const optimal = groups[0]?.matches.length ?? 0;

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-2">
        <div>
          <div className="hud-label">{t("hud.cropEngine.sub")}</div>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {matches.length} crops · {optimal} aquifer-safe
          </p>
        </div>
        <div className="flex gap-1.5">
          {groups.map((g) => (
            <span
              key={g.id}
              title={t(CLASS_COPY[g.id])}
              className={cn(
                "grid min-w-6 place-items-center rounded border px-1.5 py-0.5 font-mono text-[10px]",
                SEVERITY_STYLES[CLASS_TONE[g.id]].chip,
              )}
            >
              {g.matches.length}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {groups.map(({ id, matches: rows }) => (
          <div key={id}>
            <div className="flex items-center gap-2">
              <span className={cn("size-1.5 rounded-full", SEVERITY_STYLES[CLASS_TONE[id]].dot)} />
              <h4 className={cn("text-[11px] font-semibold", SEVERITY_STYLES[CLASS_TONE[id]].text)}>
                {t(CLASS_COPY[id])}
              </h4>
              <span className="font-mono text-[10px] text-muted-foreground">{rows.length}</span>
            </div>
            {rows.length === 0 ? (
              <p className="mt-1 pl-3.5 text-[11px] text-muted-foreground">{t("crop.empty")}</p>
            ) : (
              <div className="mt-1.5 grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
                {rows.map((m) => (
                  <CropCard key={m.id} match={m} lang={lang} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
