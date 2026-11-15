import React from "react";
import { cn } from "@/lib/utils";

export interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

/**
 * Magic UI & Linear-inspired glowing Border Beam.
 * Uses a rotating conic-gradient masked to the card border perimeter
 * so only the card edge glows while mouse events pass through cleanly.
 */
export function BorderBeam({
  className,
  size = 240,
  duration = 12,
  borderWidth = 1.5,
  colorFrom = "#38bdf8",
  colorTo = "#10b981",
  delay = 0,
}: BorderBeamProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]",
        className,
      )}
      style={{
        padding: `${borderWidth}px`,
        WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor",
        mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        maskComposite: "exclude",
      }}
    >
      <div
        className="absolute top-1/2 left-1/2 aspect-square rounded-full pointer-events-none"
        style={{
          width: `${size}%`,
          height: `${size}%`,
          animation: `borderBeamSpin ${duration}s linear infinite`,
          animationDelay: `${delay}s`,
          background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 270deg, ${colorFrom} 315deg, ${colorTo} 355deg, transparent 360deg)`,
        }}
      />
    </div>
  );
}

export default BorderBeam;
