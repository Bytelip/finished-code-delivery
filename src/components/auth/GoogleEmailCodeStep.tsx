import { useCallback, useEffect, useRef, useState } from "react";
import {
  MISSING_SUPABASE_ENV_MESSAGE,
  isSupabaseConfigured,
  supabase,
} from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isSixDigitCode } from "@/lib/googleOtp";

export function GoogleEmailCodeStep({ email, onCancel }: { email: string; onCancel: () => void }) {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const sent = useRef(false);

  const send = useCallback(async () => {
    setMsg(null);
    if (!isSupabaseConfigured()) {
      setMsg(MISSING_SUPABASE_ENV_MESSAGE);
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) setMsg(error.message);
    else {
      setMsg(`We sent a 6-digit code to ${email}.`);
      setCooldown(45);
    }
  }, [email]);
  useEffect(() => {
    if (!sent.current) {
      sent.current = true;
      void send();
    }
  }, [send]);
  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [cooldown]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSixDigitCode(code)) {
      setMsg("Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    setBusy(false);
    if (error) setMsg("That code is wrong or expired. Try again or resend.");
  };

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background p-4">
      <form
        onSubmit={verify}
        className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6"
      >
        <h1 className="text-xl font-semibold text-foreground">Check your Gmail</h1>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code sent to {email} to finish signing in with Google.
        </p>
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="123456"
          aria-label="6-digit code"
        />
        {msg && (
          <p className="text-sm text-muted-foreground" role="status">
            {msg}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          Verify code
        </Button>
        <div className="flex justify-between text-sm">
          <button
            type="button"
            className="text-primary disabled:opacity-50"
            disabled={cooldown > 0}
            onClick={() => void send()}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
          <button type="button" className="text-muted-foreground" onClick={onCancel}>
            Use another account
          </button>
        </div>
      </form>
    </div>
  );
}
