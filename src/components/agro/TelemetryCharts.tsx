import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CloudSun, Droplets, Leaf, Sprout } from "lucide-react";
import { HudCard } from "@/components/agro/hud";
import type { AgroTelemetry } from "@/types/agroSpace";
import { LocalizedText } from "@/components/i18n/LocalizedText";

const tick = { fill: "oklch(0.68 0.035 235)", fontSize: 12, fontFamily: "var(--font-mono)" };
const tooltipProps = {
  contentStyle: {
    background: "oklch(0.12 0.025 260 / 0.95)",
    border: "1px solid oklch(0.79 0.17 210 / 0.45)",
    borderRadius: 8,
    boxShadow: "0 0 20px rgba(0, 0, 0, 0.8), 0 0 10px rgba(0, 240, 255, 0.2)",
    backdropFilter: "blur(12px)",
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    color: "oklch(0.96 0.012 210)",
    padding: "8px 12px",
  },
  labelStyle: { color: "var(--cyan)", fontWeight: "bold", marginBottom: "4px" },
  cursor: { stroke: "var(--cyan)", strokeOpacity: 0.4, fill: "var(--cyan)", fillOpacity: 0.08 },
};
const legendProps = {
  wrapperStyle: { fontSize: 12, fontFamily: "var(--font-mono)", paddingTop: 8 },
  iconSize: 8,
};
const grid = (
  <CartesianGrid stroke="oklch(0.79 0.17 210 / 0.12)" strokeDasharray="3 4" vertical={false} />
);

function LocalizedChartTick({
  x = 0,
  y = 0,
  payload,
  textAnchor = "middle",
}: {
  x?: number;
  y?: number;
  payload?: { value?: string | number };
  textAnchor?: "start" | "middle" | "end";
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      dominantBaseline="central"
      fill="oklch(0.68 0.035 235)"
      fontSize={12}
      fontFamily="var(--font-mono)"
    >
      <LocalizedText text={String(payload?.value ?? "")} />
    </text>
  );
}

const localizeTooltipLabel = (value: unknown) => <LocalizedText text={String(value ?? "")} />;
const localizeTooltipSeries = (value: React.ReactNode, name: string | number) => [
  value,
  <LocalizedText key={String(name)} text={String(name)} />,
];
const localizeLegend = (value: string | number) => <LocalizedText text={String(value)} />;

export function PowerChart({ data }: { data: AgroTelemetry["power"] }) {
  return (
    <HudCard
      title="NASA POWER · 30-Day Energy & Water"
      subtitle="PAR · VPD · EVPTRNS vs PRECTOTCORR"
      icon={<CloudSun />}
      className="border-cyan/35 shadow-[0_0_25px_rgba(0,0,0,0.5)]"
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
            {grid}
            <XAxis dataKey="day" tick={tick} interval={5} tickLine={false} axisLine={false} />
            <YAxis yAxisId="par" tick={tick} tickLine={false} axisLine={false} />
            <YAxis yAxisId="mm" orientation="right" tick={tick} tickLine={false} axisLine={false} />
            <YAxis yAxisId="vpd" hide domain={[0, 6]} />
            <Tooltip
              {...tooltipProps}
              labelFormatter={localizeTooltipLabel}
              formatter={localizeTooltipSeries}
            />
            <Legend {...legendProps} formatter={localizeLegend} />
            <Bar
              yAxisId="mm"
              dataKey="PRECTOTCORR"
              name="Rain mm"
              fill="var(--cyan)"
              fillOpacity={0.55}
              radius={[3, 3, 0, 0]}
            />
            <Line
              yAxisId="par"
              dataKey="PAR"
              name="PAR W/m²"
              stroke="var(--amber)"
              strokeWidth={2.2}
              dot={false}
            />
            <Line
              yAxisId="mm"
              dataKey="EVPTRNS"
              name="ET mm/d"
              stroke="var(--emerald)"
              strokeWidth={2.2}
              dot={false}
            />
            <Line
              yAxisId="vpd"
              dataKey="VPD"
              name="VPD kPa"
              stroke="var(--crimson)"
              strokeWidth={1.8}
              strokeDasharray="4 3"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </HudCard>
  );
}

