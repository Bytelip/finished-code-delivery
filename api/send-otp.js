import nodemailer from "nodemailer";

/**
 * Strict RFC 5322 compatible email validation.
 * Strictly rejects <, >, ", ', whitespace, carriage returns, newlines, and control characters.
 */
const STRICT_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function isValidEmail(email) {
  if (typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  if (/[\r\n<>"'\s]/.test(trimmed)) return false;
  return STRICT_EMAIL_REGEX.test(trimmed);
}

function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeName(rawName) {
  if (typeof rawName !== "string") return "Mission Commander";
  const cleaned = rawName.replace(/<[^>]*>/g, "").replace(/[^\w\s.-]/g, "").trim();
  const truncated = cleaned.slice(0, 40);
  return escapeHtml(truncated) || "Mission Commander";
}

// In-memory rate limiting & 60s cooldown cache (per email & per IP)
const rateLimitCache = new Map();

function checkRateLimit(key, cooldownSec = 60, maxPerWindow = 5, windowSec = 900) {
  const now = Date.now();
  const record = rateLimitCache.get(key);

  if (!record) {
    rateLimitCache.set(key, { count: 1, firstSent: now, lastSent: now });
    return { allowed: true };
  }

  // 60-second cooldown
  const timeSinceLast = (now - record.lastSent) / 1000;
  if (timeSinceLast < cooldownSec) {
    return {
      allowed: false,
      retryAfter: Math.ceil(cooldownSec - timeSinceLast),
      error: `Please wait ${Math.ceil(cooldownSec - timeSinceLast)} seconds before requesting a new code.`,
    };
  }

  // Sliding window (15 minutes)
  if (now - record.firstSent > windowSec * 1000) {
    rateLimitCache.set(key, { count: 1, firstSent: now, lastSent: now });
    return { allowed: true };
  }

  if (record.count >= maxPerWindow) {
    const windowRemaining = Math.ceil((windowSec * 1000 - (now - record.firstSent)) / 1000);
    return {
      allowed: false,
      retryAfter: windowRemaining,
      error: `Maximum verification attempts reached. Please try again in ${Math.ceil(windowRemaining / 60)} minutes.`,
    };
  }

  record.count += 1;
  record.lastSent = now;
  return { allowed: true };
}

export function generateNasaOtpHtml(otp, name) {
  const safeName = sanitizeName(name);
  const cleanOtp = String(otp).trim().replace(/\D/g, "");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgroSpace Nexus Security Verification</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #070B13; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #070B13;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; margin: 0 auto; background: linear-gradient(180deg, #0D1526 0%, #060A12 100%); border: 1px solid rgba(34, 211, 238, 0.28); border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); overflow: hidden;">
          <tr>
            <td style="padding: 32px 32px 16px 32px; text-align: center;">
              <div style="display: inline-block; padding: 6px 14px; background: rgba(34, 211, 238, 0.12); border: 1px solid rgba(34, 211, 238, 0.35); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #38BDF8; letter-spacing: 1.5px; text-transform: uppercase;">
                🛰️ NASA SPACE APPS • AGROSPACE NEXUS
              </div>
              <h1 style="margin: 20px 0 8px 0; font-size: 24px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px;">
                Planetary Observatory Access
              </h1>
              <p style="margin: 0; font-size: 14px; color: #94A3B8; line-height: 1.6;">
                Security Clearance for <strong style="color: #F8FAFC;">${safeName}</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #030712; border: 2px dashed #06B6D4; border-radius: 16px; padding: 24px 16px; text-align: center; box-shadow: inset 0 2px 12px rgba(0,0,0,0.6);">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 700; color: #38BDF8; letter-spacing: 2px; text-transform: uppercase;">
                      6-DIGIT VERIFICATION CODE
                    </p>
                    <div style="font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace; font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #22D3EE; text-shadow: 0 0 16px rgba(34, 211, 238, 0.6); padding-left: 12px;">
                      ${cleanOtp}
                    </div>
                    <div style="margin-top: 14px; display: inline-block; padding: 4px 12px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 8px; font-size: 12px; font-weight: 600; color: #FBBF24;">
                      ⏱️ Valid for 5 minutes • Single-use orbital passkey
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 32px 28px 32px;">
              <p style="margin: 0; font-size: 13px; color: #94A3B8; line-height: 1.6; text-align: center;">
                Enter this code into the AgroSpace Nexus login portal to complete verification and unlock live 3D orbital telemetry.
              </p>
              <p style="margin: 14px 0 0 0; font-size: 12px; color: #64748B; text-align: center;">
                If you did not initiate this sign-in request, please ignore this transmission.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background: rgba(15, 23, 42, 0.6); border-top: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
              <div style="font-size: 11px; font-weight: 600; color: #94A3B8; letter-spacing: 0.5px;">
                AGROSPACE NEXUS • AUTONOMOUS BIO-CLIMATIC OBSERVATORY
              </div>
              <div style="margin-top: 4px; font-family: monospace; font-size: 11px; color: #38BDF8;">
                HAROHALLI GROUND STATION • 12.6622° N, 77.4503° E
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Use POST." });
  }

  const { email, name, otp, gmailUser, gmailAppPassword } = req.body || {};

  // Strict email validation
  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, error: "Valid recipient email address is required." });
  }
  const cleanEmail = String(email).trim().toLowerCase();

  // Strict OTP format validation
  if (!otp || typeof otp !== "string") {
    return res.status(400).json({ success: false, error: "Valid 6-digit OTP code is required." });
  }
  const cleanOtp = String(otp).trim().replace(/\D/g, "");
  if (cleanOtp.length < 6 || cleanOtp.length > 8) {
    return res.status(400).json({ success: false, error: "OTP code must be 6 to 8 digits." });
  }

  // Rate limit and cooldown check per-email
  const emailRateLimit = checkRateLimit(`email:${cleanEmail}`);
  if (!emailRateLimit.allowed) {
    return res.status(429).json({
      success: false,
      error: emailRateLimit.error,
      retryAfter: emailRateLimit.retryAfter,
    });
  }

  // Rate limit check per-IP
  const clientIp = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
  const ipRateLimit = checkRateLimit(`ip:${String(clientIp).split(",")[0].trim()}`, 2, 10, 900);
  if (!ipRateLimit.allowed) {
    return res.status(429).json({
      success: false,
      error: "Too many verification requests from this IP. Please wait before retrying.",
    });
  }

  const user = (gmailUser || process.env.GMAIL_USER || "").trim().toLowerCase();
  const pass = (gmailAppPassword || process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");

  if (!user || !pass || !isValidEmail(user)) {
    return res.status(400).json({
      ok: false,
      success: false,
      needsSmtpSetup: true,
      error:
        "Gmail SMTP sender not configured. Please enter your Sender Gmail address and 16-character Google App Password once in the settings modal.",
    });
  }

  const safeName = sanitizeName(name);

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 10000,
    });

    const info = await transporter.sendMail({
      from: `"AgroSpace Nexus Mission Control" <${user}>`,
      to: cleanEmail,
      subject: "AgroSpace Nexus — Your 6-Digit Security Verification Code",
      text: `AgroSpace Nexus Verification Code: ${cleanOtp}\n\nHello ${safeName},\n\nYour 6-digit security verification code is: ${cleanOtp}\nThis code expires in 5 minutes.\n\nAgroSpace Nexus Planetary Observatory`,
      html: generateNasaOtpHtml(cleanOtp, safeName),
    });

    // Safe operational log (no email address, no OTP code, no PII)
    console.info(`[Gmail Serverless] Verification email dispatched successfully (Message ID: ${info.messageId})`);

    return res.status(200).json({
      ok: true,
      success: true,
      delivered: true,
      deliveryMethod: "gmail_smtp",
      messageId: info.messageId,
      timestamp: new Date().toISOString(),
    });
  } catch (_err) {
    console.error("[Gmail Serverless Error] Failed to deliver email through SMTP provider.");
    return res.status(500).json({
      ok: false,
      success: false,
      delivered: false,
      error: "Failed to deliver email through Google SMTP. Please verify SMTP credentials.",
    });
  }
}
