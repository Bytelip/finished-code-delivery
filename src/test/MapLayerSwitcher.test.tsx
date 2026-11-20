import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MapLayerSwitcher, BASEMAP_OPTIONS } from "@/components/map/MapLayerSwitcher";

describe("MapLayerSwitcher", () => {
  it("renders the compact floating basemap layers button", () => {
    render(
      <MapLayerSwitcher
        currentStyle="satellite"
        onStyleChange={vi.fn()}
        showLabels={true}
        onToggleLabels={vi.fn()}
        enable3dTerrain={true}
        onToggle3dTerrain={vi.fn()}
        viewMode="3d"
      />,
    );

    expect(screen.getByText("Basemap")).toBeDefined();
    expect(screen.getByText("Satellite")).toBeDefined();
  });

  it("expands popover on click and shows all 4 basemap options with labels", () => {
    const onStyleChange = vi.fn();
    render(
      <MapLayerSwitcher
        currentStyle="satellite"
        onStyleChange={onStyleChange}
        showLabels={true}
        onToggleLabels={vi.fn()}
        enable3dTerrain={true}
        onToggle3dTerrain={vi.fn()}
        viewMode="3d"
      />,
    );

    // Click the button to expand
    const trigger = screen.getByTitle("Change Basemap & Terrain Layers");
    fireEvent.click(trigger);

    // All 4 basemap options must be displayed
    for (const opt of BASEMAP_OPTIONS) {
      expect(screen.getAllByText(opt.label).length).toBeGreaterThan(0);
    }

    // Click "Terrain" option
    const terrainBtn = screen.getByRole("button", { name: /⛰️ Terrain/i });
    fireEvent.click(terrainBtn);
    expect(onStyleChange).toHaveBeenCalledWith("terrain");
  });

  it("handles Place Labels and 3D Terrain mesh checkboxes", () => {
    const onToggleLabels = vi.fn();
    const onToggle3dTerrain = vi.fn();

    render(
      <MapLayerSwitcher
        currentStyle="satellite"
        onStyleChange={vi.fn()}
        showLabels={true}
        onToggleLabels={onToggleLabels}
        enable3dTerrain={true}
        onToggle3dTerrain={onToggle3dTerrain}
        viewMode="3d"
      />,
    );

    // Expand menu
    const trigger = screen.getByTitle("Change Basemap & Terrain Layers");
    fireEvent.click(trigger);

    const labelsCheckbox = screen.getByLabelText(/Place Labels & Borders/i);
    fireEvent.click(labelsCheckbox);
    expect(onToggleLabels).toHaveBeenCalledWith(false);

    const terrainCheckbox = screen.getByLabelText(/3D Terrain Relief Mesh/i);
    fireEvent.click(terrainCheckbox);
    expect(onToggle3dTerrain).toHaveBeenCalledWith(false);
  });
});
