import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { toast } from "sonner";
import { friendlyAuthError } from "@/services/cloudAuth";

export const Route = createFileRoute("/auth/callback")({ component: AuthCallbackRoute });

function AuthCallbackRoute() {
  const navigate = useNavigate();
  const [statusMessage, setStatusMessage] = useState<string>("Completing secure sign-in…");

  useEffect(() => {
    let mounted = true;

    async function handleAuthCallback() {
      if (typeof window === "undefined") return;

      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");

      if (error || errorDescription) {
        const msg = friendlyAuthError(errorDescription || error || "Authentication was cancelled");
        toast.error(msg);
        if (mounted) navigate({ to: "/login", replace: true });
        return;
      }

      // Check for hash parameters (implicit flow fallback or invite/recovery tokens)
      if (typeof window !== "undefined" && window.location.hash && window.location.hash.includes("access_token")) {
        setStatusMessage("Restoring secure session…");
        const hash = window.location.hash.replace(/^#/, "");
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        if (accessToken) {
          try {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });
            if (!sessionError) {
              if (mounted) navigate({ to: "/", replace: true });
              return;
            }
          } catch (err) {
            console.warn("[OAuth] Hash token exchange:", err);
          }
        }
      }

      // If PKCE authorization code is present in URL, exchange it for session
      if (code) {
        setStatusMessage("Exchanging authentication token…");
        try {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.warn("[OAuth] Code exchange warning:", exchangeError.message);
            // Check if a session already exists regardless
            const { data: currentSession } = await supabase.auth.getSession();
            if (currentSession.session) {
              if (mounted) navigate({ to: "/", replace: true });
              return;
            }
            toast.error(friendlyAuthError(exchangeError.message));
            if (mounted) navigate({ to: "/login", replace: true });
            return;
          }

          if (data?.session) {
            if (mounted) navigate({ to: "/", replace: true });
            return;
          }
        } catch (err: unknown) {
          console.error("[OAuth] Unexpected code exchange error:", err);
        }
      }

      // Check current session
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        if (mounted) navigate({ to: "/", replace: true });
        return;
      }

      // Fallback: listen for onAuthStateChange to settle
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          if (mounted) navigate({ to: "/", replace: true });
        } else if (event === "SIGNED_OUT") {
          if (mounted) navigate({ to: "/login", replace: true });
        }
      });

      // Safety timeout: if nothing resolves after 3 seconds, redirect to login
      const timer = setTimeout(() => {
        if (mounted) {
          void supabase.auth.getSession().then(({ data }) => {
            navigate({ to: data.session ? "/" : "/login", replace: true });
          });
        }
      }, 3000);

      return () => {
        clearTimeout(timer);
        sub.subscription.unsubscribe();
      };
    }

    const cleanupPromise = handleAuthCallback();
    return () => {
      mounted = false;
      void cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, [navigate]);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-8 text-center text-foreground">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
        <svg className="h-6 w-6 animate-spin text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-foreground">
        <LocalizedText text={statusMessage} />
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        <LocalizedText text="Verifying authentication credentials…" />
      </p>
    </main>
  );
}
