import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const authMocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  signUp: vi.fn(),
  verifyOtp: vi.fn(),
  signInWithOtp: vi.fn(),
  signInWithPassword: vi.fn(),
  resend: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  getUser: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
}));

describe("Supabase Env Config & Direct OAuth Auth", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    localStorage.clear();
    Object.values(authMocks).forEach((fn) => fn.mockReset());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@/integrations/supabase/client");
  });

  it("trims whitespace and trailing slashes from VITE_SUPABASE_URL and supports both ANON and PUBLISHABLE keys", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "  https://example-project.supabase.co///  ");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "  anon-key-123  ");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "  pub-key-456  ");

    const { getSupabaseCredentials, isSupabaseConfigured } =
      await import("@/integrations/supabase/client");

    expect(getSupabaseCredentials()).toEqual({
      url: "https://example-project.supabase.co",
      key: "anon-key-123",
    });
    expect(isSupabaseConfigured()).toBe(true);
  });

  it("falls back to VITE_SUPABASE_PUBLISHABLE_KEY when VITE_SUPABASE_ANON_KEY is empty", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example-project.supabase.co/");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "  sb_publishable_abc  ");

    const { getSupabaseCredentials, isSupabaseConfigured } =
      await import("@/integrations/supabase/client");

    expect(getSupabaseCredentials()).toEqual({
      url: "https://example-project.supabase.co",
      key: "sb_publishable_abc",
    });
    expect(isSupabaseConfigured()).toBe(true);
  });

  it("returns empty credentials with no hardcoded fallback when env vars are missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");

    const { getSupabaseCredentials, isSupabaseConfigured, MISSING_SUPABASE_ENV_MESSAGE } =
      await import("@/integrations/supabase/client");

    expect(getSupabaseCredentials()).toEqual({ url: "", key: "" });
    expect(isSupabaseConfigured()).toBe(false);
    expect(MISSING_SUPABASE_ENV_MESSAGE).toBe(
      "Missing Supabase environment variables in deployment settings",
    );
  });

  it("uses direct Supabase OAuth for Google and Microsoft without Lovable proxy", async () => {
    authMocks.signInWithOAuth.mockResolvedValue({ data: { url: undefined }, error: null });

    vi.doMock("@/integrations/supabase/client", () => ({
      MISSING_SUPABASE_ENV_MESSAGE: "Missing Supabase environment variables in deployment settings",
      isSupabaseConfigured: () => true,
      supabase: { auth: authMocks },
    }));

    const { signInWithProvider } = await import("@/services/cloudAuth");

    const googleOutcome = await signInWithProvider("google");
    expect(googleOutcome.ok).toBe(true);
    expect(authMocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });

    const msOutcome = await signInWithProvider("microsoft");
    expect(msOutcome.ok).toBe(true);
    expect(authMocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "azure",
      options: {
        scopes: "email profile openid",
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  });

  it("routes signUp, verifyOtp, signInWithOtp, and signInWithPassword directly to Supabase Auth", async () => {
    authMocks.signUp.mockResolvedValue({
      data: { user: { id: "u1", identities: [{}] }, session: null },
      error: null,
    });
    authMocks.verifyOtp.mockResolvedValue({
      data: { user: { id: "u1" }, session: {} },
      error: null,
    });
    authMocks.signInWithOtp.mockResolvedValue({ error: null });
    authMocks.signInWithPassword.mockResolvedValue({ error: null });

    vi.doMock("@/integrations/supabase/client", () => ({
      MISSING_SUPABASE_ENV_MESSAGE: "Missing Supabase environment variables in deployment settings",
      isSupabaseConfigured: () => true,
      supabase: { auth: authMocks },
    }));

    const { signUpWithEmail, verifyEmailOtp, sendSignInOtp, signInWithEmail } =
      await import("@/services/cloudAuth");

    const signUpRes = await signUpWithEmail("Naren", "naren@gmail.com", "Password123!");
    expect(signUpRes).toEqual({ ok: true, needsConfirmation: true });
    expect(authMocks.signUp).toHaveBeenCalledWith({
      email: "naren@gmail.com",
      password: "Password123!",
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: "Naren" },
      },
    });

    const verifyRes = await verifyEmailOtp("naren@gmail.com", "123456", "signup");
    expect(verifyRes.ok).toBe(true);
    expect(authMocks.verifyOtp).toHaveBeenCalledWith({
      email: "naren@gmail.com",
      token: "123456",
      type: "signup",
    });

    const otpRes = await sendSignInOtp("naren@gmail.com");
    expect(otpRes.ok).toBe(true);
    expect(authMocks.signInWithOtp).toHaveBeenCalledWith({
      email: "naren@gmail.com",
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    const signInRes = await signInWithEmail("naren@gmail.com", "Password123!");
    expect(signInRes.ok).toBe(true);
    expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
      email: "naren@gmail.com",
      password: "Password123!",
    });
  });

  it("shows clear inline missing env error in CosmicAuthPage when Supabase env vars are missing", async () => {
    vi.doMock("@/integrations/supabase/client", () => ({
      MISSING_SUPABASE_ENV_MESSAGE: "Missing Supabase environment variables in deployment settings",
      isSupabaseConfigured: () => false,
      supabase: { auth: authMocks },
    }));

    const { CosmicAuthPage } = await import("@/components/CosmicAuthPage");
    render(<CosmicAuthPage />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(
      "Missing Supabase environment variables in deployment settings",
    );

    const googleButton = screen.getByRole("button", { name: /Continue with Google/i });
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Missing Supabase environment variables in deployment settings",
      );
    });
    expect(authMocks.signInWithOAuth).not.toHaveBeenCalled();
  });
});
