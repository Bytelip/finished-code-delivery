/**
 * AgroSpace Nexus — Customizable Theme Utilities & WCAG Auto-Contrast Safety Engine.
 * SSR-safe pure helpers for hex validation, luminance, WCAG contrast ratios,
 * derived CSS variables, persistent custom drafts/presets, and JSON import/export.
 */

export type ThemeId = "orbital-emerald" | "solar-harvest" | "midnight-nebula" | "arctic-telemetry";

export type ThemeMode = "dark" | "light";

export type CornerRoundness = "sharp" | "balanced" | "rounded";

export interface CustomThemeConfig {
  accent: string | null;
  canvas: string | null;
  surface: string | null;
  textOverride: string | null;
  glassOpacity: number;
  blurPx: number;
  cornerRadius: CornerRoundness;
}

export interface SavedCustomTheme {
  id: string;
  name: string;
  baseTheme: ThemeId;
  config: CustomThemeConfig;
  updatedAt: string;
}

export interface ThemeContrastMetrics {
  accentOnPrimaryFg: number;
  primaryFgHex: string;
  textOnSurface: number;
  textHex: string;
  accentOnSurface: number;
  autoAdjustedText: boolean;
}

export interface ThemeCssOutput {
  vars: Record<string, string>;
  contrast: ThemeContrastMetrics;
  effectiveAccent: string;
  effectiveCanvas: string;
  effectiveSurface: string;
}

export const DEFAULT_CUSTOM_THEME_CONFIG: CustomThemeConfig = {
  accent: null,
  canvas: null,
  surface: null,
  textOverride: null,
  glassOpacity: 0.82,
  blurPx: 16,
  cornerRadius: "balanced",
};

export const CUSTOM_DRAFT_STORAGE_KEY = "agrospace-custom-theme-draft";
export const CUSTOM_SAVED_THEMES_STORAGE_KEY = "agrospace-saved-custom-themes";
export const CUSTOM_ACTIVE_ID_STORAGE_KEY = "agrospace-active-custom-theme";

export interface PresetPaletteTokens {
  canvas: string;
  surface: string;
  accent: string;
  textPrimary: string;
  textMuted: string;
  primaryForeground: string;
}

export const PRESET_MODE_PALETTES: Record<ThemeId, Record<ThemeMode, PresetPaletteTokens>> = {
  "orbital-emerald": {
    dark: {
      canvas: "#090D12",
      surface: "#101720",
      accent: "#10B981",
      textPrimary: "#F1F5F9",
      textMuted: "#94A3B8",
      primaryForeground: "#03150E",
    },
    light: {
      canvas: "#F6F8FA",
      surface: "#FFFFFF",
      accent: "#059669",
      textPrimary: "#0F172A",
      textMuted: "#475569",
      primaryForeground: "#FFFFFF",
    },
  },
  "solar-harvest": {
    dark: {
      canvas: "#141210",
      surface: "#1E1A16",
      accent: "#F59E0B",
      textPrimary: "#FAF7F2",
      textMuted: "#B8AFA4",
      primaryForeground: "#1A1002",
    },
    light: {
      canvas: "#FBF8F3",
      surface: "#FFFFFF",
      accent: "#B45309",
      textPrimary: "#1C1917",
      textMuted: "#57534E",
      primaryForeground: "#FFFFFF",
    },
  },
  "midnight-nebula": {
    dark: {
      canvas: "#0B1021",
      surface: "#131A33",
      accent: "#8B5CF6",
      textPrimary: "#F3F4F6",
      textMuted: "#9CA3AF",
      primaryForeground: "#FFFFFF",
    },
    light: {
      canvas: "#F7F7FC",
      surface: "#FFFFFF",
      accent: "#4F46E5",
      textPrimary: "#1E1B4B",
      textMuted: "#4B5563",
      primaryForeground: "#FFFFFF",
    },
  },
  "arctic-telemetry": {
    dark: {
      canvas: "#0E1318",
      surface: "#151D26",
      accent: "#38BDF8",
      textPrimary: "#F0F6FC",
      textMuted: "#94A3B8",
      primaryForeground: "#04161D",
    },
    light: {
      canvas: "#F8FAFC",
      surface: "#FFFFFF",
      accent: "#0284C7",
      textPrimary: "#0F172A",
      textMuted: "#475569",
      primaryForeground: "#FFFFFF",
    },
  },
};

