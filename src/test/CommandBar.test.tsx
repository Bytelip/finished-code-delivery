import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CommandBar } from "@/components/agro/CommandBar";
import * as preciseLocationModule from "@/utils/preciseLocation";

describe("CommandBar Location & Search", () => {
  const defaultProps = {
    lat: 13.13,
    lon: 78.13,
    borewellDepth: 60,
    irrigation: "Borewell" as const,
    season: "Kharif" as const,
    scenario: "Nominal" as const,
    onLocation: vi.fn(),
    onDepth: vi.fn(),
    onIrrigation: vi.fn(),
    onSeason: vi.fn(),
    onScenario: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("triggers high-precision GPS resolution and shows accuracy badge", async () => {
    vi.spyOn(preciseLocationModule, "resolvePreciseLocation").mockResolvedValue({
      lat: 13.14,
      lon: 78.15,
      accuracy: 24,
      source: "gps-high-accuracy",
      isFallback: false,
      isCoarse: false,
    });

    render(<CommandBar {...defaultProps} />);

    const gpsBtn = screen.getByRole("button", { name: /Acquire high-precision GPS location/i });
    fireEvent.click(gpsBtn);

    await waitFor(() => {
      expect(defaultProps.onLocation).toHaveBeenCalledWith(13.14, 78.15, undefined);
    });

    // Verify accuracy badge
    expect(screen.getByText(/±24m/i)).toBeInTheDocument();
  });

  it("searches OpenStreetMap Nominatim and updates location on selection", async () => {
    vi.spyOn(preciseLocationModule, "searchNominatimPlaces").mockResolvedValue([
      {
        placeId: "101",
        displayName: "Kolar, Karnataka, India",
        shortName: "Kolar",
        lat: 13.1367,
        lon: 78.1292,
        type: "town",
      },
    ]);

    render(<CommandBar {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/Search village, town, pincode/i);
    fireEvent.change(searchInput, { target: { value: "Kolar" } });

    // Wait for dropdown
    await waitFor(() => {
      expect(screen.getByText("Kolar, Karnataka, India")).toBeInTheDocument();
    });

    // Click result
    const placeItem = screen.getByText("Kolar, Karnataka, India");
    fireEvent.click(placeItem);

    expect(defaultProps.onLocation).toHaveBeenCalledWith(13.1367, 78.1292, "Kolar");
  });

  it("displays insecure LAN warning banner and HTTPS switch link when GPS is blocked on network IP", async () => {
    vi.spyOn(preciseLocationModule, "resolvePreciseLocation").mockResolvedValue({
      lat: 12.97,
      lon: 77.59,
      accuracy: 5000,
      source: "ip-fallback",
      isFallback: true,
      isCoarse: true,
      networkBlocked: true,
    });

    render(<CommandBar {...defaultProps} />);

    const gpsBtn = screen.getByRole("button", { name: /Acquire high-precision GPS location/i });
    fireEvent.click(gpsBtn);

    await waitFor(() => {
      expect(screen.getByText(/Switch to HTTPS/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/chrome:\/\/flags/i)).toBeInTheDocument();
  });
});
