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
});
