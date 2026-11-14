import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CROP_NAME_KEY, HAZARD_NAME_KEY, translator, type Lang } from "@/i18n/translations";
import type { CropMatch } from "@/utils/cropSuitabilityEngine";
import { formatCoord } from "@/components/agro/hud";
import type { AgroTelemetry } from "@/types/agroSpace";

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="font-medium text-neutral-900">{value}</div>
    </div>
  );
}

export function FarmerAdvisoryModal({
  open,
  onOpenChange,
  telemetry,
  matches,
  lang,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  telemetry: AgroTelemetry;
  matches: CropMatch[];
  lang: Lang;
}) {
  const t = translator(lang);
  // Recommend sowing candidates first: in-season, never groundwater-risky.
  const eligible = matches.filter((m) => m.classification !== "high-risk");
  const ranked = [...eligible.filter((m) => m.inSeason), ...eligible.filter((m) => !m.inSeason)];
  const top = (ranked.length > 0 ? ranked : matches).slice(0, 3);
  const active = telemetry.hazards
    .filter((h) => h.severity === "critical" || h.severity === "warning")
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto border-border bg-background p-4 sm:p-5">
        <DialogHeader className="print:hidden">
          <DialogTitle>{t("advisory.title")}</DialogTitle>
          <DialogDescription>{t("advisory.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 print:hidden">
          <span className="hud-label">
            {t("advisory.lang")}: {lang.toUpperCase()}
          </span>
          <Button variant="hud" size="sm" onClick={() => window.print()}>
            <Printer />
            {t("advisory.print")}
          </Button>
        </div>

        <div
          id="farmer-advisory-report"
          className="farmer-report rounded-md bg-white p-5 text-[13px] leading-relaxed text-neutral-900 sm:p-6"
        >
          <header className="flex items-start justify-between gap-4 border-b border-neutral-300 pb-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
                {t("advisory.title")}
              </h2>
              <p className="mt-0.5 text-[11px] text-neutral-600">{t("advisory.subtitle")}</p>
            </div>
            <div className="shrink-0 text-right text-[11px] text-neutral-600">
              <div className="font-semibold text-neutral-900">AgroSpace Nexus</div>
              <div>
                {t("advisory.date")}: {today}
              </div>
            </div>
          </header>

          <section className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[12px] sm:grid-cols-3">
            <Detail label={t("advisory.farm")} value={telemetry.meta.regionLabel} />
            <Detail
              label={t("advisory.coords")}
              value={`${formatCoord(telemetry.meta.lat, "lat")} · ${formatCoord(telemetry.meta.lon, "lon")}`}
            />
            <Detail label={t("advisory.climate")} value={telemetry.meta.climateZone} />
            <Detail label={t("advisory.season")} value={telemetry.input.season} />
            <Detail label={t("advisory.irrigation")} value={telemetry.input.irrigation} />
            <Detail
              label={t("advisory.borewell")}
              value={`${telemetry.input.borewellDepth} m mbgl`}
            />
          </section>

          <section className="mt-4">
            <h3 className="border-b border-neutral-300 pb-1 text-sm font-semibold text-neutral-900">
              {t("advisory.topCrops")}
            </h3>
            <div className="mt-2 space-y-2">
              {top.map((m) => (
                <div
                  key={m.id}
                  className="break-inside-avoid rounded border border-neutral-300 p-2.5"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] font-semibold text-neutral-900">
                      {t(CROP_NAME_KEY(m.id))}
                    </span>
                    <span className="font-mono text-[12px] font-semibold text-neutral-900">
                      {t("advisory.score")} {m.score}%
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-neutral-600">
                    {t("advisory.waterBudget")}: {m.seasonalETc} mm {t("crop.demand").toLowerCase()}
                    {" · "}
                    {t("crop.deficit")}: {m.deficitMm} mm · {t("crop.sowing")}: {m.profile.sowing}
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-800">
                    <span className="font-semibold">{t("crop.fertilizer")}: </span>
                    {m.fertilizer}
                  </p>
                  <p className="mt-0.5 text-[11px] text-neutral-800">
                    <span className="font-semibold">{t("crop.irrigation")}: </span>
                    {m.irrigation}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-4">
            <h3 className="border-b border-neutral-300 pb-1 text-sm font-semibold text-neutral-900">
              {t("advisory.hazards")}
            </h3>
            {active.length === 0 ? (
              <p className="mt-2 text-[11px] text-neutral-700">{t("advisory.noHazards")}</p>
            ) : (
              <div className="mt-2 space-y-2">
                {active.map((h) => (
                  <div key={h.id} className="break-inside-avoid">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[12px] font-semibold text-neutral-900">
                        {t(HAZARD_NAME_KEY(h.type))}
                      </span>
                      <span className="font-mono text-[10px] text-neutral-600">{h.metric}</span>
                    </div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-neutral-800">
                      {h.actions.map((a) => (
                        <li key={a}>{t(a)}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <footer className="mt-4 border-t border-neutral-300 pt-2 text-[10px] leading-snug text-neutral-600">
            {t("advisory.footer")}
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
