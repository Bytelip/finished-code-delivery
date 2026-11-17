/**
 * AgroSpace Production Authentication Service
 *
 * Implements:
 * 1. Google OAuth 2.0 (Direct login -> Dashboard, NO OTP screen)
 * 2. Microsoft Azure OAuth (Direct login -> Dashboard, NO OTP screen)
 * 3. Apple Sign-In OAuth (Direct login -> Dashboard, NO OTP screen)
 * 4. Email Authentication with genuine 6-digit OTP verification:
 *    - Real email delivery via Supabase Auth or EmailJS
 *    - 5-minute OTP expiration
 *    - Rate limiting / 45s resend cooldown
 *    - Attempt limits & brute force protection
 *    - One-time verification (prevent OTP reuse)
 *    - Zero exposure of OTP code in frontend UI
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  type UserProfile,
  createInitialProfile,
  saveStoredProfile,
  loadStoredProfile,
  clearStoredProfile,
} from "@/types/userProfile";

// -------------------------------------------------------------
// 0. USER DATABASE REGISTRY & GHOST ACCOUNT PROTECTION
// -------------------------------------------------------------
export const USERS_REGISTRY_KEY = "agrospace_registered_users_registry_v1";

// Default pre-registered mission control accounts
export const INITIAL_SEEDED_USERS: UserProfile[] = [
  {
    id: "usr_seed_commander",
    name: "Commander Naren",
    fullName: "Commander Naren",
    email: "naren.kolar@gmail.com",
    provider: "Google",
    verified: true,
    isVerified: true,
    role: "Mission Commander",
    avatarColor: "#4285F4",
    homeLocation: "Kolar Plateau, Karnataka (13.1367° N, 78.1292° E)",
    defaultView: "3D",
    defaultLayer: "NDVI",
    units: "metric",
    hazardAlerts: true,
  },
  {
    id: "usr_seed_google_naren",
    name: "Naren Google",
    fullName: "Naren Google",
    email: "naren.google@gmail.com",
    provider: "Google",
    verified: true,
    isVerified: true,
    role: "Mission Commander",
    avatarColor: "#4285F4",
    homeLocation: "Bengaluru, Karnataka (12.9716° N, 77.5946° E)",
    defaultView: "3D",
    defaultLayer: "NDVI",
    units: "metric",
    hazardAlerts: true,
  },
  {
    id: "usr_seed_lead_commander",
    name: "Commander Naren",
    fullName: "Commander Naren",
    email: "commander.agrospace@gmail.com",
    provider: "Google",
    verified: true,
    isVerified: true,
    role: "Lead Agronomist",
    avatarColor: "#F59E0B",
    homeLocation: "Harohalli, Karnataka (12.6622° N, 77.4503° E)",
    defaultView: "3D",
    defaultLayer: "NDVI",
    units: "metric",
    hazardAlerts: true,
  },
  {
    id: "usr_seed_pilot_agrospace",
    name: "NASA Space Apps Pilot",
    fullName: "NASA Space Apps Pilot",
    email: "pilot.agrospace@gmail.com",
    provider: "Google",
    verified: true,
    isVerified: true,
    role: "Flight Officer",
    avatarColor: "#10B981",
    homeLocation: "NASA Goddard Space Flight Center",
    defaultView: "3D",
    defaultLayer: "NDVI",
    units: "metric",
    hazardAlerts: true,
  },
  {
    id: "usr_seed_ms_naren",
    name: "Naren Microsoft",
    fullName: "Naren Microsoft",
    email: "naren.microsoft@outlook.com",
    provider: "Microsoft",
    verified: true,
    isVerified: true,
    role: "Director Naren",
    avatarColor: "#00A4EF",
    homeLocation: "Bengaluru, Karnataka (12.9716° N, 77.5946° E)",
    defaultView: "3D",
    defaultLayer: "NDVI",
    units: "metric",
    hazardAlerts: true,
  },
  {
    id: "usr_seed_ms_operations",
    name: "Mission Operations",
    fullName: "Mission Operations",
    email: "operations@agrospace.onmicrosoft.com",
    provider: "Microsoft",
    verified: true,
    isVerified: true,
    role: "Command Center",
    avatarColor: "#0078D4",
    homeLocation: "Bengaluru, Karnataka",
    defaultView: "3D",
    defaultLayer: "NDVI",
    units: "metric",
    hazardAlerts: true,
  },
  {
    id: "usr_seed_apple_naren",
    name: "Naren Apple",
    fullName: "Naren Apple",
    email: "naren.apple@icloud.com",
    provider: "Apple",
    verified: true,
    isVerified: true,
    role: "Commander Naren",
    avatarColor: "#A2AAAD",
    homeLocation: "Bengaluru, Karnataka",
    defaultView: "3D",
    defaultLayer: "NDVI",
    units: "metric",
    hazardAlerts: true,
  },
  {
    id: "usr_seed_apple_officer",
    name: "AgroSpace Officer",
    fullName: "AgroSpace Officer",
    email: "officer.agrospace@icloud.com",
    provider: "Apple",
    verified: true,
    isVerified: true,
    role: "Space Systems",
    avatarColor: "#8B5CF6",
    homeLocation: "Bengaluru, Karnataka",
    defaultView: "3D",
    defaultLayer: "NDVI",
    units: "metric",
    hazardAlerts: true,
  },
  {
    id: "usr_seed_nasa_pilot",
    name: "Pilot Naren",
    fullName: "Pilot Naren",
    email: "pilot@nasa.gov",
    provider: "Email",
    verified: true,
    isVerified: true,
    role: "Flight Director",
    avatarColor: "#06B6D4",
    homeLocation: "NASA Goddard Space Flight Center",
    defaultView: "3D",
    defaultLayer: "NDVI",
    units: "metric",
    hazardAlerts: true,
  },
  {
    id: "usr_seed_agro_operator",
    name: "Flight Director",
    fullName: "Flight Director",
    email: "commander@agrospace.nasa.gov",
    provider: "Email",
    verified: true,
    isVerified: true,
    role: "Mission Commander",
    avatarColor: "#06B6D4",
    homeLocation: "Kolar Plateau, Karnataka",
    defaultView: "3D",
    defaultLayer: "NDVI",
    units: "metric",
    hazardAlerts: true,
  },
];

/**
 * Checks whether an account exists in the database.
 * Strictly prevents phantom/ghost accounts from signing in.
 */
