import { Sprout, Droplets, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { HudCard, Readout } from "@/components/agro/hud";
import { Progress } from "@/components/ui/progress";
import type { CropRecommendation } from "@/types/agroSpace";
import { LocalizedText } from "@/components/i18n/LocalizedText";

export function CropEngineSlot({ crop }: { crop: CropRecommendation }) {
  const stressTone =
    crop.waterStressIndex > 0.5
      ? "text-rose-400 drop-shadow-[0_0_8px_#ff2e56]"
      : crop.waterStressIndex > 0.2
        ? "text-amber-400 drop-shadow-[0_0_8px_#ffb700]"
        : "text-emerald-400 drop-shadow-[0_0_8px_#00ff9d]";

  const coverage = Math.min(
    100,
    Math.round((crop.seasonalAvailable / Math.max(1, crop.seasonalETc)) * 100),
  );

  return (
    <section id="crop-engine-slot" aria-label="Crop engine">
      <HudCard
        title="Crop & Biomass Engine"
        subtitle="NASA ETc · Water Balance · Yield Telemetry"
        icon={<Sprout />}
        className="border-cyan/40 shadow-[0_0_30px_rgba(0,0,0,0.6)]"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-bold tracking-tight text-emerald-400 drop-shadow-[0_0_10px_rgba(0,255,157,0.5)]">
              {crop.crop}
            </span>
            <span className="rounded-md border border-emerald/50 bg-emerald/15 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              {<LocalizedText text={"Recommended Sow"} />}
            </span>
          </div>
          <div className="font-mono text-xs text-cyan-300 bg-cyan/10 border border-cyan/30 px-2 py-0.5 rounded-md">
            {<LocalizedText text={"Window: Sow "} />}
            {crop.sowingWindow}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Readout
            label="Yield est."
            value={crop.yieldTPerHa}
            unit="t/ha"
            tone="text-emerald-400 drop-shadow-[0_0_6px_#00ff9d]"
          />
          <Readout
            label="Water stress"
            value={crop.waterStressIndex.toFixed(2)}
            tone={stressTone}
          />
          <Readout
            label="Deficit"
            value={crop.deficitMm}
            unit="mm"
            tone={
              crop.deficitMm > 0
                ? "text-amber-400 drop-shadow-[0_0_6px_#ffb700]"
                : "text-emerald-400 drop-shadow-[0_0_6px_#00ff9d]"
            }
          />
          <Readout
            label="Borewell yield"
            value={crop.borewellYieldLph.toLocaleString("en-US")}
            unit="L/h"
            tone="text-cyan-300 drop-shadow-[0_0_6px_#00f0ff]"
          />
        </div>

        {/* Budget Coverage Meter */}
        <div className="mt-4 rounded-lg border border-border/40 bg-background/50 p-3 backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between font-mono text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground font-semibold">
              <Droplets className="size-3 text-cyan-300" />{" "}
              {<LocalizedText text={" Water Budget Coverage"} />}
            </span>
            <span className={cn("tabular-nums font-bold", stressTone)}>
              {crop.seasonalAvailable} / {crop.seasonalETc} {<LocalizedText text={" mm · "} />}
              {coverage}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60 border border-border/40">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 shadow-sm",
                coverage >= 100
                  ? "bg-emerald shadow-[0_0_10px_#00ff9d]"
                  : coverage >= 60
                    ? "bg-cyan shadow-[0_0_10px_#00f0ff]"
                    : "bg-amber shadow-[0_0_10px_#ffb700]",
              )}
              style={{ width: `${coverage}%` }}
            />
          </div>
        </div>

        {/* Advisory Flight Callout */}
        <div className="mt-3.5 flex items-start gap-2.5 rounded-md border border-cyan/30 bg-cyan/5 p-3 text-xs leading-relaxed text-foreground backdrop-blur-sm">
          <Gauge className="size-4 shrink-0 mt-0.5 text-cyan-300 drop-shadow-[0_0_6px_#00f0ff]" />
          <p>{crop.advisory}</p>
        </div>

        {/* Field Shift Atlas Badge Link */}
        <div className="mt-3 flex items-center justify-between text-xs font-mono text-muted-foreground pt-2 border-t border-border/30">
          <span className="flex items-center gap-1.5 text-cyan-300">
            <span className="size-1.5 rounded-full bg-cyan shadow-[0_0_6px_#00f0ff] animate-pulse" />
            {<LocalizedText text={"Global Crop Atlas: 600 Crops Active"} />}
          </span>
          <span className="text-xs text-emerald-400">
            {<LocalizedText text={"5-Factor Scoring Loaded"} />}
          </span>
        </div>
      </HudCard>
    </section>
  );
}
