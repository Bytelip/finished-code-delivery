import React from "react";
import { Play, Pause, SkipBack, SkipForward, Radio, Layers, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimeStep {
  id: string;
  label: string;
  dateLabel: string;
  timestamp: string;
}

export const ZOOM_EARTH_TIME_STEPS: TimeStep[] = [
  { id: "-24h", label: "-24H", dateLabel: "14 Nov 05:30", timestamp: "14 Nov 05:30 IST" },
  { id: "-12h", label: "-12H", dateLabel: "14 Nov 17:30", timestamp: "14 Nov 17:30 IST" },
  { id: "-6h", label: "-6H", dateLabel: "14 Nov 23:30", timestamp: "14 Nov 23:30 IST" },
  { id: "-3h", label: "-3H", dateLabel: "15 Nov 02:30", timestamp: "15 Nov 02:30 IST" },
  {
    id: "live",
    label: "LIVE",
    dateLabel: "15 Nov 05:30 (LIVE)",
    timestamp: "15 Nov 05:30 IST (LIVE)",
  },
  {
    id: "+3h",
    label: "+3H",
    dateLabel: "15 Nov 08:30 (AI)",
    timestamp: "15 Nov 08:30 IST (FORECAST)",
  },
  {
    id: "+6h",
    label: "+6H",
    dateLabel: "15 Nov 11:30 (AI)",
    timestamp: "15 Nov 11:30 IST (FORECAST)",
  },
  {
    id: "+12h",
    label: "+12H",
    dateLabel: "15 Nov 17:30 (AI)",
    timestamp: "15 Nov 17:30 IST (FORECAST)",
  },
  {
    id: "+24h",
    label: "+24H",
    dateLabel: "16 Nov 05:30 (AI)",
    timestamp: "16 Nov 05:30 IST (FORECAST)",
  },
];

interface TimePlayerPillProps {
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  className?: string;
}

export function TimePlayerPill({
  currentStepIndex,
  onStepChange,
  isPlaying,
  onTogglePlay,
  className,
}: TimePlayerPillProps) {
  const currentStep = ZOOM_EARTH_TIME_STEPS[currentStepIndex] || ZOOM_EARTH_TIME_STEPS[4]!;
  const isLive = currentStep.id === "live";

  const handlePrev = () => {
    onStepChange(currentStepIndex > 0 ? currentStepIndex - 1 : ZOOM_EARTH_TIME_STEPS.length - 1);
  };

  const handleNext = () => {
    onStepChange((currentStepIndex + 1) % ZOOM_EARTH_TIME_STEPS.length);
  };

  const handleJumpLive = () => {
    const liveIdx = ZOOM_EARTH_TIME_STEPS.findIndex((s) => s.id === "live");
    if (liveIdx !== -1) onStepChange(liveIdx);
  };

  return (
    <div
      data-hud-overlay="time-player-dock"
      className={cn(
        "pointer-events-auto flex flex-col sm:flex-row items-center gap-2 select-none",
        className,
      )}
    >
      {/* Center Player Pill */}
      <div className="flex items-center gap-1.5 rounded-full bg-[#181C24]/90 backdrop-blur-xl border border-white/12 shadow-[0_4px_24px_rgba(0,0,0,0.6)] px-2 py-1 text-foreground text-xs font-mono">
        {/* Play / Pause Button */}
        <button
          type="button"
          onClick={onTogglePlay}
          className="size-7 rounded-full bg-[#1D74F5] hover:bg-[#3B82F6] active:bg-[#1E40AF] text-foreground flex items-center justify-center transition-all shadow-md cursor-pointer shrink-0"
          title={isPlaying ? "Pause Timeline Animation" : "Play Timeline Animation"}
        >
          {isPlaying ? (
            <Pause className="size-3.5 fill-current" />
          ) : (
            <Play className="size-3.5 fill-current ml-0.5" />
          )}
        </button>

        {/* Step Backward */}
        <button
          type="button"
          onClick={handlePrev}
          className="p-1 rounded-full hover:bg-white/10 text-foreground hover:text-foreground transition-colors"
          title="Step Backward"
        >
          <SkipBack className="size-3.5" />
        </button>

        {/* Current Timestamp Display */}
        <div className="px-2 py-0.5 min-w-36 text-center">
          <span className="font-semibold text-foreground text-xs tracking-wide block truncate">
            {currentStep.timestamp}
          </span>
        </div>

        {/* Step Forward */}
        <button
          type="button"
          onClick={handleNext}
          className="p-1 rounded-full hover:bg-white/10 text-foreground hover:text-foreground transition-colors"
          title="Step Forward"
        >
          <SkipForward className="size-3.5" />
        </button>

        {/* LIVE Badge Button */}
        <button
          type="button"
          onClick={handleJumpLive}
          className={cn(
            "flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-150 cursor-pointer",
            isLive
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-400/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              : "bg-white/5 text-muted-foreground border border-white/10 hover:text-foreground hover:bg-white/10",
          )}
          title="Jump to Real-Time Live Feed"
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              isLive ? "bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" : "bg-slate-500",
            )}
          />
          LIVE
        </button>
      </div>

      {/* Model Source Badge Pill */}
      <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-[#181C24]/80 backdrop-blur-md border border-white/10 px-3 py-1 text-xs font-mono text-foreground shadow-lg">
        <Layers className="size-3 text-cyan-300" />
        <span>NASA GIBS • ICON 13 km • GFS 22 km</span>
      </div>
    </div>
  );
}
