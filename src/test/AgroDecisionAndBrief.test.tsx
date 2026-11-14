import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AgroDecisionCard } from "@/components/agro/AgroDecisionCard";
import { NasaMissionBriefModal } from "@/components/NasaMissionBriefModal";
import { generateTelemetry } from "@/services/mockNasaTelemetry";

const mockTelemetry = generateTelemetry({
  lat: 13.175,
  lon: 78.4192,
  borewellDepth: 60,
  season: "Kharif",
  scenario: "Nominal",
  irrigation: "Borewell",
});

describe("AgroDecisionCard & NasaMissionBriefModal", () => {
  it("renders AgroDecisionCard with AI health gauge, satellite metrics, and export button", () => {
    const onExport = vi.fn();
    render(<AgroDecisionCard telemetry={mockTelemetry} onExportReport={onExport} />);

    expect(screen.getByText(/AI Agronomic & Climate Decision Engine/i)).toBeDefined();
    expect(screen.getByText(/NDVI Vigor/i)).toBeDefined();
    expect(screen.getByText(/Root Moisture/i)).toBeDefined();
    expect(screen.getByText(/Evapo ESI/i)).toBeDefined();
    expect(screen.getByText(/Rainfall/i)).toBeDefined();

    const exportBtn = screen.getByText(/Export NASA Field Report/i);
    expect(exportBtn).toBeDefined();
    fireEvent.click(exportBtn);
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it("renders NasaMissionBriefModal with satellite constellations and tab navigation", () => {
    const onClose = vi.fn();
    render(<NasaMissionBriefModal isOpen={true} onClose={onClose} />);

    expect(screen.getByText(/AgroSpace Nexus: Mission Architecture Brief/i)).toBeDefined();
    expect(screen.getByText(/8 SATELLITE CONSTELLATIONS/i)).toBeDefined();
    expect(screen.getByText(/4-STAGE 3D\/2D WEBGL PIPELINE/i)).toBeDefined();
    expect(screen.getByText(/GLOBAL FOOD SECURITY & IMPACT/i)).toBeDefined();

    // Click on 4-stage pipeline tab
    fireEvent.click(screen.getByText(/4-STAGE 3D\/2D WEBGL PIPELINE/i));
    expect(screen.getByText(/STAGE 1: ORBITAL/i)).toBeDefined();
    expect(screen.getByText(/STAGE 4: 2D GIS/i)).toBeDefined();

    // Click on Impact tab
    fireEvent.click(screen.getByText(/GLOBAL FOOD SECURITY & IMPACT/i));
    expect(screen.getByText(/34%/i)).toBeDefined();
    expect(screen.getByText(/Water Savings/i)).toBeDefined();

    // Launch HUD button calls onClose
    const launchBtn = screen.getByText(/Launch Live Mission HUD/i);
    fireEvent.click(launchBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
