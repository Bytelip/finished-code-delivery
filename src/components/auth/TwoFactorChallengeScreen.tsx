import React, { useState } from "react";
import { ShieldCheck, KeyRound, LogOut, Loader2 } from "lucide-react";
import { CosmicParallaxBg } from "@/components/CosmicAuthPage";
import { sanitizeTotpCode, verifyActiveTotpChallenge } from "@/services/mfaAuth";
import { SegmentedCodeInput } from "@/components/auth/SegmentedCodeInput";
import { supabase } from "@/integrations/supabase/client";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { toast } from "sonner";

export interface TwoFactorChallengeFormProps {
  email?: string | undefined;
  onVerified: () => Promise<void> | void;
  onSignOut: () => Promise<void> | void;
}

export const TwoFactorChallengeForm: React.FC<TwoFactorChallengeFormProps> = ({
  email,
  onVerified,
  onSignOut,
}) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeTotpCode(code);
    if (clean.length !== 6) {
      setError("Please enter the complete 6-digit code from your authenticator app.");
      return;
    }

    setError("");
    setVerifying(true);
    try {
      const res = await verifyActiveTotpChallenge(clean);
      if (!res.ok) {
        setError(res.error || "Invalid verification code. Please try again.");
        return;
      }

      if (typeof supabase?.auth?.refreshSession === "function") {
        await supabase.auth.refreshSession().catch(() => undefined);
      }

      toast.success(<LocalizedText text="Two-factor verification complete" />);
      await onVerified();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Verification failed. Please check your authenticator app code.",
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleSignOutClick = async () => {
    setSigningOut(true);
    try {
      setCode("");
      setError("");
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
  };

  const canSubmit = code.length === 6 && !verifying && !signingOut;

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
        <ShieldCheck className="h-6 w-6" />
      </div>

      <h2 className="text-xl font-semibold text-foreground">
        <LocalizedText text="Two-Factor Verification" />
      </h2>

      <p className="mt-2 text-sm text-muted-foreground">
        <LocalizedText text="Enter the 6-digit verification code from your authenticator app" />
        {email ? (
          <>
            {" "}
            <LocalizedText text="for" />{" "}
            <span className="font-mono font-medium text-cyan-300 break-all">{email}</span>
          </>
        ) : null}
        .
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-left text-xs text-rose-400"
        >
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
        <div>
          <SegmentedCodeInput
            id="mfa-totp-input"
            value={code}
            onChange={(val) => setCode(sanitizeTotpCode(val))}
            ariaLabel="6-digit two-factor authentication code"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full rounded-xl py-3 text-sm font-semibold transition-all cursor-pointer ${
            canSubmit
              ? "bg-[var(--accent)] text-[var(--primary-foreground)] shadow-[0_0_20px_var(--accent-glow)] hover:brightness-110"
              : "cursor-not-allowed bg-[var(--secondary)] text-[var(--text-muted)]"
          }`}
        >
          <span className="inline-flex items-center justify-center gap-2">
            {verifying ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <KeyRound className="size-4" />
            )}
            <LocalizedText text={verifying ? "Verifying code…" : "Verify & Continue"} />
          </span>
        </button>

        <button
          type="button"
          disabled={verifying || signingOut}
          onClick={() => void handleSignOutClick()}
          className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-lg border border-white/10 text-xs font-medium text-muted-foreground hover:bg-white/[0.04] hover:text-foreground disabled:opacity-40 cursor-pointer transition-colors"
        >
          <LogOut className="size-3.5" />
          <LocalizedText text={signingOut ? "Signing out…" : "Sign out / Use another account"} />
        </button>
      </form>
    </div>
  );
};

export interface TwoFactorChallengeScreenProps {
  email?: string | undefined;
  onVerified: () => Promise<void> | void;
  onSignOut: () => Promise<void> | void;
}

export const TwoFactorChallengeScreen: React.FC<TwoFactorChallengeScreenProps> = ({
  email,
  onVerified,
  onSignOut,
}) => {
  return (
    <CosmicParallaxBg head="AGROSPACE NEXUS" text="ORBITAL TELEMETRY, EARTH INTELLIGENCE">
      <div className="relative my-4 max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-glass)] p-4 sm:mx-auto sm:p-7 backdrop-blur-2xl shadow-[var(--shadow-hud)] text-[var(--text-primary)]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-[var(--accent)]/35 bg-[var(--accent-surface)] shadow-[0_0_20px_var(--accent-glow)]">
          <svg
            className="h-7 w-7 text-[var(--accent)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="12" cy="12" r="4" />
            <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-30 12 12)" />
          </svg>
        </div>

        <TwoFactorChallengeForm email={email} onVerified={onVerified} onSignOut={onSignOut} />

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          <LocalizedText text="Protected by AgroSpace Two-Factor Security (TOTP)." />
        </p>
      </div>
    </CosmicParallaxBg>
  );
};
