/**
 * Real account system backed by Lovable Cloud.
 * Sessions come from the Cloud auth client; each account's farmer profile lives in the
 * `profiles` table (one row per user, readable/editable only by its owner).
 */
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import type { Database } from "@/integrations/supabase/types";
import type { UserProfile } from "@/components/CosmicAuthPage";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type SocialProvider = "google" | "microsoft" | "lovable";

export interface AuthOutcome {
  ok: boolean;
  error?: string;
  /** Sign-up succeeded but the farmer must click the link in their inbox first. */
  needsConfirmation?: boolean;
  /** The browser is leaving for the provider's sign-in page. */
  redirected?: boolean;
}

export const MIN_PASSWORD_LENGTH = 8;

const PROVIDER_LABELS: Record<string, UserProfile["provider"]> = {
  google: "Google",
  azure: "Microsoft",
  microsoft: "Microsoft",
  apple: "Apple",
  lovable: "Lovable",
  email: "Email",
};

export function providerLabel(user: Pick<User, "app_metadata">): UserProfile["provider"] {
  const raw = String(user.app_metadata?.provider ?? "email").toLowerCase();
  if (PROVIDER_LABELS[raw]) return PROVIDER_LABELS[raw];
  if (raw.includes("lovable")) return "Lovable";
  return "Email";
}

const DEFAULT_NOTIFICATIONS = {
  cycloneAlerts: true,
  usgsQuakeAlerts: true,
  droughtAlerts: true,
  emailAlerts: true,
};

function readNotifications(value: unknown): NonNullable<UserProfile["notifications"]> {
  const v = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    cycloneAlerts: v["cycloneAlerts"] !== false,
    usgsQuakeAlerts: v["usgsQuakeAlerts"] !== false,
    droughtAlerts: v["droughtAlerts"] !== false,
    emailAlerts: v["emailAlerts"] !== false,
  };
}

function formatHome(name: string, lat: number, lon: number): string {
  return `${name} (${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? "E" : "W"})`;
}

/** Builds the app's profile shape from the signed-in account and its stored profile row. */
export function profileFromRow(
  user: Pick<User, "id" | "email" | "app_metadata" | "user_metadata" | "email_confirmed_at">,
  row: ProfileRow | null,
): UserProfile {
  const email = user.email ?? "";
  const metaName =
    (user.user_metadata?.["full_name"] as string | undefined) ||
    (user.user_metadata?.["name"] as string | undefined) ||
    "";
  const name = row?.full_name?.trim() || metaName.trim() || email.split("@")[0] || "Farmer";
  const homeName = row?.home_name ?? "Kolar Plateau, Karnataka";
  const homeLat = row?.home_lat ?? 13.1367;
  const homeLon = row?.home_lon ?? 78.1292;
  const view = row?.default_view === "2D" ? "2D" : "3D";
  const units = row?.units === "imperial" ? "imperial" : "metric";
  const layer = row?.default_layer ?? "NDVI";
  return {
    id: user.id,
    name,
    fullName: name,
    email,
    provider: providerLabel(user),
    verified: true,
    isVerified: true,
    verifiedAt: user.email_confirmed_at ?? undefined,
    role: row?.job_title ?? "Farmer",
    callsign: row?.callsign ?? undefined,
    avatarColor: row?.avatar_color ?? "#06B6D4",
    homeLocation: formatHome(homeName, homeLat, homeLon),
    defaultView: view,
    defaultLayer: layer,
    units,
    hazardAlerts: row?.hazard_alerts ?? true,
    preferences: {
      homeBaseName: homeName,
      homeCoords: { lat: homeLat, lon: homeLon },
      defaultViewMode: view === "2D" ? "2d" : "3d",
      defaultActiveLayer: layer,
      units,
    },
    notifications: readNotifications(row?.notifications ?? DEFAULT_NOTIFICATIONS),
  };
}