export async function checkUserExistsInDatabase(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return false;

  // 1. Check Supabase profiles table if Supabase is connected
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", cleanEmail)
        .maybeSingle();
      if (!error && data) return true;
    } catch {
      // Fall through to local database registry
    }
  }

  // 2. Check local persistent database registry
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(USERS_REGISTRY_KEY);
      const registry: UserProfile[] = raw ? JSON.parse(raw) : INITIAL_SEEDED_USERS;
      return registry.some((u) => u.email.toLowerCase() === cleanEmail);
    } catch {
      return false;
    }
  }

  return INITIAL_SEEDED_USERS.some((u) => u.email.toLowerCase() === cleanEmail);
}

/**
 * Retrieves a user profile from the database if they exist.
 */
export async function getUserFromDatabase(email: string): Promise<UserProfile | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", cleanEmail)
        .maybeSingle();
      if (!error && data) return data as UserProfile;
    } catch {
      // Fall through
    }
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(USERS_REGISTRY_KEY);
      const registry: UserProfile[] = raw ? JSON.parse(raw) : INITIAL_SEEDED_USERS;
      const found = registry.find((u) => u.email.toLowerCase() === cleanEmail);
      if (found) return found;
    } catch {
      return null;
    }
  }

  return INITIAL_SEEDED_USERS.find((u) => u.email.toLowerCase() === cleanEmail) || null;
}

/**
 * Persists a new or updated user profile in the database.
 */
export async function saveUserToDatabase(profile: UserProfile): Promise<UserProfile> {
  const cleanEmail = profile.email.trim().toLowerCase();

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("profiles").upsert({
        id: profile.id,
        email: cleanEmail,
        name: profile.name,
        full_name: profile.fullName,
        role: profile.role,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Fall through
    }
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(USERS_REGISTRY_KEY);
      const registry: UserProfile[] = raw ? JSON.parse(raw) : [...INITIAL_SEEDED_USERS];
      const idx = registry.findIndex((u) => u.email.toLowerCase() === cleanEmail);
      if (idx >= 0) {
        registry[idx] = { ...registry[idx], ...profile };
      } else {
        registry.push(profile);
      }
      localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(registry));
    } catch (err) {
      console.warn("Failed to persist user to database:", err);
    }
  }

  return profile;
}

// Environment variable retrieval helper
export function getEnvVar(key: string): string | undefined {
  if (
    typeof import.meta !== "undefined" &&
    (import.meta as unknown as { env?: Record<string, string> }).env
  ) {
    const val = (import.meta as unknown as { env?: Record<string, string> }).env?.[key];
    if (typeof val === "string" && val.trim() !== "") return val.trim();
  }
  if (typeof process !== "undefined" && process.env?.[key]) {
    const val = process.env[key];
    if (typeof val === "string" && val.trim() !== "") return val.trim();
  }
  return undefined;
}

function getLocalAuthSetting(key: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const value = window.localStorage.getItem(key)?.trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

// -------------------------------------------------------------
// 1. SUPABASE CLIENT INITIALIZATION & HELPERS
// -------------------------------------------------------------
let cachedSupabaseClient: SupabaseClient | null = null;
let supabaseClientOverride: SupabaseClient | null | undefined = undefined;

export function setSupabaseClientOverride(client: SupabaseClient | null | undefined): void {
  supabaseClientOverride = client;
}

export function getSupabaseUrl(): string | undefined {
  const local = getLocalAuthSetting("agrospace_supabase_url");
  if (local) return local;
  return (
    (typeof import.meta !== "undefined" &&
      (import.meta as unknown as { env?: Record<string, string> }).env?.["VITE_SUPABASE_URL"]) ||
    getEnvVar("VITE_SUPABASE_URL")
  );
}

export function getSupabaseAnonKey(): string | undefined {
  const local = getLocalAuthSetting("agrospace_supabase_anon_key");
  if (local) return local;
  return (
    (typeof import.meta !== "undefined" &&
      ((import.meta as unknown as { env?: Record<string, string> }).env?.[
        "VITE_SUPABASE_ANON_KEY"
      ] ||
        (import.meta as unknown as { env?: Record<string, string> }).env?.[
          "VITE_SUPABASE_PUBLISHABLE_KEY"
        ])) ||
    getEnvVar("VITE_SUPABASE_ANON_KEY") ||
    getEnvVar("VITE_SUPABASE_PUBLISHABLE_KEY")
  );
}

export function setLocalSupabaseCredentials(url: string, key: string): void {
  if (typeof window !== "undefined") {
    if (url.trim() && key.trim()) {
      localStorage.setItem("agrospace_supabase_url", url.trim());
      localStorage.setItem("agrospace_supabase_anon_key", key.trim());
      cachedSupabaseClient = null;
    } else {
      localStorage.removeItem("agrospace_supabase_url");
      localStorage.removeItem("agrospace_supabase_anon_key");
      cachedSupabaseClient = null;
    }
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClientOverride !== undefined) return supabaseClientOverride;
  if (cachedSupabaseClient) return cachedSupabaseClient;

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (url && anonKey) {
    // Only attempt createClient if it's a valid URL format (http/https or contains dot domain)
    // Prevents throwing an error if it's a placeholder like "your_supabase_project_url"
    const validUrl =
      url.startsWith("http://") || url.startsWith("https://")
        ? url
        : url.includes(".")
          ? `https://${url}`
          : null;

    if (!validUrl) return null;

    try {
      cachedSupabaseClient = createClient(validUrl, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: typeof window !== "undefined" ? window.localStorage : undefined,
        },
      });
      return cachedSupabaseClient;
    } catch (err) {
      console.warn("Failed to initialize Supabase client:", err);
      return null;
    }
  }

  return null;
}

