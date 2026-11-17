/**
 * Transactional email templates for the sign-up flow.
 * Plain HTML strings so the same bodies can be reused by the Vercel function.
 */

export interface EmailMessage {
  subject: string;
  html: string;
  text: string;
}

const shell = (inner: string): string => `<!DOCTYPE html>
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

export function buildVerificationEmail({ name, otp }: { name: string; otp: string }): EmailMessage {
  const safeName = name || "Commander";
  return {
    subject: `Your AgroSpace verification code: ${otp}`,
    text: `Hello ${safeName},\n\nYour AgroSpace Nexus verification code is ${otp}. It expires in 5 minutes.\n\nIf you did not request this code, you can ignore this email.`,
    html: shell(`
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
          </tr>`),
  };
}

export function buildWelcomeEmail({
  name,
  email,
}: {
  name: string;
  email: string;
}): EmailMessage {
  const safeName = name || "Commander";
  return {
    subject: "Welcome to AgroSpace Nexus Mission Control",
    text: `Welcome aboard, ${safeName}!\n\nYour AgroSpace Nexus account (${email}) is verified. Open the mission control app to start exploring orbital telemetry and crop intelligence.`,
    html: shell(`
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
          </tr>`),
  };
}
