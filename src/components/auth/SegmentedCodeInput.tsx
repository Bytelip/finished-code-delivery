import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface SegmentedCodeInputProps {
  id: string;
  value: string;
  onChange: (nextCode: string) => void;
  ariaLabel: string;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Responsive 6-digit OTP / TOTP input that renders six flexible boxes
 * (flex-1 min-w-0 max-w-[44px] h-11 sm:h-12) over a single accessible
 * numeric input for paste, autofill, mobile keypad, and screen readers.
 */
export const SegmentedCodeInput: React.FC<SegmentedCodeInputProps> = ({
  id,
  value,
  onChange,
  ariaLabel,
  autoFocus = true,
  className,
}) => {
  const [focused, setFocused] = useState(false);
  const digits = value.replace(/\D/g, "").slice(0, 6);
  const activeSlot = Math.min(digits.length, 5);

  return (
    <div className={cn("relative mx-auto w-full max-w-[304px]", className)}>
      <div aria-hidden="true" className="flex w-full items-center justify-center gap-1.5 sm:gap-2">
        {Array.from({ length: 6 }, (_, index) => {
          const char = digits[index] ?? "";
          const isCurrent = focused && index === activeSlot;
          return (
            <div
              key={index}
              className={cn(
                "flex h-11 sm:h-12 flex-1 min-w-0 max-w-[44px] items-center justify-center rounded-xl border bg-[var(--bg-surface)] font-mono text-lg sm:text-xl font-bold tabular-nums transition-all select-none",
                char
                  ? "border-[var(--accent)] text-[var(--accent)] shadow-[0_0_12px_var(--accent-glow)]"
                  : "border-[var(--border-subtle)] text-[var(--text-muted)]",
                isCurrent && "border-[var(--accent)] ring-2 ring-[var(--accent-glow)]",
              )}
            >
              {char || "•"}
            </div>
          );
        })}
      </div>

      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        value={digits}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onPaste={(e) => {
          const pasted = e.clipboardData.getData("text").trim().replace(/\D/g, "").slice(0, 6);
          if (pasted.length > 0) {
            e.preventDefault();
            onChange(pasted);
          }
        }}
        aria-label={ariaLabel}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
    </div>
  );
};
