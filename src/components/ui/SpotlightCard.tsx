import React, { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  borderColor?: string;
  size?: number;
}

/**
 * Linear.app & GitHub Copilot-inspired Specular Spotlight Card.
 * Tracks mouse position to cast a localized 380px radial specular light
 * and a 1px illuminated hairline border.
 */
export function SpotlightCard({
  children,
  className,
  spotlightColor = "rgba(56, 189, 248, 0.12)",
  borderColor = "rgba(56, 189, 248, 0.38)",
  size = 380,
  ...props
}: SpotlightCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group relative rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-glass)] backdrop-blur-xl transition-all duration-300 shadow-[var(--shadow-hud)] overflow-hidden",
        className,
      )}
      {...props}
    >
      {/* Specular 1px Border Illumination at cursor location */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px rounded-[inherit] transition-opacity duration-300 z-20"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(${size}px circle at ${coords.x}px ${coords.y}px, ${borderColor}, transparent 45%)`,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          padding: "1px",
        }}
      />

      {/* Radial Specular Highlight on Card Face */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 z-10"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(${size}px circle at ${coords.x}px ${coords.y}px, ${spotlightColor}, transparent 65%)`,
        }}
      />

      {/* Card Content */}
      <div className="relative z-0 w-full h-full">{children}</div>
    </div>
  );
}

export default SpotlightCard;
