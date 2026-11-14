import { Sprout } from "lucide-react";
import { cn } from "@/lib/utils";
import { HudCard, Readout } from "@/components/agro/hud";
import { Progress } from "@/components/ui/progress";
import { CropSuitabilityGrid } from "@/components/agro/CropSuitabilityGrid";
import { translator, type Lang } from "@/i18n/translations";
import type { CropMatch } from "@/utils/cropSuitabilityEngine";
import type { CropRecommendation } from "@/types/agroSpace";

export function CropEngineSlot({
  crop,
  matches,
  lang,
}: {
  crop: CropRecommendation;
  matches: CropMatch[];
  lang: Lang;
}) {
  const t = translator(lang);
  const stressTone =
    crop.waterStressIndex > 0.5
      ? "text-crimson"
      : crop.waterStressIndex > 0.2
        ? "text-amber"
        : "text-emerald";
  const coverage = Math.min(
    100,
    Math.round((crop.seasonalAvailable / Math.max(1, crop.seasonalETc)) * 100),
  );

  return (
    <section id="crop-engine-slot" aria-label="Crop engine">
      <div className="grid gap-4 xl:grid-cols-3">
        <HudCard title={t("hud.cropEngine")} subtitle={crop.crop} icon={<Sprout />}>
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-lg font-semibold text-emerald">{crop.crop}</div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {t("crop.sowing")} {crop.sowingWindow}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Readout
              label={t("crop.readout.yield")}
              value={crop.yieldTPerHa}
              unit="t/ha"
              tone="text-emerald"
            />
            <Readout
              label={t("crop.readout.waterStress")}
              value={crop.waterStressIndex.toFixed(2)}
              tone={stressTone}
            />
            <Readout
              label={t("crop.deficit")}
              value={crop.deficitMm}
              unit="mm"
              tone={crop.deficitMm > 0 ? "text-amber" : "text-emerald"}
            />
            <Readout
              label={t("crop.readout.borewell")}
              value={crop.borewellYieldLph.toLocaleString("en-US")}
              unit="L/h"
              tone="text-cyan"
            />
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>{t("crop.readout.coverage")}</span>
              <span className={cn("tabular-nums", stressTone)}>
                {crop.seasonalAvailable} / {crop.seasonalETc} mm · {coverage}%
              </span>
            </div>
            <Progress value={coverage} className="h-1.5 bg-muted" />
          </div>
          <p className="mt-3 rounded-md border border-border bg-background/40 p-2.5 text-xs text-muted-foreground">
            {crop.advisory}
          </p>
        </HudCard>

        <div className="hud-card p-4 xl:col-span-2">
          <CropSuitabilityGrid matches={matches} lang={lang} />
        </div>
      </div>
    </section>
  );
}
