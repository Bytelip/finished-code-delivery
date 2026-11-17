/**
 * Supabase Edge Function: verify-auth-otp
 *
 * Validates a 6-digit OTP entered by the user against the salted hash stored
 * in pending_otps. Enforces 5-minute expiration, max 5 attempts, and one-time
 * use. On success, marks the record verified and returns a success payload;
 * the frontend then completes Supabase email/password sign-up (or sign-in).
 *
 * Called from the browser with:
 *   { email: string, code: string }
 *
 * Only the service role reads pending_otps; the browser never queries the
 * table directly.
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
    const email = (body.email || "").trim().toLowerCase();
    const code = (body.code || "").trim().replace(/\D/g, "");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: "A valid email address is required." }, 400);
    }

    if (code.length !== 6) {
      return jsonResponse({
        error: "Please enter all 6 digits of the verification code.",
      }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[verify-auth-otp] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
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

    // 1. Fetch the most recent pending record for this email.
    const selectRes = await fetch(
      `${supabaseUrl}/rest/v1/pending_otps?email=eq.${encodeURIComponent(
        email,
      )}&order=created_at.desc&limit=1`,
      { headers: authHeaders },
    );

    if (!selectRes.ok) {
      const errText = await selectRes.text();
      console.error("[verify-auth-otp] Failed to fetch pending OTP:", selectRes.status, errText);
      return jsonResponse(
        { error: "Could not verify code. Please request a new code." },
        500,
      );
    }

    const rows = (await selectRes.json()) as PendingOtpRow[];
    const record = rows[0];

    if (!record) {
      return jsonResponse({
        error: "No active verification session found. Please request a new code.",
      }, 404);
    }

    if (record.verified) {
      return jsonResponse({
        error: "This code has already been used. Please request a new code.",
      }, 409);
    }

    // 2. Expiration
    const expiresAtMs = Date.parse(record.expires_at);
    if (Number.isNaN(expiresAtMs) || Date.now() > expiresAtMs) {
      await fetch(
        `${supabaseUrl}/rest/v1/pending_otps?id=eq.${encodeURIComponent(record.id)}`,
        { method: "DELETE", headers: authHeaders },
      );
      return jsonResponse({
        error: "Verification code has expired (5-minute limit). Please request a new code.",
      }, 410);
    }

    // 3. Brute force protection
    if (record.attempts >= 5) {
      await fetch(
        `${supabaseUrl}/rest/v1/pending_otps?id=eq.${encodeURIComponent(record.id)}`,
        { method: "DELETE", headers: authHeaders },
      );
      return jsonResponse({
        error: "Maximum verification attempts exceeded. Please request a new code.",
      }, 429);
    }

    // 4. Hash compare
    const computedHash = await sha256(`${email}:${code}:${record.salt}`);
    if (computedHash !== record.code_hash) {
      const newAttempts = record.attempts + 1;
      await fetch(
        `${supabaseUrl}/rest/v1/pending_otps?id=eq.${encodeURIComponent(record.id)}`,
        {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify({ attempts: newAttempts }),
        },
      );
      const remaining = 5 - newAttempts;
      return jsonResponse({
        error: `Invalid verification code. ${remaining} attempt${
          remaining === 1 ? "" : "s"
        } remaining.`,
      }, 400);
    }

    // 5. Success: mark verified, invalidate for reuse.
    await fetch(
      `${supabaseUrl}/rest/v1/pending_otps?id=eq.${encodeURIComponent(record.id)}`,
      {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ verified: true, attempts: record.attempts + 1 }),
      },
    );

    return jsonResponse({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[verify-auth-otp] Unhandled exception:", errorMsg);
    return jsonResponse({ error: errorMsg }, 500);
  }
});
