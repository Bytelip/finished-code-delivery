import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Severity } from "@/types/agroSpace";
import { LocalizedText } from "@/components/i18n/LocalizedText";

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
    <div className={cn("hud-card p-4.5 transition-all duration-200", className)}>
      <header className="mb-3.5 flex items-start justify-between gap-3 border-b border-border/40 pb-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          {icon && (
            <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border border-cyan/40 bg-cyan/10 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.25)] [&_svg]:size-3.5">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="truncate font-sans text-sm font-semibold tracking-tight text-foreground">
              <LocalizedText text={title} />
            </h3>
            {subtitle && (
              <p className="mt-0.5 truncate font-mono text-xs tracking-wider text-muted-foreground normal-case">
                <LocalizedText text={subtitle} />
              </p>
            )}
          </div>
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </header>
      {children}
    </div>
  );
}

export const SEVERITY_STYLES: Record<
  Severity,
  { label: string; text: string; chip: string; dot: string; ring: string; glow: string }
> = {
  nominal: {
    label: "Nominal",
    text: "text-emerald-400",
    chip: "border-emerald/40 bg-emerald/10 text-emerald-400 shadow-[0_0_12px_rgba(0,255,157,0.18)]",
    dot: "bg-emerald shadow-[0_0_6px_#00ff9d]",
    ring: "border-emerald/30",
    glow: "glow-emerald",
  },
  watch: {
    label: "Watch",
    text: "text-cyan-300",
    chip: "border-cyan/40 bg-cyan/10 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.18)]",
    dot: "bg-cyan shadow-[0_0_6px_#00f0ff]",
    ring: "border-cyan/35",
    glow: "glow-cyan",
  },
  warning: {
    label: "Warning",
    text: "text-amber-400",
    chip: "border-amber/50 bg-amber/15 text-amber-400 shadow-[0_0_14px_rgba(255,183,0,0.25)]",
    dot: "bg-amber shadow-[0_0_8px_#ffb700]",
    ring: "border-amber/50",
    glow: "glow-amber",
  },
  critical: {
    label: "Critical",
    text: "text-rose-400",
    chip: "border-crimson/60 bg-crimson/20 text-rose-400 shadow-[0_0_16px_rgba(255,46,86,0.35)]",
    dot: "bg-crimson shadow-[0_0_10px_#ff2e56]",
    ring: "border-crimson/70",
    glow: "glow-crimson",
  },
};

export function SeverityChip({ severity }: { severity: Severity }) {
  const s = SEVERITY_STYLES[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wider backdrop-blur-md transition-shadow",
        s.chip,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          s.dot,
          (severity === "critical" || severity === "warning") && "animate-pulse",
        )}
      />
      <LocalizedText text={s.label} />
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
    <div className="min-w-0 rounded-md border border-border/30 bg-background/30 p-2 backdrop-blur-sm">
      <div className="hud-label truncate text-xs text-muted-foreground">
        <LocalizedText text={label} />
      </div>
      <div className={cn("mt-1 truncate font-mono text-lg font-semibold tabular-nums", tone)}>
        {value}
        {unit && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            <LocalizedText text={unit} />
          </span>
        )}
      </div>
    </div>
  );
}

export const formatCoord = (v: number, axis: "lat" | "lon") => {
  const dir = axis === "lat" ? (v >= 0 ? "N" : "S") : v >= 0 ? "E" : "W";
  return `${Math.abs(v).toFixed(4)}°${dir}`;
};
