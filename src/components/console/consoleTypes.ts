import type { DashboardTab } from "@/types/agroSpace";

export type ConsoleView =
  | "overview"
  | "satellite-map"
  | "weather-soil"
  | "hazards"
  | "data-explorer"
  | "services"
  | "settings";

export interface ConsoleNavItem {
  id: ConsoleView;
  label: string;
  description: string;
  section: "MISSION" | "OPERATIONS" | "SYSTEM";
  shortcut: string;
  chordKey: string;
  badge?: "NEW";
}

export const CONSOLE_NAV_ITEMS: ConsoleNavItem[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Mission & Field Overview",
    section: "MISSION",
    shortcut: "G O",
    chordKey: "o",
  },
  {
    id: "satellite-map",
    label: "Satellite Map",
    description: "NASA GIBS WMTS & 3D/2D Field Map",
    section: "MISSION",
    shortcut: "G M",
    chordKey: "m",
  },
  {
    id: "weather-soil",
    label: "Weather & Soil",
    description: "NASA POWER Agroclimatology & Crop Metrics",
    section: "MISSION",
    shortcut: "G W",
    chordKey: "w",
  },
  {
    id: "hazards",
    label: "Hazard Advisors",
    description: "Frost, Drought, Storm & Multi-Hazard Alerts",
    section: "OPERATIONS",
    shortcut: "G H",
    chordKey: "h",
  },
  {
    id: "data-explorer",
    label: "Data Explorer",
    description: "Split-Pane Query & Telemetry Time-Series",
    section: "OPERATIONS",
    shortcut: "G E",
    chordKey: "e",
    badge: "NEW",
  },
  {
    id: "services",
    label: "Field Services",
    description: "Active NASA Data Streams & Sensor Endpoints",
    section: "OPERATIONS",
    shortcut: "G F",
    chordKey: "f",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Field Parameters, Theme & Operator Profile",
    section: "SYSTEM",
    shortcut: "G ,",
    chordKey: ",",
  },
];

export function mapConsoleViewToDashboardTab(view: ConsoleView): DashboardTab {
  switch (view) {
    case "weather-soil":
      return "groundwater";
    case "hazards":
      return "hazards";
    case "services":
      return "granules";
    case "overview":
    case "satellite-map":
    case "data-explorer":
    case "settings":
    default:
      return "overview";
  }
}
