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
    expect(profile.preferences?.homeBaseName).toBe("Kolar Plateau, Karnataka");

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

  it("shows a clear provider error instead of a simulated OAuth account chooser", async () => {
    vi.spyOn(authService, "initiateOAuthLogin").mockResolvedValue({
      success: false,
      needsAccountPicker: true,
    });

    render(<CosmicAuthPage />);

    const googleBtn = screen.getByRole("button", { name: /Continue with Google/i });
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(screen.getByText(/Google sign-in could not be started/i)).toBeDefined();
    });

    expect(screen.queryByText(/Choose an account/i)).toBeNull();
    expect(screen.queryByText(/Naren Google/i)).toBeNull();
    expect(screen.queryByText(/Authentication Setup Notice/i)).toBeNull();
    expect(screen.queryByText(/Google OAuth is not configured/i)).toBeNull();
  });

  it("authenticates via Email and Password login and immediately signs in to dashboard", async () => {
    const mockVerifiedUser = createInitialProfile("pilot@nasa.gov", "Email", "Pilot Naren");
    const signInSpy = vi.spyOn(authService, "signInWithEmailPassword").mockResolvedValue({
      success: true,
      user: mockVerifiedUser,
    });

    const handleSuccess = vi.fn();
    render(<CosmicAuthPage onSuccess={handleSuccess} />);

    // Fill email and password
    const emailInput = screen.getByPlaceholderText(/Enter your email address/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
    fireEvent.change(emailInput, { target: { value: "pilot@nasa.gov" } });
    fireEvent.change(passwordInput, { target: { value: "missionPassword123" } });

    // Submit
    const submitBtn = screen.getByRole("button", { name: /Sign In to Orbit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(signInSpy).toHaveBeenCalledWith("pilot@nasa.gov", "missionPassword123");
      expect(handleSuccess).toHaveBeenCalledWith(mockVerifiedUser);
    });

    // Verify NO OTP or SMTP modal exists
    expect(screen.queryByText(/Check your Gmail/i)).toBeNull();
    expect(screen.queryByText(/⚙️ SMTP/i)).toBeNull();
  });

  it("registers a new user in Create Account mode via email OTP verification flow", async () => {
    const mockNewUser = createInitialProfile("cadet@nasa.gov", "Email", "Cadet Rao");
    const dispatchSpy = vi.spyOn(authService, "dispatchVerificationEmail").mockResolvedValue({
      success: true,
      isConfigured: true,
    });
    const verifySpy = vi.spyOn(authService, "verifyOtpCode").mockResolvedValue({
      success: true,
    });
    const signUpSpy = vi.spyOn(authService, "signUpWithEmailPassword").mockResolvedValue({
      success: true,
      user: mockNewUser,
    });
    const welcomeSpy = vi.spyOn(authService, "dispatchWelcomeEmail").mockResolvedValue({
      success: true,
      isConfigured: true,
    });

    const handleSuccess = vi.fn();
    render(<CosmicAuthPage onSuccess={handleSuccess} />);

    // Switch to Create Account tab
    const createAccountTab = screen.getByRole("button", { name: /Create Account/i });
    fireEvent.click(createAccountTab);

    // Fill details
    const nameInput = screen.getByPlaceholderText(/Profile Name/i);
    const emailInput = screen.getByPlaceholderText(/Enter your email address/i);
    const passwordInput = screen.getByPlaceholderText(/Create password \(min 6 characters\)/i);

    fireEvent.change(nameInput, { target: { value: "Cadet Rao" } });
    fireEvent.change(emailInput, { target: { value: "cadet@nasa.gov" } });
    fireEvent.change(passwordInput, { target: { value: "securePass456" } });

    const submitBtn = screen.getByRole("button", { name: /Create Account & Enter Orbit/i });
    fireEvent.click(submitBtn);

    // Sign-up dispatches a verification email then transitions to OTP step
    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith("cadet@nasa.gov", "Cadet Rao", "signup");
      expect(screen.getByText(/Verify your email/i)).toBeDefined();
    });

    // Enter the 6-digit code and submit verification
    const otpInput = screen.getByPlaceholderText(/• • • • • •/i);
    fireEvent.change(otpInput, { target: { value: "123456" } });

    const verifyBtn = screen.getByRole("button", { name: /Verify & Enter Orbit/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(verifySpy).toHaveBeenCalledWith("cadet@nasa.gov", "123456");
      expect(signUpSpy).toHaveBeenCalledWith("cadet@nasa.gov", "securePass456", "Cadet Rao");
      expect(welcomeSpy).toHaveBeenCalledWith("cadet@nasa.gov", "Cadet Rao");
      expect(handleSuccess).toHaveBeenCalledWith(mockNewUser);
    });
  });

  it("shows an error on failed signin credentials", async () => {
    vi.spyOn(authService, "signInWithEmailPassword").mockResolvedValue({
      success: false,
      error: "Invalid login credentials. User account not found.",
    });

    render(<CosmicAuthPage />);

    const emailInput = screen.getByPlaceholderText(/Enter your email address/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
    fireEvent.change(emailInput, { target: { value: "unknown@nasa.gov" } });
    fireEvent.change(passwordInput, { target: { value: "wrongPassword" } });

    const submitBtn = screen.getByRole("button", { name: /Sign In to Orbit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Invalid login credentials\. User account not found\./i)).toBeDefined();
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
    vi.spyOn(authService, "signInWithEmailPassword").mockResolvedValue({
      success: false,
      error: "Invalid login credentials. Account not found.",
    });

    render(<CosmicAuthPage />);

    // Type credentials in Sign In tab
    const emailInput = screen.getByPlaceholderText(/Enter your email address/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
    fireEvent.change(emailInput, { target: { value: "unregistered.cadet@agrospace.nasa.gov" } });
    fireEvent.change(passwordInput, { target: { value: "secret123" } });

    // Click Sign In to trigger error
    const submitBtn = screen.getByRole("button", { name: /Sign In to Orbit/i });
    fireEvent.click(submitBtn);

    // Verify error banner is visible
    await waitFor(() => {
      expect(screen.getByText(/Invalid login credentials\. Account not found\./i)).toBeDefined();
    });

    // Switch to "Create Account" tab
    const createAccountTab = screen.getByRole("button", { name: /Create Account/i });
    fireEvent.click(createAccountTab);

    // Verify error banner is immediately cleared
    await waitFor(() => {
      expect(screen.queryByText(/Invalid login credentials\. Account not found\./i)).toBeNull();
    });
  });

  it("requires a valid profile name before enabling email signup", () => {
    render(<CosmicAuthPage />);
    fireEvent.click(screen.getByRole("button", { name: /Create Account/i }));
    const nameInput = screen.getByPlaceholderText(/Profile Name/i);
    const emailInput = screen.getByPlaceholderText(/Enter your email address/i);
    const passwordInput = screen.getByPlaceholderText(/Create password \(min 6 characters\)/i);
    const submitBtn = screen.getByRole("button", { name: /Create Account & Enter Orbit/i });
    expect(nameInput).toHaveProperty("required", true);
    fireEvent.change(emailInput, { target: { value: "valid.name@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "validPassword123" } });
    expect(submitBtn).toHaveProperty("disabled", true);
    fireEvent.change(nameInput, { target: { value: "A" } });
    expect(submitBtn).toHaveProperty("disabled", true);
    fireEvent.change(nameInput, { target: { value: "Valid Name" } });
    expect(submitBtn).toHaveProperty("disabled", false);
  });
  it("submitting in Create Account tab dispatches a verification email and shows the OTP step", async () => {
    const dispatchSpy = vi.spyOn(authService, "dispatchVerificationEmail").mockResolvedValue({
      success: true,
      isConfigured: true,
    });

    const handleSuccess = vi.fn();
    render(<CosmicAuthPage onSuccess={handleSuccess} />);

    // Switch to Create Account tab
    const createAccountTab = screen.getByRole("button", { name: /Create Account/i });
    fireEvent.click(createAccountTab);

    // Enter details
    const nameInput = screen.getByPlaceholderText(/Profile Name/i);
    const emailInput = screen.getByPlaceholderText(/Enter your email address/i);
    const passwordInput = screen.getByPlaceholderText(/Create password \(min 6 characters\)/i);
    fireEvent.change(nameInput, { target: { value: "Fresh Cadet" } });
    fireEvent.change(emailInput, { target: { value: "fresh.cadet@agrospace.nasa.gov" } });
    fireEvent.change(passwordInput, { target: { value: "cadetPass123" } });

    // Click submit
    const submitBtn = screen.getByRole("button", { name: /Create Account & Enter Orbit/i });
    fireEvent.click(submitBtn);

    // Sign-up dispatches a verification email then transitions to OTP step
    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(
        "fresh.cadet@agrospace.nasa.gov",
        "Fresh Cadet",
        "signup",
      );
      expect(screen.getByText(/Verify your email/i)).toBeDefined();
    });
    expect(handleSuccess).not.toHaveBeenCalled();
  });

  it("registers new account in signup mode and allows subsequent signin", async () => {
    authService.setSupabaseClientOverride(null);

    // 1. Sign up a new user with Email + Password
    const newEmail = "new.cadet@agrospace.nasa.gov";
    const signUpResult = await authService.signUpWithEmailPassword(
      newEmail,
      "cadetSecret789",
      "Cadet Rao",
    );
    expect(signUpResult.success).toBe(true);
    expect(signUpResult.user?.email).toBe(newEmail);
    expect(signUpResult.user?.isVerified).toBe(true);

    // 2. Now user exists in database: subsequent signin mode succeeds
    const signInResult = await authService.signInWithEmailPassword(
      newEmail,
      "cadetSecret789",
    );
    expect(signInResult.success).toBe(true);
    expect(signInResult.user?.email).toBe(newEmail);

    authService.setSupabaseClientOverride(undefined);
  });

  it("signOutUser properly invokes supabase.auth.signOut and wipes all local auth storage", async () => {
    const mockSignOut = vi.fn().mockResolvedValue({ error: null });
    authService.setSupabaseClientOverride({
      auth: {
        signOut: mockSignOut,
      },
    } as never);

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
