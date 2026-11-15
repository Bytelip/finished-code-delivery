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

  it("authenticates with Google directly without any fake modal or OTP screen", async () => {
    const mockGoogleUser = createInitialProfile(
      "naren.kolar@gmail.com",
      "Google",
      "Commander Naren",
    );
    const initiateOAuthSpy = vi
      .spyOn(authService, "initiateOAuthLogin")
      .mockImplementation(async (_provider, _origin, _mode, onSuccess) => {
        onSuccess?.(mockGoogleUser);
        return { success: true, user: mockGoogleUser };
      });

    const handleSuccess = vi.fn();
    render(<CosmicAuthPage onSuccess={handleSuccess} />);

    // Click Continue with Google
    const googleBtn = screen.getByRole("button", { name: /Continue with Google/i });
    fireEvent.click(googleBtn);

    // Verify initiateOAuthLogin was called with Google
    expect(initiateOAuthSpy).toHaveBeenCalledWith("Google");

    // Verify there is NO fake modal, NO error banner, and NO OTP screen
    expect(screen.queryByText(/Instant Clearance/i)).toBeNull();
    expect(screen.queryByText(/Authentication Setup Notice/i)).toBeNull();
    expect(screen.queryByText(/Check your Gmail/i)).toBeNull();

    // Verify user is immediately authenticated and redirected
    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledWith(mockGoogleUser);
    });
  });

  it("opens interactive OAuth account chooser when OAuth provider has no credentials, without showing any red Authentication Setup Notice", async () => {
    vi.spyOn(authService, "initiateOAuthLogin").mockResolvedValue({
      success: false,
      needsAccountPicker: true,
    });

    render(<CosmicAuthPage />);

    const googleBtn = screen.getByRole("button", { name: /Continue with Google/i });
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(screen.getByText(/Choose an account/i)).toBeDefined();
      expect(screen.getByText(/Naren Google/i)).toBeDefined();
    });

    // CRITICAL: Red Authentication Setup Notice must be completely absent
    expect(screen.queryByText(/Authentication Setup Notice/i)).toBeNull();
    expect(screen.queryByText(/Google OAuth is not configured/i)).toBeNull();
  });

  it("transitions to 6-digit OTP screen without showing OTP on screen, shows webmail preview link, and allows entering 6 digits to verify", async () => {
    const sendOtpSpy = vi.spyOn(authService, "sendEmailOtp").mockResolvedValue({
      success: true,
      devCode: "831942",
      previewUrl: "https://ethereal.email/message/Waqmg4ddsoo123",
      deliveryMethod: "ethereal_inbox",
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

    // 🔒 SECURITY CHECK: OTP and Auto-Fill button must NEVER be displayed in the UI/DOM
    expect(screen.queryByText(/Live Gmail Dispatch OTP/i)).toBeNull();
    expect(screen.queryByText("831942")).toBeNull();
    expect(screen.queryByText(/Auto-Fill/i)).toBeNull();

    // 📬 TIER 2: 1-Click Open Dispatched Email in Browser Inbox button must be displayed
    const inboxLink = screen.getByText(/Open Dispatched Email in Browser Inbox/i);
    expect(inboxLink).toBeDefined();
    const anchor = inboxLink.closest("a");
    expect(anchor?.getAttribute("href")).toBe("https://ethereal.email/message/Waqmg4ddsoo123");

    // Verify presence of Security Verification and Expiration timer
    expect(screen.getByText(/Security Verification/i)).toBeDefined();
    expect(screen.getByText(/Expires in/i)).toBeDefined();

    // Enter the 6 digits received in user's email inbox into the 6 input boxes
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBe(6);
    ["8", "3", "1", "9", "4", "2"].forEach((d, idx) => {
      fireEvent.change(inputs[idx], { target: { value: d } });
    });

    expect((inputs[0] as HTMLInputElement).value).toBe("8");
    expect((inputs[5] as HTMLInputElement).value).toBe("2");

    const verifyBtn = screen.getByRole("button", { name: /Verify & Enter Orbit/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(verifyOtpSpy).toHaveBeenCalledWith(
        "pilot@nasa.gov",
        "831942",
        undefined,
        "signin",
        "Email",
      );
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  it("opens the compact ⚙️ SMTP setup modal and allows configuring credentials", async () => {
    render(<CosmicAuthPage />);

    const configBtn = screen.getByRole("button", { name: /SMTP/i });
    expect(configBtn).toBeDefined();

    fireEvent.click(configBtn);

    expect(screen.getByText(/Configure Custom Gmail SMTP/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/e\.g\. nakkaabhishek24@gmail\.com/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/e\.g\. abcd efgh ijkl mnop/i)).toBeDefined();

    const saveBtn = screen.getByRole("button", { name: /Save & Connect SMTP/i });
    expect(saveBtn).toBeDefined();
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

    const verifyBtn = screen.getByRole("button", {
      name: /Verify & (Create Account|Enter Orbit)/i,
    });
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

  it("strictly rejects ghost accounts / phantom logins when user does not exist in database during signin", async () => {
    // Attempting to send OTP in signin mode for an unregistered ghost email
    const result = await authService.sendEmailOtp("ghost.operator@unknown.com", "signin");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Account not found\. Please sign up first\./i);

    // Attempting direct OAuth signin for an unregistered ghost email
    const oauthProfile = authService.completeDirectOAuthLogin(
      "Google",
      "ghost.operator@unknown.com",
      "Ghost Operator",
      "signin",
    );
    expect(oauthProfile).toBeNull();
  });

  it("clears error state when switching between Sign In and Create Account tabs", async () => {
    render(<CosmicAuthPage />);

    // Type an unregistered email in Sign In tab
    const emailInput = screen.getByPlaceholderText(/Enter your Gmail or email address/i);
    fireEvent.change(emailInput, { target: { value: "unregistered.cadet@agrospace.nasa.gov" } });

    // Click Continue to trigger "Account not found" error
    const continueBtn = screen.getByRole("button", { name: /^Continue$/i });
    fireEvent.click(continueBtn);

    // Verify error banner is visible
    await waitFor(() => {
      expect(screen.getByText(/Account not found\. Please sign up first\./i)).toBeDefined();
    });

    // Switch to "Create Account" tab
    const createAccountTab = screen.getByRole("button", { name: /Create Account/i });
    fireEvent.click(createAccountTab);

    // Verify error banner is immediately cleared
    await waitFor(() => {
      expect(screen.queryByText(/Account not found\. Please sign up first\./i)).toBeNull();
    });
  });

  it("submitting in Create Account tab executes registration flow without rejecting non-existent accounts", async () => {
    const sendOtpSpy = vi.spyOn(authService, "sendEmailOtp").mockResolvedValue({
      success: true,
      isConfigured: true,
    });

    render(<CosmicAuthPage />);

    // Switch to Create Account tab
    const createAccountTab = screen.getByRole("button", { name: /Create Account/i });
    fireEvent.click(createAccountTab);

    // Enter a new unregistered email
    const emailInput = screen.getByPlaceholderText(/Enter your Gmail or email address/i);
    fireEvent.change(emailInput, { target: { value: "fresh.cadet@agrospace.nasa.gov" } });

    // Click Continue
    const continueBtn = screen.getByRole("button", { name: /^Continue$/i });
    fireEvent.click(continueBtn);

    // In signup mode, it transitions to OTP screen instead of showing "Account not found"
    await waitFor(() => {
      expect(sendOtpSpy).toHaveBeenCalledWith(
        "fresh.cadet@agrospace.nasa.gov",
        "signup",
        "email",
        "",
      );
      expect(screen.queryByText(/Account not found\. Please sign up first\./i)).toBeNull();
      expect(screen.getByText(/Check your Gmail/i)).toBeDefined();
    });
  });

  it("registers new account in signup mode and allows subsequent signin", async () => {
    authService.setSupabaseClientOverride(null);

    // 1. Sign up a new user
    const newEmail = "new.cadet@agrospace.nasa.gov";
    const signUpResult = await authService.sendEmailOtp(newEmail, "signup");
    expect(signUpResult.success).toBe(true);

    const verifiedProfile = await authService.verifyEmailOtp(
      newEmail,
      signUpResult.devCode || "123456",
      "Cadet Rao",
      "signup",
    );
    expect(verifiedProfile.success).toBe(true);
    expect(verifiedProfile.user?.email).toBe(newEmail);

    // 2. Now user exists in database: subsequent signin mode succeeds
    const signInResult = await authService.sendEmailOtp(newEmail, "signin");
    expect(signInResult.success).toBe(true);

    authService.setSupabaseClientOverride(undefined);
  });

  it("signOutUser properly invokes supabase.auth.signOut and wipes all local auth storage", async () => {
    const mockSignOut = vi.fn().mockResolvedValue({ error: null });
    // @ts-expect-error Mock Supabase client
    authService.setSupabaseClientOverride({
      auth: {
        signOut: mockSignOut,
      },
    });

    localStorage.setItem("agrospace_user_profile_v1", JSON.stringify({ email: "test@nasa.gov" }));
    localStorage.setItem("sb-enutgngbsatwgpemwzgx-auth-token", "mock-token");

    await authService.signOutUser();

    expect(mockSignOut).toHaveBeenCalledWith({ scope: "global" });
    expect(localStorage.getItem("agrospace_user_profile_v1")).toBeNull();
    expect(localStorage.getItem("sb-enutgngbsatwgpemwzgx-auth-token")).toBeNull();

    authService.setSupabaseClientOverride(undefined);
  });

  it("processIncomingAuthCallback returns null when no OAuth callback parameters exist in URL", async () => {
    // Normal page load without ?code= or #access_token=
    const result = await authService.processIncomingAuthCallback();
    expect(result).toBeNull();
  });
});
