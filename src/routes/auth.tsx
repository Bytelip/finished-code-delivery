import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CosmicAuthPage } from "@/components/CosmicAuthPage";
import { saveStoredProfile, type UserProfile } from "@/types/userProfile";
import { toast } from "sonner";

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

  const handleSuccess = (profile: UserProfile) => {
    saveStoredProfile(profile);
    toast.success(`Welcome, ${profile.fullName}`, {
      description: `Authenticated via ${profile.provider}. Clearance Level: ${profile.role}.`,
    });
    navigate({ to: "/" });
  };

  const handleClose = () => {
    navigate({ to: "/" });
  };

  return <CosmicAuthPage onSuccess={handleSuccess} onClose={handleClose} />;
}
