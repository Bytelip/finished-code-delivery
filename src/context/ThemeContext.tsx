import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  applyCustomThemeCssVars,
  clearCustomThemeCssVars,
  CUSTOM_ACTIVE_ID_STORAGE_KEY,
  CUSTOM_DRAFT_STORAGE_KEY,
  CUSTOM_SAVED_THEMES_STORAGE_KEY,
  DEFAULT_CUSTOM_THEME_CONFIG,
  deriveThemeCssVars,
  isCustomThemeModified,
  parseImportedCustomTheme,
  PRESET_MODE_PALETTES,
  sanitizeCustomThemeConfig,
  serializeCustomTheme,
  type CustomThemeConfig,
  type SavedCustomTheme,
  type ThemeContrastMetrics,
  type ThemeId,
  type ThemeMode,
} from "@/lib/themeUtils";

export type {
  ThemeId,
  ThemeMode,
  CustomThemeConfig,
  SavedCustomTheme,
  ThemeContrastMetrics,
} from "@/lib/themeUtils";

export const THEME_STORAGE_KEY = "agrospace-theme";
export const MODE_STORAGE_KEY = "agrospace-mode";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  badge: string;
  description: string;
  dark: {
    canvas: string;
    surface: string;
    accent: string;
  };
  light: {
    canvas: string;
    surface: string;
    accent: string;
  };
  swatch: {
    primary: string;
    secondary: string;
  };
}

export const THEME_CONFIGS: ThemeConfig[] = [
  {
    id: "orbital-emerald",
    name: "Orbital Emerald",
    badge: "NASA DEFAULT",
    description: "Deep slate aerospace cockpit paired with laser-emerald vegetation accents.",
    dark: PRESET_MODE_PALETTES["orbital-emerald"].dark,
    light: PRESET_MODE_PALETTES["orbital-emerald"].light,
    swatch: { primary: "#10B981", secondary: "#090D12" },
  },
  {
    id: "solar-harvest",
    name: "Solar Harvest",
    badge: "AGRI-AMBER",
    description: "Warm obsidian and harvest amber built for crop thermal and solar telemetry.",
    dark: PRESET_MODE_PALETTES["solar-harvest"].dark,
    light: PRESET_MODE_PALETTES["solar-harvest"].light,
    swatch: { primary: "#F59E0B", secondary: "#141210" },
  },
  {
    id: "midnight-nebula",
    name: "Midnight Nebula",
    badge: "DEEP SPACE",
    description: "High-altitude violet cosmos and deep indigo glass for atmospheric overlays.",
    dark: PRESET_MODE_PALETTES["midnight-nebula"].dark,
    light: PRESET_MODE_PALETTES["midnight-nebula"].light,
    swatch: { primary: "#8B5CF6", secondary: "#0B1021" },
  },
  {
    id: "arctic-telemetry",
    name: "Arctic Telemetry",
    badge: "HIGH CONTRAST",
    description:
      "Crisp GitHub-slate charcoal and cyan telemetry lines for sharp instrument reading.",
    dark: PRESET_MODE_PALETTES["arctic-telemetry"].dark,
    light: PRESET_MODE_PALETTES["arctic-telemetry"].light,
    swatch: { primary: "#38BDF8", secondary: "#0E1318" },
  },
];

const VALID_THEME_IDS: ReadonlyArray<ThemeId> = THEME_CONFIGS.map((t) => t.id);

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function applyThemeToDocument(themeId: ThemeId, mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", themeId);
  root.setAttribute("data-mode", mode);
  if (mode === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
  } else {
    root.classList.add("dark");
    root.classList.remove("light");
    root.style.colorScheme = "dark";
  }
}

function safeReadJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeWriteStorage(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota errors
  }
}

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  currentConfig: ThemeConfig;
  availableThemes: ThemeConfig[];
  customConfig: CustomThemeConfig;
  hasCustomOverrides: boolean;
  savedCustomThemes: SavedCustomTheme[];
  activeCustomThemeId: string | null;
  contrastMetrics: ThemeContrastMetrics;
  isStudioOpen: boolean;
  setIsStudioOpen: (open: boolean) => void;
  updateCustomConfig: (patch: Partial<CustomThemeConfig>) => void;
  resetCustomConfig: () => void;
  saveCustomTheme: (name: string) => SavedCustomTheme;
  applySavedCustomTheme: (id: string) => void;
  deleteSavedCustomTheme: (id: string) => void;
  exportThemeJson: (name?: string) => string;
  importThemeJson: (raw: string) => { ok: true; name: string } | { ok: false; error: string };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Deterministic initial defaults ensure identical SSR & initial client hydration
  const [theme, setThemeState] = useState<ThemeId>("orbital-emerald");
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [customConfig, setCustomConfig] = useState<CustomThemeConfig>(DEFAULT_CUSTOM_THEME_CONFIG);
  const [savedCustomThemes, setSavedCustomThemes] = useState<SavedCustomTheme[]>([]);
  const [activeCustomThemeId, setActiveCustomThemeId] = useState<string | null>(null);
  const [isStudioOpen, setIsStudioOpen] = useState(false);

  // Refs guarantee synchronous reads inside flushSync / rapid ViewTransition double-clicks
  const themeRef = useRef<ThemeId>(theme);
  const modeRef = useRef<ThemeMode>(mode);
  const customConfigRef = useRef<CustomThemeConfig>(customConfig);
  themeRef.current = theme;
  modeRef.current = mode;
  customConfigRef.current = customConfig;

  // Hydrate persisted preset, mode & custom theme overrides before paint on client mount
  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") return;
    let initialTheme: ThemeId = "orbital-emerald";
    let initialMode: ThemeMode = "dark";
    let initialCustom: CustomThemeConfig = DEFAULT_CUSTOM_THEME_CONFIG;
    let initialSaved: SavedCustomTheme[] = [];
    let initialActiveId: string | null = null;

    try {
      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
      const savedMode = window.localStorage.getItem(MODE_STORAGE_KEY) as ThemeMode | null;
      if (savedTheme && VALID_THEME_IDS.includes(savedTheme)) {
        initialTheme = savedTheme;
      }
      if (savedMode === "light" || savedMode === "dark") {
        initialMode = savedMode;
      }

      const rawDraft = safeReadJson<Partial<CustomThemeConfig>>(CUSTOM_DRAFT_STORAGE_KEY);
      if (rawDraft) {
        initialCustom = sanitizeCustomThemeConfig(rawDraft);
      }

      const rawSavedList = safeReadJson<SavedCustomTheme[]>(CUSTOM_SAVED_THEMES_STORAGE_KEY);
      if (Array.isArray(rawSavedList)) {
        initialSaved = rawSavedList
          .filter((item) => item && typeof item.id === "string" && typeof item.name === "string")
          .map((item) => ({
            id: item.id,
            name: item.name,
            baseTheme: VALID_THEME_IDS.includes(item.baseTheme)
              ? item.baseTheme
              : "orbital-emerald",
            config: sanitizeCustomThemeConfig(item.config),
            updatedAt:
              typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString(),
          }));
      }

      const rawActiveId = window.localStorage.getItem(CUSTOM_ACTIVE_ID_STORAGE_KEY);
      if (rawActiveId && initialSaved.some((s) => s.id === rawActiveId)) {
        initialActiveId = rawActiveId;
      }
    } catch {
      // Ignore storage errors
    }

    themeRef.current = initialTheme;
    modeRef.current = initialMode;
    customConfigRef.current = initialCustom;

    setThemeState(initialTheme);
    setModeState(initialMode);
    setCustomConfig(initialCustom);
    setSavedCustomThemes(initialSaved);
    setActiveCustomThemeId(initialActiveId);

    applyThemeToDocument(initialTheme, initialMode);
    if (isCustomThemeModified(initialCustom)) {
      applyCustomThemeCssVars(initialTheme, initialMode, initialCustom);
    } else {
      clearCustomThemeCssVars();
    }
  }, []);

  const syncCustomToDom = useCallback(
    (nextTheme: ThemeId, nextMode: ThemeMode, nextConfig: CustomThemeConfig) => {
      applyThemeToDocument(nextTheme, nextMode);
      if (isCustomThemeModified(nextConfig)) {
        applyCustomThemeCssVars(nextTheme, nextMode, nextConfig);
        safeWriteStorage(CUSTOM_DRAFT_STORAGE_KEY, JSON.stringify(nextConfig));
      } else {
        clearCustomThemeCssVars();
        safeWriteStorage(CUSTOM_DRAFT_STORAGE_KEY, null);
      }
    },
    [],
  );

  const setTheme = useCallback(
    (id: ThemeId) => {
      themeRef.current = id;
      setThemeState(id);
      setActiveCustomThemeId(null);
      safeWriteStorage(THEME_STORAGE_KEY, id);
      safeWriteStorage(CUSTOM_ACTIVE_ID_STORAGE_KEY, null);
      syncCustomToDom(id, modeRef.current, customConfigRef.current);
    },
    [syncCustomToDom],
  );

  const setMode = useCallback(
    (nextMode: ThemeMode) => {
      modeRef.current = nextMode;
      setModeState(nextMode);
      safeWriteStorage(MODE_STORAGE_KEY, nextMode);
      syncCustomToDom(themeRef.current, nextMode, customConfigRef.current);
    },
    [syncCustomToDom],
  );

  const toggleMode = useCallback(() => {
    const nextMode: ThemeMode = modeRef.current === "dark" ? "light" : "dark";
    modeRef.current = nextMode;
    setModeState(nextMode);
    safeWriteStorage(MODE_STORAGE_KEY, nextMode);
    syncCustomToDom(themeRef.current, nextMode, customConfigRef.current);
  }, [syncCustomToDom]);

  const updateCustomConfig = useCallback(
    (patch: Partial<CustomThemeConfig>) => {
      const merged = sanitizeCustomThemeConfig({ ...customConfigRef.current, ...patch });
      customConfigRef.current = merged;
      setCustomConfig(merged);
      setActiveCustomThemeId(null);
      safeWriteStorage(CUSTOM_ACTIVE_ID_STORAGE_KEY, null);
      syncCustomToDom(themeRef.current, modeRef.current, merged);
    },
    [syncCustomToDom],
  );

  const resetCustomConfig = useCallback(() => {
    customConfigRef.current = DEFAULT_CUSTOM_THEME_CONFIG;
    setCustomConfig(DEFAULT_CUSTOM_THEME_CONFIG);
    setActiveCustomThemeId(null);
    safeWriteStorage(CUSTOM_DRAFT_STORAGE_KEY, null);
    safeWriteStorage(CUSTOM_ACTIVE_ID_STORAGE_KEY, null);
    clearCustomThemeCssVars();
    applyThemeToDocument(themeRef.current, modeRef.current);
  }, []);

  const saveCustomTheme = useCallback(
    (name: string): SavedCustomTheme => {
      const cleanName = name.trim().slice(0, 48) || "Custom Theme";
      const entry: SavedCustomTheme = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: cleanName,
        baseTheme: theme,
        config: sanitizeCustomThemeConfig(customConfig),
        updatedAt: new Date().toISOString(),
      };
      setSavedCustomThemes((prev) => {
        const filtered = prev.filter((item) => item.name.toLowerCase() !== cleanName.toLowerCase());
        const nextList = [entry, ...filtered];
        safeWriteStorage(CUSTOM_SAVED_THEMES_STORAGE_KEY, JSON.stringify(nextList));
        return nextList;
      });
      setActiveCustomThemeId(entry.id);
      safeWriteStorage(CUSTOM_ACTIVE_ID_STORAGE_KEY, entry.id);
      return entry;
    },
    [theme, customConfig],
  );

  const applySavedCustomTheme = useCallback(
    (id: string) => {
      const found = savedCustomThemes.find((item) => item.id === id);
      if (!found) return;
      const clean = sanitizeCustomThemeConfig(found.config);
      setThemeState(found.baseTheme);
      setCustomConfig(clean);
      setActiveCustomThemeId(found.id);
      safeWriteStorage(THEME_STORAGE_KEY, found.baseTheme);
      safeWriteStorage(CUSTOM_ACTIVE_ID_STORAGE_KEY, found.id);
      syncCustomToDom(found.baseTheme, mode, clean);
    },
    [savedCustomThemes, mode, syncCustomToDom],
  );

  const deleteSavedCustomTheme = useCallback((id: string) => {
    setSavedCustomThemes((prev) => {
      const nextList = prev.filter((item) => item.id !== id);
      safeWriteStorage(CUSTOM_SAVED_THEMES_STORAGE_KEY, JSON.stringify(nextList));
      return nextList;
    });
    setActiveCustomThemeId((curr) => {
      if (curr === id) {
        safeWriteStorage(CUSTOM_ACTIVE_ID_STORAGE_KEY, null);
        return null;
      }
      return curr;
    });
  }, []);

  const exportThemeJson = useCallback(
    (name?: string) => {
      const activeSaved = savedCustomThemes.find((s) => s.id === activeCustomThemeId);
      const exportName = name || activeSaved?.name || `${theme}-custom`;
      return serializeCustomTheme(exportName, theme, customConfig);
    },
    [savedCustomThemes, activeCustomThemeId, theme, customConfig],
  );

  const importThemeJson = useCallback(
    (raw: string): { ok: true; name: string } | { ok: false; error: string } => {
      const parsed = parseImportedCustomTheme(raw);
      if (!parsed.ok) return parsed;
      setThemeState(parsed.baseTheme);
      setCustomConfig(parsed.config);
      setActiveCustomThemeId(null);
      safeWriteStorage(THEME_STORAGE_KEY, parsed.baseTheme);
      safeWriteStorage(CUSTOM_ACTIVE_ID_STORAGE_KEY, null);
      syncCustomToDom(parsed.baseTheme, mode, parsed.config);
      return { ok: true, name: parsed.name };
    },
    [mode, syncCustomToDom],
  );

  const derived = useMemo(
    () => deriveThemeCssVars(theme, mode, customConfig),
    [theme, mode, customConfig],
  );

  const hasCustomOverrides = useMemo(() => isCustomThemeModified(customConfig), [customConfig]);

  const currentConfig = useMemo<ThemeConfig>(() => {
    const base = THEME_CONFIGS.find((t) => t.id === theme) ?? THEME_CONFIGS[0]!;
    const activeSaved = savedCustomThemes.find((s) => s.id === activeCustomThemeId);
    const modePalette = PRESET_MODE_PALETTES[theme][mode];
    if (!hasCustomOverrides && !activeSaved) {
      return {
        ...base,
        swatch: {
          primary: modePalette.accent,
          secondary: modePalette.canvas,
        },
      };
    }
    return {
      ...base,
      name: activeSaved?.name ?? (hasCustomOverrides ? `${base.name} (Custom)` : base.name),
      dark: {
        canvas: customConfig.canvas ?? base.dark.canvas,
        surface: customConfig.surface ?? base.dark.surface,
        accent: customConfig.accent ?? base.dark.accent,
      },
      light: {
        canvas: customConfig.canvas ?? base.light.canvas,
        surface: customConfig.surface ?? base.light.surface,
        accent: customConfig.accent ?? base.light.accent,
      },
      swatch: {
        primary: customConfig.accent ?? modePalette.accent,
        secondary: customConfig.canvas ?? modePalette.canvas,
      },
    };
  }, [theme, mode, customConfig, hasCustomOverrides, savedCustomThemes, activeCustomThemeId]);

  const isDark = mode === "dark";

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      mode,
      isDark,
      setMode,
      toggleMode,
      currentConfig,
      availableThemes: THEME_CONFIGS,
      customConfig,
      hasCustomOverrides,
      savedCustomThemes,
      activeCustomThemeId,
      contrastMetrics: derived.contrast,
      isStudioOpen,
      setIsStudioOpen,
      updateCustomConfig,
      resetCustomConfig,
      saveCustomTheme,
      applySavedCustomTheme,
      deleteSavedCustomTheme,
      exportThemeJson,
      importThemeJson,
    }),
    [
      theme,
      setTheme,
      mode,
      isDark,
      setMode,
      toggleMode,
      currentConfig,
      customConfig,
      hasCustomOverrides,
      savedCustomThemes,
      activeCustomThemeId,
      derived.contrast,
      isStudioOpen,
      updateCustomConfig,
      resetCustomConfig,
      saveCustomTheme,
      applySavedCustomTheme,
      deleteSavedCustomTheme,
      exportThemeJson,
      importThemeJson,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

const FALLBACK_THEME_CONTEXT: ThemeContextType = {
  theme: "orbital-emerald",
  setTheme: () => undefined,
  mode: "dark",
  isDark: true,
  setMode: () => undefined,
  toggleMode: () => undefined,
  currentConfig: THEME_CONFIGS[0]!,
  availableThemes: THEME_CONFIGS,
  customConfig: DEFAULT_CUSTOM_THEME_CONFIG,
  hasCustomOverrides: false,
  savedCustomThemes: [],
  activeCustomThemeId: null,
  contrastMetrics: deriveThemeCssVars("orbital-emerald", "dark", DEFAULT_CUSTOM_THEME_CONFIG)
    .contrast,
  isStudioOpen: false,
  setIsStudioOpen: () => undefined,
  updateCustomConfig: () => undefined,
  resetCustomConfig: () => undefined,
  saveCustomTheme: (name: string) => ({
    id: "fallback-custom",
    name,
    baseTheme: "orbital-emerald",
    config: DEFAULT_CUSTOM_THEME_CONFIG,
    updatedAt: "2026-01-01T00:00:00.000Z",
  }),
  applySavedCustomTheme: () => undefined,
  deleteSavedCustomTheme: () => undefined,
  exportThemeJson: (name?: string) =>
    serializeCustomTheme(name ?? "orbital-emerald", "orbital-emerald", DEFAULT_CUSTOM_THEME_CONFIG),
  importThemeJson: () => ({ ok: false, error: "ThemeProvider unavailable" }),
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  return context ?? FALLBACK_THEME_CONTEXT;
}
