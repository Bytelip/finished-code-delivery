/**
 * User Profile & Mission Control Preferences Contract
 * Supports Email OTP verification, Google/Microsoft/Apple OAuth, and customizable telemetry preferences.
 */

export type AuthProvider = "Google" | "Microsoft" | "Apple" | "Email OTP";
export type OperatorRole = "COMMANDER" | "OPERATOR" | "AGRONOMIST" | "RESEARCHER";

export interface UserPreferences {
  homeBaseName: string;
  homeCoords: {
    lat: number;
    lon: number;
  };
  defaultViewMode: "3d" | "2d";
  defaultActiveLayer: string;
  units: "metric" | "imperial";
}

export interface NotificationSettings {
  cycloneAlerts: boolean;
  usgsQuakeAlerts: boolean;
  droughtAlerts: boolean;
  emailAlerts: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  callsign: string;
  role: OperatorRole;
  avatarUrl?: string;
  avatarColor: string;
  isVerified: boolean;
  provider: AuthProvider;
  verifiedAt: string;
  preferences: UserPreferences;
  notifications: NotificationSettings;
  apiKeys?: {
    nasaApiKey?: string;
  };
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  homeBaseName: "Kolar Plateau, Karnataka",
  homeCoords: {
    lat: 13.1367,
    lon: 78.1292,
  },
  defaultViewMode: "3d",
  defaultActiveLayer: "NDVI",
  units: "metric",
};

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  cycloneAlerts: true,
  usgsQuakeAlerts: true,
  droughtAlerts: true,
  emailAlerts: true,
};

export function createInitialProfile(
  email: string,
  provider: AuthProvider = "Email OTP",
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
    "Orbital Commander";

  return {
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    email: email.trim().toLowerCase(),
    fullName: cleanName,
    callsign: "Flight Director",
    role: "COMMANDER",
    avatarColor:
      provider === "Google"
        ? "#4285F4"
        : provider === "Microsoft"
          ? "#00A4EF"
          : provider === "Apple"
            ? "#A2AAAD"
            : "#00F0FF",
    isVerified: true,
    provider,
    verifiedAt: new Date().toISOString(),
    preferences: { ...DEFAULT_PREFERENCES },
    notifications: { ...DEFAULT_NOTIFICATIONS },
    apiKeys: {
      nasaApiKey: "",
    },
  };
}

export function loadStoredProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("agro_user_profile");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.email === "string") {
        return {
          ...createInitialProfile(parsed.email, parsed.provider || "Email OTP"),
          ...parsed,
          preferences: { ...DEFAULT_PREFERENCES, ...(parsed.preferences || {}) },
          notifications: { ...DEFAULT_NOTIFICATIONS, ...(parsed.notifications || {}) },
        };
      }
    }

    // Backward compatibility with legacy agro_operator key
    const legacyRaw = localStorage.getItem("agro_operator");
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (legacy?.email) {
        const created = createInitialProfile(legacy.email, legacy.provider || "Email OTP");
        localStorage.setItem("agro_user_profile", JSON.stringify(created));
        return created;
      }
    }
  } catch (err) {
    console.warn("Failed to load user profile from storage:", err);
  }
  return null;
}

export function saveStoredProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("agro_user_profile", JSON.stringify(profile));
    localStorage.setItem(
      "agro_operator",
      JSON.stringify({ email: profile.email, provider: profile.provider }),
    );
  } catch (err) {
    console.error("Failed to save user profile to storage:", err);
  }
}

export function clearStoredProfile(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("agro_user_profile");
    localStorage.removeItem("agro_operator");
  } catch (err) {
    console.error("Failed to clear user profile from storage:", err);
  }
}
