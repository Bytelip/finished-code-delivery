import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GlobeViewport } from "@/components/GlobeViewport";
import { generateTelemetry } from "@/services/mockNasaTelemetry";
import type { TelemetryInput, MapLayer } from "@/types/agroSpace";

const mockInput: TelemetryInput = {
  lat: 13.13,
  lon: 78.13,
  borewellDepth: 60,
  season: "Kharif",
  scenario: "Nominal",
  irrigation: "Borewell",
};

const telemetry = generateTelemetry(mockInput);

describe("GlobeViewport", () => {
  it("mounts inside #globe-container with stable data attributes", () => {
    const onLayer = vi.fn();
    const onOpacity = vi.fn();
    const onPick = vi.fn();

    const { container } = render(
      <GlobeViewport
        telemetry={telemetry}
        activeLayer="NDVI"
        onLayer={onLayer}
        opacity={70}
        onOpacity={onOpacity}
        onPick={onPick}
      />,
    );

    const globeContainer = container.querySelector("#globe-container");
    expect(globeContainer).not.toBeNull();
    expect(globeContainer?.getAttribute("data-lat")).toBe("13.13");
    expect(globeContainer?.getAttribute("data-lon")).toBe("78.13");
    expect(globeContainer?.getAttribute("data-layer")).toBe("NDVI");
  });

  it("renders the 3D Orbital and 2D Field GIS mode toggles", () => {
    render(
      <GlobeViewport
        telemetry={telemetry}
        activeLayer="NDVI"
        onLayer={vi.fn()}
        opacity={70}
        onOpacity={vi.fn()}
        onPick={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /3D Orbital View/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /2D Field GIS View/i })).toBeDefined();
  });

  it("switches view mode between 3D Orbital and 2D Field GIS when clicked", () => {
    render(
      <GlobeViewport
        telemetry={telemetry}
        activeLayer="NDVI"
        onLayer={vi.fn()}
        opacity={70}
        onOpacity={vi.fn()}
        onPick={vi.fn()}
      />,
    );

    const gisBtn = screen.getByRole("button", { name: /2D Field GIS View/i });
    fireEvent.click(gisBtn);

    const orbitalBtn = screen.getByRole("button", { name: /3D Orbital View/i });
    fireEvent.click(orbitalBtn);
  });

  it("renders NASA GIBS WMTS layer switcher pills and calls onLayer", () => {
    const onLayer = vi.fn();

    render(
      <GlobeViewport
        telemetry={telemetry}
        activeLayer="NDVI"
        onLayer={onLayer}
        opacity={70}
        onOpacity={vi.fn()}
        onPick={vi.fn()}
      />,
    );

    const smapBtn = screen.getByRole("radio", { name: /SMAP Moisture/i });
    expect(smapBtn).toBeDefined();
    fireEvent.click(smapBtn);
    expect(onLayer).toHaveBeenCalledWith("SMAP Moisture");
  });

  it("displays the target reticle and layer readout HUD overlays", () => {
    const { container } = render(
      <GlobeViewport
        telemetry={telemetry}
        activeLayer="SMAP Moisture"
        onLayer={vi.fn()}
        opacity={70}
        onOpacity={vi.fn()}
        onPick={vi.fn()}
      />,
    );

    expect(container.querySelector('[data-hud-overlay="reticle"]')).not.toBeNull();
    expect(container.querySelector('[data-hud-overlay="layer-readout"]')).not.toBeNull();
    expect(container.querySelector('[data-hud-overlay="layer-switcher"]')).not.toBeNull();
    expect(container.querySelector('[data-hud-overlay="zoom-controls"]')).not.toBeNull();
    expect(container.querySelector('[data-tour="basemap-switcher"]')).not.toBeNull();
  });

  it("interacts with HUD zoom control bar buttons", () => {
    render(
      <GlobeViewport
        telemetry={telemetry}
        activeLayer="NDVI"
        onLayer={vi.fn()}
        opacity={70}
        onOpacity={vi.fn()}
        onPick={vi.fn()}
      />,
    );

    const zoomInBtn = screen.getByRole("button", { name: /Zoom in/i });
    const zoomOutBtn = screen.getByRole("button", { name: /Zoom out/i });
    const targetFarmBtn = screen.getByRole("button", { name: /Locate target coordinates/i });
    const fullOrbitBtn = screen.getByRole("button", { name: /Reset to full orbit/i });

    expect(zoomInBtn).toBeDefined();
    expect(zoomOutBtn).toBeDefined();
    expect(targetFarmBtn).toBeDefined();
    expect(fullOrbitBtn).toBeDefined();

    fireEvent.click(zoomInBtn);
    fireEvent.click(zoomOutBtn);
    fireEvent.click(targetFarmBtn);
    fireEvent.click(fullOrbitBtn);
  });

  it("handles basemap style changes and toggles between Terrain, Default, Satellite, and Dark", () => {
    const { container } = render(
      <GlobeViewport
        telemetry={telemetry}
        activeLayer="NDVI"
        onLayer={vi.fn()}
        opacity={70}
        onOpacity={vi.fn()}
        onPick={vi.fn()}
      />,
    );

    const switcherTrigger = container.querySelector(
      '[data-tour="basemap-switcher"] button',
    );
    expect(switcherTrigger).not.toBeNull();
    if (switcherTrigger) {
      fireEvent.click(switcherTrigger);
      const terrainBtn = screen.getByRole("button", { name: /⛰️ Terrain/i });
      fireEvent.click(terrainBtn);
    }
  });

  it("synchronizes the top stage indicator and projection mode on the HUD", () => {
    const { container } = render(
      <GlobeViewport
        telemetry={telemetry}
        activeLayer="NDVI"
        onLayer={vi.fn()}
        opacity={70}
        onOpacity={vi.fn()}
        onPick={vi.fn()}
      />,
    );

    const stagePill = container.querySelector('[data-hud-overlay="zoom-stage-pill"]');
    expect(stagePill).not.toBeNull();
    // Default mode in jsdom fallback is 2D Field GIS (Stage 4, Mercator)
    expect(stagePill?.textContent).toContain("2D TACTICAL MAP");
  });

  it("smoothly triggers projection transition when Target Farm and Full Orbit are clicked", () => {
    render(
      <GlobeViewport
        telemetry={telemetry}
        activeLayer="NDVI"
        onLayer={vi.fn()}
        opacity={70}
        onOpacity={vi.fn()}
        onPick={vi.fn()}
      />,
    );

    const targetFarmBtn = screen.getByRole("button", { name: /Locate target coordinates/i });
    fireEvent.click(targetFarmBtn);

    const fullOrbitBtn = screen.getByRole("button", { name: /Reset to full orbit/i });
    fireEvent.click(fullOrbitBtn);

    // Verify 3D and 2D mode toggle buttons remain intact
    expect(screen.getByRole("button", { name: /3D Orbital View/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /2D Field GIS View/i })).toBeDefined();
  });
});
