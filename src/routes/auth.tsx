import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CosmicAuthPage } from "@/components/CosmicAuthPage";
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

  const handleSuccess = (user: { email: string; provider: string }) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("agro_operator", JSON.stringify(user));
    }
    toast.success(`Welcome, Operator (${user.email})`, {
      description: `Authenticated via ${user.provider}. Mission Control Clearance Granted.`,
    });
    navigate({ to: "/" });
  };

  const handleClose = () => {
    navigate({ to: "/" });
  };

  return <CosmicAuthPage onSuccess={handleSuccess} onClose={handleClose} />;
}
