/**
 * Supabase Edge Function: send-auth-email
 *
 * Generates a 6-digit OTP, stores its hash in the pending_otps table, and
 * dispatches it to the recipient via the Resend API. The plaintext code is
 * NEVER persisted — only a salted SHA-256 hash is written to the database.
 *
 * Called from the browser (sign-up flow) with:
 *   { email: string, name?: string, action?: "signup" | "verify" | "welcome" }
 *
 * Resend credentials come from RESEND_API_KEY. The sender address defaults to
 * onboarding@resend.dev (Resend's shared sandbox sender) so that requests do
 * not fail with a 403 domain-verification error before a custom domain is
 * configured. Override with RESEND_FROM_EMAIL.
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

interface SendEmailRequest {
  email?: string;
  name?: string;
  action?: string;
}

// SHA-256 helper using Web Crypto (available in the Deno runtime).
async function sha256(str: string): Promise<string> {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char] ?? char;
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  // 1. CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Use POST." }, 405);
  }

  try {
    const body: SendEmailRequest = await req.json().catch(() => ({}));
    const recipientEmail = (body.email || "").trim().toLowerCase();

    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return jsonResponse({ error: "A valid email address is required." }, 400);
    }

    const displayName = (body.name || recipientEmail.split("@")[0] || "").trim().slice(0, 80);
    const actionType =
      body.action === "welcome" ? "welcome" : body.action === "verify" ? "verify" : "signup";

    // 2. Resend credentials
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-auth-email] RESEND_API_KEY is not configured.");
      return jsonResponse(
        {
          error: "Email delivery is not configured. Add RESEND_API_KEY to the project secrets.",
        },
        500,
      );
    }

    const fromEmail =
      Deno.env.get("RESEND_FROM_EMAIL") || "AgroSpace Nexus <onboarding@resend.dev>";

    if (actionType === "welcome") {
      const safeName = escapeHtml(displayName || recipientEmail.split("@")[0] || "there");
      const welcomeResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipientEmail],
          subject: "Welcome to AgroSpace Nexus",
          html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#e2e8f0;background:#0b111e;border-radius:16px"><h1 style="color:#22d3ee">Welcome to AgroSpace Nexus</h1><p>Hello ${safeName},</p><p>Your account is verified and ready. You can now explore orbital telemetry and Earth intelligence from your AgroSpace workspace.</p><p style="color:#94a3b8">If you did not create this account, please contact support.</p></div>`,
        }),
      });
      const welcomeData = await welcomeResponse.json().catch(() => ({}));
      if (!welcomeResponse.ok) {
        console.error(
          "[send-auth-email] Resend welcome-email error:",
          welcomeResponse.status,
          welcomeData,
        );
        const apiMessage =
          (welcomeData as { message?: string }).message || "Welcome email delivery failed.";
        return jsonResponse({ error: apiMessage }, welcomeResponse.status);
      }
      return jsonResponse({
        success: true,
        id: (welcomeData as { id?: string }).id,
        message: "Welcome email dispatched.",
      });
    }

    // 3. Generate a cryptographically secure 6-digit code
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const otpCode = (((arr[0] ?? 0) % 900000) + 100000).toString();

    const saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes);
    const salt = Array.from(saltBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const codeHash = await sha256(`${recipientEmail}:${otpCode}:${salt}`);

    // 4. Persist the hash (not the plaintext) to the database via the service
    // role key. Replace any existing pending code for this email.
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        "[send-auth-email] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured.",
      );
      return jsonResponse({ error: "Email verification is not configured on the server." }, 500);
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const upsertRes = await fetch(`${supabaseUrl}/rest/v1/pending_otps?on_conflict=email`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        email: recipientEmail,
        code_hash: codeHash,
        salt,
        attempts: 0,
        verified: false,
        expires_at: expiresAt,
      }),
    });

    if (!upsertRes.ok) {
      const errText = await upsertRes.text();
      console.error("[send-auth-email] Failed to persist OTP:", upsertRes.status, errText);
      return jsonResponse({ error: "Failed to stage verification code. Please try again." }, 500);
    }

    // 5. Build the email body
    const subject = `AgroSpace Verification Code: ${otpCode}`;
    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>AgroSpace Nexus Clearance Code</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#070B14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#FFFFFF;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#070B14;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#0B111E;border:1px solid rgba(56,189,248,0.25);border-radius:20px;padding:36px 28px;box-shadow:0 24px 60px rgba(0,0,0,0.8),0 0 30px rgba(34,211,238,0.15);">
          <tr>
            <td align="center" style="padding-bottom:18px;">
              <div style="display:inline-block;width:56px;height:56px;line-height:56px;text-align:center;border-radius:16px;background:linear-gradient(180deg,rgba(34,211,238,0.2) 0%,rgba(37,99,235,0.1) 100%);border:1px solid rgba(34,211,238,0.4);font-size:26px;">🛰️</div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:6px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:0.5px;">AgroSpace Nexus</h1>
              <p style="margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#22D3EE;font-family:monospace;">Orbital Telemetry • Earth Intelligence</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 0 16px;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:#94A3B8;">
                Hello <strong style="color:#F8FAFC;">${escapeHtml(displayName)}</strong>, use this single-use 6-digit verification code to complete your mission clearance on <strong style="color:#F8FAFC;">${escapeHtml(recipientEmail)}</strong>:
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:10px 0 24px;">
              <div style="display:inline-block;background-color:#030712;border:1px solid #22D3EE;border-radius:14px;padding:16px 32px;box-shadow:0 0 25px rgba(34,211,238,0.25);">
                <span style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:36px;font-weight:800;letter-spacing:8px;color:#38BDF8;">${otpCode}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid rgba(255,255,255,0.08);padding-top:20px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#64748B;">⏱️ Security clearance code is valid for <strong>5 minutes</strong> (${actionType}).</p>
              <p style="margin:0;font-size:11px;color:#475569;">If you did not request this code, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // 6. Dispatch via Resend HTTP API
    console.log(`[send-auth-email] Dispatching OTP email via Resend to ${recipientEmail}`);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject,
        html: htmlBody,
      }),
    });

    const resendData = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      console.error("[send-auth-email] Resend API error:", resendResponse.status, resendData);
      const apiMessage =
        (resendData as { message?: string }).message ||
        "Email delivery failed. Please try again shortly.";
      return jsonResponse({ error: apiMessage }, resendResponse.status);
    }

    console.log(
      `[send-auth-email] Successfully sent email via Resend: ${(resendData as { id?: string }).id}`,
    );

    return jsonResponse({
      success: true,
      id: (resendData as { id?: string }).id,
      message: "Verification code dispatched. Check your inbox.",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[send-auth-email] Unhandled exception:", errorMsg);
    return jsonResponse({ error: errorMsg }, 500);
  }
});
