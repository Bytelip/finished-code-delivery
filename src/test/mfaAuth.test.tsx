import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mfaMocks = vi.hoisted(() => ({
  listFactors: vi.fn(),
  enroll: vi.fn(),
  challenge: vi.fn(),
  verify: vi.fn(),
  unenroll: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
  challengeAndVerify: vi.fn(),
}));

const authClientMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  mfa: mfaMocks,
}));

describe("Optional TOTP Two-Factor Authentication (2FA)", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    Object.values(mfaMocks).forEach((fn) => fn.mockReset());
    authClientMocks.getUser.mockReset();
    authClientMocks.getSession.mockReset();
    authClientMocks.refreshSession.mockReset();
    authClientMocks.signOut.mockReset();
    authClientMocks.onAuthStateChange.mockReset();

    authClientMocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    authClientMocks.refreshSession.mockResolvedValue({ data: { session: {} }, error: null });
    authClientMocks.signOut.mockResolvedValue({ error: null });
    authClientMocks.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1", email: "farmer@agrospace.io" } } },
      error: null,
    });
    authClientMocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "u1",
          email: "farmer@agrospace.io",
          app_metadata: { provider: "google" },
          user_metadata: { full_name: "Farmer Asha" },
          email_confirmed_at: "2026-01-01T00:00:00Z",
        },
      },
      error: null,
    });

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.doUnmock("@/integrations/supabase/client");
    vi.restoreAllMocks();
  });

  function mockSupabaseClient() {
    vi.doMock("@/integrations/supabase/client", () => ({
      MISSING_SUPABASE_ENV_MESSAGE: "Missing Supabase environment variables in deployment settings",
      isSupabaseConfigured: () => true,
      supabase: {
        auth: authClientMocks,
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "u1",
                  full_name: "Farmer Asha",
                  job_title: "Farmer",
                  callsign: null,
                  avatar_color: "#3ecf8e",
                  home_name: "Kolar Plateau, Karnataka",
                  home_lat: 13.1367,
                  home_lon: 78.1292,
                  default_view: "3D",
                  default_layer: "NDVI",
                  units: "metric",
                  hazard_alerts: true,
                  notifications: {},
                  created_at: "2026-01-01",
                  updated_at: "2026-01-01",
                },
                error: null,
              }),
            }),
          }),
        }),
      },
    }));
  }

  it("unenrolls leftover unverified TOTP factors before enrolling and uses separate challenge + verify without logging secrets", async () => {
    mockSupabaseClient();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    mfaMocks.listFactors.mockResolvedValue({
      data: {
        all: [
          {
            id: "stale-unverified-1",
            factor_type: "totp",
            status: "unverified",
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        ],
        totp: [],
      },
      error: null,
    });
    mfaMocks.unenroll.mockResolvedValue({ data: { id: "stale-unverified-1" }, error: null });
    mfaMocks.enroll.mockResolvedValue({
      data: {
        id: "totp-factor-1",
        type: "totp",
        totp: {
          qr_code: "<svg xmlns='http://www.w3.org/2000/svg'></svg>",
          secret: "JBSWY3DPEHPK3PXP",
          uri: "otpauth://totp/AgroSpace%20Nexus:farmer@agrospace.io?secret=JBSWY3DPEHPK3PXP",
        },
      },
      error: null,
    });
    mfaMocks.challenge.mockResolvedValue({ data: { id: "chal-1", type: "totp" }, error: null });
    mfaMocks.verify.mockResolvedValue({ data: { access_token: "aal2-jwt" }, error: null });

    const { enrollTotpFactor, verifyTotpFactorCode } = await import("@/services/mfaAuth");

    const enrollRes = await enrollTotpFactor("Authenticator App");
    expect(enrollRes.ok).toBe(true);
    expect(mfaMocks.unenroll).toHaveBeenCalledWith({ factorId: "stale-unverified-1" });
    expect(mfaMocks.enroll).toHaveBeenCalledWith({
      factorType: "totp",
      issuer: "AgroSpace Nexus",
      friendlyName: "Authenticator App",
    });

    const verifyRes = await verifyTotpFactorCode("totp-factor-1", "654321");
    expect(verifyRes.ok).toBe(true);
    expect(mfaMocks.challenge).toHaveBeenCalledWith({ factorId: "totp-factor-1" });
    expect(mfaMocks.verify).toHaveBeenCalledWith({
      factorId: "totp-factor-1",
      challengeId: "chal-1",
      code: "654321",
    });
    expect(mfaMocks.challengeAndVerify).not.toHaveBeenCalled();

    const logged = [
      ...logSpy.mock.calls.flat(),
      ...warnSpy.mock.calls.flat(),
      ...errSpy.mock.calls.flat(),
    ].join(" ");
    expect(logged).not.toContain("JBSWY3DPEHPK3PXP");
    expect(logged).not.toContain("654321");
  });

  it("renders TwoFactorSettingsCard enrollment, error handling, enabled badge, and disable confirmation flow", async () => {
    mockSupabaseClient();
    const verifiedFactor = {
      id: "factor-verified-1",
      friendly_name: "Authenticator App",
      factor_type: "totp",
      status: "verified",
      created_at: "2026-11-25T10:00:00Z",
      updated_at: "2026-11-25T10:00:00Z",
    };

    mfaMocks.listFactors
      .mockResolvedValueOnce({ data: { all: [], totp: [] }, error: null }) // initial load
      .mockResolvedValueOnce({ data: { all: [], totp: [] }, error: null }) // pre-enroll cleanup check
      .mockResolvedValueOnce({
        data: { all: [verifiedFactor], totp: [verifiedFactor] },
        error: null,
      }) // refresh after verify
      .mockResolvedValueOnce({ data: { all: [], totp: [] }, error: null }); // refresh after disable

    mfaMocks.enroll.mockResolvedValue({
      data: {
        id: "factor-verified-1",
        type: "totp",
        totp: {
          qr_code: "<svg xmlns='http://www.w3.org/2000/svg'></svg>",
          secret: "MANUALKEY123456",
          uri: "otpauth://totp/AgroSpace?secret=MANUALKEY123456",
        },
      },
      error: null,
    });

    mfaMocks.challenge
      .mockResolvedValueOnce({ data: { id: "c1" }, error: null })
      .mockResolvedValueOnce({ data: { id: "c2" }, error: null });
    mfaMocks.verify
      .mockResolvedValueOnce({ data: null, error: { message: "Invalid TOTP code" } })
      .mockResolvedValueOnce({ data: { access_token: "aal2" }, error: null });
    mfaMocks.unenroll.mockResolvedValue({ data: { id: "factor-verified-1" }, error: null });

    const { TwoFactorSettingsCard } = await import("@/components/console/TwoFactorSettingsCard");
    render(<TwoFactorSettingsCard />);

    await waitFor(() => {
      expect(screen.getByText("Off")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: /Enable 2FA/i }));

    await waitFor(() => {
      expect(screen.getByAltText(/Two-factor authentication QR code/i)).toBeDefined();
      expect(screen.getByText("MANUALKEY123456")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: /Copy setup key/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("MANUALKEY123456");

    const codeInput = screen.getByLabelText("6-digit authenticator verification code");
    fireEvent.change(codeInput, { target: { value: "000111" } });
    fireEvent.click(screen.getByRole("button", { name: /Verify & Enable/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/Invalid authenticator code/i);
    });

    fireEvent.change(codeInput, { target: { value: "222333" } });
    fireEvent.click(screen.getByRole("button", { name: /Verify & Enable/i }));

    await waitFor(() => {
      expect(screen.getByText("Enabled")).toBeDefined();
      expect(screen.getByText("Authenticator App")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: /Disable 2FA/i }));
    fireEvent.click(screen.getByRole("button", { name: /Confirm Disable/i }));

    await waitFor(() => {
      expect(mfaMocks.unenroll).toHaveBeenCalledWith({ factorId: "factor-verified-1" });
      expect(screen.getByText("Off")).toBeDefined();
    });
  });

  it("skips 2FA screen completely in AuthGate when user has nextLevel aal1", async () => {
    mockSupabaseClient();
    mfaMocks.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal1", currentAuthenticationMethods: [] },
      error: null,
    });

    const { AuthGate } = await import("@/components/auth/AuthGate");
    render(
      <AuthGate>
        {({ user }) => <div data-testid="dashboard-unlocked">Dashboard for {user.name}</div>}
      </AuthGate>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-unlocked").textContent).toContain("Farmer Asha");
    });
    expect(screen.queryByText(/Two-Factor Verification/i)).toBeNull();
  });

  it("blocks dashboard and verifies AAL2 TOTP challenge when currentLevel is aal1 and nextLevel is aal2", async () => {
    mockSupabaseClient();
    const verifiedFactor = {
      id: "factor-99",
      friendly_name: "Authenticator App",
      factor_type: "totp",
      status: "verified",
      created_at: "2026-11-25T10:00:00Z",
      updated_at: "2026-11-25T10:00:00Z",
    };

    mfaMocks.getAuthenticatorAssuranceLevel
      .mockResolvedValueOnce({
        data: { currentLevel: "aal1", nextLevel: "aal2", currentAuthenticationMethods: [] },
        error: null,
      })
      .mockResolvedValue({
        data: { currentLevel: "aal2", nextLevel: "aal2", currentAuthenticationMethods: [] },
        error: null,
      });

    mfaMocks.listFactors.mockResolvedValue({
      data: { all: [verifiedFactor], totp: [verifiedFactor] },
      error: null,
    });
    mfaMocks.challenge.mockResolvedValue({ data: { id: "chal-99" }, error: null });
    mfaMocks.verify.mockResolvedValue({ data: { access_token: "aal2" }, error: null });

    const { AuthGate } = await import("@/components/auth/AuthGate");
    render(
      <AuthGate>
        {({ user }) => <div data-testid="dashboard-unlocked">Dashboard for {user.name}</div>}
      </AuthGate>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Two-Factor Verification/i)).toBeDefined();
    });
    expect(screen.queryByTestId("dashboard-unlocked")).toBeNull();
    expect(screen.getByRole("button", { name: /Sign out \/ Use another account/i })).toBeDefined();

    const codeInput = screen.getByLabelText("6-digit two-factor authentication code");
    fireEvent.change(codeInput, { target: { value: "889900" } });
    fireEvent.click(screen.getByRole("button", { name: /Verify & Continue/i }));

    await waitFor(() => {
      expect(mfaMocks.challenge).toHaveBeenCalledWith({ factorId: "factor-99" });
      expect(mfaMocks.verify).toHaveBeenCalledWith({
        factorId: "factor-99",
        challengeId: "chal-99",
        code: "889900",
      });
      expect(screen.getByTestId("dashboard-unlocked").textContent).toContain("Farmer Asha");
    });
  });

  it("lets locked AAL1 users sign out from the 2FA gate so they are never stuck", async () => {
    mockSupabaseClient();
    mfaMocks.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal2", currentAuthenticationMethods: [] },
      error: null,
    });

    const { AuthGate } = await import("@/components/auth/AuthGate");
    render(
      <AuthGate>
        {({ user }) => <div data-testid="dashboard-unlocked">Dashboard for {user.name}</div>}
      </AuthGate>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Two-Factor Verification/i)).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign out \/ Use another account/i }));

    await waitFor(() => {
      expect(authClientMocks.signOut).toHaveBeenCalledTimes(1);
    });
  });
});