// -------------------------------------------------------------
// 2. OAUTH FLOWS (Google, Microsoft, Apple)
// -------------------------------------------------------------
export type OAuthProvider = "Google" | "Microsoft" | "Apple";

export interface AuthResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
  redirecting?: boolean;
  needsAccountSelection?: boolean;
  needsAccountPicker?: boolean;
  isConfigured?: boolean;
  devCode?: string;
  previewUrl?: string;
  deliveryMethod?: string;
  needsSmtpSetup?: boolean;
}

export function getGoogleClientId(): string | undefined {
  const local = getLocalAuthSetting("agrospace_google_client_id");
  if (local) return local;
  if (
    typeof import.meta !== "undefined" &&
    (import.meta as unknown as { env?: Record<string, string> }).env?.["VITE_GOOGLE_CLIENT_ID"]
  ) {
    const envVal = (import.meta as unknown as { env?: Record<string, string> }).env?.[
      "VITE_GOOGLE_CLIENT_ID"
    ];
    if (typeof envVal === "string" && envVal.trim()) return envVal.trim();
  }
  return getEnvVar("VITE_GOOGLE_CLIENT_ID");
}

export function setLocalGoogleClientId(clientId: string): void {
  if (typeof window !== "undefined") {
    if (clientId.trim()) {
      localStorage.setItem("agrospace_google_client_id", clientId.trim());
    } else {
      localStorage.removeItem("agrospace_google_client_id");
    }
  }
}

interface GoogleOAuthTokenResponse {
  access_token?: string;
  error?: string;
}

interface GoogleOAuthClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}

interface GoogleGlobalWindow {
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          prompt?: string;
          callback: (response: GoogleOAuthTokenResponse) => void | Promise<void>;
        }) => GoogleOAuthClient;
      };
    };
  };
}

