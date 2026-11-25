import React, { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Palette,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/context/ThemeContext";
import { AnimatedThemeSwitch } from "@/components/theme/AnimatedThemeSwitch";
import {
  CORNER_RADIUS_SCALE,
  PRESET_MODE_PALETTES,
  type CornerRoundness,
  normalizeHex,
} from "@/lib/themeUtils";
import { cn } from "@/lib/utils";
import { LocalizedText } from "@/components/i18n/LocalizedText";

const ACCENT_SWATCHES = [
  { label: "Orbital Emerald", hex: "#10B981" },
  { label: "Cyan Telemetry", hex: "#06B6D4" },
  { label: "Solar Amber", hex: "#F59E0B" },
  { label: "Nebula Violet", hex: "#8B5CF6" },
  { label: "Crimson Alert", hex: "#F43F5E" },
  { label: "Lime Chlorophyll", hex: "#84CC16" },
];

const CANVAS_SWATCHES_DARK = [
  { label: "Deep Space", hex: "#090D12" },
  { label: "Charcoal Slate", hex: "#11161D" },
  { label: "Warm Obsidian", hex: "#141210" },
  { label: "Midnight Indigo", hex: "#0B1021" },
];

const CANVAS_SWATCHES_LIGHT = [
  { label: "Crisp Mist", hex: "#F6F8FA" },
  { label: "Warm Alabaster", hex: "#FBF8F3" },
  { label: "Ice Paper", hex: "#F8FAFC" },
  { label: "Soft Lavender", hex: "#F5F3FF" },
];

const SURFACE_SWATCHES_DARK = [
  { label: "HUD Glass Slate", hex: "#101720" },
  { label: "Carbon Panel", hex: "#171C24" },
  { label: "Roasted Earth", hex: "#1C1814" },
  { label: "Deep Cosmos", hex: "#131936" },
];

const SURFACE_SWATCHES_LIGHT = [
  { label: "Pure White", hex: "#FFFFFF" },
  { label: "Cool Ceramic", hex: "#F1F5F9" },
  { label: "Linen Ivory", hex: "#FEFDF9" },
  { label: "Cloud Tint", hex: "#EEF2FF" },
];

const TEXT_SWATCHES = [
  { label: "Auto Ink", hex: null },
  { label: "Crisp White", hex: "#F8FAFC" },
  { label: "Pure Obsidian", hex: "#0F172A" },
  { label: "Mint Phosphor", hex: "#D1FAE5" },
];

interface ColorChannelControlProps {
  label: string;
  description: string;
  value: string | null;
  fallbackHex: string;
  swatches: Array<{ label: string; hex: string }>;
  onChange: (hex: string | null) => void;
}

function ColorChannelControl({
  label,
  description,
  value,
  fallbackHex,
  swatches,
  onChange,
}: ColorChannelControlProps) {
  const effectiveHex = value ?? fallbackHex;
  const [hexDraft, setHexDraft] = useState(effectiveHex);

  useEffect(() => {
    setHexDraft(value ?? fallbackHex);
  }, [value, fallbackHex]);

  const commitHexInput = (raw: string) => {
    setHexDraft(raw);
    const normalized = normalizeHex(raw);
    if (normalized) {
      onChange(normalized);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-black/5 dark:bg-white/[0.03] p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-[var(--text-primary)]">{label}</div>
          <div className="text-[11px] text-[var(--text-muted)]">{description}</div>
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 rounded-md border border-[var(--border-subtle)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors cursor-pointer"
          >
            Auto
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 cursor-pointer">
          <input
            type="color"
            aria-label={`${label} color picker`}
            value={effectiveHex}
            onChange={(e) => {
              const norm = normalizeHex(e.target.value);
              if (norm) onChange(norm);
            }}
            className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
          />
          <input
            type="text"
            aria-label={`${label} hex value`}
            value={hexDraft}
            onChange={(e) => commitHexInput(e.target.value)}
            maxLength={7}
            spellCheck={false}
            className="w-20 bg-transparent font-mono text-xs font-semibold text-[var(--text-primary)] focus:outline-none uppercase"
          />
        </label>

        <div className="flex flex-wrap items-center gap-1.5">
          {swatches.map((sw) => {
            const active = effectiveHex.toUpperCase() === sw.hex.toUpperCase() && value !== null;
            return (
              <button
                key={sw.label}
                type="button"
                title={`${sw.label} (${sw.hex})`}
                aria-label={`${label}: ${sw.label}`}
                onClick={() => onChange(sw.hex)}
                className={cn(
                  "size-6 rounded-full border transition-transform hover:scale-110 cursor-pointer flex items-center justify-center",
                  active
                    ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--bg-surface)] border-white"
                    : "border-black/20 dark:border-white/25",
                )}
                style={{ backgroundColor: sw.hex }}
              >
                {active && <Check className="size-3 text-white drop-shadow" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ThemeStudioModal() {
  const {
    theme,
    mode,
    availableThemes,
    setTheme,
    customConfig,
    hasCustomOverrides,
    savedCustomThemes,
    activeCustomThemeId,
    contrastMetrics,
    updateCustomConfig,
    resetCustomConfig,
    saveCustomTheme,
    applySavedCustomTheme,
    deleteSavedCustomTheme,
    exportThemeJson,
    importThemeJson,
    isStudioOpen,
    setIsStudioOpen,
  } = useTheme();

  const [saveName, setSaveName] = useState("");
  const [showJsonPanel, setShowJsonPanel] = useState(false);
  const [importDraft, setImportDraft] = useState("");

  useEffect(() => {
    if (!isStudioOpen) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsStudioOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isStudioOpen, setIsStudioOpen]);

  if (!isStudioOpen) return null;

  const presetTokens = PRESET_MODE_PALETTES[theme][mode];
  const effectiveAccent = customConfig.accent ?? presetTokens.accent;
  const effectiveCanvas = customConfig.canvas ?? presetTokens.canvas;
  const effectiveSurface = customConfig.surface ?? presetTokens.surface;

  const handleSaveTheme = () => {
    const trimmed = saveName.trim();
    if (!trimmed) {
      toast.info("Enter a custom theme name before saving.");
      return;
    }
    const saved = saveCustomTheme(trimmed);
    setSaveName("");
    toast.success(`Saved custom theme "${saved.name}"`);
  };

  const handleCopyJson = async () => {
    const json = exportThemeJson(saveName.trim() || undefined);
    setImportDraft(json);
    setShowJsonPanel(true);
    try {
      await navigator.clipboard.writeText(json);
      toast.success("Theme JSON copied to clipboard");
    } catch {
      toast.info("Theme JSON generated below — copy manually.");
    }
  };

  const handleImportJson = () => {
    const res = importThemeJson(importDraft);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Imported theme "${res.name}"`);
    setShowJsonPanel(false);
  };

  const buttonWcagGrade =
    contrastMetrics.accentOnPrimaryFg >= 7
      ? "AAA"
      : contrastMetrics.accentOnPrimaryFg >= 4.5
        ? "AA"
        : "Guard Active";
  const textWcagGrade =
    contrastMetrics.textOnSurface >= 7
      ? "AAA"
      : contrastMetrics.textOnSurface >= 4.5
        ? "AA"
        : "Low";

  return (
    <div
      className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Customizable Theme Studio"
      onClick={() => setIsStudioOpen(false)}
    >
      <div
        className="relative flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-hud)] backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="h-1 w-full shrink-0"
          style={{
            background: `linear-gradient(90deg, ${effectiveAccent}, var(--status-ok), var(--status-warn))`,
          }}
        />

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--border-subtle)]"
              style={{
                backgroundColor: "var(--accent-surface)",
                color: "var(--accent)",
              }}
            >
              <Palette className="size-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                  <LocalizedText text="Theme Studio" />
                </h2>
                {hasCustomOverrides && (
                  <span
                    className="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold"
                    style={{
                      backgroundColor: "var(--accent)",
                      color: contrastMetrics.primaryFgHex,
                    }}
                  >
                    CUSTOMIZED
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] truncate">
                <LocalizedText text="Live HUD colors, glass opacity, blur intensity & WCAG auto-contrast." />
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AnimatedThemeSwitch />
            <button
              type="button"
              onClick={() => setIsStudioOpen(false)}
              aria-label="Close Theme Studio"
              className="grid size-8 place-items-center rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Base Preset Row */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Base Theme Preset ({mode === "dark" ? "Dark" : "Light"})
              </span>
              <span className="font-mono text-[11px] text-[var(--accent)]">
                Zero-flash boot enabled
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {availableThemes.map((preset) => {
                const selected = preset.id === theme && !activeCustomThemeId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setTheme(preset.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs transition-all cursor-pointer",
                      selected
                        ? "border-[var(--accent)] bg-[var(--accent-surface)] font-semibold text-[var(--text-primary)]"
                        : "border-[var(--border-subtle)] bg-black/5 dark:bg-white/[0.03] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    <span
                      className="size-3.5 shrink-0 rounded-full border border-white/30"
                      style={{
                        background: `linear-gradient(135deg, ${preset.swatch.secondary} 50%, ${preset.swatch.primary} 50%)`,
                      }}
                    />
                    <span className="truncate">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview & WCAG Contrast Safety Guard */}
          <div
            className="rounded-xl border border-[var(--border-subtle)] p-4 space-y-3"
            style={{
              backgroundColor: effectiveCanvas,
              borderRadius: CORNER_RADIUS_SCALE[customConfig.cornerRadius].lg,
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className="font-mono text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: contrastMetrics.textHex }}
              >
                <ShieldCheck className="size-3.5" style={{ color: effectiveAccent }} />
                Live HUD Preview & WCAG Auto-Contrast Guard
              </span>
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                <span
                  className="rounded-md border border-[var(--border-subtle)] px-2 py-0.5"
                  style={{
                    backgroundColor: effectiveSurface,
                    color: contrastMetrics.textHex,
                  }}
                >
                  Text {contrastMetrics.textOnSurface}:1 ({textWcagGrade})
                  {contrastMetrics.autoAdjustedText ? " · Auto-Adjusted" : ""}
                </span>
                <span
                  className="rounded-md px-2 py-0.5 font-bold"
                  style={{
                    backgroundColor: effectiveAccent,
                    color: contrastMetrics.primaryFgHex,
                  }}
                >
                  Action {contrastMetrics.accentOnPrimaryFg}:1 ({buttonWcagGrade})
                </span>
              </div>
            </div>

            <div
              className="flex flex-wrap items-center justify-between gap-3 border border-[var(--border-subtle)] p-3"
              style={{
                backgroundColor: "var(--bg-glass)",
                backdropFilter: `blur(${customConfig.blurPx}px)`,
                borderRadius: CORNER_RADIUS_SCALE[customConfig.cornerRadius].md,
              }}
            >
              <div className="min-w-0">
                <div
                  className="font-mono text-xs font-bold"
                  style={{ color: contrastMetrics.textHex }}
                >
                  NDVI VEGETATION · SENTINEL-2 LIVE
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Opacity {Math.round(customConfig.glassOpacity * 100)}% · Blur{" "}
                  {customConfig.blurPx}px · Corners {customConfig.cornerRadius}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold"
                  style={{
                    backgroundColor: "var(--accent-surface)",
                    color: "var(--accent)",
                  }}
                >
                  Target Lock
                </span>
                <button
                  type="button"
                  onClick={() => updateCustomConfig({})}
                  className="px-3 py-1.5 font-mono text-xs font-bold shadow-sm transition-transform active:scale-95"
                  style={{
                    backgroundColor: effectiveAccent,
                    color: contrastMetrics.primaryFgHex,
                    borderRadius: CORNER_RADIUS_SCALE[customConfig.cornerRadius].sm,
                  }}
                >
                  Primary CTA
                </button>
              </div>
            </div>
          </div>

          {/* Color Pickers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ColorChannelControl
              label="Accent Color"
              description="Active indicators, buttons, focus rings & telemetry highlights."
              value={customConfig.accent}
              fallbackHex={presetTokens.accent}
              swatches={ACCENT_SWATCHES}
              onChange={(hex) => updateCustomConfig({ accent: hex })}
            />
            <ColorChannelControl
              label="Canvas / Background Tint"
              description="Page workspace backdrop under HUD telemetry cards."
              value={customConfig.canvas}
              fallbackHex={presetTokens.canvas}
              swatches={mode === "dark" ? CANVAS_SWATCHES_DARK : CANVAS_SWATCHES_LIGHT}
              onChange={(hex) => updateCustomConfig({ canvas: hex })}
            />
            <ColorChannelControl
              label="Card / HUD Surface"
              description="Card background, dialogs, and CommandBar glass tint."
              value={customConfig.surface}
              fallbackHex={presetTokens.surface}
              swatches={mode === "dark" ? SURFACE_SWATCHES_DARK : SURFACE_SWATCHES_LIGHT}
              onChange={(hex) => updateCustomConfig({ surface: hex })}
            />
            <div className="rounded-xl border border-[var(--border-subtle)] bg-black/5 dark:bg-white/[0.03] p-3 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    Text Contrast Override
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    WCAG safety guard prevents low-contrast text ink.
                  </div>
                </div>
                {customConfig.textOverride && (
                  <button
                    type="button"
                    onClick={() => updateCustomConfig({ textOverride: null })}
                    className="rounded-md border border-[var(--border-subtle)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    Auto
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 cursor-pointer">
                  <input
                    type="color"
                    aria-label="Text contrast override color picker"
                    value={customConfig.textOverride ?? presetTokens.textPrimary}
                    onChange={(e) => {
                      const norm = normalizeHex(e.target.value);
                      if (norm) updateCustomConfig({ textOverride: norm });
                    }}
                    className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                    {customConfig.textOverride ?? "AUTO"}
                  </span>
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {TEXT_SWATCHES.map((sw) => {
                    const active = customConfig.textOverride === sw.hex;
                    return (
                      <button
                        key={sw.label}
                        type="button"
                        onClick={() => updateCustomConfig({ textOverride: sw.hex })}
                        className={cn(
                          "rounded-lg border px-2 py-1 font-mono text-[11px] transition-colors cursor-pointer",
                          active
                            ? "border-[var(--accent)] bg-[var(--accent-surface)] text-[var(--text-primary)] font-semibold"
                            : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                        )}
                      >
                        {sw.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* HUD Glass & Geometry Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-xl border border-[var(--border-subtle)] bg-black/5 dark:bg-white/[0.03] p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)]">HUD Glass Opacity</span>
                <span className="font-mono font-bold text-[var(--accent)]">
                  {Math.round(customConfig.glassOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                aria-label="HUD Glass Opacity"
                min={35}
                max={96}
                step={1}
                value={Math.round(customConfig.glassOpacity * 100)}
                onChange={(e) => updateCustomConfig({ glassOpacity: Number(e.target.value) / 100 })}
                className="w-full accent-[var(--accent)] cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)]">Backdrop Blur</span>
                <span className="font-mono font-bold text-[var(--accent)]">
                  {customConfig.blurPx}px
                </span>
              </div>
              <input
                type="range"
                aria-label="Backdrop Blur Intensity"
                min={0}
                max={32}
                step={1}
                value={customConfig.blurPx}
                onChange={(e) => updateCustomConfig({ blurPx: Number(e.target.value) })}
                className="w-full accent-[var(--accent)] cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-semibold text-[var(--text-primary)]">
                Corner Roundness
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(["sharp", "balanced", "rounded"] as CornerRoundness[]).map((radiusMode) => {
                  const active = customConfig.cornerRadius === radiusMode;
                  return (
                    <button
                      key={radiusMode}
                      type="button"
                      aria-pressed={active}
                      onClick={() => updateCustomConfig({ cornerRadius: radiusMode })}
                      className={cn(
                        "rounded-lg border px-2 py-1.5 font-mono text-[11px] capitalize transition-all cursor-pointer",
                        active
                          ? "border-[var(--accent)] font-bold"
                          : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                      )}
                      style={
                        active
                          ? {
                              backgroundColor: "var(--accent)",
                              color: contrastMetrics.primaryFgHex,
                            }
                          : undefined
                      }
                    >
                      {radiusMode}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Save, Switch & Manage Custom Themes */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-black/5 dark:bg-white/[0.03] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-[var(--accent)]" />
                Save & Switch Custom Themes
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopyJson()}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1 font-mono text-[11px] text-[var(--text-primary)] hover:border-[var(--accent)] cursor-pointer"
                >
                  <Copy className="size-3" /> Export JSON
                </button>
                <button
                  type="button"
                  onClick={() => setShowJsonPanel((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1 font-mono text-[11px] text-[var(--text-primary)] hover:border-[var(--accent)] cursor-pointer"
                >
                  <Upload className="size-3" /> Import JSON
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveTheme();
                  }
                }}
                placeholder="Name your theme (e.g., Monsoon Emerald HUD)"
                aria-label="Custom theme name"
                className="min-w-0 flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveTheme}
                className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-mono text-xs font-bold transition-all hover:brightness-110 cursor-pointer"
                style={{
                  backgroundColor: "var(--accent)",
                  color: contrastMetrics.primaryFgHex,
                }}
              >
                <Save className="size-3.5" />
                Save as Custom Theme
              </button>
            </div>

            {savedCustomThemes.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {savedCustomThemes.map((saved) => {
                  const active = saved.id === activeCustomThemeId;
                  const swatchAccent =
                    saved.config.accent ?? PRESET_MODE_PALETTES[saved.baseTheme][mode].accent;
                  const swatchCanvas =
                    saved.config.canvas ?? PRESET_MODE_PALETTES[saved.baseTheme][mode].canvas;
                  return (
                    <div
                      key={saved.id}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-xl border px-3 py-2",
                        active
                          ? "border-[var(--accent)] bg-[var(--accent-surface)]"
                          : "border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => applySavedCustomTheme(saved.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer"
                      >
                        <span
                          className="size-4 shrink-0 rounded-full border border-white/30"
                          style={{
                            background: `linear-gradient(135deg, ${swatchCanvas} 50%, ${swatchAccent} 50%)`,
                          }}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-[var(--text-primary)]">
                            {saved.name}
                          </div>
                          <div className="font-mono text-[10px] text-[var(--text-muted)]">
                            {saved.baseTheme} · {saved.config.cornerRadius}
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete custom theme ${saved.name}`}
                        onClick={() => {
                          deleteSavedCustomTheme(saved.id);
                          toast.info(`Deleted "${saved.name}"`);
                        }}
                        className="grid size-7 shrink-0 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-rose-500/15 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {showJsonPanel && (
              <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                  <span>Paste exported theme JSON or download current snippet</span>
                  <button
                    type="button"
                    onClick={() => setImportDraft(exportThemeJson(saveName.trim() || undefined))}
                    className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    <Download className="size-3" /> Load Current
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={importDraft}
                  onChange={(e) => setImportDraft(e.target.value)}
                  placeholder='{"schema":"agrospace-theme/v1","name":"My Theme","baseTheme":"orbital-emerald","config":{"accent":"#10B981"}}'
                  aria-label="Theme JSON input"
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 font-mono text-[11px] text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowJsonPanel(false)}
                    className="rounded-lg border border-[var(--border-subtle)] px-3 py-1 font-mono text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleImportJson}
                    className="rounded-lg px-3 py-1 font-mono text-xs font-bold cursor-pointer"
                    style={{
                      backgroundColor: "var(--accent)",
                      color: contrastMetrics.primaryFgHex,
                    }}
                  >
                    Apply Imported JSON
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] px-5 py-3 bg-black/5 dark:bg-black/25">
          <button
            type="button"
            onClick={() => {
              resetCustomConfig();
              toast.info("Theme reset to preset default");
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-3.5 py-2 font-mono text-xs font-semibold text-[var(--text-primary)] hover:border-rose-400/50 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <RotateCcw className="size-3.5" />
            Reset to Default
          </button>

          <button
            type="button"
            onClick={() => setIsStudioOpen(false)}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 font-mono text-xs font-bold shadow-sm transition-all hover:brightness-110 cursor-pointer"
            style={{
              backgroundColor: "var(--accent)",
              color: contrastMetrics.primaryFgHex,
            }}
          >
            <Check className="size-3.5" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
