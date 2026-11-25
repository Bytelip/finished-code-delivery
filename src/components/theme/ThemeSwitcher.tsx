import React from "react";
import { Check, ChevronDown, Palette } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LocalizedText } from "@/components/i18n/LocalizedText";

interface ThemeSwitcherProps {
  className?: string;
  variant?: "navbar" | "compact" | "full";
}

/**
 * Dual-tone circular swatch indicator showing canvas & accent colors
 */
export function ThemeSwatch({
  primary,
  secondary,
  size = 14,
  className,
}: {
  primary: string;
  secondary: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border border-black/15 dark:border-white/25 shadow-sm",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${secondary} 50%, ${primary} 50%)`,
      }}
      aria-hidden="true"
    />
  );
}

export function ThemeSwitcher({ className, variant = "navbar" }: ThemeSwitcherProps) {
  const { theme, setTheme, currentConfig, availableThemes, mode } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          className={cn(
            variant === "compact"
              ? "h-7 px-2 rounded-full border gap-1.5"
              : "h-7 px-2.5 text-xs font-mono font-semibold tracking-wide rounded-full border transition-all duration-200 flex items-center gap-1.5",
            "cursor-pointer select-none",
            "bg-[var(--bg-surface)] hover:bg-[var(--bg-glass)] text-[var(--text-primary)] border-[var(--border-subtle)] shadow-sm",
            className,
          )}
          title={`Active Theme: ${currentConfig.name} (${mode === "dark" ? "Dark" : "Light"})`}
          aria-label={`Select theme palette (Active: ${currentConfig.name})`}
        >
          <ThemeSwatch
            primary={currentConfig.swatch.primary}
            secondary={currentConfig.swatch.secondary}
            size={13}
          />
          {variant !== "compact" && (
            <span className="hidden md:inline font-sans font-medium text-xs">
              {currentConfig.name}
            </span>
          )}
          <ChevronDown className="size-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-72 p-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl rounded-xl z-[250] text-[var(--text-primary)]"
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Palette className="size-3.5 text-[var(--accent)]" />
            <LocalizedText text="Theme Presets" />
          </span>
          <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-[var(--accent-surface)] text-[var(--accent)]">
            {mode === "dark" ? "DARK" : "LIGHT"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[var(--border-subtle)] my-1" />

        <div className="space-y-1">
          {availableThemes.map((item) => {
            const isSelected = item.id === theme;
            return (
              <DropdownMenuItem
                key={item.id}
                onClick={() => setTheme(item.id)}
                className={cn(
                  "flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-xs",
                  isSelected
                    ? "bg-[var(--accent-surface)] text-[var(--text-primary)] font-semibold border border-[var(--accent)]/45"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 border border-transparent",
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ThemeSwatch
                    primary={item.swatch.primary}
                    secondary={item.swatch.secondary}
                    size={18}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-xs text-[var(--text-primary)] font-semibold">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] truncate">
                      {item.badge}
                    </span>
                  </div>
                </div>

                {isSelected && <Check className="size-4 text-[var(--accent)] shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Full 4-theme card selector for Settings -> Appearance
 */
export function ThemeSettingsCard() {
  const { theme, setTheme, availableThemes, mode } = useTheme();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Palette className="size-3.5 text-[var(--accent)]" />
          <LocalizedText text="Interface Appearance & Theme" />
        </span>
        <span className="text-[11px] font-mono text-[var(--text-muted)]">
          4 Themes · {mode === "dark" ? "Dark" : "Light"} Mode
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {availableThemes.map((item) => {
          const isSelected = item.id === theme;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTheme(item.id)}
              aria-pressed={isSelected}
              className={cn(
                "flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer",
                isSelected
                  ? "bg-[var(--accent-surface)] border-[var(--accent)] ring-1 ring-[var(--accent)]"
                  : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--accent)]/60",
              )}
            >
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ThemeSwatch
                    primary={item.swatch.primary}
                    secondary={item.swatch.secondary}
                    size={18}
                  />
                  <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
                    {item.name}
                  </span>
                </div>
                {isSelected && (
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--primary-foreground)]">
                    <Check className="size-2.5 stroke-[3]" />
                  </span>
                )}
              </div>

              <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                {item.description}
              </p>

              <div className="mt-auto pt-1 flex items-center justify-between w-full text-[11px] font-mono text-[var(--text-muted)]">
                <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] text-[var(--text-primary)]">
                  {item.badge}
                </span>
                <span>{mode === "dark" ? "Dark" : "Light"}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