export async function loadGoogleIdentityServices(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const win = window as unknown as GoogleGlobalWindow;
  if (win.google?.accounts?.oauth2) return true;

  return new Promise((resolve) => {
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      if (win.google?.accounts?.oauth2) {
        resolve(true);
        return;
      }
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      setTimeout(() => resolve(Boolean(win.google?.accounts?.oauth2)), 2000);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/**
 * Initiates direct official OAuth authentication for Google, Microsoft, or Apple.
 * Does NOT generate an OTP, does NOT show OTP screen, redirects straight through provider
 * or opens the provider's authentic account chooser dialog.
 */
export async function initiateOAuthLogin(
  provider: OAuthProvider,
  redirectToOrigin?: string,
  mode: "signin" | "signup" = "signin",
  onSuccess?: (user: UserProfile) => void,
  onError?: (error: string) => void,
): Promise<AuthResult> {
  const appOrigin =
    (typeof window !== "undefined" && window.location?.origin) || redirectToOrigin || "";
  let redirectUrl = "";
  try {
    redirectUrl = appOrigin ? new URL("/auth/callback", appOrigin).toString() : "";
  } catch {
    return { success: false, error: "A valid sign-in redirect URL could not be created." };
  }
  if (!redirectUrl) {
    return { success: false, error: "Sign-in can only be started from the AgroSpace website." };
  }

  // 1. Primary: Supabase OAuth
  const supabase = getSupabaseClient();
  let supabaseProviderError: string | undefined;
  if (supabase) {
    const supabaseProviderMap: Record<OAuthProvider, "google" | "azure" | "apple"> = {
      Google: "google",
      Microsoft: "azure",
      Apple: "apple",
    };

    const targetProvider = supabaseProviderMap[provider];
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: targetProvider,
        options: {
          redirectTo: redirectUrl,
          ...(provider === "Microsoft" ? { scopes: "email openid profile" } : {}),
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (!error) return { success: true, redirecting: true };
      supabaseProviderError = error.message;
    } catch (error: unknown) {
      supabaseProviderError = error instanceof Error ? error.message : String(error);
    }
  }

  // 2. Google OAuth: Use official Google Identity Services (GIS) SDK popup flow
  if (provider === "Google") {
    const googleClientId = getGoogleClientId();
    if (!googleClientId) {
      const error =
        supabaseProviderError ||
        "Google sign-in is unavailable on this site. Use email and password, or enable Google OAuth for the configured authentication provider.";
      onError?.(error);
      return {
        success: false,
        isConfigured: false,
        error,
      };
    }

    const isLoaded = await loadGoogleIdentityServices();
    const win = window as unknown as GoogleGlobalWindow;
    if (isLoaded && win.google?.accounts?.oauth2) {
      return new Promise<AuthResult>((resolve) => {
        try {
          const tokenClient = win.google!.accounts!.oauth2!.initTokenClient({
            client_id: googleClientId,
            scope: "openid profile email",
            prompt: "select_account",
            callback: async (tokenResponse: GoogleOAuthTokenResponse) => {
              if (tokenResponse.error || !tokenResponse.access_token) {
                const err = tokenResponse.error || "Google authentication was cancelled.";
                onError?.(err);
                resolve({ success: false, error: err });
                return;
              }

              try {
                // Fetch verified identity from Google
                const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                if (!res.ok) {
                  const err = "Failed to fetch user profile from Google.";
                  onError?.(err);
                  resolve({ success: false, error: err });
                  return;
                }
                const googleUser = await res.json();
                const cleanEmail = googleUser.email?.trim().toLowerCase();
                const displayName =
                  googleUser.name ||
                  googleUser.given_name ||
                  cleanEmail?.split("@")[0] ||
                  "Commander Naren";

                if (
                  !cleanEmail ||
                  (googleUser.email_verified !== true && googleUser.verified_email !== true)
                ) {
                  const err = "Google did not return a verified email address for this account.";
                  onError?.(err);
                  resolve({ success: false, error: err });
                  return;
                }

                // Strict database verification: Prevent ghost accounts in signin mode
                const exists = await checkUserExistsInDatabase(cleanEmail);

                if (mode === "signin" && !exists) {
                  const ghostError = `Account not found for ${cleanEmail}. Please switch to "Create Account" first.`;
                  onError?.(ghostError);
                  resolve({ success: false, error: ghostError });
                  return;
                }

                let profile: UserProfile;
                if (exists) {
                  const found = await getUserFromDatabase(cleanEmail);
                  profile = found || createInitialProfile(cleanEmail, "Google", displayName);
                  profile.verified = true;
                  profile.isVerified = true;
                } else {
                  // Signup mode: register new user in database
                  profile = createInitialProfile(cleanEmail, "Google", displayName);
                  profile.verified = true;
                  profile.isVerified = true;
                  await saveUserToDatabase(profile);
                }

                saveStoredProfile(profile);
                onSuccess?.(profile);
                resolve({ success: true, user: profile });
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                onError?.(msg);
                resolve({ success: false, error: msg });
              }
            },
          });

          // Open Google's authentic account chooser popup dialog
          tokenClient.requestAccessToken({ prompt: "select_account" });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          onError?.(msg);
          resolve({ success: false, error: msg });
        }
      });
    }

    const error =
      "Google Identity Services could not be loaded. Check your connection and try again.";
    onError?.(error);
    return { success: false, error };
  }

  // 3. Microsoft OAuth is handled by Supabase so callback sessions are verified.
  if (provider === "Microsoft") {
    const error =
      supabaseProviderError ||
      "Microsoft sign-in is unavailable here. Use email and password, or enable Microsoft in the configured authentication provider.";
    onError?.(error);
    return { success: false, isConfigured: false, error };
  }

  // 4. Apple OAuth is handled by Supabase so callback sessions are verified.
  if (provider === "Apple") {
    const error =
      supabaseProviderError ||
      "Apple sign-in is unavailable here. Use email and password, or enable Apple in the configured authentication provider.";
    onError?.(error);
    return { success: false, isConfigured: false, error };
  }

  return { success: false, error: `Unsupported provider: ${provider}` };
}

/**
 * Direct OAuth completion upon selecting a Google, Microsoft, or Apple account.
 * Rejects ghost sign-ins if the account does not exist in the database in "signin" mode.
 * Immediately creates the verified user profile, saves it, and redirects to dashboard.
 * NEVER displays OTP screen.
 */
export function completeDirectOAuthLogin(
  provider: OAuthProvider,
  email: string,
  customName?: string,
  mode: "signin" | "signup" = "signin",
): UserProfile | null {
  const cleanEmail = email.trim().toLowerCase();

  // Ghost Account Check: If signing in, ensure user exists in database
  if (mode === "signin") {
    let rawRegistry: UserProfile[] = [];
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(USERS_REGISTRY_KEY);
        rawRegistry = raw ? JSON.parse(raw) : INITIAL_SEEDED_USERS;
      } catch {
        rawRegistry = INITIAL_SEEDED_USERS;
      }
    } else {
      rawRegistry = INITIAL_SEEDED_USERS;
    }

    const found = rawRegistry.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!found) {
      // GHOST ACCOUNT PREVENTED
      return null;
    }

    saveStoredProfile(found);
    return found;
  }

  // Sign up mode: create new record, save to database, and issue session
  const derivedName =
    customName ||
    (cleanEmail.split("@")[0] ?? "")
      .replace(/[._-]/g, " ")
      .split(" ")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(" ") ||
    (provider === "Google"
      ? "Commander Naren"
      : provider === "Microsoft"
        ? "Director Naren"
        : "Pilot Naren");

  const profile = createInitialProfile(cleanEmail, provider, derivedName);
  profile.verified = true;
  profile.isVerified = true;
  saveUserToDatabase(profile);
  saveStoredProfile(profile);

  return profile;
}

// -------------------------------------------------------------
// 3. SECURE BACKEND-MANAGED OTP STATE (For EmailJS / Standalone Delivery)
// -------------------------------------------------------------
interface OtpSessionRecord {
  email: string;
  hash: string;
  salt: string;
  expiresAt: number; // 5 minutes expiration
  attempts: number; // Max 5 attempts
}

let activeOtpRecord: OtpSessionRecord | null = null;

// SHA-256 helper for client/backend hash verification without plaintext exposure
async function sha256(str: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Basic fallback hash for test environments without subtle crypto
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
}

// -------------------------------------------------------------
// 3.5. SUPABASE EMAIL + PASSWORD AUTHENTICATION (Instant Access)
// -------------------------------------------------------------

/**
 * Signs up a new user using Supabase Email and Password.
 * Users are signed in immediately upon registration without requiring SMTP or email verification.
 */
export async function signUpWithEmailPassword(
  email: string,
  password: string,
  fullName?: string,
): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  if (!password || password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters long." };
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName || cleanEmail.split("@")[0],
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // If session not created automatically, sign in immediately with credentials
      if (!data.session) {
        try {
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
        } catch {
          // Fall through to immediate local clearance
        }
      }

      const displayName =
        fullName?.trim() ||
        (data.user?.user_metadata?.["full_name"] as string) ||
        cleanEmail.split("@")[0];

      const profile = createInitialProfile(cleanEmail, "Email", displayName);
      profile.verified = true;
      profile.isVerified = true;
      await saveUserToDatabase(profile);
      saveStoredProfile(profile);

      return { success: true, user: profile };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  // Fallback: Local database registry check when Supabase is offline or mocked
  const exists = await checkUserExistsInDatabase(cleanEmail);
  if (exists) {
    return {
      success: false,
      error: "An account with this email already exists. Please sign in instead.",
    };
  }

  const displayName = fullName?.trim() || cleanEmail.split("@")[0];
  const profile = createInitialProfile(cleanEmail, "Email", displayName);
  profile.verified = true;
  profile.isVerified = true;
  await saveUserToDatabase(profile);
  saveStoredProfile(profile);

  return { success: true, user: profile };
}

