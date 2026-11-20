import type { Plugin, ViteDevServer } from "vite";
import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";

const CONFIG_FILE = path.resolve(process.cwd(), ".smtp-config.json");
const ENV_FILE = path.resolve(process.cwd(), ".env");

let cachedSmtp: { user?: string; pass?: string } = {
  user: process.env.GMAIL_USER,
  pass: process.env.GMAIL_APP_PASSWORD,
};

function getStoredSmtp(): { user?: string; pass?: string } {
  if (cachedSmtp.user && cachedSmtp.pass) {
    return cachedSmtp;
  }

  // 1. Check .smtp-config.json
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      if (data?.gmailUser && data?.gmailAppPassword) {
        cachedSmtp = {
          user: String(data.gmailUser).trim().toLowerCase(),
          pass: String(data.gmailAppPassword).trim().replace(/\s+/g, ""),
        };
        process.env.GMAIL_USER = cachedSmtp.user;
        process.env.GMAIL_APP_PASSWORD = cachedSmtp.pass;
        return cachedSmtp;
      }
    }
  } catch (err) {
    console.warn("[SMTP Config Load Warning]", err);
  }

  // 2. Check process.env
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    cachedSmtp = {
      user: process.env.GMAIL_USER.trim().toLowerCase(),
      pass: process.env.GMAIL_APP_PASSWORD.trim().replace(/\s+/g, ""),
    };
    return cachedSmtp;
  }

  // 3. Check .env directly
  try {
    if (fs.existsSync(ENV_FILE)) {
      const envText = fs.readFileSync(ENV_FILE, "utf-8");
      const userMatch = envText.match(/^GMAIL_USER=(.*)$/m);
      const passMatch = envText.match(/^GMAIL_APP_PASSWORD=(.*)$/m);
      if (userMatch && passMatch && userMatch[1].trim() && passMatch[1].trim()) {
        cachedSmtp = {
          user: userMatch[1].trim().toLowerCase(),
          pass: passMatch[1].trim().replace(/\s+/g, ""),
        };
        process.env.GMAIL_USER = cachedSmtp.user;
        process.env.GMAIL_APP_PASSWORD = cachedSmtp.pass;
        return cachedSmtp;
      }
    }
  } catch (err) {
    console.warn("[.env Parse Warning]", err);
  }

  return cachedSmtp;
}

// Initial sync
getStoredSmtp();

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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeName(rawName: unknown): string {
  if (typeof rawName !== "string") return "Mission Commander";
  const cleaned = rawName.replace(/<[^>]*>/g, "").replace(/[^\w\s.-]/g, "").trim();
  const truncated = cleaned.slice(0, 40);
  return escapeHtml(truncated) || "Mission Commander";
}

// In-memory rate limiting and cooldown cache
const rateLimitCache = new Map<string, { count: number; firstSent: number; lastSent: number }>();

