import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
import { LocalizedText } from "@/components/i18n/LocalizedText";

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
    toast.success(<LocalizedText text="Setup key copied to clipboard" />);
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

      toast.success(<LocalizedText text="Two-Factor Authentication enabled" />, {
        description: (
          <LocalizedText text="Your account is now protected with an authenticator app." />
        ),
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
      toast.success(<LocalizedText text="Two-Factor Authentication disabled" />);
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

  const renderModal = (node: React.ReactNode) =>
    typeof document !== "undefined" ? createPortal(node, document.body) : null;

  return (
    <>
      <section
        aria-label="Two-Factor Authentication Security"
        className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <div
              className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border",
                isEnabled
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                  : "border-white/15 bg-white/[0.04] text-cyan-300",
              )}
            >
              <KeyRound className="size-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-mono text-xs font-semibold text-foreground">
                  <LocalizedText text="Two-Factor Authentication (2FA)" />
                </h3>
                {loading ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    <Loader2 className="size-2.5 animate-spin" />
                    Checking…
                  </span>
                ) : isEnabled ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-emerald-400">
                    <ShieldCheck className="size-3" />
                    Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] font-medium uppercase text-muted-foreground">
                    <ShieldOff className="size-3" />
                    Off
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                <LocalizedText text="Optional TOTP authenticator verification alongside your Google, Microsoft, or Email sign-in." />
              </p>
            </div>
          </div>
        </div>

        {loadError && !loading && (
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-muted-foreground">
            {loadError}
          </div>
        )}

        {isEnabled && activeFactor ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <Smartphone className="size-4 shrink-0 text-emerald-400" />
                <div className="min-w-0">
                  <div className="truncate font-mono font-semibold text-foreground">
                    {activeFactor.friendlyName}
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    TOTP · Enrolled {formatDate(activeFactor.createdAt)}
                  </div>
                </div>
              </div>
              <span className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-400">
                Active
              </span>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setDisableError("");
                  setDisableTarget(activeFactor);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 font-mono text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
              >
                <ShieldOff className="size-3.5" />
                <span>Disable 2FA</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-xs">
            <span className="text-muted-foreground">
              <LocalizedText text="Use Google Authenticator, 1Password, Microsoft Authenticator, or Authy." />
            </span>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleOpenEnroll()}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-3.5 font-mono text-xs font-bold text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer shrink-0"
            >
              <ShieldCheck className="size-3.5" />
              <span>Enable 2FA</span>
            </button>
          </div>
        )}
      </section>

      {/* Enroll Authenticator App Modal (portaled outside any parent <form>) */}
      {enrollModalOpen &&
        renderModal(
          <div
            className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
            onClick={() => void handleCloseEnroll()}
            role="dialog"
            aria-modal="true"
            aria-label="Set Up Two-Factor Authentication"
          >
            <div
              className="w-full max-w-md rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-hud)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-cyan-300" />
                  <h3 className="text-sm font-semibold">Set Up Authenticator App</h3>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCloseEnroll()}
                  aria-label="Close 2FA setup"
                  className="rounded-lg p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                {enrolling ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-10">
                    <Loader2 className="size-6 animate-spin text-cyan-300" />
                    <p className="text-muted-foreground">Generating authenticator credentials…</p>
                  </div>
                ) : (
                  <>
                    {enrollError && (
                      <div
                        role="alert"
                        className="flex items-start gap-2 rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-400"
                      >
                        <ShieldAlert className="size-3.5 shrink-0 mt-0.5" />
                        <span>{enrollError}</span>
                      </div>
                    )}

                    {enrollment && (
                      <form onSubmit={(e) => void handleVerifyEnable(e)} className="space-y-4">
                        <p className="text-muted-foreground leading-relaxed">
                          1. Scan this QR code with your authenticator app, or copy the manual setup
                          key below.
                        </p>

                        {/* Crisp white padded container so phone cameras scan easily */}
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
                          <span className="block text-[11px] font-mono text-muted-foreground">
                            Manual Setup Key
                          </span>
                          <div className="flex items-center justify-between gap-2 rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2">
                            <code className="truncate font-mono text-xs tracking-wide text-cyan-300 select-all">
                              {enrollment.secret}
                            </code>
                            <button
                              type="button"
                              onClick={handleCopySecret}
                              aria-label="Copy setup key"
                              className="inline-flex h-6 shrink-0 items-center gap-1 rounded border border-white/15 bg-white/[0.05] px-2 font-mono text-[11px] text-foreground hover:border-cyan-400/50 cursor-pointer"
                            >
                              {copiedSecret ? (
                                <>
                                  <Check className="size-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
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
                            className="block text-[11px] font-mono text-muted-foreground"
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
                            className="h-11 w-full rounded-xl border border-cyan-400/35 bg-slate-900/90 px-3 text-center font-mono text-lg font-bold tracking-[0.45em] text-cyan-300 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/25"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
                          <button
                            type="button"
                            onClick={() => void handleCloseEnroll()}
                            className="h-8 rounded-lg border border-white/15 bg-white/[0.04] px-3 font-mono font-medium text-foreground hover:bg-white/10 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={totpCode.length !== 6 || verifying}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-4 font-mono font-bold text-slate-950 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
          </div>,
        )}

      {/* Disable 2FA Confirmation Modal (portaled outside any parent <form>) */}
      {disableTarget &&
        renderModal(
          <div
            className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
            onClick={() => !disabling && setDisableTarget(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Disable Two-Factor Authentication"
          >
            <div
              className="w-full max-w-sm rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-hud)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="size-4 text-rose-400" />
                  <h3 className="text-sm font-semibold">Disable Two-Factor Authentication</h3>
                </div>
                <button
                  type="button"
                  disabled={disabling}
                  onClick={() => setDisableTarget(null)}
                  aria-label="Close confirmation"
                  className="rounded-lg p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <p className="text-muted-foreground leading-relaxed">
                  Are you sure you want to remove{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {disableTarget.friendlyName}
                  </span>
                  ? Your account will no longer ask for a 6-digit authenticator code at sign-in.
                </p>

                {disableError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-rose-400"
                  >
                    {disableError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
                  <button
                    type="button"
                    disabled={disabling}
                    onClick={() => setDisableTarget(null)}
                    className="h-8 rounded-lg border border-white/15 bg-white/[0.04] px-3 font-mono font-medium text-foreground hover:bg-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={disabling}
                    onClick={() => void handleConfirmDisable()}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-rose-500 px-3.5 font-mono font-semibold text-white hover:bg-rose-600 disabled:opacity-50 cursor-pointer"
                  >
                    {disabling && <Loader2 className="size-3.5 animate-spin" />}
                    <span>{disabling ? "Removing…" : "Confirm Disable"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
        )}
    </>
  );
};