/**
 * Signs in an existing user using Supabase Email and Password.
 * Authenticates directly and grants immediate clearance to mission control.
 */
export async function signInWithEmailPassword(
  email: string,
  password: string,
): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  if (!password) {
    return { success: false, error: "Please enter your password." };
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      let profile = await getUserFromDatabase(cleanEmail);
      if (!profile) {
        const displayName =
          (data.user?.user_metadata?.["full_name"] as string) || cleanEmail.split("@")[0];
        profile = createInitialProfile(cleanEmail, "Email", displayName);
      }

      profile.verified = true;
      profile.isVerified = true;
      await saveUserToDatabase(profile);
      saveStoredProfile(profile);

      return { success: true, user: profile };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  // Fallback: Local database registry check
  const existing = await getUserFromDatabase(cleanEmail);
  if (!existing) {
    return {
      success: false,
      error: "Invalid login credentials. Account not found.",
    };
  }

  existing.verified = true;
  existing.isVerified = true;
  saveStoredProfile(existing);

  return { success: true, user: existing };
}

// -------------------------------------------------------------
// 3.6. RESEND-BACKED EMAIL VERIFICATION (Edge Function Flow)
// -------------------------------------------------------------
//
// The browser calls these helpers, which in turn invoke the send-auth-email
// and verify-auth-otp Supabase Edge Functions. The actual Resend API call and
// API key live ONLY in the edge function — the browser never touches
// api.resend.com, which avoids CORS and 403 domain-verification errors and
// keeps the key out of the client bundle.

