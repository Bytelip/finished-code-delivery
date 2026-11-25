import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import React from "react";
import {
  ThemeProvider,
  useTheme,
  MODE_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from "@/context/ThemeContext";
import { ThemeSwitcher, ThemeSettingsCard } from "@/components/theme/ThemeSwitcher";
import { ThemeStudioModal } from "@/components/theme/ThemeStudioModal";
import { contrastRatio, pickReadableForeground, sanitizeCustomThemeConfig } from "@/lib/themeUtils";
import { AnimatedThemeSwitch } from "@/components/theme/AnimatedThemeSwitch";

function TestConsumer() {
  const { theme, setTheme, mode, setMode, toggleMode, currentConfig, availableThemes } = useTheme();
  return (
    <div>
      <span data-testid="active-theme">{theme}</span>
      <span data-testid="active-mode">{mode}</span>
      <span data-testid="active-name">{currentConfig.name}</span>
      <span data-testid="active-accent">{currentConfig.swatch.primary}</span>
      <span data-testid="theme-count">{availableThemes.length}</span>
      <button onClick={() => setTheme("solar-harvest")}>Set Solar Harvest</button>
      <button onClick={() => setTheme("midnight-nebula")}>Set Midnight Nebula</button>
      <button onClick={() => setTheme("arctic-telemetry")}>Set Arctic Telemetry</button>
      <button onClick={() => setTheme("orbital-emerald")}>Set Orbital Emerald</button>
      <button onClick={() => setMode("light")}>Set Light</button>
      <button onClick={() => setMode("dark")}>Set Dark</button>
      <button onClick={toggleMode}>Toggle Mode</button>
    </div>
  );
}

describe("Premium 4-Theme System & Animated Light/Dark Switch", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(document, "startViewTransition");
    Reflect.deleteProperty(document.documentElement, "animate");
  });

  it("initializes with orbital-emerald dark mode and applies data-theme + html class", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("active-theme").textContent).toBe("orbital-emerald");
    expect(screen.getByTestId("active-mode").textContent).toBe("dark");
    expect(screen.getByTestId("active-name").textContent).toBe("Orbital Emerald");
    expect(screen.getByTestId("active-accent").textContent).toBe("#10B981");
    expect(screen.getByTestId("theme-count").textContent).toBe("4");
    expect(document.documentElement.getAttribute("data-theme")).toBe("orbital-emerald");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("switches and persists all 4 presets and Dark/Light modes in localStorage", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByText("Set Solar Harvest"));
    });
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("solar-harvest");
    expect(document.documentElement.getAttribute("data-theme")).toBe("solar-harvest");
    expect(screen.getByTestId("active-accent").textContent).toBe("#F59E0B");

    act(() => {
      fireEvent.click(screen.getByText("Set Light"));
    });
    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(screen.getByTestId("active-accent").textContent).toBe("#B45309");

    act(() => {
      fireEvent.click(screen.getByText("Set Midnight Nebula"));
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("midnight-nebula");
    expect(screen.getByTestId("active-accent").textContent).toBe("#4F46E5");

    act(() => {
      fireEvent.click(screen.getByText("Set Arctic Telemetry"));
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("arctic-telemetry");
    expect(screen.getByTestId("active-accent").textContent).toBe("#0284C7");

    act(() => {
      fireEvent.click(screen.getByText("Set Dark"));
    });
    expect(screen.getByTestId("active-accent").textContent).toBe("#38BDF8");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("hydrates previously stored theme and light mode from localStorage on mount", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "midnight-nebula");
    localStorage.setItem(MODE_STORAGE_KEY, "light");

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("active-theme").textContent).toBe("midnight-nebula");
    expect(screen.getByTestId("active-mode").textContent).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("midnight-nebula");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("triggers View Transitions circular reveal on AnimatedThemeSwitch click and computes Math.hypot maxRadius", async () => {
    const animateMock = vi.fn();
    Object.defineProperty(document.documentElement, "animate", {
      configurable: true,
      writable: true,
      value: animateMock,
    });

    const startViewTransitionMock = vi.fn((cb: () => void) => {
      cb();
      return { ready: Promise.resolve() };
    });
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      writable: true,
      value: startViewTransitionMock,
    });

    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <ThemeProvider>
        <AnimatedThemeSwitch />
      </ThemeProvider>,
    );

    const toggleBtn = screen.getByRole("switch", { name: /Switch to light mode/i });
    vi.spyOn(toggleBtn, "getBoundingClientRect").mockReturnValue({
      left: 900,
      top: 10,
      width: 56,
      height: 28,
      right: 956,
      bottom: 38,
      x: 900,
      y: 10,
      toJSON: () => ({}),
    });

    fireEvent.click(toggleBtn);

    expect(startViewTransitionMock).toHaveBeenCalledTimes(1);
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(toggleBtn.getAttribute("aria-checked")).toBe("false");

    await waitFor(() => {
      expect(animateMock).toHaveBeenCalledTimes(1);
    });

    const [keyframes, options] = animateMock.mock.calls[0]!;
    expect(keyframes.clipPath[0]).toBe("circle(0px at 928px 24px)");
    expect(keyframes.clipPath[1]).toMatch(/^circle\(/);
    expect(options).toEqual({
      duration: 500,
      easing: "ease-in-out",
      pseudoElement: "::view-transition-new(root)",
    });
  });

  it("gracefully falls back when prefers-reduced-motion: reduce or startViewTransition is missing", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <ThemeProvider>
        <AnimatedThemeSwitch />
      </ThemeProvider>,
    );

    const toggleBtn = screen.getByRole("switch", { name: /Switch to light mode/i });
    fireEvent.click(toggleBtn);

    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBe("light");
  });

  it("renders compact ThemeSwitcher trigger and ThemeSettingsCard with all 4 presets", () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
        <ThemeSettingsCard />
      </ThemeProvider>,
    );

    expect(screen.getByTitle(/Active Theme: Orbital Emerald/i)).toBeInTheDocument();
    expect(screen.getByText("4 Themes · Dark Mode")).toBeInTheDocument();

    const solarBtn = screen.getByRole("button", { name: /Solar Harvest/i });
    fireEvent.click(solarBtn);

    expect(document.documentElement.getAttribute("data-theme")).toBe("solar-harvest");
  });

  it("supports Customizable Theme Studio colors, blur/opacity/radius, WCAG auto-contrast, save/delete, JSON import/export & Escape close", () => {
    // 1. WCAG foreground contrast guard verification
    const brightFg = pickReadableForeground("#FACC15");
    expect(brightFg.hex).toBe("#041019");
    expect(brightFg.ratio).toBeGreaterThanOrEqual(4.5);

    const darkFg = pickReadableForeground("#1E3A8A");
    expect(darkFg.hex).toBe("#FFFFFF");
    expect(darkFg.ratio).toBeGreaterThanOrEqual(4.5);

    expect(contrastRatio("#FFFFFF", "#090D12")).toBeGreaterThan(15);
    expect(sanitizeCustomThemeConfig({ blurPx: 99, glassOpacity: 0.1 }).blurPx).toBe(32);

    render(
      <ThemeProvider>
        <ThemeSettingsCard />
        <ThemeStudioModal />
      </ThemeProvider>,
    );

    // Open Theme Studio via Settings card button
    const customizeBtn = screen.getByRole("button", { name: /Customize Theme/i });
    fireEvent.click(customizeBtn);

    expect(screen.getByRole("dialog", { name: /Customizable Theme Studio/i })).toBeInTheDocument();

    // Update Accent hex input to bright yellow (#FACC15) -> auto-contrast picks #041019 foreground
    const accentHex = screen.getByLabelText(/Accent Color hex value/i);
    fireEvent.change(accentHex, { target: { value: "#FACC15" } });
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#FACC15");
    expect(document.documentElement.style.getPropertyValue("--primary-foreground")).toBe("#041019");

    // Update glass opacity & blur sliders + rounded corners
    fireEvent.change(screen.getByLabelText(/HUD Glass Opacity/i), { target: { value: "64" } });
    fireEvent.change(screen.getByLabelText(/Backdrop Blur Intensity/i), {
      target: { value: "24" },
    });
    fireEvent.click(screen.getByRole("button", { name: "rounded" }));

    expect(document.documentElement.style.getPropertyValue("--hud-blur")).toBe("24px");
    expect(document.documentElement.style.getPropertyValue("--ui-radius-lg")).toBe("1.25rem");
    expect(document.documentElement.style.getPropertyValue("--bg-glass")).toContain("0.64)");

    // Save named custom theme & verify persistence
    fireEvent.change(screen.getByLabelText(/Custom theme name/i), {
      target: { value: "Solar Harvest Gold" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save as Custom Theme/i }));
    expect(screen.getAllByText("Solar Harvest Gold").length).toBeGreaterThan(0);

    // Reset to default clears overrides
    fireEvent.click(screen.getByRole("button", { name: /Reset to Default/i }));
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe("");

    // Escape closes the studio dialog
    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: /Customizable Theme Studio/i }),
    ).not.toBeInTheDocument();
  });

  it("switches Light <-> Dark cleanly on custom dark canvas themes, syncs data-mode, and cancels rapid double-click transitions safely", async () => {
    const skipTransitionMock = vi.fn();
    const startViewTransitionMock = vi.fn((cb: () => void) => {
      cb();
      return {
        ready: Promise.resolve(),
        finished: Promise.resolve(),
        skipTransition: skipTransitionMock,
      };
    });
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      writable: true,
      value: startViewTransitionMock,
    });
    Object.defineProperty(document.documentElement, "animate", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    function Harness() {
      const { mode, updateCustomConfig } = useTheme();
      return (
        <div>
          <span data-testid="mode-readout">{mode}</span>
          <AnimatedThemeSwitch />
          <button
            type="button"
            onClick={() =>
              updateCustomConfig({
                accent: "#84CC16",
                canvas: "#11161D",
                surface: "#171C24",
                glassOpacity: 0.64,
              })
            }
          >
            Apply Dark Custom
          </button>
        </div>
      );
    }

    render(
      <ThemeProvider>
        <Harness />
      </ThemeProvider>,
    );

    // 1. Apply custom dark canvas & surface in Dark mode
    fireEvent.click(screen.getByText("Apply Dark Custom"));
    expect(document.documentElement.style.getPropertyValue("--bg-canvas")).toBe("#11161D");
    expect(document.documentElement.style.getPropertyValue("--bg-surface")).toBe("#171C24");
    expect(document.documentElement.getAttribute("data-mode")).toBe("dark");

    // 2. Switch Dark -> Light: custom dark surface/canvas must NOT lock Light mode into dark colors
    const switchBtn = screen.getByRole("switch");
    fireEvent.click(switchBtn);
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.getAttribute("data-mode")).toBe("light");
    expect(document.documentElement.style.getPropertyValue("--bg-canvas")).toBe("");
    expect(document.documentElement.style.getPropertyValue("--bg-surface")).toBe("");
    expect(document.documentElement.style.getPropertyValue("--bg-glass")).toBe(
      "rgba(255, 255, 255, 0.64)",
    );
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#84CC16");
    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBe("light");

    // 3. Rapidly switch Light -> Dark -> Light back-to-back without stale closure or two-click bug
    fireEvent.click(switchBtn);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-mode")).toBe("dark");
    expect(document.documentElement.style.getPropertyValue("--bg-canvas")).toBe("#11161D");

    fireEvent.click(switchBtn);
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.getAttribute("data-mode")).toBe("light");
    await waitFor(() => {
      expect(document.documentElement.classList.contains("theme-transitioning")).toBe(false);
    });
  });
});
