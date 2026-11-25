/**
 * OAuth providers (Google and Microsoft/Azure) already verify email ownership, so OAuth
 * sessions proceed directly to the dashboard without an extra inbox OTP prompt.
 * Manual email sign-ups and passwordless email sign-ins enforce 6-digit OTP verification in CosmicAuthPage.
 */
export function sessionNeedsEmailCode(
  _accessToken: string | undefined,
  _provider: string | undefined,
): boolean {
  return false;
}

export const isSixDigitCode = (v: string) => /^\d{6}$/.test(v);
