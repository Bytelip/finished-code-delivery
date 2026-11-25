import React, { useRef } from "react";
import { flushSync } from "react-dom";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

export interface AnimatedThemeSwitchProps {
  className?: string;
}

export const AnimatedThemeSwitch: React.FC<AnimatedThemeSwitchProps> = ({ className }) => {
  const { mode, toggleMode } = useTheme();
  const isDark = mode === "dark";
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const docWithTransition =
      typeof document !== "undefined"
        ? (document as Document & {
            startViewTransition?: (cb: () => void) => { ready: Promise<void> };
          })
        : null;

    if (!docWithTransition?.startViewTransition || prefersReducedMotion || !buttonRef.current) {
      toggleMode();
      return;
    }

    const rect = buttonRef.current.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    try {
      const transition = docWithTransition.startViewTransition(() => {
        flushSync(() => {
          toggleMode();
        });
      });

      void transition.ready
        .then(() => {
          if (typeof document.documentElement.animate === "function") {
            document.documentElement.animate(
              {
                clipPath: [
                  `circle(0px at ${x}px ${y}px)`,
                  `circle(${maxRadius}px at ${x}px ${y}px)`,
                ],
              },
              {
                duration: 500,
                easing: "ease-in-out",
                pseudoElement: "::view-transition-new(root)",
              },
            );
          }
        })
        .catch(() => undefined);
    } catch {
      toggleMode();
    }
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
      onClick={handleToggle}
      className={cn(
        "relative inline-flex !min-h-7 !min-w-14 h-7 w-14 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer select-none overflow-hidden",
        isDark
          ? "border-indigo-400/35 bg-gradient-to-r from-[#0f172a] via-[#1e1b4b] to-[#312e81] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6),0_0_12px_rgba(99,102,241,0.22)]"
          : "border-amber-400/60 bg-gradient-to-r from-sky-200 via-amber-100 to-amber-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_2px_10px_rgba(245,158,11,0.22)]",
        className,
      )}
    >
      {/* Sky vs Night decorative micro-elements */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-300",
          isDark ? "opacity-100" : "opacity-0",
        )}
      >
        <span className="absolute left-2 top-1.5 size-1 rounded-full bg-white/85 animate-pulse" />
        <span className="absolute left-4 bottom-2 size-0.5 rounded-full bg-sky-200/90" />
        <span className="absolute left-6 top-2.5 size-1 rounded-full bg-indigo-200/70" />
      </span>

      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-300",
          isDark ? "opacity-0" : "opacity-100",
        )}
      >
        <span className="absolute right-2.5 top-1.5 h-1.5 w-3 rounded-full bg-white/85 blur-[0.3px]" />
        <span className="absolute right-4 bottom-1.5 h-1.5 w-2.5 rounded-full bg-white/75" />
      </span>

      {/* Spring-animated Sliding Thumb with Morphing Sun/Moon */}
      <motion.span
        layout
        initial={false}
        animate={{ x: isDark ? 28 : 0, rotate: isDark ? 0 : 180 }}
        transition={{ type: "spring", stiffness: 520, damping: 32 }}
        className={cn(
          "relative z-10 flex size-6 items-center justify-center rounded-full shadow-md",
          isDark
            ? "bg-slate-900 text-indigo-200 border border-indigo-300/35"
            : "bg-white text-amber-500 border border-amber-300/80 shadow-[0_0_10px_rgba(245,158,11,0.4)]",
        )}
      >
        {isDark ? (
          <Moon className="size-3.5 fill-indigo-200/20" />
        ) : (
          <Sun className="size-3.5 fill-amber-400/25" />
        )}
      </motion.span>
    </button>
  );
};
