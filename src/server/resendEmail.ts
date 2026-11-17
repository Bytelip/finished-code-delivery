/**
 * Server-only Resend email client.
 *
 * The Resend API key must never reach the browser: calling api.resend.com from the
 * client fails with CORS/preflight errors and exposes the key. Every email is sent
 * from the app's own server handler (`src/routes/api/send-otp.ts` in dev / Nitro,
 * `api/send-otp.js` on the static Vercel deploy) through this module.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM_ADDRESS = "onboarding@resend.dev";

export interface ResendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface ResendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/** Reads a runtime environment variable without touching browser globals. */
function serverEnv(key: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  const value = process.env[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/**
 * Sender address. Defaults to Resend's onboarding sender so an unverified domain
 * cannot cause a 403 domain-verification failure during setup.
 */
export function getResendFromEmail(): string {
  return serverEnv("RESEND_FROM_EMAIL") || `AgroSpace Nexus <${DEFAULT_FROM_ADDRESS}>`;
}

export function isResendConfigured(): boolean {
  return Boolean(serverEnv("RESEND_API_KEY"));
}

export async function sendResendEmail(payload: ResendEmailPayload): Promise<ResendEmailResult> {
  const apiKey = serverEnv("RESEND_API_KEY");

  if (!apiKey) {
    const error =
      "RESEND_API_KEY is not configured on the server. Add your Resend API key to enable email delivery.";
    console.error("[Resend] " + error);
    return { success: false, error };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getResendFromEmail(),
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        ...(payload.text ? { text: payload.text } : {}),
      }),
    });

    const rawBody = await response.text();
    let parsed: { id?: string; message?: string; name?: string } = {};
    try {
      parsed = rawBody ? (JSON.parse(rawBody) as typeof parsed) : {};
    } catch {
      parsed = {};
    }

    if (!response.ok) {
      const detail = parsed.message || rawBody || response.statusText || "Unknown Resend error";
      console.error(`[Resend] API error ${response.status}: ${detail}`);
      return {
        success: false,
        error: `Resend API error (${response.status}): ${detail}`,
      };
    }

    console.info(`[Resend] Email accepted for ${payload.to} (id: ${parsed.id ?? "unknown"})`);
    return { success: true, ...(parsed.id ? { id: parsed.id } : {}) };
  } catch (err: unknown) {
    // Network failures, DNS problems and any CORS-style rejection surface here.
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Resend] Network/CORS error while calling the Resend API:", message);
    return { success: false, error: `Network error contacting Resend: ${message}` };
  }
}
