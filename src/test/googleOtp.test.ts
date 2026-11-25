import { describe, it, expect } from "vitest";
import { sessionNeedsEmailCode, isSixDigitCode } from "@/lib/googleOtp";

const tok = (amr: unknown) => `x.${btoa(JSON.stringify({ amr }))}.y`;

describe("OAuth direct dashboard entry & 6-digit email code helper", () => {
  it("allows Google OAuth sessions directly into the dashboard without an extra Gmail code step", () => {
    expect(sessionNeedsEmailCode(tok([{ method: "oauth" }]), "google")).toBe(false);
    expect(sessionNeedsEmailCode(tok([{ method: "otp" }]), "google")).toBe(false);
  });

  it("allows Microsoft (azure) OAuth sessions directly into the dashboard", () => {
    expect(sessionNeedsEmailCode(tok([{ method: "oauth" }]), "azure")).toBe(false);
  });

  it("email-password sessions skip secondary session check once verified", () => {
    expect(sessionNeedsEmailCode(tok([{ method: "password" }]), "email")).toBe(false);
  });

  it("email OTP validation requires exactly 6 digits", () => {
    expect(isSixDigitCode("123456")).toBe(true);
    expect(isSixDigitCode("12345")).toBe(false);
  });
});
