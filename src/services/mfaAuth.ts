/**
 * Optional Two-Factor Authentication (TOTP / MFA) helpers backed by Supabase Auth (`supabase.auth.mfa`).
 * Never logs TOTP secrets, QR URIs, or verification codes.
 */
import type { Factor } from "@supabase/supabase-js";
import {
  MISSING_SUPABASE_ENV_MESSAGE,
  isSupabaseConfigured,
  supabase,
} from "@/integrations/supabase/client";

export interface MfaFactorInfo {
  id: string;
  friendlyName: string;
  factorType: string;
  status: "verified" | "unverified";
  createdAt: string;
  updatedAt: string;
}

export interface TotpEnrollmentData {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}

export interface MfaAssuranceStatus {
  currentLevel: string | null;
  nextLevel: string | null;
  needsMfaChallenge: boolean;
  error?: string | undefined;
}

export function sanitizeTotpCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function toQrImageSrc(qrCode: string): string {
  if (!qrCode) return "";
  if (qrCode.startsWith("data:")) return qrCode;
  return `data:image/svg+xml;utf-8,${encodeURIComponent(qrCode)}`;
}

export function friendlyMfaError(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (!m) return "Verification failed. Please check your authenticator code and try again.";
  if (m.includes("missing supabase environment variables")) return MISSING_SUPABASE_ENV_MESSAGE;
  if (
    m.includes("invalid totp") ||
    m.includes("invalid code") ||
    m.includes("token") ||
    m.includes("verification code")
  ) {
    return "Invalid authenticator code. Enter the latest 6-digit code shown in your app.";
  }
  if (m.includes("expired") || m.includes("challenge")) {
    return "Your verification challenge expired. Please try verifying with a fresh code.";
  }
  if (m.includes("already exists") || m.includes("friendly name")) {
    return "An authenticator setup is already registered. Please refresh and try again.";
  }
  if (m.includes("too many") || m.includes("rate limit")) {
    return "Too many attempts. Please wait a minute before trying again.";
  }
  return message || "Something went wrong with two-factor authentication. Please try again.";
}

function mapFactor(factor: Factor): MfaFactorInfo {
  return {
    id: factor.id,
    friendlyName: factor.friendly_name?.trim() || "Authenticator App",
    factorType: factor.factor_type,
    status: factor.status === "verified" ? "verified" : "unverified",
    createdAt: factor.created_at,
    updatedAt: factor.updated_at,
  };
}

function hasMfaClient(): boolean {
  return Boolean(
    isSupabaseConfigured() &&
    supabase?.auth &&
    typeof supabase.auth.mfa?.listFactors === "function" &&
    typeof supabase.auth.mfa?.getAuthenticatorAssuranceLevel === "function",
  );
}

/** Lists verified and unverified TOTP factors on the signed-in user's account. */
export async function listTotpFactors(): Promise<{
  ok: boolean;
  verifiedFactors: MfaFactorInfo[];
  unverifiedFactors: MfaFactorInfo[];
  error?: string | undefined;
}> {
  if (!hasMfaClient()) {
    return {
      ok: false,
      verifiedFactors: [],
      unverifiedFactors: [],
      error: MISSING_SUPABASE_ENV_MESSAGE,
    };
  }

  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) {
    return {
      ok: false,
      verifiedFactors: [],
      unverifiedFactors: [],
      error: friendlyMfaError(error?.message),
    };
  }

  const allFactors = Array.isArray(data.all) ? data.all : [];
  const rawVerifiedTotp = Array.isArray(data.totp)
    ? data.totp
    : allFactors.filter((f) => f.factor_type === "totp" && f.status === "verified");

  const verifiedFactors = rawVerifiedTotp.map(mapFactor);
  const unverifiedFactors = allFactors
    .filter((f) => f.factor_type === "totp" && f.status !== "verified")
    .map(mapFactor);

  return { ok: true, verifiedFactors, unverifiedFactors };
}

