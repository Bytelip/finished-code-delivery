import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Severity } from "@/types/agroSpace";

export function HudCard({
  title,
  subtitle,
  icon,
  right,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("hud-card p-4", className)}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {icon && <span className="mt-0.5 text-cyan [&_svg]:size-4">{icon}</span>}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold tracking-tight">{title}</h3>
            {subtitle && <p className="hud-label mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>
        {right}
      </header>
      {children}
    </div>
  );
}

export const SEVERITY_STYLES: Record<
  Severity,
  { label: string; text: string; chip: string; dot: string; ring: string }
> = {
  nominal: {
    label: "Nominal",
    text: "text-emerald",
    chip: "border-emerald/40 bg-emerald/10 text-emerald",
    dot: "bg-emerald",
    ring: "border-emerald/25",
  },
  watch: {
    label: "Watch",
    text: "text-cyan",
    chip: "border-cyan/40 bg-cyan/10 text-cyan",
    dot: "bg-cyan",
    ring: "border-cyan/30",
  },
  warning: {
    label: "Warning",
    text: "text-amber",
    chip: "border-amber/40 bg-amber/10 text-amber",
    dot: "bg-amber",
    ring: "border-amber/40",
  },
  critical: {
    label: "Critical",
    text: "text-crimson",
    chip: "border-crimson/50 bg-crimson/15 text-crimson",
    dot: "bg-crimson",
    ring: "border-crimson/60",
  },
};

export function SeverityChip({ severity }: { severity: Severity }) {
  const s = SEVERITY_STYLES[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        s.chip,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", s.dot, severity === "critical" && "animate-pulse")}
      />
      {s.label}
    </span>
  );
}

export function Readout({
  label,
  value,
  unit,
  tone = "text-foreground",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="hud-label truncate">{label}</div>
      <div className={cn("mt-1 truncate font-mono text-lg font-semibold tabular-nums", tone)}>
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export const formatCoord = (v: number, axis: "lat" | "lon") => {
  const dir = axis === "lat" ? (v >= 0 ? "N" : "S") : v >= 0 ? "E" : "W";
  return `${Math.abs(v).toFixed(4)}°${dir}`;
};
