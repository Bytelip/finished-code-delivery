import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { CosmicAuthPage } from "@/components/CosmicAuthPage";
import { saveStoredProfile, type UserProfile } from "@/types/userProfile";
import { processIncomingAuthCallback } from "@/services/authService";
import { toast } from "sonner";
import { LocalizedText } from "@/components/i18n/LocalizedText";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Mission Control Sign In — AgroSpace Nexus" },
      {
        name: "description",
        content:
          "Sign in to AgroSpace Nexus Mission Control for orbital telemetry and farm intelligence.",
      },
    ],
  }),
  component: AuthRouteComponent,
});

function AuthRouteComponent() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  // Detect incoming OAuth session or fragment tokens on page load
  useEffect(() => {
    if (pathname === "/auth/callback") return;
    processIncomingAuthCallback()
      .then((user) => {
        if (user) {
          saveStoredProfile(user);
          toast.success(<LocalizedText text={`Welcome, ${user.fullName}`} />, {
            description: (
              <LocalizedText
                text={`Authenticated via ${user.provider}. Clearance Level: ${user.role}.`}
              />
            ),
          });
          navigate({ to: "/" });
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Authentication callback failed.";
        toast.error(<LocalizedText text={message} />);
      });
  }, [navigate, pathname]);

  if (pathname === "/auth/callback") return <Outlet />;

  const handleSuccess = (profile: UserProfile) => {
    saveStoredProfile(profile);
    toast.success(<LocalizedText text={`Welcome, ${profile.fullName}`} />, {
      description: (
        <LocalizedText
          text={`Authenticated via ${profile.provider}. Clearance Level: ${profile.role}.`}
        />
      ),
    });
    navigate({ to: "/" });
  };

  const handleClose = () => {
    navigate({ to: "/" });
  };

  return <CosmicAuthPage onSuccess={handleSuccess} onClose={handleClose} />;
}