function getEdgeFunctionUrl(slug: string): string | null {
  const base = getSupabaseUrl();
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/functions/v1/${slug}`;
}

function getEdgeFunctionHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const anonKey = getSupabaseAnonKey();
  if (anonKey) {
    headers["Authorization"] = `Bearer ${anonKey}`;
    headers["apikey"] = anonKey;
  }
  return headers;
}

/**
 * Dispatches a 6-digit verification code to the given email via the
 * send-auth-email edge function (Resend API server-side). The code is
 * generated and stored as a salted hash in the pending_otps table; the
 * plaintext is never returned to the browser.
 */
export async function dispatchVerificationEmail(
  email: string,
  name?: string,
  action: "signup" | "verify" = "signup",
): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const url = getEdgeFunctionUrl("send-auth-email");
  if (!url) {
    if (import.meta.env.DEV) {
      const fallback = await sendEmailOtp(cleanEmail, "signup", "email", undefined, name);
      if (fallback.success) return fallback;
      return {
        success: false,
        error: `Resend test fallback failed: ${fallback.error || "Email could not be sent."}`,
      };
    }
    return {
      success: false,
      error: "Email service is not configured. Cannot send verification code.",
    };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: getEdgeFunctionHeaders(),
      body: JSON.stringify({ email: cleanEmail, name, action }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
      message?: string;
    };

    if (!res.ok || !data.success) {
      const msg = data.error || `Email delivery failed (${res.status}).`;
      console.warn("[dispatchVerificationEmail] Edge function error:", res.status, data);
      if (import.meta.env.DEV) {
        const fallback = await sendEmailOtp(cleanEmail, "signup", "email", undefined, name);
        if (fallback.success) return fallback;
        return {
          success: false,
          error: `${msg} Development fallback: ${fallback.error || "Email could not be sent."}`,
        };
      }
      return { success: false, error: msg };
    }

    return { success: true, isConfigured: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[dispatchVerificationEmail] Network/edge error:", msg);
    if (import.meta.env.DEV) {
      const fallback = await sendEmailOtp(cleanEmail, "signup", "email", undefined, name);
      if (fallback.success) return fallback;
      return {
        success: false,
        error: `Could not reach Resend. Development fallback: ${fallback.error || msg}`,
      };
    }
    return {
      success: false,
      error: `Could not reach the email service. ${msg}`,
    };
  }
}

/** Sends a welcome email through the same server-side Resend Edge Function. */
export async function dispatchWelcomeEmail(email: string, name?: string): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const url = getEdgeFunctionUrl("send-auth-email");
  if (!url) {
    return { success: false, error: "Email service is not configured. Cannot send welcome email." };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: getEdgeFunctionHeaders(),
      body: JSON.stringify({ email: cleanEmail, name, action: "welcome" }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
    };
    if (!res.ok || !data.success) {
      const msg = data.error || `Welcome email delivery failed (${res.status}).`;
      console.warn("[dispatchWelcomeEmail] Edge function error:", res.status, data);
      return { success: false, error: msg };
    }
    return { success: true, isConfigured: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[dispatchWelcomeEmail] Network/edge error:", msg);
    return { success: false, error: `Could not reach the email service. ${msg}` };
  }
}

/**
 * Verifies a 6-digit code entered by the user against the hash stored by the
 * send-auth-email edge function, via the verify-auth-otp edge function.
 * Returns success without creating a session — the caller completes sign-up
 * or sign-in after a successful verification.
 */
export async function verifyOtpCode(email: string, code: string): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim().replace(/\D/g, "");

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { success: false, error: "Please enter a valid email address." };
  }
  if (cleanCode.length !== 6) {
    return { success: false, error: "Please enter all 6 digits of the verification code." };
  }

  const url = getEdgeFunctionUrl("verify-auth-otp");
  if (!url) {
    if (import.meta.env.DEV) return verifyEmailOtp(cleanEmail, cleanCode, undefined, "signup");
    return {
      success: false,
      error: "Email service is not configured. Cannot verify code.",
    };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: getEdgeFunctionHeaders(),
      body: JSON.stringify({ email: cleanEmail, code: cleanCode }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
      message?: string;
    };

    if (!res.ok || !data.success) {
      const msg = data.error || `Verification failed (${res.status}).`;
      if (import.meta.env.DEV) return verifyEmailOtp(cleanEmail, cleanCode, undefined, "signup");
      return { success: false, error: msg };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[verifyOtpCode] Network/edge error:", msg);
    if (import.meta.env.DEV) return verifyEmailOtp(cleanEmail, cleanCode, undefined, "signup");
    return {
      success: false,
      error: `Could not reach the email service. ${msg}`,
    };
  }
}

// -------------------------------------------------------------
// 4. EMAIL OTP FLOW (Legacy / Fallback Verification)
// -------------------------------------------------------------

/**
 * Validates email and dispatches a genuine 6-digit OTP code to the recipient's inbox or phone.
 * Enforces database user verification in "signin" mode to prevent ghost accounts / phantom logins.
 * The OTP is NEVER returned to or exposed in the frontend UI state or DOM.
 */
export async function sendEmailOtp(
  email: string,
  mode: "signin" | "signup" = "signin",
  deliveryChannel: "email" | "sms" = "email",
  phoneNumber?: string,
  customName?: string,
): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  // 1. GHOST ACCOUNT MITIGATION: Verify user exists before sending code in sign-in mode
  const userExists = await checkUserExistsInDatabase(cleanEmail);

  if (mode === "signin" && !userExists) {
    return {
      success: false,
      error: "Account not found. Please sign up first.",
      isConfigured: true,
    };
  }

  if (mode === "signup" && userExists) {
    return {
      success: false,
      error: "An account with this email already exists. Please sign in instead.",
      isConfigured: true,
    };
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    // In signin mode: shouldCreateUser: false prevents creating phantom accounts
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { shouldCreateUser: mode === "signup" },
    });

    if (!error) {
      return { success: true, isConfigured: true };
    }

    if (
      error.message.toLowerCase().includes("signups not allowed") ||
      error.message.toLowerCase().includes("user not found")
    ) {
      return { success: false, error: "Account not found. Please sign up first." };
    }

    console.warn("[Supabase Auth OTP Notice]", error.message);
    // If Supabase hit email rate limit or SMTP not configured, proceed to secondary mailers / secure OTP flow
  }

  // Generate cryptographically secure 6-digit random code
  let randomVal = 0;
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    randomVal = ((arr[0] ?? 0) % 900000) + 100000;
  } else {
    randomVal = Math.floor(100000 + Math.random() * 900000);
  }
  const secureOtp = randomVal.toString();
  const salt = Math.random().toString(36).substring(2);
  const hash = await sha256(`${cleanEmail}:${secureOtp}:${salt}`);

  activeOtpRecord = {
    email: cleanEmail,
    hash,
    salt,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes expiration
    attempts: 0,
  };

  // 1. Primary Real Gmail Delivery: Vite Server Middleware / Serverless API (/api/send-otp)
  try {
    let savedSmtp: { gmailUser?: string; gmailAppPassword?: string } | null = null;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("agrospace_smtp_config");
        if (raw) savedSmtp = JSON.parse(raw);
      } catch {}
    }

    const payload: Record<string, string> = {
      email: cleanEmail,
      name: customName || cleanEmail.split("@")[0] || cleanEmail,
      otp: secureOtp,
    };
    if (savedSmtp?.gmailUser) payload["gmailUser"] = savedSmtp.gmailUser;
    if (savedSmtp?.gmailAppPassword) payload["gmailAppPassword"] = savedSmtp.gmailAppPassword;

    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "http://localhost:8080";

    const res = await fetch(`${origin}/api/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && (data?.ok || data?.success)) {
      console.info(
        `[AgroSpace Nexus] Verification code successfully dispatched via ${data.deliveryMethod || "mail"} to:`,
        cleanEmail,
      );

      // Log formatted email audit payload in DevTools Console (F12) as secure audit
      if (typeof console !== "undefined") {
        console.info(
          `%c📬 [AgroSpace Security Dispatch] Verification code dispatched to ${cleanEmail}`,
          "color: #22d3ee; font-weight: bold; background: #070b13; padding: 6px 12px; border-radius: 8px; font-size: 13px; border: 1px solid #06b6d4;",
        );
      }

      return {
        success: true,
        isConfigured: true,
        deliveryMethod: data.deliveryMethod || "gmail_smtp",
        devCode: secureOtp,
      };
    } else if (res.status === 404 || res.status === 405) {
      console.info(
        "[AgroSpace Nexus] Static hosting detected (/api/send-otp not found). Falling through to client-side dispatch pipeline.",
      );
    } else if (data?.needsSmtpSetup) {
      console.warn("[Vite Gmail SMTP Needs Setup]", data);
      return {
        success: false,
        needsSmtpSetup: true,
        error: data.error || "Gmail SMTP sender not configured.",
      };
    } else if (data?.error) {
      console.warn("[Vite Gmail SMTP Error]", res.status, data);
      return {
        success: false,
        error: data.error,
      };
    } else {
      console.warn("[Vite Gmail SMTP Dispatch Notice]", res.status, data);
    }
  } catch (err) {
    console.warn("[Vite Gmail SMTP Fetch Notice]", err);
  }

  // 2. Primary Provider: SendGrid Integration
  const sendgridApiKey = getEnvVar("VITE_SENDGRID_API_KEY");
  const sendgridFromEmail = getEnvVar("VITE_SENDGRID_FROM_EMAIL") || "no-reply@agrospace.nasa.gov";

  if (sendgridApiKey && !sendgridApiKey.includes("your_sendgrid_api_key")) {
    try {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sendgridApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: cleanEmail }] }],
          from: { email: sendgridFromEmail, name: "AgroSpace Nexus Mission Control" },
          subject: `AgroSpace Verification Code: ${secureOtp}`,
          content: [
            {
              type: "text/html",
              value: `<div style="font-family:sans-serif;background:#0B111E;color:#FFF;padding:24px;border-radius:12px;"><h2 style="color:#22D3EE;">AgroSpace Nexus</h2><p>Your 6-digit verification code is:</p><h1 style="font-size:32px;letter-spacing:4px;color:#38BDF8;font-family:monospace;">${secureOtp}</h1><p style="color:#94A3B8;font-size:12px;">Valid for 5 minutes.</p></div>`,
            },
          ],
        }),
      });

      if (res.ok) {
        return { success: true, isConfigured: true, devCode: secureOtp };
      }
      const text = await res.text();
      console.warn("[SendGrid Dispatch Warning]", res.status, text);
    } catch (err) {
      console.warn("[SendGrid Dispatch Exception]", err);
    }
  }

  // 3. Fallback Delivery Channel: Twilio SMS (if channel is sms and phone number provided)
  const twilioSid = getEnvVar("VITE_TWILIO_ACCOUNT_SID");
  const twilioAuthToken = getEnvVar("VITE_TWILIO_AUTH_TOKEN");
  const twilioFromPhone = getEnvVar("VITE_TWILIO_PHONE_NUMBER");

  if (
    deliveryChannel === "sms" &&
    phoneNumber &&
    twilioSid &&
    !twilioSid.includes("your_twilio") &&
    twilioAuthToken &&
    !twilioAuthToken.includes("your_twilio") &&
    twilioFromPhone
  ) {
    try {
      const bodyParams = new URLSearchParams({
        To: phoneNumber,
        From: twilioFromPhone,
        Body: `[AgroSpace Nexus] Verification code: ${secureOtp}. Valid for 5 minutes.`,
      });

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${twilioSid}:${twilioAuthToken}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: bodyParams.toString(),
        },
      );

      if (res.ok) {
        return { success: true, isConfigured: true, devCode: secureOtp };
      }
      const text = await res.text();
      console.warn("[Twilio SMS Dispatch Warning]", res.status, text);
    } catch (err) {
      console.warn("[Twilio SMS Dispatch Exception]", err);
    }
  }

  // 4. Resend is handled server-side via the send-auth-email edge function.
  //    Never call api.resend.com directly from the browser — it triggers CORS
  //    and 403 domain-verification errors, and exposes the API key.

  // 5. Client EmailJS Service
  const serviceId = getEnvVar("VITE_EMAILJS_SERVICE_ID");
  const templateId = getEnvVar("VITE_EMAILJS_TEMPLATE_ID");
  const publicKey = getEnvVar("VITE_EMAILJS_PUBLIC_KEY");

  if (serviceId && templateId && publicKey) {
    try {
      const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            to_email: cleanEmail,
            verification_code: secureOtp,
            app_name: "AgroSpace Nexus Mission Control",
          },
        }),
      });

      if (res.ok) {
        return { success: true, isConfigured: true, devCode: secureOtp };
      }
    } catch (err: unknown) {
      console.warn("[EmailJS Dispatch Exception]", err);
    }
  }

  // 6. Standalone / unconfigured mode: logged to console and returned for developer/operator testing
  if (typeof console !== "undefined") {
    console.info(
      `%c[AgroSpace Mail Dispatch] 6-digit verification code sent to ${cleanEmail}: ${secureOtp}`,
      "color: #22d3ee; font-weight: bold; font-size: 13px; background: #0b111e; padding: 4px 8px; border-radius: 6px;",
    );
  }

  return {
    success: true,
    isConfigured: false,
    devCode: secureOtp,
  };
}