/** The editable profile fields to store for an account. Email, sign-in method and id are never written. */
export function rowFromProfile(profile: UserProfile): ProfileUpdate {
  const prefs = profile.preferences;
  const homeName =
    prefs?.homeBaseName?.trim() ||
    profile.homeLocation.replace(/\s*\(.*\)\s*$/, "").trim() ||
    "Kolar Plateau, Karnataka";
  const view = (prefs?.defaultViewMode ?? profile.defaultView).toUpperCase() === "2D" ? "2D" : "3D";
  return {
    full_name: (profile.fullName || profile.name || "").trim().slice(0, 80),
    job_title: (profile.role || "Farmer").trim().slice(0, 80),
    callsign: profile.callsign?.trim().slice(0, 80) || null,
    avatar_color: profile.avatarColor,
    home_name: homeName.slice(0, 160),
    home_lat: prefs?.homeCoords?.lat ?? 13.1367,
    home_lon: prefs?.homeCoords?.lon ?? 78.1292,
    default_view: view,
    default_layer: prefs?.defaultActiveLayer || profile.defaultLayer || "NDVI",
    units: (prefs?.units ?? profile.units) === "imperial" ? "imperial" : "metric",
    hazard_alerts: profile.hazardAlerts,
    notifications: readNotifications(profile.notifications ?? DEFAULT_NOTIFICATIONS),
  };
}

/** Turns Cloud auth errors into plain sentences for farmers. */
export function friendlyAuthError(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login credentials")) return "Wrong email or password.";
  if (m.includes("email not confirmed"))
    return "Please confirm your email first — check your inbox for the link we sent.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "An account with this email already exists. Sign in instead.";
  if (m.includes("password") && (m.includes("weak") || m.includes("pwned") || m.includes("leaked")))
    return "That password is too easy to guess. Please choose a stronger one.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a minute and try again.";
  return message || "Something went wrong. Please try again.";
}

async function loadProfileRow(user: User): Promise<ProfileRow | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) return data;
  // Accounts created before profiles existed get one now.
  const fallbackName =
    (user.user_metadata?.["full_name"] as string | undefined) ||
    (user.user_metadata?.["name"] as string | undefined) ||
    user.email?.split("@")[0] ||
    "";
  const { data: created } = await supabase
    .from("profiles")
    .insert({ id: user.id, full_name: fallbackName.slice(0, 80) })
    .select("*")
    .maybeSingle();
  return created ?? null;
}

/** The signed-in farmer with their saved profile, or null when nobody is signed in. */
export async function fetchSignedInProfile(): Promise<UserProfile | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const row = await loadProfileRow(data.user);
  return profileFromRow(data.user, row);
}

export async function saveProfile(profile: UserProfile): Promise<AuthOutcome> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: "Please sign in again to save your profile." };
  const { error } = await supabase.from("profiles").update(rowFromProfile(profile)).eq("id", data.user.id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<AuthOutcome> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: { full_name: name.trim().slice(0, 80) },
    },
  });
  if (error) return { ok: false, error: friendlyAuthError(error.message) };
  // An existing email comes back with no identities instead of an error.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { ok: false, error: friendlyAuthError("already registered") };
  }
  return { ok: true, needsConfirmation: !data.session };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthOutcome> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  return error ? { ok: false, error: friendlyAuthError(error.message) } : { ok: true };
}

export async function resendConfirmation(email: string): Promise<AuthOutcome> {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: window.location.origin },
  });
  return error ? { ok: false, error: friendlyAuthError(error.message) } : { ok: true };
}

export async function sendPasswordReset(email: string): Promise<AuthOutcome> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return error ? { ok: false, error: friendlyAuthError(error.message) } : { ok: true };
}

export async function updatePassword(password: string): Promise<AuthOutcome> {
  const { error } = await supabase.auth.updateUser({ password });
  return error ? { ok: false, error: friendlyAuthError(error.message) } : { ok: true };
}

export async function signInWithProvider(provider: SocialProvider): Promise<AuthOutcome> {
  const result = await lovable.auth.signInWithOAuth(provider, {
    redirect_uri: window.location.origin,
  });
  if (result.error) {
    return { ok: false, error: friendlyAuthError(result.error.message) };
  }
  if ("redirected" in result && result.redirected) return { ok: true, redirected: true };
  return { ok: true };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