export const CORNER_RADIUS_SCALE: Record<
  CornerRoundness,
  { base: string; sm: string; md: string; lg: string; xl: string; xxl: string }
> = {
  sharp: {
    base: "0.25rem",
    sm: "0.15rem",
    md: "0.25rem",
    lg: "0.35rem",
    xl: "0.5rem",
    xxl: "0.625rem",
  },
  balanced: {
    base: "0.5rem",
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    xxl: "1.25rem",
  },
  rounded: {
    base: "0.875rem",
    sm: "0.625rem",
    md: "0.875rem",
    lg: "1.25rem",
    xl: "1.75rem",
    xxl: "2rem",
  },
};

export const CUSTOM_THEME_CSS_VAR_KEYS = [
  "--accent",
  "--primary",
  "--ring",
  "--cyan",
  "--accent-primary",
  "--accent-glow",
  "--accent-surface",
  "--primary-foreground",
  "--bg-canvas",
  "--background",
  "--bg-primary",
  "--bg-surface",
  "--popover",
  "--bg-glass",
  "--card",
  "--bg-card",
  "--sidebar",
  "--border-subtle",
  "--border",
  "--input",
  "--text-primary",
  "--foreground",
  "--card-foreground",
  "--popover-foreground",
  "--text-muted",
  "--muted-foreground",
  "--hud-blur",
  "--radius",
  "--ui-radius-sm",
  "--ui-radius-md",
  "--ui-radius-lg",
  "--ui-radius-xl",
  "--ui-radius-2xl",
] as const;

