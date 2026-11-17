/**
 * Vercel serverless email handler — POST /api/send-otp
 *
 * Sends the sign-up verification code (and the welcome email) through Resend's
 * HTTP API. The browser only ever calls this same-origin endpoint, so the
 * RESEND_API_KEY stays on the server and there are no CORS or 403 failures.
 *
 * Env:
 *   RESEND_API_KEY    — Resend API key (required to deliver email)
 *   RESEND_FROM_EMAIL — sender address; defaults to onboarding@resend.dev so an
 *                       unverified domain does not trigger a 403
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM_ADDRESS = "onboarding@resend.dev";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const shell = (inner) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgroSpace Nexus</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #070B13; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; background-color: #0B111E; border: 1px solid rgba(34, 211, 238, 0.28); border-radius: 20px; padding: 32px 28px;">
          <tr>
            <td align="center" style="padding-bottom: 18px;">
              <div style="display: inline-block; padding: 6px 14px; background: rgba(34, 211, 238, 0.12); border: 1px solid rgba(34, 211, 238, 0.35); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #38BDF8; letter-spacing: 1.5px; text-transform: uppercase;">
                AgroSpace Nexus
              </div>
            </td>
          </tr>
          ${inner}
          <tr>
            <td style="padding-top: 22px; text-align: center; font-size: 11px; color: #64748B;">
              AgroSpace Nexus • Orbital Telemetry &amp; Earth Intelligence
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export function generateNasaOtpHtml(otp, name) {
  const safeName = name || "Commander";
  return shell(`
          <tr>
            <td align="center">
              <h1 style="margin: 0 0 8px; font-size: 22px; color: #FFFFFF;">Verify your email</h1>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #94A3B8;">
                Hello <strong style="color: #F8FAFC;">${safeName}</strong>, use the code below to finish creating your mission account.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 22px 0;">
              <div style="background: #030712; border: 2px dashed #06B6D4; border-radius: 16px; padding: 20px 16px;">
                <p style="margin: 0 0 8px; font-size: 11px; font-weight: 700; color: #38BDF8; letter-spacing: 2px; text-transform: uppercase;">
                  6-digit verification code
                </p>
                <div style="font-family: Menlo, Monaco, Consolas, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #22D3EE;">
                  ${otp}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="font-size: 12px; color: #94A3B8;">
              This code expires in 5 minutes. If you did not create an AgroSpace Nexus account, ignore this email.
            </td>
          </tr>`);
}

function welcomeHtml(name, email) {
  const safeName = name || "Commander";
  return shell(`
          <tr>
            <td align="center">
              <h1 style="margin: 0 0 8px; font-size: 22px; color: #FFFFFF;">Welcome aboard, ${safeName}</h1>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #94A3B8;">
                Your email <strong style="color: #F8FAFC;">${email}</strong> is verified and your mission account is active.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 22px 0;">
              <div style="background: #030712; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 16px; padding: 18px;">
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #CBD5E1;">
                  You now have access to live 3D orbital telemetry, NDVI crop layers, hazard alerts and agro decision briefs.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="font-size: 12px; color: #94A3B8;">
              Clearance level: Mission Commander
            </td>
          </tr>`);
}

async function sendViaResend({ to, name, otp, purpose }) {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) {
    const error =
      "RESEND_API_KEY is not configured on the server. Add your Resend API key to enable email delivery.";
    console.error("[Resend] " + error);
    return { success: false, error };
  }

  const fromEmail = (process.env.RESEND_FROM_EMAIL || "").trim() || `AgroSpace Nexus <${DEFAULT_FROM_ADDRESS}>`;
  const safeName = name || to.split("@")[0] || "Commander";
  const isWelcome = purpose === "welcome";

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: isWelcome
          ? "Welcome to AgroSpace Nexus Mission Control"
          : `Your AgroSpace verification code: ${otp}`,
        html: isWelcome ? welcomeHtml(safeName, to) : generateNasaOtpHtml(otp, safeName),
        ...(isWelcome
          ? {
              text: `Welcome aboard, ${safeName}!\n\nYour AgroSpace Nexus account (${to}) is verified.`,
            }
          : {
              text: `Hello ${safeName},\n\nYour AgroSpace Nexus verification code is ${otp}. It expires in 5 minutes.`,
            }),
      }),
    });

    const rawBody = await response.text();
    let parsed = {};
    try {
      parsed = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      parsed = {};
    }

    if (!response.ok) {
      const detail = parsed.message || rawBody || response.statusText || "Unknown Resend error";
      console.error(`[Resend] API error ${response.status}: ${detail}`);
      return { success: false, error: `Resend API error (${response.status}): ${detail}` };
    }

    console.info(`[Resend] Email accepted for ${to} (id: ${parsed.id || "unknown"})`);
    return { success: true, id: parsed.id };
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    console.error("[Resend] Network/CORS error while calling the Resend API:", message);
    return { success: false, error: `Network error contacting Resend: ${message}` };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, success: false, error: "Method not allowed. Use POST." });
  }

  const { email, name, otp, purpose } = req.body || {};
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!EMAIL_PATTERN.test(cleanEmail)) {
    return res
      .status(400)
      .json({ ok: false, success: false, error: "A valid recipient email address is required." });
  }

  if (purpose === "welcome") {
    console.info(`[auth-email] Dispatching welcome email to ${cleanEmail}`);
    const result = await sendViaResend({ to: cleanEmail, name, purpose: "welcome" });
    return result.success
      ? res.status(200).json({ ok: true, success: true, deliveryMethod: "resend", id: result.id })
      : res.status(502).json({ ok: false, success: false, error: result.error });
  }

  const cleanOtp = String(otp || "").replace(/\D/g, "");
  if (cleanOtp.length !== 6) {
    return res
      .status(400)
      .json({ ok: false, success: false, error: "A 6-digit verification code is required." });
  }

  console.info(`[auth-email] Dispatching verification code to ${cleanEmail}`);
  const result = await sendViaResend({ to: cleanEmail, name, otp: cleanOtp, purpose: "verification" });
  return result.success
    ? res.status(200).json({ ok: true, success: true, deliveryMethod: "resend", id: result.id })
    : res.status(502).json({ ok: false, success: false, error: result.error });
}
