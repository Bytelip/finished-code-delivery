import { describe, it, expect } from "vitest";
import { sessionNeedsEmailCode, isSixDigitCode } from "@/lib/googleOtp";
const tok = (amr: unknown) => `x.${btoa(JSON.stringify({ amr }))}.y`;
describe("google email code", () => {
  it("google session without code needs one", () => expect(sessionNeedsEmailCode(tok([{ method: "oauth" }]), "google")).toBe(true));
  it("google session after code is cleared", () => expect(sessionNeedsEmailCode(tok([{ method: "otp" }]), "google")).toBe(false));
  it("email-password users skip it", () => expect(sessionNeedsEmailCode(tok([{ method: "password" }]), "email")).toBe(false));
  it("code must be 6 digits", () => { expect(isSixDigitCode("123456")).toBe(true); expect(isSixDigitCode("12345")).toBe(false); });
});
