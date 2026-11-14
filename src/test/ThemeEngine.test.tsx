import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { ThemeProvider, useTheme, AVAILABLE_THEMES, THEME_CONFIGS } from "@/context/ThemeContext";
import { ThemeSwitcher, ThemeSettingsCard } from "@/components/theme/ThemeSwitcher";

function TestConsumer() {
  const {
    theme,
    setTheme,
    currentConfig,
    availableThemes,
    customSettings,
    updateCustomSettings,
    resetCustomSettings,
  } = useTheme();
  return (
    <div>
      <span data-testid="active-theme">{theme}</span>
      <span data-testid="active-name">{currentConfig.name}</span>
      <span data-testid="active-badge">{currentConfig.badge}</span>
      <span data-testid="theme-count">{availableThemes.length}</span>
      <span data-testid="custom-accent">{customSettings.accentColor}</span>
      <span data-testid="custom-bg">{customSettings.backgroundColor}</span>
      <button onClick={() => setTheme("monochrome-dark")}>Set Onyx Dark</button>
      <button onClick={() => setTheme("monochrome-light")}>Set Alabaster Light</button>
      <button onClick={() => setTheme("champagne-gold")}>Set Gold</button>
      <button onClick={() => setTheme("emerald-terra")}>Set Emerald</button>
      <button
        onClick={() => {
          setTheme("custom");
          updateCustomSettings({ accentColor: "#FF007F", backgroundColor: "#02040A", blurPx: 20 });
        }}
      >
        Set Custom Neon
      </button>
      <button onClick={resetCustomSettings}>Reset Custom</button>
    </div>
  );
}

describe("Multi-Theme Engine & Switcher", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
  });

  it("initializes with default orbital-cyan theme and sets html attributes", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("active-theme").textContent).toBe("orbital-cyan");
    expect(screen.getByTestId("active-name").textContent).toBe("Orbital Sapphire");
    expect(screen.getByTestId("theme-count").textContent).toBe("5");
    expect(document.documentElement.getAttribute("data-theme")).toBe("orbital-cyan");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("persists and updates theme to monochrome-dark (Onyx Monochrome)", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByText("Set Onyx Dark"));
    });

    expect(screen.getByTestId("active-theme").textContent).toBe("monochrome-dark");
    expect(screen.getByTestId("active-name").textContent).toBe("Onyx Monochrome");
    expect(localStorage.getItem("agro_theme")).toBe("monochrome-dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("monochrome-dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("updates theme to monochrome-light (Alabaster Daylight) and switches to light class", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByText("Set Alabaster Light"));
    });

    expect(screen.getByTestId("active-theme").textContent).toBe("monochrome-light");
    expect(screen.getByTestId("active-name").textContent).toBe("Alabaster Daylight");
    expect(document.documentElement.getAttribute("data-theme")).toBe("monochrome-light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("switches to luxury champagne-gold and emerald-terra themes", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByText("Set Gold"));
    });
    expect(screen.getByTestId("active-theme").textContent).toBe("champagne-gold");
    expect(screen.getByTestId("active-name").textContent).toBe("Obsidian & Gold");
    expect(document.documentElement.getAttribute("data-theme")).toBe("champagne-gold");

    act(() => {
      fireEvent.click(screen.getByText("Set Emerald"));
    });
    expect(screen.getByTestId("active-theme").textContent).toBe("emerald-terra");
    expect(screen.getByTestId("active-name").textContent).toBe("Emerald Biosphere");
    expect(document.documentElement.getAttribute("data-theme")).toBe("emerald-terra");
  });

  it("supports Custom User Theme with dynamic accent, background and CSS variables", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByText("Set Custom Neon"));
    });

    expect(screen.getByTestId("active-theme").textContent).toBe("custom");
    expect(screen.getByTestId("active-name").textContent).toBe("Custom User Theme");
    expect(screen.getByTestId("custom-accent").textContent).toBe("#FF007F");
    expect(document.documentElement.getAttribute("data-theme")).toBe("custom");
    expect(document.documentElement.style.getPropertyValue("--accent-primary")).toBe("#FF007F");
    expect(document.documentElement.style.getPropertyValue("--bg-primary")).toBe("#02040A");
    expect(document.documentElement.style.getPropertyValue("--hud-blur")).toBe("20px");
  });

  it("renders ThemeSwitcher trigger button and shows current theme details", () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    const trigger = screen.getByTitle(/active theme/i);
    expect(trigger).toBeInTheDocument();
    expect(trigger.getAttribute("title")).toContain("Orbital Sapphire");
  });

  it("renders ThemeSettingsCard and allows clicking theme options", () => {
    render(
      <ThemeProvider>
        <ThemeSettingsCard />
      </ThemeProvider>,
    );

    expect(screen.getByText(/Interface Appearance & Theme/i)).toBeInTheDocument();
    expect(screen.getByText("5 Presets + Custom Builder")).toBeInTheDocument();

    const onyxBtn = screen.getByRole("button", { name: /Onyx Monochrome/i });
    expect(onyxBtn).toBeInTheDocument();

    act(() => {
      fireEvent.click(onyxBtn);
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("monochrome-dark");
  });
});
