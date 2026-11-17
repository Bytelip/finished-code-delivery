import { createFileRoute } from "@tanstack/react-router";
import { sendResendEmail } from "@/server/resendEmail";
import { buildVerificationEmail, buildWelcomeEmail } from "@/server/authEmails";

/**
 * POST /api/send-otp
 *
 * The only place emails are dispatched from. The browser posts here (same origin,
 * so no CORS preflight) and this handler talks to Resend with RESEND_API_KEY,
 * which never leaves the server.
 */
interface SendOtpRequest {
  email?: string;
  name?: string;
  otp?: string;
  purpose?: "verification" | "welcome";
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/send-otp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: SendOtpRequest;
        try {
          payload = (await request.json()) as SendOtpRequest;
        } catch {
          return json({ ok: false, success: false, error: "Invalid JSON body." }, 400);
        }

        const email = payload.email?.trim().toLowerCase() ?? "";
        if (!EMAIL_PATTERN.test(email)) {
          return json(
            { ok: false, success: false, error: "A valid recipient email address is required." },
            400,
          );
        }

        const name = payload.name?.trim() || email.split("@")[0] || "Commander";

        if (payload.purpose === "welcome") {
          console.info(`[auth-email] Dispatching welcome email to ${email}`);
          const result = await sendResendEmail({ to: email, ...buildWelcomeEmail({ name, email }) });
          if (!result.success) {
            return json({ ok: false, success: false, error: result.error }, 502);
          }
          return json({
            ok: true,
            success: true,
            deliveryMethod: "resend",
            ...(result.id ? { id: result.id } : {}),
          });
        }

        const otp = payload.otp?.trim().replace(/\D/g, "") ?? "";
        if (otp.length !== 6) {
          return json(
            { ok: false, success: false, error: "A 6-digit verification code is required." },
            400,
          );
        }

        console.info(`[auth-email] Dispatching verification code to ${email}`);
        const result = await sendResendEmail({ to: email, ...buildVerificationEmail({ name, otp }) });
        if (!result.success) {
          return json({ ok: false, success: false, error: result.error }, 502);
        }
        return json({
          ok: true,
          success: true,
          deliveryMethod: "resend",
          ...(result.id ? { id: result.id } : {}),
        });
      },
    },
  },
});
