import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

export type ThemeId =
  "orbital-cyan" | "monochrome-dark" | "monochrome-light" | "champagne-gold" | "emerald-terra";

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

export const THEME_CONFIGS: Record<ThemeId, ThemeConfig> = {
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

export const AVAILABLE_THEMES = Object.values(THEME_CONFIGS);

const STORAGE_KEY = "agro_theme";
const DEFAULT_THEME: ThemeId = "orbital-cyan";

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  currentConfig: ThemeConfig;
  availableThemes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
      if (stored && stored in THEME_CONFIGS) {
        return stored;
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_THEME;
  });

  const setTheme = (nextTheme: ThemeId) => {
    if (nextTheme in THEME_CONFIGS) {
      setThemeState(nextTheme);
      try {
        localStorage.setItem(STORAGE_KEY, nextTheme);
      } catch {
        // ignore storage errors
      }
    }
  };

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const config = THEME_CONFIGS[theme] || THEME_CONFIGS[DEFAULT_THEME];

    // Apply data-theme attribute
    root.setAttribute("data-theme", theme);

    // Apply or remove dark class
    if (config.isDark) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
  }, [theme]);

  const currentConfig = useMemo(
    () => THEME_CONFIGS[theme] || THEME_CONFIGS[DEFAULT_THEME],
    [theme],
  );

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      currentConfig,
      availableThemes: AVAILABLE_THEMES,
    }),
    [theme, currentConfig],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback if rendered outside ThemeProvider
    return {
      theme: DEFAULT_THEME,
      setTheme: () => {},
      currentConfig: THEME_CONFIGS[DEFAULT_THEME],
      availableThemes: AVAILABLE_THEMES,
    };
  }
  return context;
}
