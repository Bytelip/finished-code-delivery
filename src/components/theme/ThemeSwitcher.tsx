import React, { useState } from "react";
import {
  Palette,
  Check,
  ChevronDown,
  Sparkles,
  Sliders,
  RotateCcw,
  Save,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import {
  useTheme,
  type ThemeId,
  THEME_CONFIGS,
  AVAILABLE_THEMES,
  DEFAULT_CUSTOM_SETTINGS,
} from "@/context/ThemeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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

const ACCENT_PRESETS = [
  { name: "Cyan", hex: "#00F0FF" },
  { name: "Emerald", hex: "#10B981" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Magenta", hex: "#EC4899" },
  { name: "Violet", hex: "#8B5CF6" },
  { name: "Pure White", hex: "#FFFFFF" },
  { name: "Crimson", hex: "#EF4444" },
];

const BACKGROUND_PRESETS = [
  { name: "Deep Space Void", hex: "#02040A" },
  { name: "Midnight Navy", hex: "#050B18" },
  { name: "Forest Obsidian", hex: "#020805" },
  { name: "Carbon Gray", hex: "#090A0F" },
  { name: "Frosted Daylight", hex: "#F1F5F9" },
];

export function CustomThemeModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { theme, setTheme, customSettings, updateCustomSettings, resetCustomSettings } = useTheme();

  const handleSave = () => {
    setTheme("custom");
    toast.success("Custom Theme Saved & Active", {
      description: "Custom accent color, surface background, blur, and glow physics applied.",
    });
    onOpenChange(false);
  };

  const handleReset = () => {
    resetCustomSettings();
    toast.info("Custom Theme Reset", {
      description: "Restored default custom parameters.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 border-border/80 backdrop-blur-2xl text-foreground shadow-2xl p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold font-mono tracking-wider text-foreground">
            <Sparkles className="size-4 text-primary animate-pulse" />
            <span>CUSTOM USER THEME BUILDER</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Craft your personalized mission control palette with real-time HUD physics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* 1. Primary Accent Color Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-mono text-xs font-semibold text-foreground flex items-center gap-1.5">
                <span>1. Primary Accent Color</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customSettings.accentColor}
                  onChange={(e) => {
                    updateCustomSettings({ accentColor: e.target.value });
                    if (theme !== "custom") setTheme("custom");
                  }}
                  className="size-6 rounded border border-border cursor-pointer bg-transparent"
                />
                <span className="font-mono text-xs font-bold text-foreground">
                  {customSettings.accentColor.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Quick Preset Accent Swatches */}
            <div className="flex flex-wrap gap-1.5">
              {ACCENT_PRESETS.map((p) => (
                <button
                  key={p.hex}
                  type="button"
                  onClick={() => {
                    updateCustomSettings({ accentColor: p.hex });
                    if (theme !== "custom") setTheme("custom");
                  }}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono border transition-all cursor-pointer",
                    customSettings.accentColor.toLowerCase() === p.hex.toLowerCase()
                      ? "border-primary bg-primary/20 text-foreground font-bold"
                      : "border-border/50 bg-muted/40 hover:bg-muted/70 text-muted-foreground",
                  )}
                >
                  <span
                    className="size-2.5 rounded-full border border-white/20"
                    style={{ backgroundColor: p.hex }}
                  />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. HUD Background Surface Color Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-mono text-xs font-semibold text-foreground">
                2. HUD Background Surface
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customSettings.backgroundColor}
                  onChange={(e) => {
                    updateCustomSettings({ backgroundColor: e.target.value });
                    if (theme !== "custom") setTheme("custom");
                  }}
                  className="size-6 rounded border border-border cursor-pointer bg-transparent"
                />
                <span className="font-mono text-xs font-bold text-foreground">
                  {customSettings.backgroundColor.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Quick Background Presets */}
            <div className="flex flex-wrap gap-1.5">
              {BACKGROUND_PRESETS.map((bg) => (
                <button
                  key={bg.hex}
                  type="button"
                  onClick={() => {
                    updateCustomSettings({ backgroundColor: bg.hex });
                    if (theme !== "custom") setTheme("custom");
                  }}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono border transition-all cursor-pointer",
                    customSettings.backgroundColor.toLowerCase() === bg.hex.toLowerCase()
                      ? "border-primary bg-primary/20 text-foreground font-bold"
                      : "border-border/50 bg-muted/40 hover:bg-muted/70 text-muted-foreground",
                  )}
                >
                  <span
                    className="size-2.5 rounded-full border border-white/20"
                    style={{ backgroundColor: bg.hex }}
                  />
                  <span>{bg.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Glass Blur & Border Glow Intensity Sliders */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-muted-foreground">Glass Blur</span>
                <span className="font-bold text-foreground">{customSettings.blurPx}px</span>
              </div>
              <input
                type="range"
                min="4"
                max="32"
                step="2"
                value={customSettings.blurPx}
                onChange={(e) => {
                  updateCustomSettings({ blurPx: Number(e.target.value) });
                  if (theme !== "custom") setTheme("custom");
                }}
                className="w-full accent-primary cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-muted-foreground">Border Glow</span>
                <span className="font-bold text-foreground">{customSettings.glowPercent}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={customSettings.glowPercent}
                onChange={(e) => {
                  updateCustomSettings({ glowPercent: Number(e.target.value) });
                  if (theme !== "custom") setTheme("custom");
                }}
                className="w-full accent-primary cursor-pointer"
              />
            </div>
          </div>

          {/* Live Preview Card */}
          <div
            className="p-3 rounded-xl border transition-all duration-300"
            style={{
              backgroundColor: customSettings.backgroundColor + "e6",
              borderColor: customSettings.accentColor + "40",
              boxShadow: `0 0 20px ${customSettings.accentColor}${Math.round(
                (customSettings.glowPercent / 100) * 120,
              )
                .toString(16)
                .padStart(2, "0")}`,
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
                <Eye className="size-3.5 text-primary" />
                <span>Live HUD Card Preview</span>
              </div>
              <span
                className="text-[9.5px] px-1.5 py-0.5 rounded font-mono font-bold"
                style={{
                  backgroundColor: customSettings.accentColor + "20",
                  color: customSettings.accentColor,
                  border: `1px solid ${customSettings.accentColor}50`,
                }}
              >
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Dynamic surface contrast, border glow aura, and interactive accents.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-8 text-xs font-mono gap-1.5 cursor-pointer"
            >
              <RotateCcw className="size-3" />
              <span>Reset to Preset</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="h-8 text-xs font-mono font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-md"
            >
              <Save className="size-3" />
              <span>Save Custom Theme</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ThemeSwitcher({ className, variant = "navbar" }: ThemeSwitcherProps) {
  const { theme, setTheme, currentConfig, availableThemes } = useTheme();
  const [customModalOpen, setCustomModalOpen] = useState(false);

  return (
    <>
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
          className="w-68 p-1.5 bg-card/95 backdrop-blur-2xl border border-border/80 shadow-2xl rounded-xl z-50 text-foreground"
        >
          <DropdownMenuLabel className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center justify-between">
            <span>Appearance & Themes</span>
            <span className="flex items-center gap-1 text-[9px] text-primary lowercase">
              <Sparkles className="size-2.5" /> 5 modes + custom
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
                    <span className="truncate text-xs text-foreground font-medium">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate font-mono">
                      {item.badge}
                    </span>
                  </div>
                </div>

                {isSelected && <Check className="size-3.5 text-primary flex-shrink-0" />}
              </DropdownMenuItem>
            );
          })}

          {/* Custom User Theme Builder Option */}
          <DropdownMenuSeparator className="bg-border/40 my-1" />
          <DropdownMenuItem
            onClick={() => {
              setTheme("custom");
              setCustomModalOpen(true);
            }}
            className={cn(
              "flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors duration-200 text-xs",
              theme === "custom"
                ? "bg-primary/20 text-foreground font-semibold border border-primary/50"
                : "text-primary/90 hover:text-foreground hover:bg-primary/10 border border-transparent",
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles className="size-4 text-primary animate-pulse flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="truncate text-xs font-semibold text-foreground">
                  ✨ Custom User Theme
                </span>
                <span className="text-[10px] text-muted-foreground truncate font-mono">
                  Create & Tune Your Own
                </span>
              </div>
            </div>
            <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/40 font-mono font-bold">
              Builder
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CustomThemeModal open={customModalOpen} onOpenChange={setCustomModalOpen} />
    </>
  );
}

/**
 * Full visual card selector for Modal / Settings pages
 */
export function ThemeSettingsCard() {
  const { theme, setTheme, availableThemes } = useTheme();
  const [customModalOpen, setCustomModalOpen] = useState(false);

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground flex items-center gap-2">
            <Palette className="size-3.5 text-primary" />
            <span>Interface Appearance & Theme</span>
          </label>
          <span className="text-[10px] font-mono text-muted-foreground">
            5 Presets + Custom Builder
          </span>
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

          {/* Custom User Theme Card Option in Grid */}
          <button
            type="button"
            onClick={() => {
              setTheme("custom");
              setCustomModalOpen(true);
            }}
            className={cn(
              "flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all duration-300 relative cursor-pointer",
              theme === "custom"
                ? "bg-primary/15 border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)] ring-1 ring-primary"
                : "bg-card/60 border-border/60 hover:border-primary/50 hover:bg-card/90",
            )}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary animate-pulse" />
                <span className="text-xs font-semibold text-foreground">Custom User Theme</span>
              </div>
              <span className="size-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                ✨
              </span>
            </div>

            <p className="text-[10.5px] text-muted-foreground line-clamp-2 leading-relaxed">
              Live accent color picker, deep surface tones, glass blur, and border glow sliders.
            </p>

            <div className="mt-auto pt-1 flex items-center justify-between w-full text-[9.5px] font-mono text-muted-foreground">
              <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/40">
                User Custom
              </span>
              <span className="text-primary font-bold">Launch Builder &rarr;</span>
            </div>
          </button>
        </div>
      </div>

      <CustomThemeModal open={customModalOpen} onOpenChange={setCustomModalOpen} />
    </>
  );
}
