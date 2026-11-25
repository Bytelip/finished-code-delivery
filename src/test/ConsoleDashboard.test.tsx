import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { generateTelemetry } from "@/services/mockNasaTelemetry";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import {
  CommandPaletteModal,
  ConsoleDataExplorerView,
  ConsoleHazardsView,
  ConsoleOverviewView,
  ConsoleServicesView,
  ConsoleSidebarRail,
  ConsoleTopBar,
} from "@/components/console";
import type { LiveApiStatus } from "@/services/nasaLiveApiService";
import { createInitialProfile } from "@/types/userProfile";

const baseTelemetry = generateTelemetry({
  lat: 12.6622,
  lon: 77.4503,
  borewellDepth: 60,
  season: "Kharif",
  scenario: "Nominal",
  irrigation: "Borewell",
});

const mockLiveStatus: LiveApiStatus = {
  isLive: true,
  activeFeeds: ["NASA POWER AG", "NASA EONET v3", "Open-Meteo Soil"],
  failedFeeds: [],
  timestamp: "2026-11-25T10:00:00Z",
};

describe("AgroSpace Dark Console UI", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders ConsoleTopBar breadcrumbs, Ctrl K trigger, and avatar Sign Out menu", () => {
    const onOpenCommandPalette = vi.fn();
    const onOpenConnect = vi.fn();
    const onSignOut = vi.fn();

    render(
      <ConsoleTopBar
        regionLabel="Harohalli Basin, India"
        lat={12.6622}
        lon={77.4503}
        scenario="Nominal"
        isLive={true}
        isLoadingLive={false}
        activeHazards={0}
        user={createInitialProfile("asha@agrospace.io", "Google", "Asha Rao")}
        onToggleMobileDrawer={vi.fn()}
        onSelectPreset={vi.fn()}
        onNavigateView={vi.fn()}
        onOpenConnect={onOpenConnect}
        onOpenCommandPalette={onOpenCommandPalette}
        onOpenHelp={vi.fn()}
        onRefreshTelemetry={vi.fn()}
        onOpenAccountSettings={vi.fn()}
        onNavigateHome={vi.fn()}
        onSignOut={onSignOut}
      />,
    );

    expect(screen.getByText("AgroSpace Ops")).toBeDefined();
    expect(screen.getByText("Harohalli Basin")).toBeDefined();
    expect(screen.getByText("LIVE")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Open command palette search/i }));
    expect(onOpenCommandPalette).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Connect/i }));
    expect(onOpenConnect).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Operator Account Menu/i }));
    fireEvent.click(screen.getByRole("button", { name: /Sign Out/i }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("renders hover-expanding ConsoleSidebarRail with section groups, NEW badge, and view switching", () => {
    const onSelectView = vi.fn();

    render(
      <ConsoleSidebarRail
        activeView="overview"
        onSelectView={onSelectView}
        activeHazards={2}
        isLive={true}
        mobileOpen={false}
        onCloseMobile={vi.fn()}
        onOpenConnect={vi.fn()}
        onRefreshTelemetry={vi.fn()}
      />,
    );

    const rail = screen.getByLabelText("Console Navigation Rail");
    expect(rail.getAttribute("style")).toContain("width: 52px");

    fireEvent.mouseEnter(rail);
    expect(rail.getAttribute("style")).toContain("width: 236px");
    expect(screen.getByText("NEW")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Data Explorer/i }));
    expect(onSelectView).toHaveBeenCalledWith("data-explorer");
  });

  it("renders ConsoleOverviewView metrics, copyable coordinates/API endpoint, and telemetry strip", () => {
    render(
      <ConsoleOverviewView
        telemetry={baseTelemetry}
        liveStatus={mockLiveStatus}
        isLoadingLive={false}
        activeHazards={0}
        onNavigateView={vi.fn()}
        onOpenConnect={vi.fn()}
      />,
    );

    expect(screen.getByText("Active Field Node")).toBeDefined();
    expect(screen.getByText("System Status")).toBeDefined();
    expect(screen.getByText("12.6622, 77.4503")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Copy coordinates/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("12.6622, 77.4503");
  });

  it("renders ConsoleHazardsView status tabs, clean critical empty state, and #hazard-matrix-slot", () => {
    const { container } = render(
      <ThemeProvider>
        <LanguageProvider>
          <ConsoleHazardsView
            telemetry={baseTelemetry}
            isLoadingLive={false}
            onRefresh={vi.fn()}
            onExportAdvisory={vi.fn()}
          />
        </LanguageProvider>
      </ThemeProvider>,
    );

    expect(screen.getByText("All Advisors")).toBeDefined();
    expect(screen.getByText("Critical / Errors")).toBeDefined();
    expect(container.querySelector("#hazard-matrix-slot")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Critical \/ Errors/i }));
    expect(screen.getByText("No hazards in this category")).toBeDefined();
  });

  it("filters ConsoleServicesView endpoints and copies endpoint URL", () => {
    render(
      <ThemeProvider>
        <LanguageProvider>
          <ConsoleServicesView
            telemetry={baseTelemetry}
            liveStatus={mockLiveStatus}
            isLoadingLive={false}
            onRefresh={vi.fn()}
            onOpenConnect={vi.fn()}
          />
        </LanguageProvider>
      </ThemeProvider>,
    );

    expect(screen.getByText("NASA POWER Agroclimatology")).toBeDefined();
    expect(screen.getByText("ISRIC SoilGrids v2.0")).toBeDefined();

    const search = screen.getByLabelText("Search endpoints");
    fireEvent.change(search, { target: { value: "POWER" } });

    expect(screen.getByText("NASA POWER Agroclimatology")).toBeDefined();
    expect(screen.queryByText("ISRIC SoilGrids v2.0")).toBeNull();
  });

  it("supports split-pane Data Explorer tabs, + New query, and Results/Chart switching", () => {
    render(
      <ConsoleDataExplorerView
        telemetry={baseTelemetry}
        liveStatus={mockLiveStatus}
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByText("Favorites")).toBeDefined();
    expect(screen.getByText("Saved Views")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /New/i }));
    expect(screen.getAllByText("custom_query_1").length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole("button", { name: /Chart/i }));
    expect(screen.getByLabelText("Telemetry query inspector")).toBeDefined();
  });

  it("filters and navigates from CommandPaletteModal", () => {
    const onNavigateView = vi.fn();
    const onClose = vi.fn();

    render(
      <CommandPaletteModal
        open={true}
        onClose={onClose}
        onNavigateView={onNavigateView}
        onSelectPreset={vi.fn()}
        onSelectPlace={vi.fn()}
        onRefreshTelemetry={vi.fn()}
        onOpenConnect={vi.fn()}
        onOpenMissionBrief={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Hazard Advisors"));
    expect(onNavigateView).toHaveBeenCalledWith("hazards");
    expect(onClose).toHaveBeenCalled();
  });
});
