import React, { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  enrollTotpFactor,
  listTotpFactors,
  sanitizeTotpCode,
  toQrImageSrc,
  unenrollTotpFactor,
  verifyTotpFactorCode,
  type MfaFactorInfo,
  type TotpEnrollmentData,
} from "@/services/mfaAuth";
import { cn } from "@/lib/utils";

export const TwoFactorSettingsCard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [verifiedFactors, setVerifiedFactors] = useState<MfaFactorInfo[]>([]);
  const [loadError, setLoadError] = useState<string>("");

  // Enrollment Modal State
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollment, setEnrollment] = useState<TotpEnrollmentData | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [enrollError, setEnrollError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Disable Confirmation Modal State
  const [disableTarget, setDisableTarget] = useState<MfaFactorInfo | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [disableError, setDisableError] = useState("");

  const refreshFactors = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await listTotpFactors();
      if (!res.ok) {
        setVerifiedFactors([]);
        setLoadError(res.error || "");
      } else {
        setVerifiedFactors(res.verifiedFactors);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshFactors();
  }, [refreshFactors]);

  const activeFactor = verifiedFactors[0] ?? null;
  const isEnabled = Boolean(activeFactor);

  const handleOpenEnroll = async () => {
    setEnrollModalOpen(true);
    setEnrolling(true);
    setEnrollError("");
    setEnrollment(null);
    setTotpCode("");
    setCopiedSecret(false);

    try {
      const res = await enrollTotpFactor("Authenticator App");
      if (!res.ok || !res.enrollment) {
        setEnrollError(res.error || "Could not start authenticator setup. Please try again.");
      } else {
        setEnrollment(res.enrollment);
      }
    } catch (err) {
      setEnrollError(err instanceof Error ? err.message : "Failed to initialize 2FA setup.");
    } finally {
      setEnrolling(false);
    }
  };

  const handleCloseEnroll = async () => {
    const leftoverId = enrollment?.factorId;
    setEnrollModalOpen(false);
    setEnrollment(null);
    setTotpCode("");
    setEnrollError("");
    if (leftoverId) {
      await unenrollTotpFactor(leftoverId).catch(() => undefined);
    }
  };

  const handleCopySecret = () => {
    if (!enrollment?.secret) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(enrollment.secret);
    }
    setCopiedSecret(true);
    toast.success("Setup key copied to clipboard");
    window.setTimeout(() => setCopiedSecret(false), 1800);
  };

  const handleVerifyEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollment) return;
    const clean = sanitizeTotpCode(totpCode);
    if (clean.length !== 6) {
      setEnrollError("Please enter the complete 6-digit code from your authenticator app.");
      return;
    }

    setEnrollError("");
    setVerifying(true);
    try {
      const res = await verifyTotpFactorCode(enrollment.factorId, clean);
      if (!res.ok) {
        setEnrollError(res.error || "Verification code did not match. Please try again.");
        return;
      }

      toast.success("Two-Factor Authentication enabled", {
        description: "Your account is now protected with an authenticator app.",
      });
      setEnrollModalOpen(false);
      setEnrollment(null);
      setTotpCode("");
      await refreshFactors();
    } catch (err) {
      setEnrollError(err instanceof Error ? err.message : "Could not verify code.");
    } finally {
      setVerifying(false);
    }
  };

  const handleConfirmDisable = async () => {
    if (!disableTarget) return;
    setDisableError("");
    setDisabling(true);
    try {
      const res = await unenrollTotpFactor(disableTarget.id);
      if (!res.ok) {
        setDisableError(res.error || "Could not disable two-factor authentication.");
        return;
      }
      toast.success("Two-Factor Authentication disabled");
      setDisableTarget(null);
      await refreshFactors();
    } catch (err) {
      setDisableError(err instanceof Error ? err.message : "Failed to disable 2FA.");
    } finally {
      setDisabling(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Registered";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <>
      <section
        aria-label="Two-Factor Authentication Security"
        className="rounded-lg border border-white/[0.08] bg-[#1c1c1c] p-5 space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div
              className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border",
                isEnabled
                  ? "border-[#3ecf8e]/30 bg-[#3ecf8e]/10 text-[#3ecf8e]"
                  : "border-white/[0.1] bg-[#171717] text-[#8b8b8b]",
              )}
            >
              <KeyRound className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[#ededed]">
                  Two-Factor Authentication (2FA)
                </h2>
                {loading ? (
                  <span className="inline-flex items-center gap-1 rounded border border-white/[0.08] bg-[#171717] px-2 py-0.5 font-mono text-[10px] text-[#8b8b8b]">
                    <Loader2 className="size-2.5 animate-spin" />
                    Checking…
                  </span>
                ) : isEnabled ? (
                  <span className="inline-flex items-center gap-1 rounded border border-[#3ecf8e]/30 bg-[#3ecf8e]/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-[#3ecf8e]">
                    <ShieldCheck className="size-3" />
                    Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded border border-white/[0.1] bg-[#171717] px-2 py-0.5 font-mono text-[10px] font-medium uppercase text-[#8b8b8b]">
                    <ShieldOff className="size-3" />
                    Off
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-[#8b8b8b]">
                Require a 6-digit authenticator app code (TOTP) alongside your sign-in method.
                Optional and isolated to your account.
              </p>
            </div>
          </div>
        </div>

        {loadError && !loading && (
          <div className="rounded-md border border-white/[0.08] bg-[#171717] px-3 py-2 text-xs text-[#8b8b8b]">
            {loadError}
          </div>
        )}

        {isEnabled && activeFactor ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/[0.08] bg-[#171717] px-3.5 py-2.5 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <Smartphone className="size-4 shrink-0 text-[#3ecf8e]" />
                <div className="min-w-0">
                  <div className="truncate font-medium text-[#ededed]">
                    {activeFactor.friendlyName}
                  </div>
                  <div className="font-mono text-[11px] text-[#8b8b8b]">
                    TOTP · Enrolled {formatDate(activeFactor.createdAt)}
                  </div>
                </div>
              </div>
              <span className="rounded border border-[#3ecf8e]/30 bg-[#3ecf8e]/10 px-2 py-0.5 font-mono text-[10px] text-[#3ecf8e]">
                Active
              </span>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setDisableError("");
                  setDisableTarget(activeFactor);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
              >
                <ShieldOff className="size-3.5" />
                <span>Disable 2FA</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/[0.08] bg-[#171717] px-3.5 py-3 text-xs">
            <span className="text-[#8b8b8b]">
              Use Google Authenticator, 1Password, Microsoft Authenticator, or Authy.
            </span>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleOpenEnroll()}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#3ecf8e] px-3.5 text-xs font-semibold text-[#121212] hover:bg-[#24b47e] disabled:opacity-50 transition-colors cursor-pointer shrink-0"
            >
              <ShieldCheck className="size-3.5" />
              <span>Enable 2FA</span>
            </button>
          </div>
        )}
      </section>

      {/* Enroll Authenticator App Modal */}
      {enrollModalOpen && (
        <div
          className="fixed inset-0 z-[9995] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
          onClick={() => void handleCloseEnroll()}
          role="dialog"
          aria-modal="true"
          aria-label="Set Up Two-Factor Authentication"
        >
          <div
            className="w-full max-w-md rounded-xl border border-white/[0.1] bg-[#1c1c1c] text-[#ededed] shadow-[0_24px_64px_rgba(0,0,0,0.85)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-[#3ecf8e]" />
                <h3 className="text-sm font-semibold">Set Up Authenticator App</h3>
              </div>
              <button
                type="button"
                onClick={() => void handleCloseEnroll()}
                aria-label="Close 2FA setup"
                className="rounded-md p-1 text-[#8b8b8b] hover:bg-white/[0.06] hover:text-[#ededed] cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {enrolling ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10">
                  <Loader2 className="size-6 animate-spin text-[#3ecf8e]" />
                  <p className="text-[#8b8b8b]">Generating authenticator credentials…</p>
                </div>
              ) : (
                <>
                  {enrollError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-md border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-400"
                    >
                      <ShieldAlert className="size-3.5 shrink-0 mt-0.5" />
                      <span>{enrollError}</span>
                    </div>
                  )}

                  {enrollment && (
                    <form onSubmit={(e) => void handleVerifyEnable(e)} className="space-y-4">
                      <p className="text-[#8b8b8b] leading-relaxed">
                        1. Scan this QR code with your authenticator app, or copy the manual setup
                        key below.
                      </p>

                      {/* Crisp white padded container so cameras read dark modules easily */}
                      <div className="flex justify-center">
                        <div className="rounded-lg bg-white p-3.5 shadow-sm">
                          <img
                            src={toQrImageSrc(enrollment.qrCode)}
                            alt="Two-factor authentication QR code"
                            className="size-44 object-contain"
                          />
                        </div>
                      </div>

                      {/* Manual Secret Key with Copy button */}
                      <div className="space-y-1.5">
                        <span className="block text-[11px] font-medium text-[#8b8b8b]">
                          Manual Setup Key
                        </span>
                        <div className="flex items-center justify-between gap-2 rounded-md border border-white/[0.08] bg-[#141414] px-3 py-2">
                          <code className="truncate font-mono text-xs tracking-wide text-[#ededed] select-all">
                            {enrollment.secret}
                          </code>
                          <button
                            type="button"
                            onClick={handleCopySecret}
                            aria-label="Copy setup key"
                            className="inline-flex h-6 shrink-0 items-center gap-1 rounded border border-white/[0.1] bg-[#1c1c1c] px-2 font-mono text-[11px] text-[#ededed] hover:border-white/[0.2] cursor-pointer"
                          >
                            {copiedSecret ? (
                              <>
                                <Check className="size-3 text-[#3ecf8e]" />
                                <span className="text-[#3ecf8e]">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 6-digit verification input */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="totp-enroll-code"
                          className="block text-[11px] font-medium text-[#8b8b8b]"
                        >
                          2. Enter the 6-digit code generated by your app
                        </label>
                        <input
                          id="totp-enroll-code"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          autoComplete="one-time-code"
                          autoFocus
                          value={totpCode}
                          onChange={(e) => setTotpCode(sanitizeTotpCode(e.target.value))}
                          onPaste={(e) => {
                            const pasted = sanitizeTotpCode(e.clipboardData.getData("text"));
                            if (pasted.length > 0) {
                              e.preventDefault();
                              setTotpCode(pasted);
                            }
                          }}
                          placeholder="000000"
                          aria-label="6-digit authenticator verification code"
                          className="h-11 w-full rounded-md border border-white/[0.12] bg-[#141414] px-3 text-center font-mono text-lg font-bold tracking-[0.45em] text-[#ededed] placeholder:text-[#8b8b8b]/40 focus:border-[#3ecf8e] focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 border-t border-white/[0.08] pt-3">
                        <button
                          type="button"
                          onClick={() => void handleCloseEnroll()}
                          className="h-8 rounded-md border border-white/[0.1] bg-[#171717] px-3 font-medium text-[#ededed] hover:bg-white/[0.06] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={totpCode.length !== 6 || verifying}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#3ecf8e] px-4 font-semibold text-[#121212] hover:bg-[#24b47e] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {verifying && <Loader2 className="size-3.5 animate-spin" />}
                          <span>{verifying ? "Verifying…" : "Verify & Enable"}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disable 2FA Confirmation Modal */}
      {disableTarget && (
        <div
          className="fixed inset-0 z-[9995] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
          onClick={() => !disabling && setDisableTarget(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Disable Two-Factor Authentication"
        >
          <div
            className="w-full max-w-sm rounded-xl border border-white/[0.1] bg-[#1c1c1c] text-[#ededed] shadow-[0_24px_64px_rgba(0,0,0,0.85)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-red-400" />
                <h3 className="text-sm font-semibold">Disable Two-Factor Authentication</h3>
              </div>
              <button
                type="button"
                disabled={disabling}
                onClick={() => setDisableTarget(null)}
                aria-label="Close confirmation"
                className="rounded-md p-1 text-[#8b8b8b] hover:bg-white/[0.06] hover:text-[#ededed] cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-[#8b8b8b] leading-relaxed">
                Are you sure you want to remove{" "}
                <span className="font-medium text-[#ededed]">{disableTarget.friendlyName}</span>?
                Your account will no longer ask for a 6-digit authenticator code at sign-in.
              </p>

              {disableError && (
                <div
                  role="alert"
                  className="rounded-md border border-red-500/35 bg-red-500/10 px-3 py-2 text-red-400"
                >
                  {disableError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-white/[0.08] pt-3">
                <button
                  type="button"
                  disabled={disabling}
                  onClick={() => setDisableTarget(null)}
                  className="h-8 rounded-md border border-white/[0.1] bg-[#171717] px-3 font-medium text-[#ededed] hover:bg-white/[0.06] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={disabling}
                  onClick={() => void handleConfirmDisable()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-red-500 px-3.5 font-semibold text-white hover:bg-red-600 disabled:opacity-50 cursor-pointer"
                >
                  {disabling && <Loader2 className="size-3.5 animate-spin" />}
                  <span>{disabling ? "Removing…" : "Confirm Disable"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
