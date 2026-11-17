import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { processIncomingAuthCallback } from "@/services/authService";
import { saveStoredProfile } from "@/types/userProfile";

export const Route = createFileRoute("/auth/callback")({ component: AuthCallbackRoute });

function AuthCallbackRoute() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    processIncomingAuthCallback()
      .then((user) => {
        if (!active) return;
        if (user) {
          saveStoredProfile(user);
          navigate({ to: "/", replace: true });
          return;
        }
        const callbackError = sessionStorage.getItem("agro_auth_callback_error");
        if (callbackError) {
          sessionStorage.removeItem("agro_auth_callback_error");
          setError(callbackError);
          return;
        }
        navigate({ to: "/login", replace: true });
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Sign-in callback failed.");
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#03060c] px-4 py-8 text-center text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl">
        <h1 className="text-lg font-semibold">{error ? "Sign-in could not be completed" : "Completing sign-in…"}</h1>
        {error ? (
          <>
            <p className="mt-3 break-words text-sm text-rose-200">{error}</p>
            <button type="button" onClick={() => navigate({ to: "/login", replace: true })} className="mt-5 min-h-11 rounded-lg bg-cyan-400 px-4 font-semibold text-slate-950">
              Return to sign in
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-400">Please wait while we verify your account.</p>
        )}
      </div>
    </main>
  );
}
