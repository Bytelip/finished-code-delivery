import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CosmicAuthPage, UserProfileNavbarWidget } from "@/components/CosmicAuthPage";
import { OperatorProfileDropdown } from "@/components/OperatorProfileDropdown";
import { UserProfileModal } from "@/components/UserProfileModal";
import * as authService from "@/services/authService";
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
    vi.restoreAllMocks();
  });

  it("creates, saves, loads, and clears user profiles in localStorage", () => {
    const profile = createInitialProfile("naren.kolar@gmail.com", "Google", "Naren Kolar");
    expect(profile.email).toBe("naren.kolar@gmail.com");
    expect(profile.fullName).toBe("Naren Kolar");
    expect(profile.isVerified).toBe(true);
    expect(profile.role).toBe("Mission Commander");
    expect(profile.preferences.homeBaseName).toBe("Kolar Plateau, Karnataka");

    saveStoredProfile(profile);
    const loaded = loadStoredProfile();
    expect(loaded).not.toBeNull();
    expect(loaded?.email).toBe("naren.kolar@gmail.com");
    expect(loaded?.fullName).toBe("Naren Kolar");

    clearStoredProfile();
    expect(loadStoredProfile()).toBeNull();
  });

  it("handles Google login directly without showing the OTP verification screen", async () => {
    const initiateOAuthSpy = vi.spyOn(authService, "initiateOAuthLogin").mockResolvedValue({
      success: true,
      redirecting: true,
    });

    render(<CosmicAuthPage />);

    const googleBtn = screen.getByRole("button", { name: /Continue with Google/i });
    expect(googleBtn).toBeDefined();

    fireEvent.click(googleBtn);

    expect(initiateOAuthSpy).toHaveBeenCalledWith("Google");
    // Verify that the OTP screen is NOT displayed
    expect(screen.queryByText(/Check your Gmail/i)).toBeNull();
    expect(screen.queryByText(/Gmail Dispatch OTP/i)).toBeNull();
    expect(screen.queryByText(/Auto-Fill/i)).toBeNull();
  });

  it("handles Microsoft login directly without showing the OTP verification screen", async () => {
    const initiateOAuthSpy = vi.spyOn(authService, "initiateOAuthLogin").mockResolvedValue({
      success: true,
      redirecting: true,
    });

    render(<CosmicAuthPage />);

    const msBtn = screen.getByRole("button", { name: /Continue with Microsoft/i });
    fireEvent.click(msBtn);

    expect(initiateOAuthSpy).toHaveBeenCalledWith("Microsoft");
    expect(screen.queryByText(/Check your Gmail/i)).toBeNull();
    expect(screen.queryByText(/Gmail Dispatch OTP/i)).toBeNull();
  });

  it("handles Apple login directly without showing the OTP verification screen", async () => {
    const initiateOAuthSpy = vi.spyOn(authService, "initiateOAuthLogin").mockResolvedValue({
      success: true,
      redirecting: true,
    });

    render(<CosmicAuthPage />);

    const appleBtn = screen.getByRole("button", { name: /Continue with Apple/i });
    fireEvent.click(appleBtn);

    expect(initiateOAuthSpy).toHaveBeenCalledWith("Apple");
    expect(screen.queryByText(/Check your Gmail/i)).toBeNull();
    expect(screen.queryByText(/Gmail Dispatch OTP/i)).toBeNull();
  });

  it("opens Google account selector and authenticates directly without any error banner or OTP screen", async () => {
    const handleSuccess = vi.fn();
    render(<CosmicAuthPage onSuccess={handleSuccess} />);

    // Click Continue with Google
    const googleBtn = screen.getByRole("button", { name: /Continue with Google/i });
    fireEvent.click(googleBtn);

    // Verify Google Account Selector modal opens
    await waitFor(() => {
      expect(screen.getByText(/Sign in with Google/i)).toBeDefined();
      expect(screen.getByText(/to continue to AgroSpace Nexus/i)).toBeDefined();
    });

    // Verify there is NO error banner and NO OTP screen
    expect(screen.queryByText(/Authentication Setup Notice/i)).toBeNull();
    expect(screen.queryByText(/Check your Gmail/i)).toBeNull();

    // Click the detected account to sign in directly
    const accountOption = screen.getByText(/Instant Clearance/i);
    fireEvent.click(accountOption);

    // Verify user is immediately authenticated and redirected
    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledTimes(1);
      const user = handleSuccess.mock.calls[0][0] as UserProfile;
      expect(user.provider).toBe("Google");
      expect(user.verified).toBe(true);
    });
  });

  it("displays setup notice when OAuth provider explicitly fails", async () => {
    vi.spyOn(authService, "initiateOAuthLogin").mockResolvedValue({
      success: false,
      error:
        "Google OAuth is not configured. Please provide VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY.",
    });

    render(<CosmicAuthPage />);

    const googleBtn = screen.getByRole("button", { name: /Continue with Google/i });
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(screen.getByText(/Authentication Setup Notice/i)).toBeDefined();
      expect(screen.getByText(/Google OAuth is not configured/i)).toBeDefined();
    });

    expect(screen.queryByText(/Check your Gmail/i)).toBeNull();
  });

  it("transitions to genuine 6-digit OTP screen ONLY on valid email entry with manual entry (no fake banner, no auto-fill)", async () => {
    const sendOtpSpy = vi.spyOn(authService, "sendEmailOtp").mockResolvedValue({
      success: true,
    });

    const mockVerifiedUser = createInitialProfile("pilot@nasa.gov", "Email", "Pilot Naren");
    const verifyOtpSpy = vi.spyOn(authService, "verifyEmailOtp").mockResolvedValue({
      success: true,
      user: mockVerifiedUser,
    });

    const handleSuccess = vi.fn();
    render(<CosmicAuthPage onSuccess={handleSuccess} />);

    // Fill email
    const emailInput = screen.getByPlaceholderText(/Enter your Gmail or email address/i);
    fireEvent.change(emailInput, { target: { value: "pilot@nasa.gov" } });

    // Submit email
    const continueBtn = screen.getByRole("button", { name: /^Continue$/i });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(sendOtpSpy).toHaveBeenCalledWith("pilot@nasa.gov");
      expect(screen.getByText(/Check your Gmail/i)).toBeDefined();
      expect(screen.getByText(/We sent a 6-digit verification code to/i)).toBeDefined();
    });

    // CRITICAL: Ensure fake "Gmail Dispatch OTP" banner and "Auto-Fill" are completely absent
    expect(screen.queryByText(/Gmail Dispatch OTP/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Auto-Fill/i })).toBeNull();

    // Verify presence of Security Verification and Expiration timer
    expect(screen.getByText(/Security Verification/i)).toBeDefined();
    expect(screen.getByText(/Expires in/i)).toBeDefined();

    // User manually enters 6-digit OTP into inputs
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBe(6);

    const testOtp = ["8", "3", "1", "9", "4", "2"];
    inputs.forEach((input, idx) => {
      fireEvent.change(input, { target: { value: testOtp[idx] } });
    });

    const verifyBtn = screen.getByRole("button", { name: /Verify & Create Account/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(verifyOtpSpy).toHaveBeenCalledWith("pilot@nasa.gov", "831942", "");
      expect(handleSuccess).toHaveBeenCalledWith(mockVerifiedUser);
    });
  });

  it("shows an error on incorrect OTP entry and allows resending after cooldown", async () => {
    vi.spyOn(authService, "sendEmailOtp").mockResolvedValue({ success: true });
    vi.spyOn(authService, "verifyEmailOtp").mockResolvedValue({
      success: false,
      error: "Invalid verification code. 4 attempts remaining.",
    });

    render(<CosmicAuthPage />);

    const emailInput = screen.getByPlaceholderText(/Enter your Gmail or email address/i);
    fireEvent.change(emailInput, { target: { value: "pilot@nasa.gov" } });

    const continueBtn = screen.getByRole("button", { name: /^Continue$/i });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(screen.getByText(/Check your Gmail/i)).toBeDefined();
    });

    const inputs = screen.getAllByRole("textbox");
    ["0", "0", "0", "0", "0", "0"].forEach((digit, idx) => {
      fireEvent.change(inputs[idx], { target: { value: digit } });
    });

    const verifyBtn = screen.getByRole("button", { name: /Verify & Create Account/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText(/Invalid verification code/i)).toBeDefined();
    });
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
    const updated = onSave.mock.calls[0][0] as UserProfile;
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
