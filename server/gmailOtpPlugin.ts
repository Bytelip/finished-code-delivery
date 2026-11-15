import type { Plugin, ViteDevServer } from "vite";
import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";

let cachedSmtp: { user?: string; pass?: string } = {
  user: process.env.GMAIL_USER,
  pass: process.env.GMAIL_APP_PASSWORD,
};

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
                Security Clearance for <strong style="color: #F8FAFC;">${name || "Mission Commander"}</strong>
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
                      ${otp}
                    </div>
                    <div style="margin-top: 14px; display: inline-block; padding: 4px 12px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 8px; font-size: 12px; font-weight: 600; color: #FBBF24;">
                      ⏱️ Valid for 3 minutes • Single-use orbital passkey
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SECURITY GUIDANCE -->
          <tr>
            <td style="padding: 12px 32px 28px 32px;">
              <p style="margin: 0; font-size: 13px; color: #94A3B8; line-height: 1.6; text-align: center;">
                Enter this code into the AgroSpace Nexus login portal to complete biometric/session handshake and unlock live 3D orbital telemetry.
              </p>
              <p style="margin: 14px 0 0 0; font-size: 12px; color: #64748B; text-align: center;">
                If you did not initiate this sign-in request, please ignore this transmission.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
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

export function gmailOtpPlugin(): Plugin {
  return {
    name: "gmail-otp-middleware",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split("?")[0] : "";

        // Handle CORS Preflight
        if (req.method === "OPTIONS" && (url === "/api/send-otp" || url === "/api/configure-smtp")) {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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

            if (!email || !otp) {
              res.statusCode = 400;
              res.end(
                JSON.stringify({
                  success: false,
                  error: "Recipient email and OTP are required.",
                }),
              );
              return;
            }

            const cleanEmail = String(email).trim().toLowerCase();
            const cleanOtp = String(otp).trim().replace(/\D/g, "");

            const user = gmailUser || cachedSmtp.user || process.env.GMAIL_USER;
            const pass = (
              gmailAppPassword ||
              cachedSmtp.pass ||
              process.env.GMAIL_APP_PASSWORD ||
              ""
            ).replace(/\s+/g, "");

            if (!user || !pass) {
              res.statusCode = 400;
              res.end(
                JSON.stringify({
                  success: false,
                  error:
                    "Gmail SMTP is not configured. Click the gear icon (⚙️) on the login card to configure your Gmail address and 16-character App Password, or set GMAIL_USER and GMAIL_APP_PASSWORD in .env.",
                }),
              );
              return;
            }

            const transporter = nodemailer.createTransport({
              service: "gmail",
              auth: { user, pass },
            });

            const info = await transporter.sendMail({
              from: `"AgroSpace Nexus Mission Control" <${user}>`,
              to: cleanEmail,
              subject: `AgroSpace Nexus — Your 6-Digit Security Verification Code: ${cleanOtp}`,
              text: `AgroSpace Nexus Verification Code: ${cleanOtp}\n\nHello ${name || "Mission Commander"},\n\nYour 6-digit security verification code is: ${cleanOtp}\nThis code is valid for 3 minutes.\n\nAgroSpace Nexus Planetary Observatory`,
              html: generateNasaOtpHtml(cleanOtp, name || cleanEmail.split("@")[0]),
            });

            console.info(
              `[Gmail SMTP] Verification code successfully sent to ${cleanEmail} via ${user} (Message ID: ${info.messageId})`,
            );

            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                delivered: true,
                recipient: cleanEmail,
                messageId: info.messageId,
                timestamp: new Date().toISOString(),
              }),
            );
            return;
          } catch (err: any) {
            console.error("[Gmail SMTP Dispatch Error]", err);
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                success: false,
                error:
                  err?.message ||
                  "Failed to deliver verification email via Gmail SMTP. Check your App Password.",
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

            const cleanUser = String(gmailUser || "").trim().toLowerCase();
            const cleanPass = String(gmailAppPassword || "").trim().replace(/\s+/g, "");

            if (!cleanUser || !cleanPass) {
              res.statusCode = 400;
              res.end(
                JSON.stringify({
                  success: false,
                  error: "Both Gmail address and 16-character Google App Password are required.",
                }),
              );
              return;
            }

            // Verify credentials with Google SMTP
            const transporter = nodemailer.createTransport({
              service: "gmail",
              auth: { user: cleanUser, pass: cleanPass },
            });

            await transporter.verify();

            // Save in server cache
            cachedSmtp = { user: cleanUser, pass: cleanPass };
            process.env.GMAIL_USER = cleanUser;
            process.env.GMAIL_APP_PASSWORD = cleanPass;

            // Also persist to .env
            try {
              const envPath = path.resolve(process.cwd(), ".env");
              let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
              if (/^GMAIL_USER=/m.test(envContent)) {
                envContent = envContent.replace(/^GMAIL_USER=.*$/m, `GMAIL_USER=${cleanUser}`);
              } else {
                envContent += `\nGMAIL_USER=${cleanUser}`;
              }
              if (/^GMAIL_APP_PASSWORD=/m.test(envContent)) {
                envContent = envContent.replace(
                  /^GMAIL_APP_PASSWORD=.*$/m,
                  `GMAIL_APP_PASSWORD=${cleanPass}`,
                );
              } else {
                envContent += `\nGMAIL_APP_PASSWORD=${cleanPass}`;
              }
              fs.writeFileSync(envPath, envContent.trim() + "\n", "utf-8");
            } catch (fsErr) {
              console.warn("[Save .env Warning]", fsErr);
            }

            console.info(`[Gmail SMTP Config] Verified and saved credentials for ${cleanUser}`);

            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                message: `Gmail SMTP connected & verified successfully! Verification emails will now send from ${cleanUser}.`,
                user: cleanUser,
              }),
            );
            return;
          } catch (err: any) {
            console.error("[Gmail SMTP Verification Error]", err);
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                success: false,
                error:
                  err?.message ||
                  "Google SMTP verification failed. Ensure you are using a 16-character Google App Password (not your normal Gmail password).",
              }),
            );
            return;
          }
        }

        // Endpoint: GET /api/configure-smtp
        if (url === "/api/configure-smtp" && req.method === "GET") {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");

          const user = cachedSmtp.user || process.env.GMAIL_USER || "";
          const hasPass = Boolean(cachedSmtp.pass || process.env.GMAIL_APP_PASSWORD);

          res.statusCode = 200;
          res.end(
            JSON.stringify({
              isConfigured: Boolean(user && hasPass),
              user: user ? user.replace(/(.{2})(.*)(@.*)/, "$1***$3") : null,
            }),
          );
          return;
        }

        next();
      });
    },
  };
}