function checkRateLimit(
  key: string,
  cooldownSec = 60,
  maxPerWindow = 5,
  windowSec = 900,
): { allowed: boolean; retryAfter?: number; error?: string } {
  const now = Date.now();
  const record = rateLimitCache.get(key);

  if (!record) {
    rateLimitCache.set(key, { count: 1, firstSent: now, lastSent: now });
    return { allowed: true };
  }

  // Cooldown
  const timeSinceLast = (now - record.lastSent) / 1000;
  if (timeSinceLast < cooldownSec) {
    return {
      allowed: false,
      retryAfter: Math.ceil(cooldownSec - timeSinceLast),
      error: `Please wait ${Math.ceil(cooldownSec - timeSinceLast)} seconds before requesting a new code.`,
    };
  }

  // Sliding window
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

function parseJsonBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: any) => {
      data += chunk;
      if (data.length > 1e6) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

export function generateNasaOtpHtml(otp: string, name: string): string {
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
          <!-- HEADER -->
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

          <!-- OTP CODE DISPLAY -->
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

          <!-- FOOTER DETAILS -->
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

          <!-- GROUND STATION WATERMARK -->
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

/**
 * Custom Vite plugin: injects Gmail SMTP endpoints during local dev / SSR builds.
 */
export function gmailOtpPlugin(): Plugin {
  return {
    name: "gmail-otp-middleware",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];

        // CORS Preflight
        if (req.method === "OPTIONS" && (url === "/api/send-otp" || url === "/api/configure-smtp")) {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type");
          res.statusCode = 204;
          res.end();
          return;
        }

        // Endpoint: POST /api/send-otp
        if (url === "/api/send-otp" && req.method === "POST") {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");

          try {
            const body = await parseJsonBody(req);
            const { email, name, otp, gmailUser, gmailAppPassword } = body;

            // Strict email format validation
            if (!isValidEmail(email)) {
              res.statusCode = 400;
              res.end(
                JSON.stringify({
                  ok: false,
                  success: false,
                  error: "Valid recipient email address is required.",
                }),
              );
              return;
            }
            const cleanEmail = String(email).trim().toLowerCase();

            // Strict OTP format validation
            if (!otp || typeof otp !== "string") {
              res.statusCode = 400;
              res.end(
                JSON.stringify({
                  ok: false,
                  success: false,
                  error: "Valid 6-digit OTP code is required.",
                }),
              );
              return;
            }
            const cleanOtp = String(otp).trim().replace(/\D/g, "");
            if (cleanOtp.length < 6 || cleanOtp.length > 8) {
              res.statusCode = 400;
              res.end(
                JSON.stringify({
                  ok: false,
                  success: false,
                  error: "OTP code must be 6 to 8 digits.",
                }),
              );
              return;
            }

            // Rate limit check per-email
            const emailLimit = checkRateLimit(`email:${cleanEmail}`);
            if (!emailLimit.allowed) {
              res.statusCode = 429;
              res.end(
                JSON.stringify({
                  ok: false,
                  success: false,
                  error: emailLimit.error,
                  retryAfter: emailLimit.retryAfter,
                }),
              );
              return;
            }

            // Rate limit check per-IP
            const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket?.remoteAddress || "unknown";
            const ipLimit = checkRateLimit(`ip:${String(clientIp).split(",")[0].trim()}`, 2, 10, 900);
            if (!ipLimit.allowed) {
              res.statusCode = 429;
              res.end(
                JSON.stringify({
                  ok: false,
                  success: false,
                  error: "Too many verification requests from this IP. Please wait before retrying.",
                }),
              );
              return;
            }

            const smtp = getStoredSmtp();
            const user = (
              gmailUser ||
              smtp.user ||
              process.env.GMAIL_USER ||
              ""
            )
              .trim()
              .toLowerCase();
            const pass = (
              gmailAppPassword ||
              smtp.pass ||
              process.env.GMAIL_APP_PASSWORD ||
              ""
            ).replace(/\s+/g, "");

            // If credentials are NOT configured yet, tell client to open SMTP setup modal
            if (!user || !pass || !isValidEmail(user)) {
              res.statusCode = 400;
              res.end(
                JSON.stringify({
                  ok: false,
                  success: false,
                  needsSmtpSetup: true,
                  error:
                    "Gmail SMTP sender not configured. Please enter your Sender Gmail address and 16-character Google App Password once.",
                }),
              );
              return;
            }

            const safeName = sanitizeName(name);

            // Real Gmail SMTP Delivery via smtp.gmail.com:465 SSL
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
                text: `AgroSpace Nexus Verification Code: ${cleanOtp}\n\nHello ${safeName},\n\nYour 6-digit security verification code is: ${cleanOtp}\nThis code is valid for 5 minutes.\n\nAgroSpace Nexus Planetary Observatory`,
                html: generateNasaOtpHtml(cleanOtp, safeName),
              });

              // Safe operational log (no email address, no OTP code, no PII)
              console.info(`[Gmail SMTP] Verification email dispatched successfully (Message ID: ${info.messageId})`);

              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  ok: true,
                  success: true,
                  delivered: true,
                  deliveryMethod: "gmail_smtp",
                  messageId: info.messageId,
                  timestamp: new Date().toISOString(),
                }),
              );
              return;
            } catch (_gmailErr: any) {
              console.error("[Gmail SMTP Error] Delivery failure through SMTP server.");
              res.statusCode = 500;
              res.end(
                JSON.stringify({
                  ok: false,
                  success: false,
                  delivered: false,
                  error: "Failed to deliver email through Google SMTP. Please verify SMTP credentials.",
                }),
              );
              return;
            }
          } catch (_err: any) {
            console.error("[OTP Dispatch Error] Internal server error handling OTP dispatch.");
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                ok: false,
                success: false,
                error: "Internal server error dispatching verification code.",
              }),
            );
            return;
          }
        }

        // Endpoint: POST /api/configure-smtp
        if (url === "/api/configure-smtp" && req.method === "POST") {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");

          try {
            const body = await parseJsonBody(req);
            const { gmailUser, gmailAppPassword } = body;

            if (!isValidEmail(gmailUser)) {
              res.statusCode = 400;
              res.end(
                JSON.stringify({
                  success: false,
                  error: "Please enter a valid Gmail address.",
                }),
              );
              return;
            }

            const cleanUser = String(gmailUser || "").trim().toLowerCase();
            const cleanPass = String(gmailAppPassword || "").trim().replace(/\s+/g, "");

            if (!cleanUser || !cleanPass) {
              res.statusCode = 400;
              res.end(
                JSON.stringify({
                  success: false,
                  error: "Both Sender Gmail and 16-character App Password are required.",
                }),
              );
              return;
            }

            // Test SMTP credentials with a handshake verify()
            try {
              const testTransporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true,
                auth: { user: cleanUser, pass: cleanPass },
                connectionTimeout: 10000,
              });

              await testTransporter.verify();
            } catch (_verifyErr: any) {
              console.error("[SMTP Verify Error] Authentication handshake failed.");
              res.statusCode = 401;
              res.end(
                JSON.stringify({
                  success: false,
                  error: "Google SMTP authentication failed. Please verify credentials.",
                }),
              );
              return;
            }

            // Credentials verified! Cache in memory and persist to local .smtp-config.json
            cachedSmtp = { user: cleanUser, pass: cleanPass };
            process.env.GMAIL_USER = cleanUser;
            process.env.GMAIL_APP_PASSWORD = cleanPass;

            try {
              fs.writeFileSync(
                CONFIG_FILE,
                JSON.stringify({ gmailUser: cleanUser, gmailAppPassword: cleanPass }, null, 2),
                "utf-8",
              );
            } catch (writeErr) {
              console.warn("[Config File Write Warning]", writeErr);
            }

            // Also append or update in .env if it exists
            try {
              if (fs.existsSync(ENV_FILE)) {
                let envContent = fs.readFileSync(ENV_FILE, "utf-8");
                if (envContent.includes("GMAIL_USER=")) {
                  envContent = envContent.replace(/^GMAIL_USER=.*$/m, `GMAIL_USER=${cleanUser}`);
                } else {
                  envContent += `\nGMAIL_USER=${cleanUser}`;
                }
                if (envContent.includes("GMAIL_APP_PASSWORD=")) {
                  envContent = envContent.replace(/^GMAIL_APP_PASSWORD=.*$/m, `GMAIL_APP_PASSWORD=${cleanPass}`);
                } else {
                  envContent += `\nGMAIL_APP_PASSWORD=${cleanPass}`;
                }
                fs.writeFileSync(ENV_FILE, envContent, "utf-8");
              }
            } catch (envWriteErr) {
              console.warn("[.env Write Warning]", envWriteErr);
            }

            console.info("[Gmail SMTP] Configuration verified and updated.");

            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                message: "Gmail SMTP connected & verified successfully!",
              }),
            );
            return;
          } catch (_err: any) {
            console.error("[SMTP Config Error] Internal exception during SMTP configuration.");
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                success: false,
                error: "Internal server error while saving configuration.",
              }),
            );
            return;
          }
        }

        next();
      });
    },
  };
}
