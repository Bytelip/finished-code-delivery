import React from "react";
import { Palette, Check, ChevronDown, Sparkles } from "lucide-react";
import { useTheme, type ThemeId, THEME_CONFIGS, AVAILABLE_THEMES } from "@/context/ThemeContext";
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

interface ThemeSwitcherProps {
  className?: string;
  variant?: "navbar" | "compact" | "full";
}

/**
 * Visual two-tone circular swatch indicator
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
        "relative rounded-full border border-white/20 shadow-sm overflow-hidden flex-shrink-0",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${primary} 50%, ${secondary} 50%)`,
      }}
      aria-hidden="true"
    />
  );
}

export function ThemeSwitcher({ className, variant = "navbar" }: ThemeSwitcherProps) {
  const { theme, setTheme, currentConfig, availableThemes } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          className={cn(
            "h-7 px-2.5 text-[11px] font-mono font-bold tracking-wider rounded-full border transition-all duration-300 flex items-center gap-1.5 cursor-pointer select-none",
            "bg-card/80 hover:bg-card text-foreground border-border/80 shadow-[0_0_12px_rgba(0,0,0,0.3)] hover:border-primary/60",
            className,
          )}
          title={`Active Theme: ${currentConfig.name} (${currentConfig.badge})`}
        >
          <Palette className="size-3 text-primary animate-pulse" />
          <ThemeSwatch
            primary={currentConfig.swatch.primary}
            secondary={currentConfig.swatch.secondary}
            size={12}
          />
          <span className="hidden md:inline font-sans font-medium text-xs">
            {currentConfig.name.split(" ")[0]}
          </span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-primary/15 text-primary border border-primary/30 hidden xl:inline">
            {currentConfig.badge}
          </span>
          <ChevronDown className="size-2.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-64 p-1.5 bg-card/95 backdrop-blur-2xl border border-border/80 shadow-2xl rounded-xl z-50 text-foreground"
      >
        <DropdownMenuLabel className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center justify-between">
          <span>Appearance & Themes</span>
          <span className="flex items-center gap-1 text-[9px] text-primary lowercase">
            <Sparkles className="size-2.5" /> 5 modes
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/40 my-1" />

        {availableThemes.map((item) => {
          const isSelected = item.id === theme;
          return (
            <DropdownMenuItem
              key={item.id}
              onClick={() => setTheme(item.id)}
              className={cn(
                "flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors duration-200 text-xs",
                isSelected
                  ? "bg-primary/15 text-foreground font-semibold border border-primary/40 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/40 border border-transparent",
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ThemeSwatch
                  primary={item.swatch.primary}
                  secondary={item.swatch.secondary}
                  size={16}
                />
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-xs text-foreground font-medium">{item.name}</span>
                  <span className="text-[10px] text-muted-foreground truncate font-mono">
                    {item.badge}
                  </span>
                </div>
              </div>

              {isSelected && <Check className="size-3.5 text-primary flex-shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Full visual card selector for Modal / Settings pages
 */
export function ThemeSettingsCard() {
  const { theme, setTheme, availableThemes } = useTheme();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground flex items-center gap-2">
          <Palette className="size-3.5 text-primary" />
          <span>Interface Appearance & Theme</span>
        </label>
        <span className="text-[10px] font-mono text-muted-foreground">5 High-End Palettes</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {availableThemes.map((item) => {
          const isSelected = item.id === theme;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTheme(item.id)}
              className={cn(
                "flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all duration-300 relative cursor-pointer",
                isSelected
                  ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(var(--primary),0.25)] ring-1 ring-primary"
                  : "bg-card/60 border-border/60 hover:border-border hover:bg-card/90",
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <ThemeSwatch
                    primary={item.swatch.primary}
                    secondary={item.swatch.secondary}
                    size={16}
                  />
                  <span className="text-xs font-semibold text-foreground">{item.name}</span>
                </div>
                {isSelected && (
                  <span className="size-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="size-2.5 stroke-[3]" />
                  </span>
                )}
              </div>

              <p className="text-[10.5px] text-muted-foreground line-clamp-2 leading-relaxed">
                {item.description}
              </p>

              <div className="mt-auto pt-1 flex items-center justify-between w-full text-[9.5px] font-mono text-muted-foreground">
                <span className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground/80 border border-border/40">
                  {item.badge}
                </span>
                <span className="opacity-75">{item.isDark ? "Dark" : "Light"}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
