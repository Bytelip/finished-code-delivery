import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CosmicAuthPage } from "@/components/CosmicAuthPage";
import { OperatorProfileDropdown } from "@/components/OperatorProfileDropdown";
import { UserProfileModal } from "@/components/UserProfileModal";
import {
  createInitialProfile,
  saveStoredProfile,
  loadStoredProfile,
  clearStoredProfile,
  type UserProfile,
} from "@/types/userProfile";

describe("User Profile & Authentication System", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates, saves, loads, and clears user profiles in localStorage", () => {
    const profile = createInitialProfile("naren.kolar@gmail.com", "Google", "Naren Kolar");
    expect(profile.email).toBe("naren.kolar@gmail.com");
    expect(profile.fullName).toBe("Naren Kolar");
    expect(profile.isVerified).toBe(true);
    expect(profile.role).toBe("COMMANDER");
    expect(profile.preferences.homeBaseName).toBe("Kolar Plateau, Karnataka");

    saveStoredProfile(profile);
    const loaded = loadStoredProfile();
    expect(loaded).not.toBeNull();
    expect(loaded?.email).toBe("naren.kolar@gmail.com");
    expect(loaded?.fullName).toBe("Naren Kolar");

    clearStoredProfile();
    expect(loadStoredProfile()).toBeNull();
  });

  it("renders CosmicAuthPage with OAuth providers and transitions to OTP screen on email entry", async () => {
    const handleSuccess = vi.fn();
    render(<CosmicAuthPage onSuccess={handleSuccess} />);

    // Check OAuth options
    expect(screen.getByText(/Continue with Google/i)).toBeDefined();
    expect(screen.getByText(/Continue with Microsoft/i)).toBeDefined();
    expect(screen.getByText(/Continue with Apple/i)).toBeDefined();

    // Fill email
    const emailInput = screen.getByPlaceholderText(/Enter your Gmail \/ work email/i);
    fireEvent.change(emailInput, { target: { value: "pilot@nasa.gov" } });

    // Submit email
    const continueBtn = screen.getByText(/Continue with Email/i);
    fireEvent.click(continueBtn);

    // Wait for step 2 (OTP screen) to appear
    await waitFor(() => {
      expect(screen.getByText(/Verify your email/i)).toBeDefined();
      expect(screen.getByText(/We've sent a 6-digit verification code to/i)).toBeDefined();
    });

    // Check that auto-fill button is present and triggers verification
    const autoFillBtn = screen.getByText(/Click to Auto-Fill & Enter/i);
    expect(autoFillBtn).toBeDefined();
    fireEvent.click(autoFillBtn);

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledTimes(1);
      const createdUser = handleSuccess.mock.calls[0][0] as UserProfile;
      expect(createdUser.email).toBe("pilot@nasa.gov");
      expect(createdUser.isVerified).toBe(true);
    });
  });

  it("renders OperatorProfileDropdown with avatar, online indicator, and opens quick menu", () => {
    const mockProfile = createInitialProfile(
      "commander@agrospace.io",
      "Email OTP",
      "Commander Naren",
    );
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
    const updated = onSave.mock.calls[0][0] as UserProfile;
    expect(updated.fullName).toBe("Flight Director Naren");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