export function SoilMoistureChart({ data, depth }: { data: AgroTelemetry["soil"]; depth: number }) {
  const access = data[data.length - 1]?.borewellAccess ?? 0;
  return (
    <HudCard
      title="Multi-Depth Soil Moisture"
      subtitle="SMAP L4 · % saturation profile"
      icon={<Droplets />}
      className="border-cyan/35 shadow-[0_0_25px_rgba(0,0,0,0.5)]"
      right={
        <div className="rounded-md border border-cyan/30 bg-cyan/10 px-2 py-1 text-right font-mono text-xs leading-tight shadow-[0_0_8px_rgba(0,240,255,0.2)]">
          <div className="font-bold text-cyan-300">
            {<LocalizedText text={"BOREWELL "} />}
            {depth} {<LocalizedText text={" m"} />}
          </div>
          <div className="text-muted-foreground">
            {<LocalizedText text={"aquifer reach "} />}
            {access}%
          </div>
        </div>
      }
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
            <defs>
              {[
                ["g0", "var(--chart-5)"],
                ["g1", "var(--cyan)"],
                ["g2", "var(--emerald)"],
                ["g3", "var(--amber)"],
              ].map(([id, c]) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={c} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            {grid}
            <XAxis dataKey="day" tick={tick} interval={5} tickLine={false} axisLine={false} />
            <YAxis tick={tick} domain={[0, 100]} tickLine={false} axisLine={false} />
            <Tooltip
              {...tooltipProps}
              labelFormatter={localizeTooltipLabel}
              formatter={localizeTooltipSeries}
            />
            <Legend {...legendProps} formatter={localizeLegend} />
            <Area
              dataKey="sm0_5"
              name="0–5cm seedbed"
              stroke="var(--chart-5)"
              fill="url(#g0)"
              strokeWidth={1.8}
            />
            <Area
              dataKey="sm7_28"
              name="7–28cm"
              stroke="var(--cyan)"
              fill="url(#g1)"
              strokeWidth={1.8}
            />
            <Area
              dataKey="sm28_100"
              name="28–100cm root"
              stroke="var(--emerald)"
              fill="url(#g2)"
              strokeWidth={2}
            />
            <Area
              dataKey="GWETPROF"
              name="GWETPROF recharge"
              stroke="var(--amber)"
              fill="url(#g3)"
              strokeWidth={1.8}
            />
            <Area
              dataKey="borewellAccess"
              name={`Borewell reach @${depth}m`}
              stroke="var(--foreground)"
              strokeDasharray="5 4"
              fill="none"
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </HudCard>
  );
}

export function PlantHealthRadar({
  health,
  tall = false,
}: {
  health: AgroTelemetry["plantHealth"];
  tall?: boolean;
}) {
  return (
    <HudCard
      title="6-Pillar Plant Health Radar"
      subtitle="NASA VIIRS · MODIS · ECOSTRESS Telemetry"
      icon={<Leaf />}
      className="border-cyan/35 shadow-[0_0_25px_rgba(0,0,0,0.5)]"
      right={
        <div className="font-mono text-3xl font-extrabold tabular-nums text-emerald-400 drop-shadow-[0_0_8px_#00ff9d]">
          {health.overall}
          <span className="text-xs font-normal text-muted-foreground">/100</span>
        </div>
      }
    >
      <div className={tall ? "h-80" : "h-64"}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={health.pillars} outerRadius="72%">
            <PolarGrid stroke="oklch(0.79 0.17 210 / 0.18)" />
            <PolarAngleAxis dataKey="label" tick={<LocalizedChartTick />} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip
              {...tooltipProps}
              labelFormatter={localizeTooltipLabel}
              formatter={localizeTooltipSeries}
            />
            <Radar
              dataKey="score"
              name="Score"
              stroke="var(--emerald)"
              fill="var(--emerald)"
              fillOpacity={0.35}
              strokeWidth={2.2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </HudCard>
  );
}

export function WaterBudgetChart({
  data,
  crop,
}: {
  data: AgroTelemetry["waterBudget"];
  crop: string;
}) {
  return (
    <HudCard
      title="Seasonal Water Budget"
      subtitle={`${crop} · ETc crop demand vs available reserve (mm)`}
      icon={<Sprout />}
      className="border-cyan/35 shadow-[0_0_25px_rgba(0,0,0,0.5)]"
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 6, left: -12, bottom: 0 }} barGap={5}>
            {grid}
            <XAxis dataKey="stage" tick={tick} tickLine={false} axisLine={false} />
            <YAxis tick={tick} tickLine={false} axisLine={false} />
            <Tooltip
              {...tooltipProps}
              labelFormatter={localizeTooltipLabel}
              formatter={localizeTooltipSeries}
            />
            <Legend {...legendProps} formatter={localizeLegend} />
            <Bar dataKey="ETc" name="Crop need ETc" fill="var(--amber)" radius={[4, 4, 0, 0]} />
            <Bar
              dataKey="available"
              name="Farm water budget"
              fill="var(--cyan)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </HudCard>
  );
}
