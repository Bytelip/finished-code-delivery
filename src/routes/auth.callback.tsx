import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LocalizedText } from "@/components/i18n/LocalizedText";

export const Route = createFileRoute("/auth/callback")({ component: AuthCallbackRoute });

function AuthCallbackRoute() {
  const navigate = useNavigate();

  useEffect(() => {
    // The auth client reads any sign-in details from the URL itself; once it settles, go home.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      navigate({ to: session ? "/" : "/login", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-8 text-center text-foreground">
      <p className="text-sm text-muted-foreground">
        <LocalizedText text="Completing sign-in…" />
      </p>
    </main>
  );
}
