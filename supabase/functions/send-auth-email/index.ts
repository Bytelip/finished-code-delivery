/**
 * Supabase Edge Function: send-auth-email
 * Supabase Auth Send Email Hook implementation.
 *
 * Receives the Send Email Hook payload from Supabase GoTrue Auth:
 * - user.email
 * - email_data.token (6-digit OTP code)
 * - email_data.email_action_type
 *
 * Dispatches the genuine verification code using Resend's official HTTP API
 * (https://api.resend.com/emails) without requiring custom SMTP servers.
 *
 * Security Hardening:
 * - Strict RFC-5322 email regex rejecting <, >, quotes, spaces, \r, \n, and control characters.
 * - Strict digits-only OTP validation (6-8 digits).
 * - Complete HTML escaping of all dynamic values to eliminate markup injection.
 * - Zero PII in logs (no email addresses, OTP codes, or full request/response bodies).
 */

// Global Deno type definition for TypeScript checks
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SupabaseAuthHookPayload {
  user?: {
    id?: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data?: {
    token?: string;
    token_hash?: string;
    redirect_to?: string;
    email_action_type?: string;
    site_url?: string;
  };
  // Fallbacks if the payload is passed in flat structure
  email?: string;
  token?: string;
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

/**
 * Strict HTML escaping helper to prevent any HTML/markup injection.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Supabase Auth Hooks send HTTP POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload: SupabaseAuthHookPayload = await req.json();

    const rawEmail = payload.user?.email || payload.email;
    const rawOtp = payload.email_data?.token || payload.token;

    // Strict email format validation
    if (!isValidEmail(rawEmail)) {
      console.error("[send-auth-email] Validation failed: missing or invalid email format.");
      return new Response(
        JSON.stringify({
          error: "Invalid hook payload: invalid email format.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const cleanEmail = rawEmail.trim().toLowerCase();

    // Strict OTP code validation: digits only, 6 to 8 digits
    if (!rawOtp || typeof rawOtp !== "string") {
      console.error("[send-auth-email] Validation failed: missing verification token.");
      return new Response(
        JSON.stringify({
          error: "Invalid hook payload: missing verification token.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const cleanOtp = rawOtp.trim().replace(/\D/g, "");
    if (cleanOtp.length < 6 || cleanOtp.length > 8) {
      console.error("[send-auth-email] Validation failed: verification token format invalid.");
      return new Response(
        JSON.stringify({
          error: "Invalid hook payload: invalid verification token format.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Whitelist allowed action types
    const rawActionType = payload.email_data?.email_action_type || "verification";
    const allowedActions = [
      "signup",
      "magiclink",
      "recovery",
      "invite",
      "email_change",
      "verification",
    ];
    const safeActionType = allowedActions.includes(rawActionType)
      ? rawActionType
      : "verification";

    // 2. Fetch Resend API credentials
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-auth-email] Service configuration error: provider API key not configured.");
      return new Response(
        JSON.stringify({
          error: "Verification delivery service is temporarily unavailable.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const fromEmail =
      Deno.env.get("RESEND_FROM_EMAIL") || "AgroSpace Nexus <onboarding@resend.dev>";

    // Hardcode subject strictly on the server (no user-controlled dynamic strings)
    const subject = `AgroSpace Verification Code: ${cleanOtp}`;

    // Sanitized, escaped HTML body
    const escapedEmail = escapeHtml(cleanEmail);
    const escapedAction = escapeHtml(safeActionType);

    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>AgroSpace Nexus Clearance Code</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #070B14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #070B14; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #0B111E; border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 20px; padding: 36px 28px; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(34, 211, 238, 0.15);">
          
          <!-- Emblem -->
          <tr>
            <td align="center" style="padding-bottom: 18px;">
              <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; text-align: center; border-radius: 16px; background: linear-gradient(180deg, rgba(34, 211, 238, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%); border: 1px solid rgba(34, 211, 238, 0.4); font-size: 26px;">
                🛰️
              </div>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td align="center" style="padding-bottom: 6px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px;">AgroSpace Nexus</h1>
              <p style="margin: 4px 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #22D3EE; font-family: monospace;">Orbital Telemetry • Earth Intelligence</p>
            </td>
          </tr>

          <!-- Instructional text -->
          <tr>
            <td align="center" style="padding: 22px 0 16px;">
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #94A3B8;">
                Here is your single-use 6-digit verification code to authenticate your mission clearance on <strong style="color: #F8FAFC;">${escapedEmail}</strong>:
              </p>
            </td>
          </tr>

          <!-- 6-digit Code Box -->
          <tr>
            <td align="center" style="padding: 10px 0 24px;">
              <div style="display: inline-block; background-color: #030712; border: 1px solid #22D3EE; border-radius: 14px; padding: 16px 32px; box-shadow: 0 0 25px rgba(34, 211, 238, 0.25);">
                <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38BDF8;">
                  ${cleanOtp}
                </span>
              </div>
            </td>
          </tr>

          <!-- Expiration & Security Notice -->
          <tr>
            <td style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 12px; color: #64748B;">
                ⏱️ Security clearance code is valid for <strong>5 minutes</strong> (${escapedAction}).
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                If you did not request this login code, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // 3. Dispatch via Resend HTTP API — Safe operational logging only (no PII)
    console.log("[send-auth-email] Dispatching verification email via provider API.");

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [cleanEmail],
        subject: subject,
        html: htmlBody,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("[send-auth-email] Provider API response failure, HTTP status:", resendResponse.status);
      return new Response(
        JSON.stringify({
          error: "Failed to dispatch verification email.",
        }),
        {
          status: resendResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("[send-auth-email] Verification email successfully dispatched via provider.");

    // Supabase Auth Hooks expect an empty JSON or success response with status 200
    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_err: unknown) {
    console.error("[send-auth-email] Internal exception during verification dispatch.");
    return new Response(JSON.stringify({ error: "Internal server error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
