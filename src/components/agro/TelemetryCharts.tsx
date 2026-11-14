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

const tick = { fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" };
const tooltipProps = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    color: "var(--popover-foreground)",
  },
  labelStyle: { color: "var(--cyan)" },
  cursor: { stroke: "var(--cyan)", strokeOpacity: 0.3, fill: "var(--cyan)", fillOpacity: 0.05 },
};
const legendProps = {
  wrapperStyle: { fontSize: 10, fontFamily: "var(--font-mono)", paddingTop: 6 },
  iconSize: 8,
};
const grid = <CartesianGrid stroke="var(--hud-line)" strokeDasharray="3 4" vertical={false} />;

export function PowerChart({ data }: { data: AgroTelemetry["power"] }) {
  return (
    <HudCard
      title="NASA POWER · 30-Day Energy & Water"
      subtitle="PAR · VPD · EVPTRNS vs PRECTOTCORR"
      icon={<CloudSun />}
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
            {grid}
            <XAxis dataKey="day" tick={tick} interval={5} tickLine={false} axisLine={false} />
            <YAxis yAxisId="par" tick={tick} tickLine={false} axisLine={false} />
            <YAxis yAxisId="mm" orientation="right" tick={tick} tickLine={false} axisLine={false} />
            <YAxis yAxisId="vpd" hide domain={[0, 6]} />
            <Tooltip {...tooltipProps} />
            <Legend {...legendProps} />
            <Bar
              yAxisId="mm"
              dataKey="PRECTOTCORR"
              name="Rain mm"
              fill="var(--cyan)"
              fillOpacity={0.45}
              radius={[2, 2, 0, 0]}
            />
            <Line
              yAxisId="par"
              dataKey="PAR"
              name="PAR W/m²"
              stroke="var(--amber)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="mm"
              dataKey="EVPTRNS"
              name="ET mm/d"
              stroke="var(--emerald)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="vpd"
              dataKey="VPD"
              name="VPD kPa"
              stroke="var(--crimson)"
              strokeWidth={1.5}
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
      subtitle="SMAP L4 · % saturation"
      icon={<Droplets />}
      right={
        <div className="text-right font-mono text-[10px] leading-tight">
          <div className="text-cyan">BOREWELL {depth} m</div>
          <div className="text-muted-foreground">aquifer reach {access}%</div>
        </div>
      }
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <defs>
              {[
                ["g0", "var(--chart-5)"],
                ["g1", "var(--cyan)"],
                ["g2", "var(--emerald)"],
                ["g3", "var(--amber)"],
              ].map(([id, c]) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={c} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            {grid}
            <XAxis dataKey="day" tick={tick} interval={5} tickLine={false} axisLine={false} />
            <YAxis tick={tick} domain={[0, 100]} tickLine={false} axisLine={false} />
            <Tooltip {...tooltipProps} />
            <Legend {...legendProps} />
            <Area
              dataKey="sm0_5"
              name="0–5cm seedbed"
              stroke="var(--chart-5)"
              fill="url(#g0)"
              strokeWidth={1.5}
            />
            <Area
              dataKey="sm7_28"
              name="7–28cm"
              stroke="var(--cyan)"
              fill="url(#g1)"
              strokeWidth={1.5}
            />
            <Area
              dataKey="sm28_100"
              name="28–100cm root"
              stroke="var(--emerald)"
              fill="url(#g2)"
              strokeWidth={1.5}
            />
            <Area
              dataKey="GWETPROF"
              name="GWETPROF recharge"
              stroke="var(--amber)"
              fill="url(#g3)"
              strokeWidth={1.5}
            />
            <Area
              dataKey="borewellAccess"
              name={`Borewell reach @${depth}m`}
              stroke="var(--foreground)"
              strokeDasharray="5 4"
              fill="none"
              strokeWidth={1.25}
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
      title="6-Pillar Plant Health"
      subtitle="Composite score 0–100"
      icon={<Leaf />}
      right={
        <div className="font-mono text-2xl font-semibold tabular-nums text-emerald">
          {health.overall}
        </div>
      }
    >
      <div className={tall ? "h-80" : "h-64"}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={health.pillars} outerRadius="72%">
            <PolarGrid stroke="var(--hud-line)" />
            <PolarAngleAxis dataKey="label" tick={{ ...tick, fill: "var(--foreground)" }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip {...tooltipProps} />
            <Radar
              dataKey="score"
              name="Score"
              stroke="var(--emerald)"
              fill="var(--emerald)"
              fillOpacity={0.28}
              strokeWidth={2}
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
      subtitle={`${crop} · ETc vs available (mm)`}
      icon={<Sprout />}
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }} barGap={4}>
            {grid}
            <XAxis dataKey="stage" tick={tick} tickLine={false} axisLine={false} />
            <YAxis tick={tick} tickLine={false} axisLine={false} />
            <Tooltip {...tooltipProps} />
            <Legend {...legendProps} />
            <Bar dataKey="ETc" name="Crop need ETc" fill="var(--amber)" radius={[3, 3, 0, 0]} />
            <Bar
              dataKey="available"
              name="Farm water budget"
              fill="var(--cyan)"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </HudCard>
  );
}