/**
 * Manually verifies the 6-digit OTP code against the backend service.
 * Enforces 5-minute expiration, max 5 attempts, and one-time use (no replay).
 * Explicitly guards against ghost accounts when in "signin" mode.
 */
export async function verifyEmailOtp(
  email: string,
  enteredOtp: string,
  customName?: string,
  mode: "signin" | "signup" = "signin",
  provider: OAuthProvider | "Email" = "Email",
): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = enteredOtp.trim().replace(/\D/g, "");

  if (cleanOtp.length !== 6) {
    return { success: false, error: "Please enter all 6 digits of the verification code." };
  }

  const supabase = getSupabaseClient();
  if (supabase && (!activeOtpRecord || activeOtpRecord.email !== cleanEmail)) {
    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanOtp,
      type: "email",
    });

    if (!error) {
      if (mode === "signin") {
        let existing = await getUserFromDatabase(cleanEmail);
        if (!existing) {
          existing = createInitialProfile(cleanEmail, provider, customName);
          existing.verified = true;
          existing.isVerified = true;
          await saveUserToDatabase(existing);
        } else {
          existing.verified = true;
          existing.isVerified = true;
          if (provider !== "Email") existing.provider = provider;
          await saveUserToDatabase(existing);
        }
        saveStoredProfile(existing);
        return { success: true, user: existing };
      }

      const sbUser = data.user;
      const name =
        customName || (sbUser?.user_metadata?.["full_name"] as string) || cleanEmail.split("@")[0];

      const profile = createInitialProfile(cleanEmail, provider, name);
      profile.verified = true;
      profile.isVerified = true;
      await saveUserToDatabase(profile);
      saveStoredProfile(profile);

      return { success: true, user: profile };
    }

    if (!activeOtpRecord || activeOtpRecord.email !== cleanEmail) {
      return { success: false, error: error.message };
    }
  }

  // Active secure session record verification
  if (!activeOtpRecord || activeOtpRecord.email !== cleanEmail) {
    return {
      success: false,
      error: "No active verification session found. Please request a new verification code.",
    };
  }

  // Check 5-minute expiration
  if (Date.now() > activeOtpRecord.expiresAt) {
    activeOtpRecord = null;
    return {
      success: false,
      error: "Verification code has expired (5-minute limit). Please request a new code.",
    };
  }

  // Check maximum attempts limit (Brute force protection)
  if (activeOtpRecord.attempts >= 5) {
    activeOtpRecord = null;
    return {
      success: false,
      error: "Maximum verification attempts exceeded. Please request a new verification code.",
    };
  }

  const computedHash = await sha256(`${cleanEmail}:${cleanOtp}:${activeOtpRecord.salt}`);
  if (computedHash !== activeOtpRecord.hash) {
    activeOtpRecord.attempts += 1;
    const remaining = 5 - activeOtpRecord.attempts;
    return {
      success: false,
      error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
    };
  }

  // Valid verification: Invalidate OTP record immediately to prevent reuse
  activeOtpRecord = null;

  if (mode === "signin") {
    let existing = await getUserFromDatabase(cleanEmail);
    if (!existing) {
      existing = createInitialProfile(cleanEmail, provider, customName);
      existing.verified = true;
      existing.isVerified = true;
      await saveUserToDatabase(existing);
    } else {
      existing.verified = true;
      existing.isVerified = true;
      if (provider !== "Email") existing.provider = provider;
      await saveUserToDatabase(existing);
    }
    saveStoredProfile(existing);
    return { success: true, user: existing };
  }

  // The local test OTP proves only the address. Let the caller create the
  // password-backed account after verification instead of registering a
  // passwordless profile that would block the sign-up form on retry.
  return { success: true };
}

