import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { UserProfileNavbarWidget } from "@/components/CosmicAuthPage";
import { OperatorProfileDropdown } from "@/components/OperatorProfileDropdown";
import { UserProfileModal } from "@/components/UserProfileModal";
import {
  createInitialProfile,
  saveStoredProfile,
  loadStoredProfile,
  clearStoredProfile,
  type UserProfile,
} from "@/types/userProfile";
import { friendlyAuthError, profileFromRow, rowFromProfile, type ProfileRow } from "@/services/cloudAuth";

describe("User Profile & Authentication System", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("creates, saves, loads, and clears user profiles in localStorage", () => {
    const profile = createInitialProfile("naren.kolar@gmail.com", "Google", "Naren Kolar");
    expect(profile.email).toBe("naren.kolar@gmail.com");
    expect(profile.fullName).toBe("Naren Kolar");
    expect(profile.isVerified).toBe(true);
    expect(profile.role).toBe("Mission Commander");
    expect(profile.preferences?.homeBaseName).toBe("Kolar Plateau, Karnataka");

    saveStoredProfile(profile);
    const loaded = loadStoredProfile();
    expect(loaded).not.toBeNull();
    expect(loaded?.email).toBe("naren.kolar@gmail.com");
    expect(loaded?.fullName).toBe("Naren Kolar");

    clearStoredProfile();
    expect(loadStoredProfile()).toBeNull();
  });

  it("builds a farmer profile from the account and its saved profile row", () => {
    const row: ProfileRow = {
      id: "u1",
      full_name: "Lakshmi Devi",
      job_title: "Farmer",
      callsign: null,
      avatar_color: "#06B6D4",
      home_name: "Mandya, Karnataka",
      home_lat: 12.52,
      home_lon: 76.9,
      default_view: "2D",
      default_layer: "SMAP",
      units: "metric",
      hazard_alerts: false,
      notifications: { cycloneAlerts: false },
      created_at: "",
      updated_at: "",
    };
    const profile = profileFromRow(
      { id: "u1", email: "l@x.in", app_metadata: { provider: "google" }, user_metadata: {}, email_confirmed_at: "2026-01-01" },
      row,
    );
    expect(profile.fullName).toBe("Lakshmi Devi");
    expect(profile.provider).toBe("Google");
    expect(profile.defaultView).toBe("2D");
    expect(profile.preferences?.homeCoords).toEqual({ lat: 12.52, lon: 76.9 });
    expect(profile.notifications?.cycloneAlerts).toBe(false);
    expect(profile.notifications?.emailAlerts).toBe(true);

    const back = rowFromProfile(profile);
    expect(back.home_name).toBe("Mandya, Karnataka");
    expect(back.default_view).toBe("2D");
    expect(back.hazard_alerts).toBe(false);
    expect(back).not.toHaveProperty("id");
  });

  it("explains common sign-in problems in plain words", () => {
    expect(friendlyAuthError("Invalid login credentials")).toBe("Wrong email or password.");
    expect(friendlyAuthError("User already registered")).toMatch(/already exists/);
    expect(friendlyAuthError("Email not confirmed")).toMatch(/confirm your email/);
  });

  it("renders OperatorProfileDropdown with avatar, online indicator, and opens quick menu", () => {
    const mockProfile = createInitialProfile("commander@agrospace.io", "Email", "Commander Naren");
    const onOpenSettings = vi.fn();
    const onSignOut = vi.fn();
    const onNavigateHome = vi.fn();

    render(
      <OperatorProfileDropdown
        profile={mockProfile}
        onOpenAuth={vi.fn()}
        onOpenSettings={onOpenSettings}
        onNavigateHome={onNavigateHome}
        onSignOut={onSignOut}
      />,
    );

    expect(screen.getByText(/Commander Naren/i)).toBeDefined();
    expect(screen.getByText(/VERIFIED/i)).toBeDefined();

    // Click trigger button to open menu
    const trigger = screen.getByLabelText(/Operator Profile Quick Menu/i);
    fireEvent.click(trigger);

    // Quick menu options
    expect(screen.getByText(/Operator Profile & Settings/i)).toBeDefined();
    expect(screen.getByText(/Home Base Station/i)).toBeDefined();
    expect(screen.getByText(/Sign Out Operator Clearance/i)).toBeDefined();

    // Click Settings
    fireEvent.click(screen.getByText(/Operator Profile & Settings/i));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("renders UserProfileModal, allows editing details, and saves changes", () => {
    const mockProfile = createInitialProfile("naren@gmail.com", "Google", "Naren");
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <UserProfileModal
        profile={mockProfile}
        currentLat={13.13}
        currentLon={78.13}
        onSave={onSave}
        onSignOut={vi.fn()}
        onClose={onClose}
      />,
    );

    expect(screen.getByText(/GMAIL VERIFIED/i)).toBeDefined();
    expect(screen.getByText(/Profile Identity/i)).toBeDefined();
    expect(screen.getByText(/Mission Preferences/i)).toBeDefined();

    // Edit full name
    const nameInput = screen.getByDisplayValue("Naren");
    fireEvent.change(nameInput, { target: { value: "Flight Director Naren" } });

    // Click Save Changes
    const saveBtn = screen.getByText(/Save Changes/i);
    fireEvent.click(saveBtn);

    expect(onSave).toHaveBeenCalledTimes(1);
    const updated = onSave.mock.calls[0]![0] as UserProfile;
    expect(updated.fullName).toBe("Flight Director Naren");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders UserProfileNavbarWidget, opens settings, and handles logout", () => {
    const mockUser: UserProfile = {
      id: "usr_test",
      name: "Commander Naren",
      email: "naren@gmail.com",
      provider: "Google",
      verified: true,
      role: "Mission Commander",
      avatarColor: "#06B6D4",
      homeLocation: "Kolar Plateau, Karnataka",
      defaultView: "3D",
      defaultLayer: "NDVI",
      units: "metric",
      hazardAlerts: true,
    };

    const onUpdateUser = vi.fn();
    const onLogout = vi.fn();

    render(
      <UserProfileNavbarWidget user={mockUser} onUpdateUser={onUpdateUser} onLogout={onLogout} />,
    );

    expect(screen.getByText(/Commander Naren/i)).toBeDefined();

    // Click profile button to open dropdown
    const trigger = screen.getByLabelText(/Operator Profile Quick Menu/i);
    fireEvent.click(trigger);

    expect(screen.getByText(/⚙️ Account & Profile Settings/i)).toBeDefined();
    expect(screen.getByText(/Sign Out of Mission Control/i)).toBeDefined();

    // Click Sign Out
    fireEvent.click(screen.getByText(/Sign Out of Mission Control/i));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
