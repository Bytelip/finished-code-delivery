/** Google sign-ins must also pass a 6-digit email code before the dashboard opens. */
export function sessionNeedsEmailCode(accessToken: string | undefined, provider: string | undefined): boolean {
  if (provider !== "google" || !accessToken) return false;
  try {
    const part = accessToken.split(".")[1] ?? "";
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as {
      amr?: Array<{ method?: string }>;
    };
    return !(json.amr ?? []).some((a) => a.method === "otp");
  } catch {
    return true;
  }
}
export const isSixDigitCode = (v: string) => /^\d{6}$/.test(v);