/** Checks whether the active Supabase session still needs an AAL2 TOTP challenge. */
export async function getMfaAssuranceLevel(): Promise<MfaAssuranceStatus> {
  if (!hasMfaClient()) {
    return {
      currentLevel: null,
      nextLevel: null,
      needsMfaChallenge: false,
    };
  }

  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) {
      return {
        currentLevel: null,
        nextLevel: null,
        needsMfaChallenge: false,
        error: error?.message,
      };
    }

    const currentLevel = data.currentLevel ?? null;
    const nextLevel = data.nextLevel ?? null;
    return {
      currentLevel,
      nextLevel,
      needsMfaChallenge: currentLevel === "aal1" && nextLevel === "aal2",
    };
  } catch {
    return {
      currentLevel: null,
      nextLevel: null,
      needsMfaChallenge: false,
    };
  }
}

/**
 * Unenrolls any leftover unverified TOTP factors, then starts a fresh TOTP enrollment.
 */
export async function enrollTotpFactor(friendlyName = "Authenticator App"): Promise<{
  ok: boolean;
  enrollment?: TotpEnrollmentData | undefined;
  error?: string | undefined;
}> {
  if (!hasMfaClient()) {
    return { ok: false, error: MISSING_SUPABASE_ENV_MESSAGE };
  }

  const existing = await supabase.auth.mfa.listFactors();
  const leftoverUnverified = (existing.data?.all ?? []).filter(
    (f) => f.factor_type === "totp" && f.status !== "verified",
  );

  for (const factor of leftoverUnverified) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: "AgroSpace Nexus",
    friendlyName,
  });

  if (error || !data || data.type !== "totp" || !data.totp) {
    return { ok: false, error: friendlyMfaError(error?.message) };
  }

  return {
    ok: true,
    enrollment: {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    },
  };
}

/**
 * Verifies a 6-digit TOTP code against a specific factor using separate challenge + verify calls.
 */
export async function verifyTotpFactorCode(
  factorId: string,
  rawCode: string,
): Promise<{ ok: boolean; error?: string | undefined }> {
  if (!hasMfaClient()) {
    return { ok: false, error: MISSING_SUPABASE_ENV_MESSAGE };
  }

  const code = sanitizeTotpCode(rawCode);
  if (code.length !== 6) {
    return { ok: false, error: "Please enter all 6 digits from your authenticator app." };
  }

  const challengeRes = await supabase.auth.mfa.challenge({ factorId });
  if (challengeRes.error || !challengeRes.data?.id) {
    return { ok: false, error: friendlyMfaError(challengeRes.error?.message) };
  }

  const verifyRes = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeRes.data.id,
    code,
  });

  if (verifyRes.error) {
    return { ok: false, error: friendlyMfaError(verifyRes.error.message) };
  }

  await supabase.auth.getSession().catch(() => undefined);
  return { ok: true };
}

/** Looks up the verified TOTP factor on the current user and completes the login challenge. */
export async function verifyActiveTotpChallenge(
  rawCode: string,
): Promise<{ ok: boolean; error?: string | undefined }> {
  const factorsRes = await listTotpFactors();
  if (!factorsRes.ok) {
    return { ok: false, error: factorsRes.error || "Unable to load authenticator settings." };
  }

  const verifiedFactor = factorsRes.verifiedFactors[0];
  if (!verifiedFactor) {
    return {
      ok: false,
      error: "No verified authenticator app found on this account.",
    };
  }

  return verifyTotpFactorCode(verifiedFactor.id, rawCode);
}

/** Removes an enrolled TOTP factor from the current user's account. */
export async function unenrollTotpFactor(
  factorId: string,
): Promise<{ ok: boolean; error?: string | undefined }> {
  if (!hasMfaClient()) {
    return { ok: false, error: MISSING_SUPABASE_ENV_MESSAGE };
  }

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    return { ok: false, error: friendlyMfaError(error.message) };
  }

  return { ok: true };
}
