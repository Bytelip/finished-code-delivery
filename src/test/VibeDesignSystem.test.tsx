import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { VibeCosmicBackground } from "@/components/ui/VibeCosmicBackground";
import { BorderBeam } from "@/components/ui/BorderBeam";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { AgroDecisionCard } from "@/components/agro/AgroDecisionCard";
import { generateTelemetry } from "@/services/mockNasaTelemetry";

const mockTelemetry = generateTelemetry({
  lat: 13.1718,
  lon: 78.4416, // Mulabagilu, Karnataka
  borewellDepth: 60,
  season: "Kharif",
  scenario: "Nominal",
  irrigation: "Borewell",
});

describe("Vibe Design System Components", () => {
  describe("VibeCosmicBackground", () => {
    it("renders canvas and animated aurora mesh without crashing", () => {
      const { container, unmount } = render(<VibeCosmicBackground />);
      const canvas = container.querySelector("canvas");
      expect(canvas).toBeDefined();

      // Fire mousemove & resize events to ensure event handlers don't crash
      act(() => {
        window.dispatchEvent(new MouseEvent("mousemove", { clientX: 150, clientY: 200 }));
        window.dispatchEvent(new Event("resize"));
      });

      unmount();
    });
  });

  describe("BorderBeam", () => {
    it("renders glowing border beam with custom parameters", () => {
      const { container } = render(
        <BorderBeam
          size={200}
          duration={10}
          borderWidth={2}
          colorFrom="#38bdf8"
          colorTo="#10b981"
        />,
      );

      const beamElement = container.firstChild as HTMLElement;
      expect(beamElement).toBeDefined();
      expect(beamElement.style.padding).toBe("2px");
    });
  });

  describe("SpotlightCard", () => {
    it("tracks mouse movement and updates specular highlight", () => {
      const { container } = render(
        <SpotlightCard className="test-card">
          <span>Card Content</span>
        </SpotlightCard>,
      );

      expect(screen.getByText("Card Content")).toBeDefined();

      const card = container.querySelector(".test-card") as HTMLElement;
      expect(card).toBeDefined();

      // Trigger mouse enter and move
      fireEvent.mouseEnter(card);
      fireEvent.mouseMove(card, { clientX: 50, clientY: 80 });

      // Trigger mouse leave
      fireEvent.mouseLeave(card);
    });
  });

  describe("AgroDecisionCard Crop Shift Simulation Modal", () => {
    it("opens Compare & Simulate Shift modal and applies shift to farm plan", () => {
      render(<AgroDecisionCard telemetry={mockTelemetry} />);

      // Find the "Compare & Simulate Shift" buttons
      const compareButtons = screen.getAllByText(/Compare & Simulate Shift/i);
      expect(compareButtons.length).toBeGreaterThan(0);

      // Click the first compare button
      fireEvent.click(compareButtons[0]);

      // Verify modal content
      expect(screen.getByText(/Field Shift Suitability & Crop Comparison Engine/i)).toBeDefined();
      expect(screen.getByText(/BASELINE \(Conventional Paddy Rice\)/i)).toBeDefined();
      expect(screen.getByText(/SHIFT TARGET/i)).toBeDefined();
      expect(screen.getByText(/NASA 5-Factor Suitability Breakdown/i)).toBeDefined();

      // Click "Apply Shift to Farm Plan" CTA button
      const applyBtn = screen.getByText(/Apply Shift to Farm Plan/i);
      expect(applyBtn).toBeDefined();
      fireEvent.click(applyBtn);

      // Modal closes after applying
      expect(screen.queryByText(/Field Shift Suitability & Crop Comparison Engine/i)).toBeNull();
    });
  });
});
