import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

export type ThemeId =
  | "orbital-cyan"
  | "monochrome-dark"
  | "monochrome-light"
  | "champagne-gold"
  | "emerald-terra"
  | "custom";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  badge: string;
  description: string;
  isDark: boolean;
  swatch: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface CustomThemeSettings {
  accentColor: string;
  backgroundColor: string;
  blurPx: number;
  glowPercent: number;
}

export const DEFAULT_CUSTOM_SETTINGS: CustomThemeSettings = {
  accentColor: "#00F0FF",
  backgroundColor: "#030712",
  blurPx: 16,
  glowPercent: 50,
};

export const THEME_CONFIGS: Record<Exclude<ThemeId, "custom">, ThemeConfig> = {
  "orbital-cyan": {
    id: "orbital-cyan",
    name: "Orbital Sapphire",
    badge: "NASA Dark",
    description: "Deep space sapphire with high-contrast electric cyan highlights",
    isDark: true,
    swatch: {
      primary: "#06B6D4",
      secondary: "#050B14",
      accent: "#22D3EE",
    },
  },
  "monochrome-dark": {
    id: "monochrome-dark",
    name: "Onyx Monochrome",
    badge: "Black & White",
    description: "Pure matte black, stark white borders, high-contrast engineering aesthetic",
    isDark: true,
    swatch: {
      primary: "#FFFFFF",
      secondary: "#050505",
      accent: "#E4E4E7",
    },
  },
  "monochrome-light": {
    id: "monochrome-light",
    name: "Alabaster Daylight",
    badge: "White & Black",
    description: "Pristine daylight ivory glass with deep ink-black typography",
    isDark: false,
    swatch: {
      primary: "#09090B",
      secondary: "#F8FAFC",
      accent: "#2563EB",
    },
  },
  "champagne-gold": {
    id: "champagne-gold",
    name: "Obsidian & Gold",
    badge: "Luxury Premier",
    description: "Velvet obsidian with warm metallic champagne gold accents",
    isDark: true,
    swatch: {
      primary: "#D4AF37",
      secondary: "#070709",
      accent: "#E5C158",
    },
  },
  "emerald-terra": {
    id: "emerald-terra",
    name: "Emerald Biosphere",
    badge: "Botanical Earth",
    description: "Forest slate with vivid emerald mint and jade agricultural glows",
    isDark: true,
    swatch: {
      primary: "#10B981",
      secondary: "#040D0A",
      accent: "#34D399",
    },
  },
};

export const AVAILABLE_THEMES: ThemeConfig[] = Object.values(THEME_CONFIGS);

const STORAGE_KEY = "agro_theme";
const CUSTOM_STORAGE_KEY = "agro_custom_theme";
const DEFAULT_THEME: ThemeId = "orbital-cyan";

function isColorDark(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length < 6) return true;
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.6;
}

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  currentConfig: ThemeConfig;
  availableThemes: ThemeConfig[];
  customSettings: CustomThemeSettings;
  updateCustomSettings: (settings: Partial<CustomThemeSettings>) => void;
  resetCustomSettings: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
      if (stored && (stored in THEME_CONFIGS || stored === "custom")) {
        return stored;
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_THEME;
  });

  const [customSettings, setCustomSettings] = useState<CustomThemeSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_CUSTOM_SETTINGS;
    try {
      const stored = localStorage.getItem(CUSTOM_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_CUSTOM_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_CUSTOM_SETTINGS;
  });

  const setTheme = (nextTheme: ThemeId) => {
    if (nextTheme in THEME_CONFIGS || nextTheme === "custom") {
      setThemeState(nextTheme);
      try {
        localStorage.setItem(STORAGE_KEY, nextTheme);
      } catch {
        // ignore
      }
    }
  };

  const updateCustomSettings = (newSettings: Partial<CustomThemeSettings>) => {
    setCustomSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const resetCustomSettings = () => {
    setCustomSettings(DEFAULT_CUSTOM_SETTINGS);
    try {
      localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(DEFAULT_CUSTOM_SETTINGS));
    } catch {
      // ignore
    }
  };

  const currentConfig: ThemeConfig = useMemo(() => {
    if (theme === "custom") {
      const isDark = isColorDark(customSettings.backgroundColor);
      return {
        id: "custom",
        name: "Custom User Theme",
        badge: "User Custom",
        description: "Tailored palette with real-time accent, surface, glass blur & glow",
        isDark,
        swatch: {
          primary: customSettings.accentColor,
          secondary: customSettings.backgroundColor,
          accent: customSettings.accentColor,
        },
      };
    }
    return THEME_CONFIGS[theme] || THEME_CONFIGS[DEFAULT_THEME];
  }, [theme, customSettings]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    // Apply data-theme attribute
    root.setAttribute("data-theme", theme);

    if (theme === "custom") {
      const isDark = isColorDark(customSettings.backgroundColor);
      if (isDark) {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
      }

      const glowAlpha = Math.round(
        Math.max(10, Math.min(255, (customSettings.glowPercent / 100) * 200)),
      )
        .toString(16)
        .padStart(2, "0");

      root.style.setProperty("--accent-primary", customSettings.accentColor);
      root.style.setProperty("--primary", customSettings.accentColor);
      root.style.setProperty("--cyan", customSettings.accentColor);
      root.style.setProperty("--accent-glow", `${customSettings.accentColor}${glowAlpha}`);
      root.style.setProperty("--bg-primary", customSettings.backgroundColor);
      root.style.setProperty("--background", customSettings.backgroundColor);
      root.style.setProperty("--bg-card", customSettings.backgroundColor + "e6");
      root.style.setProperty("--card", customSettings.backgroundColor + "e6");
      root.style.setProperty("--border", `${customSettings.accentColor}40`);
      root.style.setProperty("--border-subtle", `${customSettings.accentColor}28`);
      root.style.setProperty("--hud-blur", `${customSettings.blurPx}px`);
    } else {
      // Predefined theme: clean up custom style overrides
      root.style.removeProperty("--accent-primary");
      root.style.removeProperty("--primary");
      root.style.removeProperty("--cyan");
      root.style.removeProperty("--accent-glow");
      root.style.removeProperty("--bg-primary");
      root.style.removeProperty("--background");
      root.style.removeProperty("--bg-card");
      root.style.removeProperty("--card");
      root.style.removeProperty("--border");
      root.style.removeProperty("--border-subtle");
      root.style.removeProperty("--hud-blur");

      const config = THEME_CONFIGS[theme] || THEME_CONFIGS[DEFAULT_THEME];
      if (config.isDark) {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
      }
    }
  }, [theme, customSettings]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      currentConfig,
      availableThemes: AVAILABLE_THEMES,
      customSettings,
      updateCustomSettings,
      resetCustomSettings,
    }),
    [theme, currentConfig, customSettings],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: DEFAULT_THEME,
      setTheme: () => {},
      currentConfig: THEME_CONFIGS[DEFAULT_THEME],
      availableThemes: AVAILABLE_THEMES,
      customSettings: DEFAULT_CUSTOM_SETTINGS,
      updateCustomSettings: () => {},
      resetCustomSettings: () => {},
    };
  }
  return context;
}
