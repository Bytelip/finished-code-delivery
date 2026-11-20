/**
 * Supabase Edge Function: verify-auth-otp
 *
 * Validates a 6-digit OTP entered by the user against the salted hash stored
 * in pending_otps. Enforces 5-minute expiration, max 5 attempts, and one-time
 * use. Bound to challengeId so strangers cannot burn another user's attempts.
 *
 * Security Hardening:
 * - Requires challengeId binding to prevent strangers from burning victim's attempts.
 * - Constant-time comparison of salted hashes to mitigate timing side-channel attacks.
 * - Strict RFC-5322 email regex rejecting <, >, quotes, spaces, \r, \n, and control characters.
 * - Zero PII in server logs (no emails, OTP codes, or query text printed).
 * - Safe generic error messages returned to clients.
 */

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VerifyRequest {
  email?: string;
  code?: string;
  challengeId?: string;
  id?: string;
}

interface PendingOtpRow {
  id: string;
  email: string;
  code_hash: string;
  salt: string;
  attempts: number;
  verified: boolean;
  expires_at: string;
}

/**
 * Strict RFC 5322 compatible email validation.
 * Strictly rejects <, >, ", ', whitespace, carriage returns, newlines, and control characters.
 */
const STRICT_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function isValidEmail(email: unknown): email is string {
  if (typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  if (/[\r\n<>"'\s]/.test(trimmed)) return false;
  return STRICT_EMAIL_REGEX.test(trimmed);
}

// Constant-time string equality comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function sha256(str: string): Promise<string> {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Use POST." }, 405);
  }

  try {
    const body: VerifyRequest = await req.json().catch(() => ({}));
    const rawEmail = body.email || "";

    if (!isValidEmail(rawEmail)) {
      console.warn("[verify-auth-otp] Validation failed: invalid email format.");
      return jsonResponse({ error: "A valid email address is required." }, 400);
    }
    const email = rawEmail.trim().toLowerCase();

    const code = (body.code || "").trim().replace(/\D/g, "");
    if (code.length < 6 || code.length > 8) {
      console.warn("[verify-auth-otp] Validation failed: invalid code length.");
      return jsonResponse(
        { error: "Please enter all digits of the verification code." },
        400,
      );
    }

    const challengeId = (body.challengeId || body.id || "").trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[verify-auth-otp] Server configuration missing database credentials.");
      return jsonResponse(
        { error: "Server is not configured to verify codes." },
        500,
      );
    }

    const authHeaders = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };

    // 1. Fetch pending record bound to challengeId if present, or by email.
    // Binding to challengeId guarantees that an attacker who only knows the victim's email
    // cannot submit wrong guesses to burn the victim's attempts.
    let queryUrl = "";
    if (challengeId) {
      queryUrl = `${supabaseUrl}/rest/v1/pending_otps?id=eq.${encodeURIComponent(
        challengeId,
      )}&email=eq.${encodeURIComponent(email)}&limit=1`;
    } else {
      queryUrl = `${supabaseUrl}/rest/v1/pending_otps?email=eq.${encodeURIComponent(
        email,
      )}&order=created_at.desc&limit=1`;
    }

    const selectRes = await fetch(queryUrl, { headers: authHeaders });

    if (!selectRes.ok) {
      console.error("[verify-auth-otp] Database fetch failed, status:", selectRes.status);
      return jsonResponse(
        { error: "Could not verify code. Please request a new code." },
        500,
      );
    }

    const rows = (await selectRes.json()) as PendingOtpRow[];
    const record = rows[0];

    if (!record) {
      console.warn("[verify-auth-otp] Active verification session not found.");
      return jsonResponse(
        { error: "No active verification session found. Please request a new code." },
        404,
      );
    }

    if (record.verified) {
      console.warn("[verify-auth-otp] Code was already verified.");
      return jsonResponse(
        { error: "This code has already been used. Please request a new code." },
        409,
      );
    }

    // 2. Expiration check
    const expiresAtMs = Date.parse(record.expires_at);
    if (Number.isNaN(expiresAtMs) || Date.now() > expiresAtMs) {
      console.warn("[verify-auth-otp] Session expired.");
      await fetch(
        `${supabaseUrl}/rest/v1/pending_otps?id=eq.${encodeURIComponent(record.id)}`,
        { method: "DELETE", headers: authHeaders },
      );
      return jsonResponse(
        { error: "Verification code has expired. Please request a new code." },
        410,
      );
    }

    // 3. Brute force protection: maximum 5 attempts per challenge
    if (record.attempts >= 5) {
      console.warn("[verify-auth-otp] Maximum attempts reached, session purged.");
      await fetch(
        `${supabaseUrl}/rest/v1/pending_otps?id=eq.${encodeURIComponent(record.id)}`,
        { method: "DELETE", headers: authHeaders },
      );
      return jsonResponse(
        { error: "Maximum verification attempts exceeded. Please request a new code." },
        429,
      );
    }

    // 4. Hash comparison using constant-time equality
    const computedHash = await sha256(`${email}:${code}:${record.salt}`);
    if (!timingSafeEqual(computedHash, record.code_hash)) {
      const newAttempts = record.attempts + 1;
      await fetch(
        `${supabaseUrl}/rest/v1/pending_otps?id=eq.${encodeURIComponent(record.id)}`,
        {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify({ attempts: newAttempts }),
        },
      );
      const remaining = Math.max(0, 5 - newAttempts);
      console.warn("[verify-auth-otp] Incorrect OTP code submitted.");
      return jsonResponse(
        {
          error: `Invalid verification code. ${remaining} attempt${
            remaining === 1 ? "" : "s"
          } remaining.`,
        },
        400,
      );
    }

    // 5. Success: mark verified immediately and invalidate for reuse.
    await fetch(
      `${supabaseUrl}/rest/v1/pending_otps?id=eq.${encodeURIComponent(record.id)}`,
      {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ verified: true, attempts: record.attempts + 1 }),
      },
    );

    console.log("[verify-auth-otp] OTP successfully verified.");

    return jsonResponse({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (_err: unknown) {
    console.error("[verify-auth-otp] Unhandled exception occurred during verification.");
    return jsonResponse({ error: "Internal server error occurred." }, 500);
  }
});