export function normalizeHex(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const cleaned = raw.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const [r, g, b] = cleaned.split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toUpperCase()}`;
  }
  return null;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const norm = normalizeHex(hex);
  if (!norm) return null;
  const val = Number.parseInt(norm.slice(1), 16);
  return {
    r: (val >> 16) & 255,
    g: (val >> 8) & 255,
    b: val & 255,
  };
}

export function rgbaFromHex(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(16, 23, 32, ${alpha})`;
  const clampedAlpha = Math.round(Math.min(1, Math.max(0, alpha)) * 100) / 100;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedAlpha})`;
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

/**
 * Selects high-contrast foreground (#041019 or #FFFFFF) against a custom accent/surface
 * so button labels and badges stay legible (WCAG >= 4.5:1 whenever mathematically reachable).
 */
export function pickReadableForeground(bgHex: string): { hex: string; ratio: number } {
  const darkInk = "#041019";
  const lightInk = "#FFFFFF";
  const darkRatio = contrastRatio(darkInk, bgHex);
  const lightRatio = contrastRatio(lightInk, bgHex);
  if (darkRatio >= lightRatio) {
    return { hex: darkInk, ratio: darkRatio };
  }
  return { hex: lightInk, ratio: lightRatio };
}

/**
 * Blends or falls back to a readable ink if a custom text color drops below minRatio (4.5:1)
 * against the rendered background surface.
 */
export function ensureReadableTextColor(
  candidateHex: string,
  surfaceHex: string,
  minRatio = 4.5,
): { hex: string; ratio: number; adjusted: boolean } {
  const ratio = contrastRatio(candidateHex, surfaceHex);
  if (ratio >= minRatio) {
    return { hex: candidateHex, ratio, adjusted: false };
  }
  const fallback = pickReadableForeground(surfaceHex);
  return { hex: fallback.hex, ratio: fallback.ratio, adjusted: true };
}

export function sanitizeCustomThemeConfig(
  raw: Partial<CustomThemeConfig> | null | undefined,
): CustomThemeConfig {
  const glass =
    typeof raw?.glassOpacity === "number" && Number.isFinite(raw.glassOpacity)
      ? Math.min(0.96, Math.max(0.35, Math.round(raw.glassOpacity * 100) / 100))
      : DEFAULT_CUSTOM_THEME_CONFIG.glassOpacity;
  const blur =
    typeof raw?.blurPx === "number" && Number.isFinite(raw.blurPx)
      ? Math.min(32, Math.max(0, Math.round(raw.blurPx)))
      : DEFAULT_CUSTOM_THEME_CONFIG.blurPx;
  const radius: CornerRoundness =
    raw?.cornerRadius === "sharp" || raw?.cornerRadius === "rounded"
      ? raw.cornerRadius
      : "balanced";
  return {
    accent: normalizeHex(raw?.accent),
    canvas: normalizeHex(raw?.canvas),
    surface: normalizeHex(raw?.surface),
    textOverride: normalizeHex(raw?.textOverride),
    glassOpacity: glass,
    blurPx: blur,
    cornerRadius: radius,
  };
}

export function isCustomThemeModified(config: CustomThemeConfig): boolean {
  return Boolean(
    config.accent ||
    config.canvas ||
    config.surface ||
    config.textOverride ||
    Math.abs(config.glassOpacity - DEFAULT_CUSTOM_THEME_CONFIG.glassOpacity) > 0.005 ||
    config.blurPx !== DEFAULT_CUSTOM_THEME_CONFIG.blurPx ||
    config.cornerRadius !== DEFAULT_CUSTOM_THEME_CONFIG.cornerRadius,
  );
}

export function deriveThemeCssVars(
  baseTheme: ThemeId,
  mode: ThemeMode,
  rawConfig: CustomThemeConfig,
): ThemeCssOutput {
  const config = sanitizeCustomThemeConfig(rawConfig);
  const preset = PRESET_MODE_PALETTES[baseTheme][mode];

  const effectiveAccent = config.accent ?? preset.accent;
  const effectiveCanvas = config.canvas ?? preset.canvas;
  const effectiveSurface = config.surface ?? preset.surface;

  const primaryFg = pickReadableForeground(effectiveAccent);
  const surfaceLum = relativeLuminance(effectiveSurface);
  const surfaceIsDark = surfaceLum < 0.35;

  const baseTextCandidate =
    config.textOverride ??
    (config.surface || config.canvas
      ? surfaceIsDark
        ? "#F1F5F9"
        : "#0F172A"
      : preset.textPrimary);

  const guardedText = ensureReadableTextColor(baseTextCandidate, effectiveSurface, 4.5);
  const mutedHex = surfaceIsDark ? "#94A3B8" : "#475569";
  const accentOnSurface = contrastRatio(effectiveAccent, effectiveSurface);
  const radiusScale = CORNER_RADIUS_SCALE[config.cornerRadius];

  const vars: Record<string, string> = {
    "--hud-blur": `${config.blurPx}px`,
    "--radius": radiusScale.base,
    "--ui-radius-sm": radiusScale.sm,
    "--ui-radius-md": radiusScale.md,
    "--ui-radius-lg": radiusScale.lg,
    "--ui-radius-xl": radiusScale.xl,
    "--ui-radius-2xl": radiusScale.xxl,
  };

  if (config.accent) {
    vars["--accent"] = effectiveAccent;
    vars["--primary"] = effectiveAccent;
    vars["--ring"] = effectiveAccent;
    vars["--cyan"] = effectiveAccent;
    vars["--accent-primary"] = effectiveAccent;
    vars["--accent-glow"] = rgbaFromHex(effectiveAccent, mode === "dark" ? 0.34 : 0.22);
    vars["--accent-surface"] = rgbaFromHex(effectiveAccent, mode === "dark" ? 0.16 : 0.12);
    vars["--primary-foreground"] = primaryFg.hex;
    vars["--border-subtle"] = rgbaFromHex(effectiveAccent, mode === "dark" ? 0.28 : 0.22);
    vars["--border"] = vars["--border-subtle"];
    vars["--input"] = vars["--border-subtle"];
  }

  if (config.canvas) {
    vars["--bg-canvas"] = effectiveCanvas;
    vars["--background"] = effectiveCanvas;
    vars["--bg-primary"] = effectiveCanvas;
  }

  if (
    config.surface ||
    Math.abs(config.glassOpacity - DEFAULT_CUSTOM_THEME_CONFIG.glassOpacity) > 0.005
  ) {
    vars["--bg-surface"] = effectiveSurface;
    vars["--popover"] = effectiveSurface;
    const glass = rgbaFromHex(effectiveSurface, config.glassOpacity);
    vars["--bg-glass"] = glass;
    vars["--card"] = glass;
    vars["--bg-card"] = glass;
    vars["--sidebar"] = glass;
  }

  if (config.textOverride || config.surface || config.canvas) {
    vars["--text-primary"] = guardedText.hex;
    vars["--foreground"] = guardedText.hex;
    vars["--card-foreground"] = guardedText.hex;
    vars["--popover-foreground"] = guardedText.hex;
    vars["--text-muted"] = mutedHex;
    vars["--muted-foreground"] = mutedHex;
  }

  return {
    vars,
    effectiveAccent,
    effectiveCanvas,
    effectiveSurface,
    contrast: {
      accentOnPrimaryFg: primaryFg.ratio,
      primaryFgHex: primaryFg.hex,
      textOnSurface: guardedText.ratio,
      textHex: guardedText.hex,
      accentOnSurface,
      autoAdjustedText: guardedText.adjusted,
    },
  };
}

export function applyCustomThemeCssVars(
  baseTheme: ThemeId,
  mode: ThemeMode,
  config: CustomThemeConfig,
): ThemeCssOutput {
  const derived = deriveThemeCssVars(baseTheme, mode, config);
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    for (const key of CUSTOM_THEME_CSS_VAR_KEYS) {
      const value = derived.vars[key];
      if (value !== undefined) {
        root.style.setProperty(key, value);
      } else {
        root.style.removeProperty(key);
      }
    }
  }
  return derived;
}

export function clearCustomThemeCssVars(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const key of CUSTOM_THEME_CSS_VAR_KEYS) {
    root.style.removeProperty(key);
  }
}

export function serializeCustomTheme(
  name: string,
  baseTheme: ThemeId,
  config: CustomThemeConfig,
): string {
  return JSON.stringify(
    {
      schema: "agrospace-theme/v1",
      name: name.trim() || "Custom Orbital Theme",
      baseTheme,
      config: sanitizeCustomThemeConfig(config),
    },
    null,
    2,
  );
}

const VALID_THEME_IDS: ThemeId[] = [
  "orbital-emerald",
  "solar-harvest",
  "midnight-nebula",
  "arctic-telemetry",
];

export function parseImportedCustomTheme(raw: string):
  | {
      ok: true;
      name: string;
      baseTheme: ThemeId;
      config: CustomThemeConfig;
    }
  | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as {
      name?: unknown;
      baseTheme?: unknown;
      config?: Partial<CustomThemeConfig>;
    };
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.config ||
      typeof parsed.config !== "object"
    ) {
      return { ok: false, error: "Invalid theme JSON: missing 'config' object." };
    }
    const baseTheme: ThemeId =
      typeof parsed.baseTheme === "string" && VALID_THEME_IDS.includes(parsed.baseTheme as ThemeId)
        ? (parsed.baseTheme as ThemeId)
        : "orbital-emerald";
    const name =
      typeof parsed.name === "string" && parsed.name.trim()
        ? parsed.name.trim().slice(0, 48)
        : "Imported Theme";
    const config = sanitizeCustomThemeConfig(parsed.config);
    return { ok: true, name, baseTheme, config };
  } catch {
    return { ok: false, error: "Could not parse theme JSON string." };
  }
}