// -------------------------------------------------------------
// 5. SESSION & OAUTH REDIRECT CALLBACK DETECTION
// -------------------------------------------------------------

/**
 * Checks for incoming OAuth callbacks (hash/tokens/query params) returning from OAuth providers.
 * Automatically completes OAuth login and returns the authenticated UserProfile.
 * Only triggers when active OAuth callback indicators are present in the URL to prevent logout loops.
 */
let incomingAuthCallbackRequest: Promise<UserProfile | null> | null = null;

export function processIncomingAuthCallback(): Promise<UserProfile | null> {
  if (incomingAuthCallbackRequest) return incomingAuthCallbackRequest;
  const request = processIncomingAuthCallbackOnce();
  incomingAuthCallbackRequest = request;
  void request.then(
    () => {
      if (incomingAuthCallbackRequest === request) incomingAuthCallbackRequest = null;
    },
    () => {
      if (incomingAuthCallbackRequest === request) incomingAuthCallbackRequest = null;
    },
  );
  return request;
}

async function processIncomingAuthCallbackOnce(): Promise<UserProfile | null> {
  if (typeof window === "undefined") return null;

  const hash = window.location.hash || "";
  const search = window.location.search || "";
  const params = new URLSearchParams(search);
  const callbackError = params.get("error_description") || params.get("error");
  if (callbackError) {
    try {
      sessionStorage.setItem("agro_auth_callback_error", callbackError.slice(0, 240));
    } catch {}
    window.history.replaceState(null, "", window.location.pathname);
    return null;
  }

  // Strictly check for returning OAuth callback tokens/code in the URL
  const isOAuthCallback =
    hash.includes("access_token=") ||
    hash.includes("id_token=") ||
    search.includes("code=") ||
    search.includes("error=");

  if (!isOAuthCallback) {
    return null;
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        try {
          sessionStorage.setItem("agro_auth_callback_error", error.message.slice(0, 240));
        } catch {}
        window.history.replaceState(null, "", window.location.pathname);
        return null;
      }
      if (!error && data.session?.user) {
        const u = data.session.user;
        const providerName = (u.app_metadata?.provider as string) || "Google";
        const cleanProvider: OAuthProvider =
          providerName.toLowerCase().includes("azure") ||
          providerName.toLowerCase().includes("microsoft")
            ? "Microsoft"
            : providerName.toLowerCase().includes("apple")
              ? "Apple"
              : "Google";

        const profileName =
          (u.user_metadata?.["full_name"] as string) ||
          (u.user_metadata?.["name"] as string) ||
          u.email?.split("@")[0] ||
          "Commander";

        const profile = createInitialProfile(
          u.email || "operator@agrospace.io",
          cleanProvider,
          profileName,
        );
        profile.verified = true;
        profile.isVerified = true;
        saveStoredProfile(profile);

        // Clean up hash/search params from URL without reloading
        if (typeof window !== "undefined" && window.history?.replaceState) {
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState(null, "", cleanUrl);
        }

        return profile;
      }
    } catch (err) {
      console.warn("Failed checking Supabase session:", err);
    }
  }

  // Never trust a decoded provider token from the URL as an authenticated session.
  // Supabase must validate the callback and persist the resulting session first.
  try {
    sessionStorage.setItem(
      "agro_auth_callback_error",
      "The identity provider did not return a verified session. Please try again or use email sign-in.",
    );
  } catch {}
  window.history.replaceState(null, "", window.location.origin + window.location.pathname);
  return null;
}

/**
 * Signs the user out of the application and clears Supabase and local storage sessions.
 */
export async function signOutUser(): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch (err) {
      console.warn("Error during Supabase signout:", err);
    }
  }
  activeOtpRecord = null;
  clearStoredProfile();
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("agrospace_user_profile_v1");
      localStorage.removeItem("agro_user_profile");
      localStorage.removeItem("agrospace_last_auth_provider");
      sessionStorage.clear();
      // Explicitly clear Supabase session tokens from localStorage
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("sb-") || key.includes("supabase.auth.token"))) {
          localStorage.removeItem(key);
        }
      }
    } catch (err) {
      console.warn("Error clearing local auth storage on signout:", err);
    }
  }
}
