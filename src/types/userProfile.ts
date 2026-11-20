/**
 * User Profile & Mission Control Preferences Contract
 * Supports Email OTP verification, Google/Microsoft/Apple OAuth, and customizable telemetry preferences.
 */
import { type UserProfile, getStoredUser, saveStoredUser } from "@/components/CosmicAuthPage";

export { type UserProfile, getStoredUser, saveStoredUser };

export type AuthProvider = "Google" | "Microsoft" | "Apple" | "Lovable" | "Email";
export type OperatorRole = string;

export function createInitialProfile(
  email: string,
  provider: "Google" | "Microsoft" | "Apple" | "Lovable" | "Email" = "Email",
  customName?: string,
): UserProfile {
  const emailPrefix = email.split("@")[0] || "operator";
  const cleanName =
    customName ||
    emailPrefix
      .replace(/[._-]/g, " ")
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ") ||
    "Commander Naren";

  return {
    id: `usr_${Date.now()}`,
    name: cleanName,
    fullName: cleanName,
    email: email.trim().toLowerCase(),
    provider,
    verified: true,
    isVerified: true,
    role: "Mission Commander",
    avatarColor:
      provider === "Google"
        ? "#4285F4"
        : provider === "Microsoft"
          ? "#00A4EF"
          : provider === "Apple"
            ? "#A2AAAD"
            : "#06B6D4",
    homeLocation: "Kolar Plateau, Karnataka (13.1367° N, 78.1292° E)",
    defaultView: "3D",
    defaultLayer: "NDVI",
    units: "metric",
    hazardAlerts: true,
    preferences: {
      homeBaseName: "Kolar Plateau, Karnataka",
      homeCoords: {
        lat: 13.1367,
        lon: 78.1292,
      },
      defaultViewMode: "3d",
      defaultActiveLayer: "NDVI",
      units: "metric",
    },
    notifications: {
      cycloneAlerts: true,
      usgsQuakeAlerts: true,
      droughtAlerts: true,
      emailAlerts: true,
    },
    callsign: "Flight Director",
  };
}

export function loadStoredProfile(): UserProfile | null {
  return getStoredUser();
}

export function saveStoredProfile(profile: UserProfile): void {
  saveStoredUser(profile);
}

export function clearStoredProfile(): void {
  saveStoredUser(null);
}
