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

    expect(screen.getByText(/3D Orbital/i)).toBeDefined();
    expect(screen.getByText(/2D Field GIS/i)).toBeDefined();
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

    const gisBtn = screen.getByText(/2D Field GIS/i);
    fireEvent.click(gisBtn);

    const orbitalBtn = screen.getByText(/3D Orbital/i);
    fireEvent.click(orbitalBtn);
  });

  it("renders all 8 NASA GIBS WMTS layer switcher pills and calls onLayer", () => {
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

    const layers: MapLayer[] = [
      "NDVI",
      "EVI",
      "LAI",
      "ECOSTRESS ESI",
      "SMAP Moisture",
      "GPM Rain",
      "FIRMS Fires",
      "Smoke AOD",
    ];

    for (const l of layers) {
      const btn = screen.getByRole("radio", { name: l });
      expect(btn).toBeDefined();
    }

    const smapBtn = screen.getByRole("radio", { name: "SMAP Moisture" });
    fireEvent.click(smapBtn);
    expect(onLayer).toHaveBeenCalledWith("SMAP Moisture");
  });

  it("displays the target reticle and layer readout HUD overlays", () => {
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

    expect(container.querySelector('[data-hud-overlay="reticle"]')).not.toBeNull();
    expect(container.querySelector('[data-hud-overlay="layer-readout"]')).not.toBeNull();
    expect(container.querySelector('[data-hud-overlay="layer-switcher"]')).not.toBeNull();
  });
});
