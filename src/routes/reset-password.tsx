import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MIN_PASSWORD_LENGTH, updatePassword } from "@/services/cloudAuth";
import { CosmicParallaxBg } from "@/components/CosmicAuthPage";
import { LocalizedText, useLocalizedValue } from "@/components/i18n/LocalizedText";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a New Password — AgroSpace Nexus" },
      { name: "description", content: "Set a new password for your AgroSpace Nexus account." },
      { property: "og:title", content: "Choose a New Password — AgroSpace Nexus" },
      { property: "og:description", content: "Set a new password for your AgroSpace Nexus account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordRoute,
});

function ResetPasswordRoute() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [linkChecked, setLinkChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const passwordLabel = useLocalizedValue("New password");
  const confirmLabel = useLocalizedValue("Repeat new password");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
      setLinkChecked(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const valid = password.length >= MIN_PASSWORD_LENGTH && password.length <= 72 && password === confirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("The two passwords don't match.");
    if (!valid) return setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
    setSaving(true);
    const result = await updatePassword(password);
    setSaving(false);
    if (!result.ok) return setError(result.error || "Could not save your new password.");
    toast.success(<LocalizedText text="Password updated" />);
    navigate({ to: "/", replace: true });
  };

  const inputClass =
    "w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-foreground placeholder-slate-400 focus:border-cyan-400 focus:outline-none";

  return (
    <CosmicParallaxBg head="AGROSPACE NEXUS" text="ORBITAL TELEMETRY, EARTH INTELLIGENCE">
      <div className="relative my-4 w-[calc(100%-1.5rem)] max-w-md rounded-xl border border-white/15 bg-[#0B111E]/90 p-5 sm:mx-auto sm:p-8 backdrop-blur-2xl text-foreground">
        <h1 className="text-center text-2xl font-semibold">
          <LocalizedText text="Choose a new password" />
        </h1>
        {!ready && linkChecked ? (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>
              <LocalizedText text="This reset link is invalid or has expired. Request a new one from the sign-in page." />
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/login" })}
              className="mt-4 min-h-11 w-full rounded-xl border border-white/12 text-cyan-300 cursor-pointer"
            >
              <LocalizedText text="Back to sign in" />
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            {error && (
              <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
                <LocalizedText text={error} />
              </p>
            )}
            <input
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={72}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label={passwordLabel}
              placeholder={passwordLabel}
              className={inputClass}
            />
            <input
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={72}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-label={confirmLabel}
              placeholder={confirmLabel}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={!valid || saving || !ready}
              className={`w-full rounded-xl py-3 text-sm font-semibold transition-all ${
                valid && !saving && ready
                  ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 cursor-pointer"
                  : "cursor-not-allowed bg-white/15 text-muted-foreground"
              }`}
            >
              <LocalizedText text={saving ? "Saving…" : "Save new password"} />
            </button>
          </form>
        )}
      </div>
    </CosmicParallaxBg>
  );
}
