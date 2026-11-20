import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HazardAlertCenter } from "@/components/HazardAlertCenter";
import { generateTelemetry } from "@/services/mockNasaTelemetry";

describe("HazardAlertCenter", () => {
  const telemetry = generateTelemetry({
    lat: 13.13,
    lon: 78.13,
    borewellDepth: 60,
    season: "Kharif",
    scenario: "Cat-4 Cyclone",
    irrigation: "Borewell",
  });

  it("renders inside element with id 'hazard-matrix-slot'", () => {
    const { container } = render(<HazardAlertCenter telemetry={telemetry} variant="full" />);
    const section = container.querySelector("#hazard-matrix-slot");
    expect(section).toBeInTheDocument();
  });

  it("renders all 8 tactical hazard alerts in full mode", () => {
    render(<HazardAlertCenter telemetry={telemetry} variant="full" initialLanguage="en" />);

    expect(screen.getByText(/Cyclone & Severe Storm/i)).toBeInTheDocument();
    expect(screen.getByText(/Earthquake & Liquefaction/i)).toBeInTheDocument();
    expect(screen.getByText(/Solar Winds, CME & Geomagnetic Storm/i)).toBeInTheDocument();
    expect(screen.getByText(/Solar Eclipse Photoperiod Dip/i)).toBeInTheDocument();
    expect(screen.getByText(/Stubble Fire & Smoke Dimming/i)).toBeInTheDocument();
    expect(screen.getByText(/Flood & Root Hypoxia/i)).toBeInTheDocument();
    expect(screen.getByText(/Heatwave, Frost & Fungal Blight/i)).toBeInTheDocument();
    expect(screen.getByText(/High Wind Spray Drift/i)).toBeInTheDocument();
  });

  it("switches language between English, Hindi, and Kannada", () => {
    const { rerender } = render(<HazardAlertCenter telemetry={telemetry} variant="full" initialLanguage="en" />);
    expect(screen.getByText(/Hazard Alert Matrix/i)).toBeInTheDocument();

    // Re-render in Hindi
    rerender(<HazardAlertCenter telemetry={telemetry} variant="full" initialLanguage="hi" />);
    expect(screen.getByText(/चक्रवात और भीषण तूफान/i)).toBeInTheDocument();

    // Re-render in Kannada
    rerender(<HazardAlertCenter telemetry={telemetry} variant="full" initialLanguage="kn" />);
    expect(screen.getByText(/ಚಂಡಮಾರುತ ಮತ್ತು ತೀವ್ರ ಬಿರುಗಾಳಿ/i)).toBeInTheDocument();
  });

  it("allows farmer to interactively check mitigation steps", () => {
    render(<HazardAlertCenter telemetry={telemetry} variant="full" initialLanguage="en" />);

    // Locate first checklist step
    const firstStep = screen.getByText(/Dig radial drainage trenches/i);
    expect(firstStep).toBeInTheDocument();

    const stepButton = firstStep.closest("button");
    expect(stepButton).not.toBeNull();
    if (stepButton) {
      fireEvent.click(stepButton);
      expect(stepButton.className).toContain("line-through");
    }
  });

  it("opens Farmer Advisory Report modal and triggers print", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<HazardAlertCenter telemetry={telemetry} variant="full" initialLanguage="en" />);

    const openModalBtn = screen.getByRole("button", { name: /Farmer Advisory Bulletin/i });
    fireEvent.click(openModalBtn);

    // Verify modal is displayed with official title
    expect(screen.getByText(/AgroSpace Nexus — Farmer Advisory Bulletin/i)).toBeInTheDocument();
    expect(screen.getByText(/REF-ASN-NASA-2026/i)).toBeInTheDocument();

    // Trigger Print
    const printBtn = screen.getByRole("button", { name: /Print Official Bulletin/i });
    fireEvent.click(printBtn);
    expect(printSpy).toHaveBeenCalled();

    printSpy.mockRestore();
  });
});
