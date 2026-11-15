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

    const recipientEmail =
      payload.user?.email ||
      payload.email;

    const otpCode =
      payload.email_data?.token ||
      payload.token;

    const actionType = payload.email_data?.email_action_type || "verification";

    if (!recipientEmail || !otpCode) {
      console.error("[send-auth-email] Missing email or token in payload:", payload);
      return new Response(
        JSON.stringify({
          error: "Invalid hook payload: missing user.email or email_data.token",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Fetch Resend API credentials
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-auth-email] RESEND_API_KEY environment variable is not configured.");
      return new Response(
        JSON.stringify({
          error: "RESEND_API_KEY secret is not set in Supabase project secrets.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const fromEmail =
      Deno.env.get("RESEND_FROM_EMAIL") || "AgroSpace Nexus <onboarding@resend.dev>";

    const subject = `AgroSpace Verification Code: ${otpCode}`;

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
                Here is your single-use 6-digit verification code to authenticate your mission clearance on <strong style="color: #F8FAFC;">${recipientEmail}</strong>:
              </p>
            </td>
          </tr>

          <!-- 6-digit Code Box -->
          <tr>
            <td align="center" style="padding: 10px 0 24px;">
              <div style="display: inline-block; background-color: #030712; border: 1px solid #22D3EE; border-radius: 14px; padding: 16px 32px; box-shadow: 0 0 25px rgba(34, 211, 238, 0.25);">
                <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38BDF8;">
                  ${otpCode}
                </span>
              </div>
            </td>
          </tr>

          <!-- Expiration & Security Notice -->
          <tr>
            <td style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 12px; color: #64748B;">
                ⏱️ Security clearance code is valid for <strong>5 minutes</strong> (${actionType}).
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

    // 3. Dispatch via Resend HTTP API
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
        subject: subject,
        html: htmlBody,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("[send-auth-email] Resend API error:", resendResponse.status, resendData);
      return new Response(
        JSON.stringify({
          error: resendData.message || "Failed to dispatch email via Resend API",
        }),
        {
          status: resendResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[send-auth-email] Successfully sent email via Resend: ${resendData.id}`);

    // Supabase Auth Hooks expect an empty JSON or success response with status 200
    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[send-auth-email] Unhandled exception:", errorMsg);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
