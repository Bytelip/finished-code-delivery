import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemeId = "orbital-emerald" | "solar-harvest" | "midnight-nebula" | "arctic-telemetry";

export type ThemeMode = "dark" | "light";

export interface ThemePalette {
  canvas: string;
  surface: string;
  glass: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentGlow: string;
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  badge: string;
  description: string;
  isDark: boolean;
  dark: ThemePalette;
  light: ThemePalette;
  swatch: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export const THEME_STORAGE_KEY = "agrospace-theme";
export const MODE_STORAGE_KEY = "agrospace-mode";
export const DEFAULT_THEME: ThemeId = "orbital-emerald";
export const DEFAULT_MODE: ThemeMode = "dark";

interface BaseThemeDefinition {
  id: ThemeId;
  name: string;
  badge: string;
  description: string;
  dark: ThemePalette;
  light: ThemePalette;
}

export const THEME_CONFIGS: Record<ThemeId, BaseThemeDefinition> = {
  "orbital-emerald": {
    id: "orbital-emerald",
    name: "Orbital Emerald",
    badge: "Default",
    description: "Deep telemetry obsidian paired with calibrated biosphere emerald accents",
    dark: {
      canvas: "#090D12",
      surface: "#101720",
      glass: "rgba(16, 23, 32, 0.86)",
      border: "rgba(16, 185, 129, 0.24)",
      text: "#F1F5F9",
      muted: "#94A3B8",
      accent: "#10B981",
      accentGlow: "rgba(16, 185, 129, 0.35)",
    },
    light: {
      canvas: "#F6F8FA",
      surface: "#FFFFFF",
      glass: "rgba(255, 255, 255, 0.88)",
      border: "rgba(15, 23, 42, 0.12)",
      text: "#0F172A",
      muted: "#475569",
      accent: "#059669",
      accentGlow: "rgba(5, 150, 105, 0.22)",
    },
  },
  "solar-harvest": {
    id: "solar-harvest",
    name: "Solar Harvest",
    badge: "Agri-Solar",
    description: "Warm dark loam and sunlit parchment surfaces with amber telemetry highlights",
    dark: {
      canvas: "#141210",
      surface: "#1E1A16",
      glass: "rgba(30, 26, 22, 0.88)",
      border: "rgba(245, 158, 11, 0.24)",
      text: "#FAF7F2",
      muted: "#B8AFA4",
      accent: "#F59E0B",
      accentGlow: "rgba(245, 158, 11, 0.32)",
    },
    light: {
      canvas: "#FBF8F3",
      surface: "#FFFFFF",
      glass: "rgba(255, 253, 249, 0.88)",
      border: "rgba(28, 25, 23, 0.12)",
      text: "#1C1917",
      muted: "#57534E",
      accent: "#B45309",
      accentGlow: "rgba(180, 83, 9, 0.20)",
    },
  },
  "midnight-nebula": {
    id: "midnight-nebula",
    name: "Midnight Nebula",
    badge: "Deep Orbit",
    description: "Cosmic indigo twilight with high-definition orbital violet and indigo accents",
    dark: {
      canvas: "#0B1021",
      surface: "#131A33",
      glass: "rgba(19, 26, 51, 0.88)",
      border: "rgba(139, 92, 246, 0.26)",
      text: "#F3F4F6",
      muted: "#9CA3AF",
      accent: "#8B5CF6",
      accentGlow: "rgba(139, 92, 246, 0.34)",
    },
    light: {
      canvas: "#F7F7FC",
      surface: "#FFFFFF",
      glass: "rgba(255, 255, 255, 0.88)",
      border: "rgba(30, 27, 75, 0.12)",
      text: "#1E1B4B",
      muted: "#4B5563",
      accent: "#4F46E5",
      accentGlow: "rgba(79, 70, 229, 0.20)",
    },
  },
  "arctic-telemetry": {
    id: "arctic-telemetry",
    name: "Arctic Telemetry",
    badge: "High-Vis",
    description: "Crisp steel polar console with ice-sky telemetry cyan for maximum clarity",
    dark: {
      canvas: "#0E1318",
      surface: "#151D26",
      glass: "rgba(21, 29, 38, 0.88)",
      border: "rgba(56, 189, 248, 0.25)",
      text: "#F0F6FC",
      muted: "#94A3B8",
      accent: "#38BDF8",
      accentGlow: "rgba(56, 189, 248, 0.34)",
    },
    light: {
      canvas: "#F8FAFC",
      surface: "#FFFFFF",
      glass: "rgba(255, 255, 255, 0.88)",
      border: "rgba(15, 23, 42, 0.12)",
      text: "#0F172A",
      muted: "#475569",
      accent: "#0284C7",
      accentGlow: "rgba(2, 132, 199, 0.20)",
    },
  },
};

function buildThemeConfig(def: BaseThemeDefinition, mode: ThemeMode): ThemeConfig {
  const palette = mode === "dark" ? def.dark : def.light;
  return {
    ...def,
    isDark: mode === "dark",
    swatch: {
      primary: palette.accent,
      secondary: palette.canvas,
      accent: palette.surface,
    },
  };
}

export const AVAILABLE_THEMES: ThemeConfig[] = Object.values(THEME_CONFIGS).map((def) =>
  buildThemeConfig(def, DEFAULT_MODE),
);

function isValidThemeId(value: string | null): value is ThemeId {
  return Boolean(value && value in THEME_CONFIGS);
}

function isValidThemeMode(value: string | null): value is ThemeMode {
  return value === "dark" || value === "light";
}

export function applyThemeToDocument(theme: ThemeId, mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  if (mode === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
  root.style.colorScheme = mode;
}

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  isDark: boolean;
  currentConfig: ThemeConfig;
  availableThemes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      const storedMode = localStorage.getItem(MODE_STORAGE_KEY);

      const resolvedTheme = isValidThemeId(storedTheme) ? storedTheme : DEFAULT_THEME;
      const resolvedMode = isValidThemeMode(storedMode) ? storedMode : DEFAULT_MODE;

      setThemeState(resolvedTheme);
      setModeState(resolvedMode);
      applyThemeToDocument(resolvedTheme, resolvedMode);
    } catch {
      applyThemeToDocument(DEFAULT_THEME, DEFAULT_MODE);
    }
  }, []);

  const setTheme = useCallback(
    (nextTheme: ThemeId) => {
      if (!isValidThemeId(nextTheme)) return;
      setThemeState(nextTheme);
      applyThemeToDocument(nextTheme, mode);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch {
        // Ignore storage errors in restricted browser contexts
      }
    },
    [mode],
  );

  const setMode = useCallback(
    (nextMode: ThemeMode) => {
      if (!isValidThemeMode(nextMode)) return;
      setModeState(nextMode);
      applyThemeToDocument(theme, nextMode);
      try {
        localStorage.setItem(MODE_STORAGE_KEY, nextMode);
      } catch {
        // Ignore storage errors in restricted browser contexts
      }
    },
    [theme],
  );

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next: ThemeMode = prev === "dark" ? "light" : "dark";
      applyThemeToDocument(theme, next);
      try {
        localStorage.setItem(MODE_STORAGE_KEY, next);
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, [theme]);

  useEffect(() => {
    applyThemeToDocument(theme, mode);
  }, [theme, mode]);

  const availableThemes = useMemo(
    () => Object.values(THEME_CONFIGS).map((def) => buildThemeConfig(def, mode)),
    [mode],
  );

  const currentConfig = useMemo(
    () => buildThemeConfig(THEME_CONFIGS[theme] || THEME_CONFIGS[DEFAULT_THEME], mode),
    [theme, mode],
  );

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      mode,
      setMode,
      toggleMode,
      isDark: mode === "dark",
      currentConfig,
      availableThemes,
    }),
    [theme, setTheme, mode, setMode, toggleMode, currentConfig, availableThemes],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: DEFAULT_THEME,
      setTheme: () => {},
      mode: DEFAULT_MODE,
      setMode: () => {},
      toggleMode: () => {},
      isDark: true,
      currentConfig: buildThemeConfig(THEME_CONFIGS[DEFAULT_THEME], DEFAULT_MODE),
      availableThemes: AVAILABLE_THEMES,
    };
  }
  return context;
}
